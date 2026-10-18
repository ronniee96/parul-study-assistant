import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createAnswerGuidePDF } from '../utils/pdfGenerator';
import { generateDynamicQuestions } from '../utils/questionGenerator';
import { apiFetch } from '../utils/apiClient';
import { formatModelConfidenceBadge } from '../utils/confidenceFormatter';
import { generateClientAIAnswer, getAvailableApiKeys } from '../utils/aiOrchestrator';

const MASTER_CATEGORIES = [
  { id: 'all', label: '🌟 All High-Yield', icon: '🌟' },
  { id: '1-2m', label: '⚡ 1-2M Definitions', icon: '⚡' },
  { id: '2-5m', label: '📝 2-5M Concepts', icon: '📝' },
  { id: '5m', label: '📋 5-Mark Answers', icon: '📋' },
  { id: '10m', label: '🏛️ 10-Mark Detailed + Diagrams', icon: '🏛️' },
  { id: 'diagrams', label: '🖼️ Important Diagrams', icon: '🖼️' },
  { id: 'flowcharts', label: '🔀 Process Flowcharts', icon: '🔀' },
  { id: 'mcqs', label: '🎯 University MCQs', icon: '🎯' },
  { id: 'mistakes', label: '⚠️ Mistakes & Examiner Secrets', icon: '⚠️' },
  { id: 'lastday', label: '⏱️ Last-Day Revision (30m)', icon: '⏱️' }
];

