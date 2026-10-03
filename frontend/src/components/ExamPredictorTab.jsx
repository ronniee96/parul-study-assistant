import React, { useState, useMemo, useEffect } from 'react';
import { createParulExamPDF, createAnswerGuidePDF } from '../utils/pdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';

function isGarbageToken(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  if (s.length < 3) return true;
  if (/\/Length|\/Filter|\/FlateDecode|\/Type|\/MediaBox|\/Parent|\/Resources|\/XObject|PDFContext|obj\b|stream\b/i.test(s)) return true;
  if (/^\/[A-Z]/.test(s)) return true;
  return false;
}

function transformPipelineToPaperFormat(pipelineResult, subjectName) {
  // Transform backend pipeline result to frontend paper format
  if (!pipelineResult?.predicted_mock_paper) return null;

  const paper = pipelineResult.predicted_mock_paper;
  const sections = [];

  for (const s of paper.sections || []) {
    sections.push({
      name: s.name,
      marks_per_question: s.marks_per_question || 2.0,
      num_questions: s.questions?.length || 0,
      total_marks: s.total_marks || 0.0,
      choice_rule: s.choice_rule || "Compulsory",
      questions: (s.questions || []).map((q, idx) => ({
        id: q.id || `q-${idx}`,
        question: q.question_text || q.question || '',
        marks: q.marks || s.marks_per_question || 2,
        co: q.co || 'CO1',
        bt: q.bloom_level || 'BT-2',
        solution: q.model_answer || q.answer || 'Solution not available',
        key_points: q.key_points || []
      }))
    });
  }

  // Calculate overall confidence from top_25 evidence scores
  let overallConfidence = 88.0;
  if (pipelineResult.top_25 && pipelineResult.top_25.length > 0) {
    const scores = pipelineResult.top_25.map(q => q.evidence_score || 0.85);
    overallConfidence = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100 * 10) / 10;
  }

  return {
    metadata: {
      university: "PARUL UNIVERSITY",
      faculty: "FACULTY OF MANAGEMENT STUDIES & HIGHER EDUCATION",
      program: "University Examination (AI-Generated Model Paper)",
      examType: "Predicted Examination",
      semester: "Semester: III",
      date: "--/--/2026",
      subjectCode: "PU-PRED",
      subject: subjectName,
      time: `${paper.duration_hours || 2.5} hours`,
      totalMarks: paper.total_marks || 60
    },
    sections: sections,
    topic_heatmap: pipelineResult.topic_heatmap || {},
    candidate_universe_count: pipelineResult.candidate_universe_count || 0,
    top_200_count: pipelineResult.top_200_count || 0,
    top_100_count: pipelineResult.top_100_count || 0,
    final_top_25: pipelineResult.top_25 || [],
    overall_confidence: overallConfidence,
    methodology_notes: pipelineResult.methodology_notes || 'Generated via forensic multi-stage pipeline'
  };
}

function formatPipelineResultForDisplay(pipelineResult, subjectName) {
  const paper = transformPipelineToPaperFormat(pipelineResult, subjectName);
  if (!paper) return null;

  // Convert to SETS-like format for backward compatibility with UI
  return [{
    setId: 'AI-GENERATED',
    title: 'AI-Generated Prediction (Forensic Pipeline)',
    badge: '🎯 Evidence-Based',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
    likelihood: `${paper.overall_confidence}%`,
    focus: 'Evidence-scored questions from 300→200→100→25 funnel',
    paper: paper
  }];
}

