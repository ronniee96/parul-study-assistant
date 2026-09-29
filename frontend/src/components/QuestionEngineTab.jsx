import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createQuestionPaperPDF, createAnswerGuidePDF } from '../utils/pdfGenerator';
import { apiFetch } from '../utils/apiClient';

export default function QuestionEngineTab({ appState = {}, setAppState, setActiveTab, apiKeys, primaryPriority, openApiKeyModal }) {
  const [generating, setGenerating] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [funnelStage, setFunnelStage] = useState(appState.rankedQuestions?.length ? 4 : (appState.questions?.length ? 1 : 0)); // 0=none, 1=300, 2=200, 3=100, 4=25
  const [selectedType, setSelectedType] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [activeTier, setActiveTier] = useState(appState.rankedQuestions?.length ? 25 : 300); // 300, 200, 100, 25
  const [engineUsed, setEngineUsed] = useState(null);
  const [failoverAlert, setFailoverAlert] = useState(null);

  const hasDocuments = Boolean(appState.extractedText || appState.uploadedFile || (appState.uploadedFiles && appState.uploadedFiles.length > 0));

  // Generate as many source-supported candidates as providers can support.
  const generateMegaQuestions = async () => {
    if (!appState.extractedText) {
      alert("Please upload study materials in the Upload tab first!");
      if (setActiveTab) setActiveTab('upload');
      return;
    }

    setGenerating(true);
    setFailoverAlert(null);

    const baseOrder = ['gemini', 'openai', 'anthropic'];
    const preferredOrder = primaryPriority ? [primaryPriority, ...baseOrder.filter(p => p !== primaryPriority)] : baseOrder;
    const sourceText = appState.extractedText;

    try {
      const data = await apiFetch('/api/v1/generate-mega-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          num_questions: 300,
          question_types: ['multiple_choice', 'short_answer', 'essay'],
          api_keys: apiKeys,
          preferred_order: preferredOrder
        })
      });

      if (data.questions && data.questions.length > 0) {
          const formatted = data.questions.map((q, idx) => ({
            id: idx + 1,
            question: q.question,
            topic: q.topic || 'Core Concept',
            type: q.type === 'multiple_choice' ? 'MCQ' : (q.type === 'essay' ? 'Essay' : 'Short Answer'),
            difficulty: q.difficulty === 'hard' ? 5 : (q.difficulty === 'easy' ? 2 : 4),
            marks: q.marks || (q.type === 'multiple_choice' ? 2 : (q.type === 'essay' ? 12 : 5)),
            options: q.options || null,
            answer: q.correct_answer || q.explanation || 'Refer to study material for detailed solution.',
            key_points: q.key_points || []
          }));

          setEngineUsed(data.engine_used || 'Multi-Model AI Engine');
          if (data.failover_log && data.failover_log.length > 0) {
            setFailoverAlert(data.failover_log[0]);
          }

          setAppState(prev => ({
            ...prev,
            questions: formatted,
            questionStages: null,
            rankedQuestions: [],
            answers: [],
            stats: {
              ...prev.stats,
              questionCount: formatted.length,
              answerCount: 0,
              evidenceScore: null
            }
          }));

          setFunnelStage(1);
          setActiveTier(300);
          setGenerating(false);
          return;
        }
    } catch (err) {
      alert(`Question generation failed: ${err.message || String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  // Rank and filter down to top 25
  const rankQuestions = async () => {
    if (!appState.questions?.length) return;
    setRanking(true);
    try {
      const result = await apiFetch('/api/v1/rank-questions', {
        method: 'POST',
        body: JSON.stringify({
          questions: appState.questions,
          material_text: appState.extractedText || '',
          past_papers: appState.pastPapers || []
        })
      });
      const top25 = result.top_25 || [];
      setAppState(prev => ({
        ...prev,
        questionStages: { top_200: result.top_200 || [], top_100: result.top_100 || [], top_25: top25 },
        rankedQuestions: top25,
        answers: top25,
        stats: { ...prev.stats, answerCount: top25.length, evidenceScore: result.stats?.avg_evidence_top25 ?? null }
      }));
      setFunnelStage(4);
      setActiveTier(25);
    } catch (err) {
      alert(`Evidence ranking failed: ${err.message || String(err)}`);
    } finally {
      setRanking(false);
    }
  };

  // Smart question filter matcher that properly categorizes all master question types
  const matchesFilterType = (q, filterType) => {
    if (!filterType || filterType === 'All') return true;
    const t = (q.type || '').toLowerCase();
    const cat = (q.category || '').toLowerCase();

    if (filterType === 'MCQ') {
      return t.includes('mcq') || cat.includes('mcq') || Boolean(q.options && q.options.length >= 2);
    }
    if (filterType === 'Essay') {
      return t.includes('essay') || cat.includes('essay') || (q.marks && q.marks >= 10);
    }
    if (filterType === 'Short Answer') {
      return (
        t.includes('short') ||
        t.includes('definition') ||
        t.includes('structured') ||
        t.includes('diagram') ||
        t.includes('flowchart') ||
        t.includes('mind map') ||
        t.includes('notes') ||
        t.includes('mistakes') ||
        cat.includes('definition') ||
        cat.includes('structured') ||
        cat.includes('diagram') ||
        cat.includes('flowchart') ||
        (!t.includes('mcq') && !t.includes('essay') && (!q.marks || q.marks < 10) && (!q.options || q.options.length === 0))
      );
    }
    return t === filterType.toLowerCase() || cat === filterType.toLowerCase();
  };

  const currentQuestions = useMemo(() => {
    const all = activeTier === 25 && appState.rankedQuestions?.length ? appState.rankedQuestions
      : activeTier === 100 && appState.questionStages?.top_100?.length ? appState.questionStages.top_100
      : activeTier === 200 && appState.questionStages?.top_200?.length ? appState.questionStages.top_200
      : appState.questions || [];
    let filtered = all.slice(0, activeTier);
    if (selectedType !== 'All') {
      filtered = filtered.filter(q => matchesFilterType(q, selectedType));
    }
    return filtered;
  }, [appState.questions, appState.questionStages, appState.rankedQuestions, activeTier, selectedType]);

  const typeCounts = useMemo(() => {
    const all = activeTier === 25 && appState.rankedQuestions?.length ? appState.rankedQuestions
      : activeTier === 100 && appState.questionStages?.top_100?.length ? appState.questionStages.top_100
      : activeTier === 200 && appState.questionStages?.top_200?.length ? appState.questionStages.top_200
      : appState.questions || [];
    const tierQuestions = all.slice(0, activeTier);
    return {
      All: tierQuestions.length,
      Essay: tierQuestions.filter(q => matchesFilterType(q, 'Essay')).length,
      'Short Answer': tierQuestions.filter(q => matchesFilterType(q, 'Short Answer')).length,
      MCQ: tierQuestions.filter(q => matchesFilterType(q, 'MCQ')).length,
    };
  }, [appState.questions, appState.questionStages, appState.rankedQuestions, activeTier]);

  const handleExportPDF = (count, withAnswers = false) => {
    const qs = currentQuestions.slice(0, count);
    const subject = appState.uploadedFiles?.length 
      ? appState.uploadedFiles.map(f => f.name.replace(/\.[^/.]+$/, "")).join(" & ") 
      : (appState.uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Course Syllabus");

    if (withAnswers) {
      createAnswerGuidePDF(qs, { subjectName: subject, totalMarks: appState.examProfile?.total_marks });
    } else {
      createQuestionPaperPDF(qs, {
        subject,
        totalMarks: appState.examProfile?.total_marks,
        time: appState.examProfile?.duration_hours != null ? `${appState.examProfile.duration_hours} Hours` : undefined,
      });
    }
  };

  if (!hasDocuments && (!appState.questions || appState.questions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 glass-card max-w-2xl mx-auto my-8">
        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-4xl mb-4 text-primary-600 dark:text-primary-400">
          ❓
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Active Session Documents</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
          Upload course material in the <strong>Upload</strong> tab, then generate questions from its readable source text.
        </p>
        <button
          onClick={() => setActiveTab && setActiveTab('upload')}
          className="px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <span>📎</span>
          <span>Go to Upload Tab</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span>❓</span> AI Question Engine & Exam Funnel
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate source-grounded practice candidates, then rank the available questions by evidence from your material and uploaded papers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExportPDF(25, false)}
            className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📥</span> Export 25 Questions (PDF)
          </button>
          <button
            onClick={() => handleExportPDF(25, true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>📖</span> Export with Answers (PDF)
          </button>
        </div>
      </div>

      {/* Engine Status Banner */}
      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-indigo-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <span className="text-amber-500 text-base">⚡</span>
          <span className="font-semibold">Target Document:</span>
          <span className="font-bold text-primary-600 dark:text-primary-400">
            {appState.uploadedFiles?.length 
              ? `${appState.uploadedFiles.length} Uploaded Files (${appState.uploadedFiles.map(f => f.name).join(', ')})`
              : (appState.uploadedFile?.name || "Uploaded Syllabus Material")}
          </span>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 font-bold">
          {engineUsed || 'Curriculum Syllabus Engine'}
        </span>
      </div>

      {/* Funnel Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generateMegaQuestions}
          disabled={generating}
          className="px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
        >
          {generating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              <span>Generating Questions...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Regenerate Questions</span>
            </>
          )}
        </button>

        <button
          onClick={rankQuestions}
          disabled={ranking}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
        >
          {ranking ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              <span>Filtering to Top 25...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Rank by source evidence</span>
            </>
          )}
        </button>
      </div>

      {/* Visual Funnel Hierarchy */}
      <div className="glass-card p-6 rounded-3xl flex flex-col gap-3">
        {/* Candidate tier */}
        <div 
          onClick={() => setActiveTier(300)}
          className={`p-3.5 rounded-2xl font-bold text-xs md:text-sm text-white flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md ${
            activeTier === 300 
              ? 'bg-blue-600 ring-4 ring-blue-300 dark:ring-blue-900 scale-[1.01]' 
              : 'bg-blue-500/80 hover:bg-blue-600 opacity-80'
          }`}
          style={{ width: '100%' }}
        >
          <div className="flex items-center gap-2">
            <span>📚</span>
            <span>{appState.questions?.length || 0} Generated Candidates</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
            {activeTier === 300 ? 'Active Tier' : 'Click to View All'}
          </span>
        </div>

        {/* Tier 200 */}
        <div 
          onClick={() => setActiveTier(200)}
          className={`p-3.5 rounded-2xl font-bold text-xs md:text-sm text-white flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md mx-auto ${
            activeTier === 200 
              ? 'bg-emerald-600 ring-4 ring-emerald-300 dark:ring-emerald-900 scale-[1.01]' 
              : 'bg-emerald-500/80 hover:bg-emerald-600 opacity-80'
          }`}
          style={{ width: '85%' }}
        >
          <div className="flex items-center gap-2">
            <span>⚖️</span>
            <span>Top {appState.questionStages?.top_200?.length || 0} Evidence-Ranked</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
            {activeTier === 200 ? 'Active Tier' : 'Click to View'}
          </span>
        </div>

        {/* Tier 100 */}
        <div 
          onClick={() => setActiveTier(100)}
          className={`p-3.5 rounded-2xl font-bold text-xs md:text-sm text-white flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md mx-auto ${
            activeTier === 100 
              ? 'bg-amber-600 ring-4 ring-amber-300 dark:ring-amber-900 scale-[1.01]' 
              : 'bg-amber-500/80 hover:bg-amber-600 opacity-80'
          }`}
          style={{ width: '65%' }}
        >
          <div className="flex items-center gap-2">
            <span>🔥</span>
            <span>Top {appState.questionStages?.top_100?.length || 0} Evidence-Ranked</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
            {activeTier === 100 ? 'Active Tier' : 'Click to View'}
          </span>
        </div>

        {/* Tier 25 */}
        <div 
          onClick={() => setActiveTier(25)}
          className={`p-3.5 rounded-2xl font-bold text-xs md:text-sm text-white flex items-center justify-between cursor-pointer transition-all duration-300 shadow-md mx-auto ${
            activeTier === 25 
              ? 'bg-rose-600 ring-4 ring-rose-300 dark:ring-rose-900 scale-[1.01]' 
              : 'bg-rose-500/80 hover:bg-rose-600 opacity-80'
          }`}
          style={{ width: '45%' }}
        >
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <span>Top {appState.questionStages?.top_25?.length || 0} source-evidence scores</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
            {activeTier === 25 ? 'Active Tier' : 'Click to View Top 25'}
          </span>
        </div>
      </div>

      {/* Type Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Showing {currentQuestions.length} Questions (Tier: Top {activeTier})
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {['All', 'Essay', 'Short Answer', 'MCQ'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedType === t 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{t}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                selectedType === t 
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/60 dark:text-primary-300' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {typeCounts[t] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-3">
        {currentQuestions.map((q, idx) => {
          const isExpanded = expandedId === q.id;

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.3) }}
              className="p-4 md:p-5 glass-card rounded-2xl border border-gray-200 dark:border-gray-700/70 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center">
                    Q{idx + 1}
                  </span>
                  
                  {Number.isFinite(q.evidence_score) && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                      <span>Evidence score {Math.round(q.evidence_score * 100)}/100</span>
                    </span>
                  )}

                  <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                    [{q.marks} Marks]
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                    {q.subType || q.type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  <span>📁</span>
                  <span className="font-semibold text-[11px] truncate max-w-[140px]">{q.topic}</span>
                </div>
              </div>

              {/* Question Text */}
              <h4 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                {q.question}
              </h4>

              {/* MCQ Options */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, oIdx) => (
                    <div 
                      key={oIdx}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 text-xs text-gray-800 dark:text-gray-200 font-medium"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {/* Toggle Answer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>{isExpanded ? '▲ Hide Model Answer' : '👁️ View Model Answer & Key Points'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Q: ${q.question}\n\nAnswer: ${q.answer}`);
                    alert("Question & Answer copied to clipboard!");
                  }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>📋</span> Copy Q&A
                </button>
              </div>

              {/* Expandable Model Answer */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col gap-3 text-xs md:text-sm"
                  >
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                        Model Answer:
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {q.answer}
                      </p>
                    </div>

                    {q.key_points && q.key_points.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                          Key Exam Points to Remember:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                          {q.key_points.map((kp, kIdx) => (
                            <li key={kIdx}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
