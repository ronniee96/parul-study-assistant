import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import QuickStats from './components/QuickStats';
import UploadTab from './components/UploadTab';
import ScreenCaptureTab from './components/ScreenCaptureTab';
import SummaryTab from './components/SummaryTab';
import QuestionEngineTab from './components/QuestionEngineTab';
import ExamPredictorTab from './components/ExamPredictorTab';
import AnswerBankTab from './components/AnswerBankTab';
import AdaptiveTab from './components/AdaptiveTab';
import StudyPlanTab from './components/StudyPlanTab';
import ResearchHubTab from './components/ResearchHubTab';
import TransparencyAuditTab from './components/TransparencyAuditTab';
import AgentSquadTab from './components/AgentSquadTab';
import SettingsTab from './components/SettingsTab';
import APIKeyModal from './components/APIKeyModal';
import AkiDashboardCompanion from './components/AkiDashboardCompanion';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  // API Keys state with permanent persistence across all sessions
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('study_assistant_permanent_api_keys') || localStorage.getItem('study_assistant_api_keys');
      return saved ? JSON.parse(saved) : { gemini: '', groq: '', deepseek: '', mistral: '', openrouter: '', sambanova: '', together: '', huggingface: '', cohere: '', openai: '', claude: '', perplexity: '' };
    } catch {
      return { gemini: '', groq: '', deepseek: '', mistral: '', openrouter: '', sambanova: '', together: '', huggingface: '', cohere: '', openai: '', claude: '', perplexity: '' };
    }
  });

  const [primaryPriority, setPrimaryPriority] = useState(() => {
    return localStorage.getItem('study_assistant_primary_priority') || 'gemini';
  });

  const handleSaveApiKeys = (keys, priority) => {
    setApiKeys(keys);
    if (priority) setPrimaryPriority(priority);
    localStorage.setItem('study_assistant_permanent_api_keys', JSON.stringify(keys));
    localStorage.setItem('study_assistant_api_keys', JSON.stringify(keys));
    if (priority) localStorage.setItem('study_assistant_primary_priority', priority);
  };

  // App state initializes clean (0 PDFs, 0 Questions, 0 Answers)
  const [appState, setAppState] = useState(() => ({
    uploadedFile: null,
    uploadedFiles: [],
    extractedText: '',
    results: null,
    summaryData: null,
    questions: [],
    rankedQuestions: [],
    predictedPaper: null,
    answers: [],
    captures: [],
    stats: {
      pdfCount: 0,
      questionCount: 0,
      confidence: 0,
      answerCount: 0
    }
  }));

  const [lastSaved, setLastSaved] = useState(null);

  const handleResetWorkspace = (showPrompt = false) => {
    if (!showPrompt || window.confirm("Start a fresh study session? This will clear all uploaded PDFs, questions, and notes. (Your API keys will remain saved)")) {
      const emptyState = {
        uploadedFile: null,
        uploadedFiles: [],
        extractedText: '',
        results: null,
        summaryData: null,
        questions: [],
        rankedQuestions: [],
        predictedPaper: null,
        answers: [],
        captures: [],
        stats: { pdfCount: 0, questionCount: 0, confidence: 0, answerCount: 0 }
      };
      setAppState(emptyState);

      // Purge all possible workspace cache keys
      try {
        localStorage.removeItem('study_assistant_workspace_v2');
        localStorage.removeItem('study_workspace_questions');
        localStorage.removeItem('study_workspace_summary');
        localStorage.removeItem('study_assistant_sr_stats');
        localStorage.removeItem('study_assistant_card_progress');
        localStorage.removeItem('parul_gemini_active_model');
        sessionStorage.clear();
      } catch (e) {
        console.warn("Error clearing storage:", e);
      }

      setSessionKey(prev => prev + 1);
      setActiveTab('upload');
      setLastSaved(null);
      setToastMessage("✨ Fresh session started! All previous data cleared. Upload new PDF(s) to begin.");
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);

  const handleRefreshAgents = () => {
    setIsRefreshingAgents(true);

    // Purge transient prompt caches & reasoning noise while keeping document corpus and API keys intact
    try {
      sessionStorage.removeItem('study_assistant_transient_prompt_cache');
      sessionStorage.removeItem('study_assistant_reasoning_temp');
    } catch (e) {
      console.warn("Error refreshing cognitive cache:", e);
    }

    setTimeout(() => {
      setIsRefreshingAgents(false);
      setToastMessage("⚡ Agent Squad & Cognitive Engine Refreshed! All 6 AI models recalibrated for maximum analytical depth.");
      setTimeout(() => setToastMessage(null), 4500);
    }, 450);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderTab = () => {
    const tabProps = {
      appState,
      setAppState,
      setActiveTab,
      apiKeys,
      primaryPriority,
      openApiKeyModal: () => setApiKeyModalOpen(true),
      sessionKey,
      startNewSession: () => handleResetWorkspace(false)
    };

    switch (activeTab) {
      case 'upload':
        return <UploadTab {...tabProps} />;
      case 'squad':
        return <AgentSquadTab {...tabProps} />;
      case 'capture':
        return <ScreenCaptureTab {...tabProps} />;
      case 'summary':
        return <SummaryTab {...tabProps} />;
      case 'research':
        return <ResearchHubTab {...tabProps} />;
      case 'questions':
        return <QuestionEngineTab {...tabProps} />;
      case 'predictor':
        return <ExamPredictorTab {...tabProps} />;
      case 'answers':
        return <AnswerBankTab {...tabProps} />;
      case 'adaptive':
        return <AdaptiveTab {...tabProps} />;
      case 'transparency':
        return <TransparencyAuditTab {...tabProps} />;
      case 'plan':
        return <StudyPlanTab {...tabProps} />;
      case 'settings':
        return <SettingsTab {...tabProps} handleSaveApiKeys={handleSaveApiKeys} />;
      case 'privacy':
        return <PrivacyPolicy onBack={() => setActiveTab('upload')} />;
      case 'terms':
        return <TermsAndConditions onBack={() => setActiveTab('upload')} />;
      default:
        return <UploadTab {...tabProps} />;
    }
  };

  const hasConfiguredKeys = Object.values(apiKeys).some(k => k && k.trim().length > 5);
  const hasActiveSession = Boolean(appState.uploadedFile || (appState.uploadedFiles && appState.uploadedFiles.length > 0) || appState.extractedText);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900 text-white shadow-xs border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-bold text-xs text-white">
              PU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold tracking-tight leading-none text-white">Parul Study Assistant</h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700 hidden sm:inline-block">
                  Academic Portal
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Exam Intelligence & Syllabus Analysis</span>
                <span className="text-[10px] text-slate-500">• NAAC Grade A++ Standard</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
            {lastSaved && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-[11px] text-slate-300 font-medium border border-slate-700 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Saved {lastSaved}</span>
              </span>
            )}

            <button
              onClick={handleRefreshAgents}
              disabled={isRefreshingAgents}
              className={`p-2 rounded-lg transition-colors cursor-pointer text-xs shrink-0 ${
                isRefreshingAgents ? 'bg-slate-800 text-slate-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Verify Backend & AI Engine Connectivity"
            >
              <svg className={`w-4 h-4 ${isRefreshingAgents ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>

            {hasActiveSession && (
              <button
                onClick={() => handleResetWorkspace(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                title="Purge current session data and start fresh"
              >
                Reset Session
              </button>
            )}

            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              title="Configure AI API Providers"
            >
              <span className="hidden sm:inline">
                {hasConfiguredKeys ? `AI Engines: (${primaryPriority.toUpperCase()})` : 'AI Providers'}
              </span>
              <span className={`w-2 h-2 rounded-full ${hasConfiguredKeys ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-lg transition-colors cursor-pointer text-xs shrink-0 ${
                activeTab === 'settings' ? 'bg-primary-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Settings & Storage"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer text-xs shrink-0 whitespace-nowrap"
              title="Toggle Light / Dark mode"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </header>

        {/* Floating Toast Message */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-600 text-white text-xs md:text-sm font-semibold py-2 px-4 shadow-lg text-center flex items-center justify-center gap-2 z-50"
            >
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={`${activeTab}-${sessionKey}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto h-full"
          >
            {renderTab()}
          </motion.div>
        </main>

        <QuickStats stats={appState.stats} />
      </div>

      {/* Aki Anime Study Companion & Antigravity Assistant (Transparent Screen Dashboard) */}
      <AkiDashboardCompanion
        appState={appState}
        setActiveTab={setActiveTab}
        apiKeys={apiKeys}
      />

      <APIKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        apiKeys={apiKeys}
        onSaveApiKeys={handleSaveApiKeys}
      />
    </div>
  );
}
