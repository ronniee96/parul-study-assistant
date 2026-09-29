import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/apiClient';


export default function ExamPredictorTab({ appState, setAppState, setActiveTab, apiKeys, primaryPriority }) {
  const [activeView, setActiveView] = useState('funnel'); // 'funnel' | 'sets' | 'parul_pyq' | 'blueprint'
  const [showAnswers, setShowAnswers] = useState(true);

  // Forensic pipeline states
  const [pipelineData, setPipelineData] = useState(appState?.pipelineData || null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [funnelStage, setFunnelStage] = useState(4); // 4=Top 25, 3=Top 100, 2=Top 200, 1=Candidates

  // Parul PYQ Digital Repository search states
  const [parulQuery, setParulQuery] = useState('');
  const [parulSubjectCode, setParulSubjectCode] = useState('');
  const [parulData, setParulData] = useState(null);
  const [searchingParul, setSearchingParul] = useState(false);

  // University Pattern Learner states
  const [analyzingPattern, setAnalyzingPattern] = useState(false);
  const [learnedBlueprint, setLearnedBlueprint] = useState(appState?.examProfile || null);

  const extractedText = appState?.extractedText || '';
  const filename = appState?.uploadedFiles?.[0]?.name || appState?.uploadedFile?.name || 'Course material';

  // Run Forensic Multi-Stage Prediction Pipeline (300 -> 200 -> 100 -> 25)
  const runForensicPipeline = async () => {
    setPipelineLoading(true);
    try {
      if (!extractedText.trim()) throw new Error('Extract source documents before running exam prediction.');
      const docs = appState?.extractedDocuments?.length
        ? appState.extractedDocuments.map((doc, i) => ({ ...doc, id: doc.id || `doc_${i + 1}` }))
        : [{ id: 'doc_1', filename, text: extractedText }];
      const configuredKeys = Object.fromEntries(
        Object.entries(apiKeys || {}).filter(([, key]) => typeof key === 'string' && key.trim().length > 5)
      );
      const preferredOrder = [primaryPriority, ...Object.keys(configuredKeys).filter(key => key !== primaryPriority)].filter(Boolean);

      const res = await apiFetch('/api/v1/predict-exam-pipeline', {
        method: 'POST',
        body: JSON.stringify({
          documents: docs,
          material_text: extractedText,
          past_papers: appState?.pastPapers || [],
          exam_profile: appState?.examProfile || learnedBlueprint || undefined,
          subject_name: filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim(),
          subject_code: appState?.examProfile?.subject_code || null,
          api_keys: configuredKeys,
          preferred_order: preferredOrder,
        })
      });
      setPipelineData(res);
      setAppState(prev => ({
        ...prev,
        pipelineData: res,
        predictedPaper: res.predicted_mock_paper || null,
        rankedQuestions: res.top_25 || [],
        answers: res.top_25 || [],
        stats: { ...(prev.stats || {}), questionCount: res.candidate_universe_count || 0, answerCount: res.final_top_25_count || 0 }
      }));
      setFunnelStage(4);
    } catch (err) {
      console.error("Forensic prediction pipeline error:", err);
      alert("Prediction pipeline note: " + (err.message || String(err)));
    } finally {
      setPipelineLoading(false);
    }
  };

  // Search Parul University Digital Repository (ir.paruluniversity.ac.in)
  const searchParulPYQ = async () => {
    setSearchingParul(true);
    try {
      const q = parulQuery || filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
      const res = await apiFetch(`/api/v1/parul-pyq/search?query=${encodeURIComponent(q)}&subject_code=${encodeURIComponent(parulSubjectCode)}`);
      setParulData(res);
    } catch (err) {
      console.error("Parul PYQ search error:", err);
    } finally {
      setSearchingParul(false);
    }
  };

  // Analyze previous year question paper structure
  const handlePatternUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAnalyzingPattern(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const extracted = await apiFetch('/api/v1/document-intelligence/extract', { method: 'POST', body: formData });
      if (!extracted.success || !extracted.full_text?.trim()) {
        throw new Error(extracted.error || `Could not extract readable text from ${file.name}.`);
      }
      const res = await apiFetch('/api/v1/exam-pattern/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: extracted.full_text, filename: file.name })
      });
      if (!res.profile) throw new Error('The paper structure analyzer did not return an exam profile.');
      setLearnedBlueprint(res.profile);
      setAppState(prev => ({
        ...prev,
        examProfile: res.profile,
        pastPapers: [...(prev.pastPapers || []), extracted.full_text],
      }));
      const details = [
        res.profile.total_marks != null ? `${res.profile.total_marks} marks` : null,
        res.profile.duration_hours != null ? `${res.profile.duration_hours} hours` : null,
        `${res.profile.sections?.length || 0} detected sections`,
      ].filter(Boolean).join(', ');
      alert(`Extracted paper profile: ${res.profile.university || 'University not identified'} (${details}).`);
    } catch (err) {
      console.error("Pattern analysis error:", err);
      alert(err.message || 'Could not analyze this previous paper.');
    } finally {
      setAnalyzingPattern(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4 max-w-6xl mx-auto">
      {/* Master View Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveView('funnel')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'funnel'
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>🎯</span>
            <span>{pipelineData ? `Forensic Prediction Funnel (${pipelineData.candidate_universe_count ?? 0} → ${pipelineData.top_200_count ?? 0} → ${pipelineData.top_100_count ?? 0} → ${pipelineData.final_top_25_count ?? 0})` : 'Forensic Prediction Funnel'}</span>
          </button>

          <button
            onClick={() => setActiveView('sets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'sets'
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>📄</span>
            <span>Study mock paper</span>
          </button>

          <button
            onClick={() => {
              setActiveView('parul_pyq');
              if (!parulData) searchParulPYQ();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'parul_pyq'
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>🏛️</span>
            <span>Parul Repository (PYQ)</span>
          </button>

          <button
            onClick={() => setActiveView('blueprint')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'blueprint'
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-black/5'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>📐</span>
            <span>My University Exam Blueprint</span>
          </button>
        </div>

        <button
          onClick={runForensicPipeline}
          disabled={pipelineLoading}
          className="px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {pipelineLoading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
              <span>Running Pipeline...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Run Prediction Pipeline</span>
            </>
          )}
        </button>
      </div>

      {/* ── VIEW 1: FORENSIC EXAM INTELLIGENCE FUNNEL ── */}
      {activeView === 'funnel' && (
        <div className="flex flex-col gap-6">
          {/* Funnel Dashboard Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-primary-900/90 via-indigo-900/90 to-purple-950/90 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <h3 className="text-xl font-bold">Multi-Stage Exam Evidence Pipeline</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                  Evidence-Grounded
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                Ranks questions using extracted material, uploaded past papers, cross-document support, and the supplied exam profile. AI critique is shown only when a provider review actually completes.
              </p>
            </div>

            <button
              onClick={runForensicPipeline}
              disabled={pipelineLoading}
              className="px-5 py-2.5 bg-white hover:bg-gray-100 text-primary-900 text-xs font-extrabold rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {pipelineLoading ? 'Analyzing source evidence...' : '⚡ Run exam evidence pipeline'}
            </button>
          </div>

          {/* Interactive 4-Tier Funnel Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                tier: 1,
                name: 'Candidate Universe',
                count: pipelineData?.candidate_universe_count ?? 0,
                desc: pipelineData ? `${Object.values(pipelineData.per_document_candidate_counts || {}).join(' + ') || pipelineData.candidate_universe_count} candidates actually generated per source` : 'Run the pipeline to generate source-grounded candidates',
                icon: '📚'
              },
              {
                tier: 2,
                name: 'Top 200 Diverse Pool',
                count: pipelineData?.top_200_count ?? 0,
                desc: 'Highest current evidence scores, with topic and question-type diversity',
                icon: '⚖️'
              },
              {
                tier: 3,
                name: 'Top 100 Adversarial Refined',
                count: pipelineData?.top_100_count ?? 0,
                desc: ['complete', 'partial'].includes(pipelineData?.adversarial_review_status)
                  ? `AI reviewed ${pipelineData.adversarial_reviewed_count || 0} candidates`
                  : 'Evidence-ranked; AI adversarial review not completed',
                icon: '🛡️'
              },
              {
                tier: 4,
                name: 'Final 25 High Evidence',
                count: pipelineData?.final_top_25_count ?? 0,
                desc: 'Top source-evidence scores among the retained candidates',
                icon: '🎯'
              }
            ].map(f => (
              <button
                key={f.tier}
                onClick={() => setFunnelStage(f.tier)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  funnelStage === f.tier
                    ? 'bg-white dark:bg-gray-800 border-primary-500 ring-2 ring-primary-500/20 shadow-md scale-[1.02]'
                    : 'bg-white/80 dark:bg-gray-900/80 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 font-mono">
                      {f.count} Qs
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 mt-2">{f.name}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[10px] font-bold text-primary-600 dark:text-primary-400">
                  {funnelStage === f.tier ? '● Currently Viewing' : 'Click to View Stage'}
                </div>
              </button>
            ))}
          </div>

          {/* Cross-Document Reinforcement & Topic Heatmap */}
          {pipelineData?.topic_heatmap && (
            <div className="glass-card p-5 rounded-3xl border border-gray-200 dark:border-gray-700/60 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>🔥</span> Topic Weighting & PYQ Heatmap
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Historical counts include verified question text only
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {Object.entries(pipelineData.topic_heatmap).map(([topic, data], tIdx) => (
                  <div key={tIdx} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{topic}</span>
                    <div className="flex items-center justify-between mt-2 text-[10px]">
                      <span className="px-1.5 py-0.2 rounded-md font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        SOURCE
                      </span>
                <span className="text-gray-500 font-mono font-bold">{data.candidate_count} candidates</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1">Verified historical questions: {data.verified_historical_question_count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Cards for Selected Funnel Stage */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span>
                <span>
                  {funnelStage === 4 ? 'Final Evidence-Ranked Questions' : (funnelStage === 3 ? (pipelineData?.adversarial_review_status === 'complete' ? 'Top 100 AI-Reviewed Candidates' : 'Top 100 Evidence-Ranked Candidates') : (funnelStage === 2 ? 'Top 200 Diverse Pool' : 'Candidate Universe Sample'))}
                </span>
              </h3>
              <span className="text-xs text-gray-500">
                Sorted by Multi-Source Evidence Score
              </span>
            </div>

            {(pipelineData ? (funnelStage === 4 ? pipelineData.top_25 : funnelStage === 3 ? pipelineData.top_100 : funnelStage === 2 ? pipelineData.top_200 : pipelineData.candidate_pool) : []).map((q, qIdx) => {
              const evidenceLabel = Number.isFinite(q.evidence_score)
                ? `Source evidence ${Math.round(q.evidence_score * 100)}/100`
                : 'Source evidence not scored';

              return (
                <div key={qIdx} className="p-5 glass-card rounded-2xl border border-gray-200 dark:border-gray-700/70 shadow-xs flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center">
                        #{qIdx + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                        {evidenceLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                        [Suggested {q.marks || 5} Marks]
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                        {q.bloom_level ? `Bloom: ${q.bloom_level}` : q.type}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 font-semibold">
                      📁 {q.topic}
                    </div>
                  </div>

                  <h4 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                    {q.question}
                  </h4>

                  {/* Multi-Evidence Breakdown Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex flex-col gap-1.5">
                      <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                        <span>🏛️</span> Historical & Material Evidence:
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed">
                        {q.historical_evidence || "No verified historical question evidence is available."}
                      </p>
                      {q.source_pages && q.source_pages.length > 0 && (
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">
                          Source Grounding: Page/Slide {q.source_pages.join(', ')} ({q.source_filename || 'Course Material'})
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 flex flex-col gap-1.5">
                      <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                        <span>⚖️</span> AI evidence review:
                      </span>
                      {q.pros_evidence && q.pros_evidence.length > 0 ? (
                        <p className="text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed">
                          • <strong>Supporting:</strong> {q.pros_evidence[0]}<br />
                          • <strong>Counter-evidence:</strong> {q.cons_evidence?.[0] || 'No counter-evidence supplied by the review.'}
                        </p>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300 text-[11px]">
                          {q.adversarial_reviewed ? 'Reviewed by the configured AI provider against the supplied evidence.' : 'AI adversarial review was not completed for this question.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Explicit Risk Factor */}
                  {q.risk_analysis && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                      <span>⚠️</span>
                      <div>
                        <strong>Risk Analysis:</strong> {q.risk_analysis}
                      </div>
                    </div>
                  )}

                  {/* Solution Preview */}
                  <div className="mt-1 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-gray-800 dark:text-gray-200">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                      Model Solution & Key Points:
                    </span>
                    <p className="whitespace-pre-line leading-relaxed text-[11px]">
                      {q.correct_answer || q.answer || 'Refer to study material for complete proof and derivation.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: PROFILE-SHAPED MOCK PAPER ── */}
      {activeView === 'sets' && (
        <div className="flex flex-col gap-5">
          {!pipelineData?.predicted_mock_paper ? (
            <div className="p-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-900 dark:text-amber-200">
              Run the exam evidence pipeline after extracting course documents to generate a mock paper. No paper has been generated yet.
              {appState?.legacyPipelineData && <p className="mt-3">A saved prediction from the older unverified generator is preserved in this session and hidden until regenerated with cited evidence.</p>}
            </div>
          ) : (
            <>
              <div className="p-5 rounded-2xl border border-primary-200 dark:border-primary-900 bg-white dark:bg-gray-900">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">Generated study mock — not an official university paper</p>
                <h3 className="mt-1 text-xl font-bold">{pipelineData.predicted_mock_paper.subject || pipelineData.subject_name}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {pipelineData.learned_exam_profile?.learned_from_past_papers
                    ? pipelineData.predicted_mock_paper.university
                    : 'No uploaded university paper profile'}
                  {pipelineData.predicted_mock_paper.subject_code ? ` • ${pipelineData.predicted_mock_paper.subject_code}` : ''}
                  {pipelineData.predicted_mock_paper.duration_hours != null ? ` • ${pipelineData.predicted_mock_paper.duration_hours} hours` : ''}
                  {pipelineData.predicted_mock_paper.total_marks != null ? ` • ${pipelineData.predicted_mock_paper.total_marks} marks` : ''}
                </p>
                <button type="button" onClick={() => setShowAnswers(value => !value)} className="mt-3 px-3 py-1.5 rounded-lg border text-xs font-semibold">
                  {showAnswers ? 'Hide answers' : 'Show answers'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                {pipelineData.predicted_mock_paper.general_instructions?.map((instruction, index) => <p key={index}>{instruction}</p>)}
              </div>
              {(pipelineData.predicted_mock_paper.sections || []).map((section, sectionIndex) => (
                <section key={section.section_id || sectionIndex} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex flex-wrap justify-between gap-2 border-b pb-2">
                    <h4 className="font-bold">{section.name}</h4>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {section.num_questions} detected questions
                    {section.total_marks != null ? ` • ${section.total_marks} marks` : ''}
                    {section.choice_rule ? ` • ${section.choice_rule}` : ''}
                  </span>
                  </div>
                  {section.description && <p className="text-xs text-gray-600 dark:text-gray-400">{section.description}</p>}
                  {(section.questions || []).map((question, index) => (
                    <article key={question.id || index} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-semibold">{index + 1}. {question.question} <span className="text-xs text-gray-500">[Suggested {question.marks} marks]</span></p>
                      {question.options?.length > 0 && <ul className="mt-2 grid sm:grid-cols-2 gap-1 text-xs text-gray-700 dark:text-gray-300">{question.options.map((option, optionIndex) => <li key={optionIndex}>{option}</li>)}</ul>}
                      {(question.source_filename || question.source_pages?.length) && <p className="mt-2 text-[11px] text-gray-500">Source: {question.source_filename || 'Uploaded document'}{question.source_pages?.length ? ` • page/slide ${question.source_pages.join(', ')}` : ''}</p>}
                      {showAnswers && (question.correct_answer || question.key_points?.length > 0) && <div className="mt-2 text-xs text-emerald-800 dark:text-emerald-300 whitespace-pre-line">{question.correct_answer}{question.key_points?.length ? `\n${question.key_points.join('\n')}` : ''}</div>}
                    </article>
                  ))}
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── VIEW 3: PARUL UNIVERSITY DIGITAL REPOSITORY (PYQ INTELLIGENCE) ── */}
      {activeView === 'parul_pyq' && (
        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-900/90 via-sky-900/90 to-indigo-950/90 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <h3 className="text-xl font-bold">Parul University Digital Repository (PYQ)</h3>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-xl">
                Search public repository records in Community 123456789/36. Records are metadata unless question text is verified.
              </p>
            </div>
            <a
              href="https://ir.paruluniversity.ac.in/xmlui/handle/123456789/36"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>🔗</span> Open DSpace XMLUI
            </a>
          </div>

          {/* Search Bar */}
          <div className="glass-card p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by Subject (e.g. Cost Accounting, Algorithms, Database)"
              value={parulQuery}
              onChange={(e) => setParulQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Course Code (e.g. 16100252)"
              value={parulSubjectCode}
              onChange={(e) => setParulSubjectCode(e.target.value)}
              className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={searchParulPYQ}
              disabled={searchingParul}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {searchingParul ? 'Querying Repository...' : '🔍 Search Repository'}
            </button>
          </div>

          {/* Search Results */}
          {parulData && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Repository records ({parulData.results_count || parulData.papers?.length || 0} matches)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parulData.papers?.map((p, pIdx) => (
                  <div key={pIdx} className="p-5 glass-card rounded-2xl border border-gray-200 dark:border-gray-700/70 shadow-xs flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                          {p.exam_type || 'Repository record'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{p.year || 'Year unavailable'}</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{p.title}</h4>
                      {[p.faculty, p.program].filter(Boolean).length > 0 && <p className="text-xs text-gray-500 mt-1">{[p.faculty, p.program].filter(Boolean).join(' • ')}</p>}
                    </div>

                    {p.sample_questions && p.sample_questions.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 block mb-1">
                          Sample Historical Questions:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                          {p.sample_questions.slice(0, 3).map((sq, sqIdx) => (
                            <li key={sqIdx} className="line-clamp-2">{sq.question} [{sq.marks}M]</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 4: MY UNIVERSITY EXAM PATTERN ANALYZER ── */}
      {activeView === 'blueprint' && (
        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-900/90 via-emerald-900/90 to-green-950/90 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📐</span>
                <h3 className="text-xl font-bold">University Question-Paper Pattern Learner</h3>
              </div>
              <p className="text-xs text-emerald-200 mt-1 max-w-xl">
                Upload your previous year question paper to extract its authentic structural blueprint: total marks, duration, sections, compulsory vs optional OR-choices, and command verbs.
              </p>
            </div>

            <label className="px-5 py-2.5 bg-white hover:bg-gray-100 text-teal-900 text-xs font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0">
              <span>📎</span>
              <span>{analyzingPattern ? 'Extracting Blueprint...' : 'Upload Past Paper'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handlePatternUpload}
                disabled={analyzingPattern}
                className="hidden"
              />
            </label>
          </div>

          {/* Active Blueprint Display Card */}
          {(() => {
            const bp = learnedBlueprint || appState?.examProfile || {};
            return (
              <div className="glass-card p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-gray-700/80 shadow-md flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div>
                    <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                      {bp.learned_from_past_papers
                        ? (bp.sections?.length || bp.total_marks != null || bp.duration_hours != null ? 'Details extracted from uploaded paper' : 'Paper uploaded; structure not detected')
                        : 'No uploaded paper profile'}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{bp.university || 'No previous paper analyzed'}</h3>
                    <p className="text-xs text-gray-500">{bp.faculty || 'Upload a previous paper to learn its structure'}{bp.exam_type ? ` • ${bp.exam_type}` : ''}</p>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold">
                      ⏱️ {bp.duration_hours ?? '—'}{bp.duration_hours != null ? ' Hours' : ''}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-300 font-bold">
                      🏆 {bp.total_marks ?? '—'}{bp.total_marks != null ? ' Total Marks' : ''}
                    </span>
                  </div>
                </div>

                {/* Section Breakdown Table */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Learned Section Breakdown & Choice Rules
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500">
                          <th className="pb-2 font-bold">Section</th>
                          <th className="pb-2 font-bold">Marks Each</th>
                          <th className="pb-2 font-bold">Questions</th>
                          <th className="pb-2 font-bold">Choice Rule / OR Structure</th>
                          <th className="pb-2 font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {(bp.sections || []).length === 0 ? <tr><td colSpan="5" className="py-3 text-gray-500">No paper sections were detected.</td></tr> : (bp.sections || []).map((sec, sIdx) => (
                          <tr key={sIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                            <td className="py-2.5 font-bold text-gray-800 dark:text-gray-200">{sec.name || `Section ${sIdx + 1}`}</td>
                            <td className="py-2.5 text-gray-600 dark:text-gray-400">{sec.marks_per_question ?? '—'}{sec.marks_per_question != null ? ' Marks' : ''}</td>
                            <td className="py-2.5 text-gray-600 dark:text-gray-400">{sec.num_questions ?? '—'}</td>
                            <td className="py-2.5 text-primary-600 dark:text-primary-400 font-semibold">{sec.choice_rule || 'Not inferred'}</td>
                            <td className="py-2.5 font-bold text-gray-900 dark:text-gray-100">{sec.total_marks ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cognitive Balance & Command Verbs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      ⚖️ Theory vs. Numerical Balance:
                    </span>
                      {bp.theory_vs_numerical && <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden flex">
                        <div style={{ width: `${bp.theory_vs_numerical.theory_pct ?? 0}%` }} className="bg-primary-500 h-full" />
                        <div style={{ width: `${bp.theory_vs_numerical.numerical_pct ?? 0}%` }} className="bg-emerald-500 h-full" />
                        </div>
                      </div>}
                    <div className="flex justify-between text-[11px] text-gray-500 font-mono mt-0.5">
                      {bp.theory_vs_numerical ? <><span>Theory: {bp.theory_vs_numerical.theory_pct ?? '—'}%</span><span>Numerical: {bp.theory_vs_numerical.numerical_pct ?? '—'}%</span></> : <span>No balance inferred</span>}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      🏷️ Command verbs found in uploaded paper:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(bp.recurring_command_verbs || []).length ? bp.recurring_command_verbs.map((verb, vIdx) => (
                        <span key={vIdx} className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                          {verb}
                        </span>
                      )) : <span className="text-xs text-gray-500">No recurring verbs inferred yet.</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