export default function AnswerBankTab({ appState, setAppState, setActiveTab, apiKeys = {}, openApiKeyModal, sessionKey }) {
  const [expandedId, setExpandedId] = useState(1);
  const [expandAll, setExpandAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [enrichingId, setEnrichingId] = useState(null);

  const hasDocuments = Boolean(
    (appState.extractedText && appState.extractedText.trim().length > 20) ||
    appState.uploadedFile ||
    (appState.uploadedFiles && appState.uploadedFiles.length > 0)
  );

  // Derive master pool of answers from questions / generator
  const allMasterAnswers = useMemo(() => {
    if (!hasDocuments) return [];
    if (appState.questions && appState.questions.length >= 25) {
      return appState.questions;
    }
    if (appState.rankedQuestions && appState.rankedQuestions.length > 0) {
      return appState.rankedQuestions;
    }
    if (appState.answers && appState.answers.length > 0) {
      return appState.answers;
    }
    if (appState.extractedText) {
      return generateDynamicQuestions(appState.extractedText, appState.uploadedFiles?.map(f => f.name).join(' ') || appState.uploadedFile?.name || '');
    }
    return [];
  }, [appState.questions, appState.rankedQuestions, appState.answers, appState.extractedText, hasDocuments, appState.uploadedFiles, appState.uploadedFile]);

  // Filter by Master Blueprint Category and Search Query
  const filteredAnswers = useMemo(() => {
    let pool = allMasterAnswers;

    if (selectedCategory !== 'all') {
      if (selectedCategory === '1-2m') {
        pool = pool.filter(a => a.category?.includes("1-2") || a.category?.includes("Definitions") || (a.marks || 2) <= 2 && a.type !== 'MCQ');
      } else if (selectedCategory === '2-5m') {
        pool = pool.filter(a => a.category?.includes("2-5") || a.category?.includes("Concepts") || (a.marks >= 2 && a.marks <= 5 && a.type !== 'MCQ'));
      } else if (selectedCategory === '5m') {
        pool = pool.filter(a => a.category?.includes("5-Mark") || a.category?.includes("Descriptive") || a.marks === 5);
      } else if (selectedCategory === '10m') {
        pool = pool.filter(a => a.category?.includes("10") || a.category?.includes("Essay") || a.type === 'Essay' || (a.marks || 0) >= 10);
      } else if (selectedCategory === 'diagrams') {
        pool = pool.filter(a => a.category?.includes("Diagram") || a.answer?.includes("Diagram") || a.answer?.includes("FRAMEWORK") || a.answer?.includes("┌─"));
      } else if (selectedCategory === 'flowcharts') {
        pool = pool.filter(a => a.category?.includes("Process") || a.category?.includes("Workflow") || a.answer?.includes("Stage") || a.answer?.includes("➔") || a.answer?.includes("->"));
      } else if (selectedCategory === 'mcqs') {
        pool = pool.filter(a => a.type === 'MCQ' || (a.options && a.options.length > 0));
      } else if (selectedCategory === 'mistakes') {
        pool = pool.filter(a => a.category?.includes("Mistakes") || a.category?.includes("Examiner") || a.answer?.includes("Common Errors") || a.answer?.includes("Examiner"));
      } else if (selectedCategory === 'lastday') {
        pool = pool.filter(a => a.category?.includes("Last-Day") || a.category?.includes("Revision") || a.answer?.includes("Revision"));
      }
    }

    if (!searchQuery.trim()) {
      return pool.slice(0, selectedCategory === 'all' ? 50 : 35);
    }

    const query = searchQuery.toLowerCase();
    const searched = pool.filter(a => 
      a.question?.toLowerCase().includes(query) ||
      a.answer?.toLowerCase().includes(query) ||
      a.topic?.toLowerCase().includes(query)
    );
    return searched.slice(0, 30);
  }, [allMasterAnswers, selectedCategory, searchQuery]);

  const handleGenerateAnswersFromMaterial = async () => {
    if (!appState.extractedText) {
      alert("Please upload course materials in the Upload tab first!");
      if (setActiveTab) setActiveTab('upload');
      return;
    }

    setGenerating(true);
    try {
      const questionsToSolve = allMasterAnswers.slice(0, 25);
      const data = await apiFetch('/api/v1/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsToSolve,
          source_text: appState.extractedText,
          api_keys: apiKeys
        })
      });

      if (data && data.answers && data.answers.length > 0) {
        setAppState(prev => ({
          ...prev,
          answers: data.answers,
          stats: { ...prev.stats, answerCount: data.answers.length }
        }));
        return;
      }
    } catch (e) {
      console.warn("Backend generate-answers endpoint not reachable, generating from syllabus engine:", e);
    } finally {
      setGenerating(false);
    }

    // Client fallback: refresh with grounded answers
    const freshQs = generateDynamicQuestions(
      appState.extractedText,
      appState.uploadedFiles?.map(f => f.name).join(' ') || appState.uploadedFile?.name || ''
    );
    const top25 = freshQs.slice(0, 25);

    setAppState(prev => ({
      ...prev,
      questions: freshQs,
      rankedQuestions: top25,
      answers: top25,
      stats: { ...prev.stats, questionCount: freshQs.length, answerCount: top25.length }
    }));
  };

  // Enrich single answer using connected AI (Gemini or OpenAI)
  const handleEnrichWithAI = async (item) => {
    const activeKeys = getAvailableApiKeys(apiKeys);
    if (!activeKeys.gemini && !activeKeys.openai) {
      if (openApiKeyModal) {
        openApiKeyModal();
      } else {
        alert("Please connect Google Gemini or OpenAI in API Keys to enable direct AI answer enrichment.");
      }
      return;
    }

    setEnrichingId(item.id);
    try {
      const enriched = await generateClientAIAnswer(
        item.question,
        appState.extractedText || item.answer,
        item.marks || 5,
        activeKeys
      );

      if (enriched && enriched.answer) {
        const updated = allMasterAnswers.map(q => {
          if (q.id === item.id) {
            return {
              ...q,
              answer: enriched.answer,
              key_points: enriched.key_points && enriched.key_points.length > 0 ? enriched.key_points : q.key_points,
              is_ai_generated: true,
              confidence: 0.96
            };
          }
          return q;
        });

        setAppState(prev => ({
          ...prev,
          questions: updated,
          answers: updated.slice(0, 25)
        }));
        alert(`Solution successfully enriched with ${enriched.engine}!`);
      }
    } catch (err) {
      console.error("AI answer enrichment failed:", err);
      alert(`AI enrichment notice: ${err.message || 'Could not reach AI provider'}`);
    } finally {
      setEnrichingId(null);
    }
  };

  const handleDownloadStudyGuide = () => {
    if (filteredAnswers.length === 0) {
      alert("No answers available to download. Please upload notes or select another category.");
      return;
    }
    const subject = appState.uploadedFiles?.map(f => f.name).join(', ') || appState.uploadedFile?.name || 'Syllabus';
    createAnswerGuidePDF(filteredAnswers, { subject });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasAnswers = allMasterAnswers.length > 0;

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span>🎓</span> Master University Answer Bank ({filteredAnswers.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Standard 10-tier exam preparation blueprint: 1-2M definitions, 5M & 10M structured answers, schematics, and examiner scoring secrets.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {hasAnswers && (
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="px-4 py-2 bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>{expandAll ? 'Collapse All' : 'Expand All Answers'}</span>
            </button>
          )}

          {hasAnswers && (
            <button
              onClick={handleDownloadStudyGuide}
              className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>📄</span> Export Category PDF
            </button>
          )}

          {appState.extractedText && (
            <button
              onClick={handleGenerateAnswersFromMaterial}
              disabled={generating}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              {generating ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  <span>Synthesizing Solutions...</span>
                </>
              ) : (
                <>
                  <span>⚡</span> Refresh Solutions
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {!hasAnswers ? (
        /* Empty State */
        <div className="glass-card p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl">
            📖
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            No Active Documents in Workspace
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Upload your lecture notes, slides, or chapter PDFs to instantly unlock all 10 Master Blueprint Answer Categories.
          </p>
          <button
            onClick={() => setActiveTab && setActiveTab('upload')}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs md:text-sm shadow-md transition-all cursor-pointer"
          >
            📎 Upload Study Materials
          </button>
        </div>
      ) : (
        /* Content Display */
        <div className="flex flex-col gap-4">
          {/* Master Prompt Category Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {MASTER_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-500/30'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by technical keyword, formula, diagram, or question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm"
            />
          </div>

          {/* Answer Cards List */}
          <div className="flex flex-col gap-3">
            {filteredAnswers.map((item, idx) => {
              const isExpanded = expandAll || expandedId === item.id;
              const diffLabel = item.difficulty === 1 ? '🟢 Easy' : (item.difficulty === 3 || item.marks >= 10 ? '🔴 Hard' : '🟡 Medium');

              return (
                <div
                  key={item.id || idx}
                  className="glass-card rounded-2xl border border-gray-200 dark:border-gray-800/80 p-5 transition-all shadow-xs flex flex-col gap-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                        Q{idx + 1}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                        <span>🎯</span>
                        <span>{formatModelConfidenceBadge(item.confidence, item.evidence_score)}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                        [{item.marks || 2} Marks]
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                        {item.type || 'Short Answer'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        {diffLabel}
                      </span>

                      {item.is_ai_generated && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                          🤖 AI Solution
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEnrichWithAI(item)}
                        disabled={enrichingId === item.id}
                        title="Enhance solution with connected Google Gemini or OpenAI"
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {enrichingId === item.id ? (
                          <>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full" />
                            <span>AI Solving...</span>
                          </>
                        ) : (
                          <>
                            <span>🤖</span>
                            <span>Enrich with AI</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => copyToClipboard(`Q: ${item.question}\n\nAnswer: ${item.answer}`, item.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer"
                        title="Copy Question & Answer"
                      >
                        <span>{copiedId === item.id ? '✓ Copied' : '📋'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Title */}
                  <h4 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                    {item.question}
                  </h4>

                  {/* MCQ Options (if present) */}
                  {item.options && item.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {item.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 text-xs text-gray-800 dark:text-gray-200 font-medium"
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer Content Accordion */}
                  <div className="border-t border-gray-100 dark:border-gray-800/60 pt-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 cursor-pointer mb-2"
                    >
                      <span>{isExpanded ? '▲ Hide Full Solution' : '👁️ View Comprehensive Model Answer & Marking Scheme'}</span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col gap-3 text-xs md:text-sm mt-2"
                        >
                          <div>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                              Model Examination Answer:
                            </span>
                            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed font-normal">
                              {item.answer}
                            </div>
                          </div>

                          {item.key_points && item.key_points.length > 0 && (
                            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                                High-Yield Key Points (Parul Marking Scheme):
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                                {item.key_points.map((kp, kIdx) => (
                                  <li key={kIdx}>{kp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
