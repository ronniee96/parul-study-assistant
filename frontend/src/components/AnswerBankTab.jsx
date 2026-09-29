import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createAnswerGuidePDF } from '../utils/pdfGenerator';
import { apiFetch } from '../utils/apiClient';

const MASTER_CATEGORIES = [
  { id: 'all', label: '🌟 All High-Yield', icon: '🌟' },
  { id: '1-2m', label: '⚡ 1-2M Definitions', icon: '⚡' },
  { id: '2-5m', label: '📝 2-5M Concepts', icon: '📝' },
  { id: '5m', label: '📋 5-Mark Answers', icon: '📋' },
  { id: '10m', label: '🏛️ 10-Mark Detailed + Diagrams', icon: '🏛️' },
  { id: 'diagrams', label: '🖼️ Important Diagrams', icon: '🖼️' },
  { id: 'flowcharts', label: '🔀 Process Flowcharts', icon: '🔀' },
  { id: 'mindmaps', label: '🧠 Mind Maps & Hierarchy', icon: '🧠' },
  { id: 'lastday', label: '⏱️ Last-Day Revision (30m)', icon: '⏱️' },
  { id: 'mistakes', label: '⚠️ Mistakes & Examiner Secrets', icon: '⚠️' },
  { id: 'mcqs', label: '🎯 University MCQs', icon: '🎯' }
];

export default function AnswerBankTab({ appState, setAppState, setActiveTab, apiKeys, openApiKeyModal, sessionKey }) {
  const [expandedId, setExpandedId] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const hasDocuments = Boolean(
    (appState.extractedText && appState.extractedText.trim().length > 20) ||
    appState.uploadedFile ||
    (appState.uploadedFiles && appState.uploadedFiles.length > 0)
  );

  // Answer material is available only after the question or answer service creates it.
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
    return [];
  }, [appState.questions, appState.rankedQuestions, appState.answers, hasDocuments]);

  // Filter by Master Blueprint Category and Search Query
  const filteredAnswers = useMemo(() => {
    let pool = allMasterAnswers;

    if (selectedCategory !== 'all') {
      if (selectedCategory === '1-2m') {
        pool = pool.filter(a => a.category === "1-2 Mark Definitions" || a.type?.includes("1-2M"));
      } else if (selectedCategory === '2-5m') {
        pool = pool.filter(a => a.category === "2-5 Mark Definitions" || a.type?.includes("2-5M"));
      } else if (selectedCategory === '5m') {
        pool = pool.filter(a => a.category === "5-Mark Answers" || (a.marks === 5 && !a.type?.includes("Diagram")));
      } else if (selectedCategory === '10m') {
        pool = pool.filter(a => a.category === "10-Mark Answers" || a.marks >= 10);
      } else if (selectedCategory === 'diagrams') {
        pool = pool.filter(a => a.category === "Important Diagrams" || a.type?.includes("Diagram") || a.answer?.includes("[DRAW"));
      } else if (selectedCategory === 'flowcharts') {
        pool = pool.filter(a => a.category === "Process Flowcharts" || a.type?.includes("Flowchart"));
      } else if (selectedCategory === 'mindmaps') {
        pool = pool.filter(a => a.category === "Mind Maps & Hierarchy" || a.type?.includes("Mind Map"));
      } else if (selectedCategory === 'lastday') {
        pool = pool.filter(a => a.category === "Last-Day Revision Notes" || a.type?.includes("Last-Day"));
      } else if (selectedCategory === 'mistakes') {
        pool = pool.filter(a => a.category === "Common Mistakes & Tips" || a.type?.includes("Mistakes"));
      } else if (selectedCategory === 'mcqs') {
        pool = pool.filter(a => a.category === "Exam MCQs" || a.type?.includes("MCQ") || a.options?.length > 0);
      }
    }

    if (!searchQuery.trim()) {
      return selectedCategory === 'all' ? pool.slice(0, 30) : pool.slice(0, 25);
    }

    const query = searchQuery.toLowerCase();
    return pool.filter(a => 
      a.question?.toLowerCase().includes(query) ||
      a.answer?.toLowerCase().includes(query) ||
      a.topic?.toLowerCase().includes(query)
    );
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
      if (data.answers && data.answers.length > 0) {
        setAppState(prev => ({
          ...prev,
          answers: data.answers,
          stats: { ...prev.stats, answerCount: data.answers.length }
        }));
      }
    } catch (e) {
      console.warn("Using high-yield master generator:", e);
    } finally {
      setGenerating(false);
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
            <span>🎓</span> Answer Bank ({filteredAnswers.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Questions and answers from your generated study set, grouped by type and marks.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
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
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
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

          {/* Answer Cards */}
          <div className="flex flex-col gap-3">
            {filteredAnswers.map((item, index) => {
              const isExpanded = expandedId === (item.id || index + 1);
              const isDiagram = item.category === "Important Diagrams" || item.type?.includes("Diagram") || item.answer?.includes("[DRAW");
              
              return (
                <div
                  key={item.id || index}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                    isExpanded 
                      ? 'border-primary-400 dark:border-primary-600 shadow-md ring-1 ring-primary-400/20' 
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : (item.id || index + 1))}
                    className="w-full p-4 md:p-5 text-left flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-black rounded-xl text-xs shrink-0 mt-0.5">
                        #{index + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-100">
                          {item.question}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[11px] px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-bold">
                            📂 {item.topic || 'Core Subject'}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-md font-bold">
                            {item.type || 'Model Solution'}
                          </span>
                          {Number.isFinite(item.evidence_score) && (
                            <span className="text-[11px] px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-md font-bold">
                              Evidence score {Math.round(item.evidence_score * 100)}%
                            </span>
                          )}
                          {item.marks && (
                            <span className="text-[11px] px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-md font-bold">
                              🏅 {item.marks} Marks
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`text-gray-400 transform transition-transform duration-200 text-sm shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 md:px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col gap-4"
                      >
                        {/* Options if MCQ */}
                        {item.options && item.options.length > 0 && (
                          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40">
                            <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block mb-2">
                              Options:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {item.options.map((opt, oIdx) => (
                                <div key={oIdx} className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/20 text-gray-800 dark:text-gray-200 font-medium">
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Model Solution Box */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-950/80 rounded-xl border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                              <span>✍️</span> Study answer from generated question data
                            </span>
                            <button
                              onClick={() => copyToClipboard(item.answer, item.id || index)}
                              className="text-xs text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 font-bold cursor-pointer flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 shadow-2xs"
                            >
                              <span>{copiedId === (item.id || index) ? '✓ Copied!' : '📋 Copy Solution'}</span>
                            </button>
                          </div>
                          
                          {/* If diagram present, render in monospaced format */}
                          <div className={`text-xs md:text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed ${isDiagram ? 'font-mono bg-white dark:bg-black/40 p-3 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto' : 'font-sans'}`}>
                            {item.answer}
                          </div>
                        </div>

                        {/* Key Examination Points Checklist */}
                        {item.key_points && item.key_points.length > 0 && (
                          <div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                              📌 Examiner Evaluation Rubric:
                            </span>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                              {item.key_points.map((kp, kIdx) => (
                                <li key={kIdx} className="flex items-start gap-2 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-gray-800 dark:text-gray-200">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                                  <span>{kp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