export default function ExamPredictorTab({ appState, setAppState, setActiveTab, apiKeys, primaryPriority, sessionId }) {
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [generating, setGenerating] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [error, setError] = useState(null);
  const [showRawData, setShowRawData] = useState(false);

  const extractedText = appState.extractedText || '';
  const filename = appState.uploadedFiles?.[0]?.name || appState.uploadedFile?.name || 'Study Material';
  const questions = appState.questions || [];
  const subjectName = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim() || "Subject";

  // Generate prediction using backend pipeline
  const generatePrediction = async () => {
    if (!extractedText.trim()) {
      alert("Please upload study materials in the Upload tab first!");
      if (setActiveTab) setActiveTab('upload');
      return;
    }

    setGenerating(true);
    setError(null);
    setPipelineResult(null);

    try {
      const baseOrder = ['gemini', 'openai', 'anthropic'];
      const preferredOrder = primaryPriority
        ? [primaryPriority, ...baseOrder.filter(p => p !== primaryPriority)]
        : baseOrder;

      const url = sessionId ? `/api/v1/predict-exam-pipeline?session_id=${sessionId}` : '/api/v1/predict-exam-pipeline';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'X-Session-ID': sessionId } : {})
        },
        body: JSON.stringify({
          documents: appState.uploadedFiles?.map((f, i) => ({
            id: `doc_${i+1}`,
            filename: f.name,
            text: '' // Backend will use session's extracted text
          })) || [],
          material_text: extractedText,
          past_papers: [],
          subject_name: subjectName,
          subject_code: null,
          api_keys: apiKeys,
          preferred_order: preferredOrder
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPipelineResult(data);
        setError(null);

        // Update appState with prediction results for other tabs
        if (data.predicted_mock_paper) {
          setAppState(prev => ({
            ...prev,
            predictedPaper: data.predicted_mock_paper,
            stats: {
              ...prev.stats,
              confidence: data.candidate_universe_count ?
                Math.min(99, 50 + Math.log10(data.candidate_universe_count) * 10) : 88
            }
          }));
        }
      } else {
        const errData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setError(errData.detail || `Server error: ${res.status}`);
      }
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Failed to generate prediction. Please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate on mount if we have extracted text and no result yet
  useEffect(() => {
    if (extractedText && extractedText.trim().length > 20 && !pipelineResult && !generating) {
      generatePrediction();
    }
  }, [extractedText, sessionId]);

  const sets = useMemo(() => {
    if (pipelineResult) {
      return formatPipelineResultForDisplay(pipelineResult, subjectName);
    }
    // Fallback: show placeholder when no prediction yet
    return [{
      setId: 'READY',
      title: 'Ready for Prediction',
      badge: '📋 Awaiting Input',
      badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
      likelihood: '—',
      focus: 'Upload documents and click "Generate Prediction" to run the forensic pipeline',
      paper: null
    }];
  }, [pipelineResult, subjectName]);

  const activeSet = sets[activeSetIndex] || sets[0];
  const paper = activeSet.paper;

  const toggleQuestion = (id) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDownloadPaperPDF = () => {
    if (paper) createParulExamPDF(paper);
  };

  const handleDownloadSolutionsPDF = () => {
    if (!paper) return;
    const qnaList = [];
    paper.sections.forEach(section => {
      (section.questions || []).forEach(item => {
        qnaList.push({
          question: `[${section.name}] ${item.question}`,
          answer: item.solution,
          key_points: item.key_points,
          marks: item.marks
        });
      });
    });
    createAnswerGuidePDF(qnaList, {
      subject: `${paper.metadata.subject} (AI-Generated Full Solutions)`,
      type: 'Model Answer Guide'
    });
  };

  const renderSection = (section) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-primary-700 dark:text-primary-300">{section.name}</h4>
          <span className="text-xs font-semibold px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
            {section.choice_rule} • {section.num_questions} Q × {section.marks_per_question} marks = {section.total_marks} marks
          </span>
        </div>

        {(section.questions || []).map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all hover:border-primary-300 dark:hover:border-primary-700"
          >
            <div className="flex items-start gap-3">
              <span className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
                {q.id}:
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-gray-100 font-medium leading-relaxed">{q.question}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                    {q.marks} marks
                  </span>
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
                    {q.co}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                    {q.bt}
                  </span>
                </div>

                {showAnswers && (
                  <AnimatePresence>
                    {expandedQuestions[q.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Model Answer:</div>
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">{q.solution}</p>
                        {(q.key_points || []).length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Key Points:</div>
                            {q.key_points.map((kp, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                <span className="text-primary-500">▸</span>
                                <span>{kp}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
              <button
                onClick={() => toggleQuestion(q.id)}
                className="p-1 text-gray-400 hover:text-primary-500 transition-colors shrink-0"
                aria-label={expandedQuestions[q.id] ? 'Collapse answer' : 'Expand answer'}
              >
                {expandedQuestions[q.id] ? '▲' : '▼'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with Pipeline Status */}
      <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Exam Predictor — Forensic Intelligence Pipeline
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              300 Candidates → 200 Diverse → 100 Adversarial Review → 25 Evidence-Scored Final
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {pipelineResult && (
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
                  Universe: {pipelineResult.candidate_universe_count || 0}
                </span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
                  Top 200: {pipelineResult.top_200_count || 0}
                </span>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-semibold">
                  Top 100: {pipelineResult.top_100_count || 0}
                </span>
                <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full font-semibold">
                  Final 25: {pipelineResult.top_25?.length || 0}
                </span>
              </div>
            )}
            <button
              onClick={generatePrediction}
              disabled={generating || !extractedText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold rounded-lg transition-colors"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Running Pipeline...
                </>
              ) : (
                '🔮 Generate Prediction'
              )}
            </button>
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {showRawData ? 'Hide Raw' : 'Show Raw'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Raw Pipeline Data Display */}
      {showRawData && pipelineResult && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-h-96 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Raw Pipeline Output (Debug)</h3>
            <button onClick={() => setShowRawData(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
          </div>
          <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(pipelineResult, null, 2).slice(0, 10000)}
          </pre>
        </div>
      )}

      {/* Paper Display */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {paper ? (
          <>
            {/* Paper Metadata Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm"
            >
              <div className="text-center mb-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {paper.metadata.university}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {paper.metadata.faculty}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {paper.metadata.program}
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span><strong>Subject:</strong> {paper.metadata.subject}</span>
                  <span><strong>Code:</strong> {paper.metadata.subjectCode}</span>
                  <span><strong>Time:</strong> {paper.metadata.time}</span>
                  <span><strong>Max Marks:</strong> {paper.metadata.totalMarks}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: activeSet.badgeColor.split(' ')[0].replace('bg-', 'bg-'), color: activeSet.badgeColor.split(' ')[1].replace('text-', '') }}>
                  {activeSet.badge} — {activeSet.likelihood} Confidence
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Pipeline Focus:</strong> {activeSet.focus}
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                    Candidates: {activeSet.paper?.candidate_universe_count || 0}
                  </span>
                  <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
                    Top 25 Evidence: {Math.round((activeSet.paper?.final_top_25?.[0]?.evidence_score || 0.85) * 100)}%
                  </span>
                  <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                    Methodology: Forensic Multi-Stage
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Topic Heatmap */}
            {paper.topic_heatmap && Object.keys(paper.topic_heatmap).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5"
              >
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">📊 Topic Heatmap — Predicted Exam Weightage</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(paper.topic_heatmap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15)
                    .map(([topic, score]) => (
                      <span key={topic} className="px-3 py-1 text-xs font-medium rounded-full border"
                        style={{
                          backgroundColor: score > 0.7 ? 'rgba(220, 38, 38, 0.1)' : score > 0.4 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          borderColor: score > 0.7 ? 'rgba(220, 38, 38, 0.3)' : score > 0.4 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                          color: score > 0.7 ? '#dc2626' : score > 0.4 ? '#f59e0b' : '#22c55e'
                        }}
                      >
                        {topic} ({(score * 100).toFixed(0)}%)
                      </span>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Sections */}
            {paper.sections?.map((section, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                {renderSection(section)}
              </motion.div>
            ))}

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <button
                onClick={handleDownloadPaperPDF}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
              >
                📄 Download Question Paper PDF
              </button>
              <button
                onClick={handleDownloadSolutionsPDF}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
              >
                📝 Download Answer Guide PDF
              </button>
            </motion.div>
          </>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8"
          >
            <div className="text-6xl mb-4">🔮</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Forensic Exam Prediction Pipeline
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Upload your study materials in the <strong>Upload</strong> tab, then click <strong>Generate Prediction</strong> to run the 300→200→100→25 evidence-driven forensic pipeline.
            </p>
            <button
              onClick={generatePrediction}
              disabled={generating || !extractedText.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {generating ? '🔄 Running Pipeline...' : '🔮 Generate Prediction'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}