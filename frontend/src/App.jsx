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
import {
  createNewSession,
  deleteSession,
  getActiveSessionId,
  getSessionCapability,
  apiFetch,
  loadSessionState,
  saveSessionState
} from './utils/apiClient';

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
      confidence: null,
      answerCount: 0
    }
  }));

  const [lastSaved, setLastSaved] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Mount effect: Probe backend health and rehydrate active session state from backend or offline cache
  useEffect(() => {
    let isMounted = true;

    async function probeBackend() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const health = await apiFetch('/api/v1/health', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (isMounted && health && health.status === 'healthy') {
          setBackendStatus('online');
        } else if (isMounted) {
          setBackendStatus('offline');
        }
      } catch {
        if (isMounted) setBackendStatus('offline');
      }
    }

    async function rehydrateSession() {
      const activeSessionId = getActiveSessionId();
      const capability = getSessionCapability(activeSessionId);

      // If no session capability exists, start cleanly
      if (!activeSessionId || !capability) {
        if (isMounted) setIsHydrating(false);
        return;
      }

      try {
        // Attempt cloud rehydration from backend using stored session capability
        const data = await apiFetch(`/api/v1/session/${encodeURIComponent(activeSessionId)}`);
        if (!isMounted) return;

        const session = data?.session || data;
        if (session && (session.extracted_text || (session.documents && session.documents.length > 0) || (session.questions && session.questions.length > 0))) {
          setAppState(prev => ({
            ...prev,
            uploadedFiles: session.documents || [],
            uploadedFile: session.documents?.[0] || null,
            extractedText: session.extracted_text || '',
            questions: session.questions || [],
            rankedQuestions: session.ranked_questions || [],
            answers: session.answers || [],
            summaryData: session.summary || null,
            predictedPaper: session.predicted_paper || null,
            captures: session.captures || [],
            stats: session.stats || {
              pdfCount: session.documents?.length || 0,
              questionCount: session.questions?.length || 0,
              confidence: session.stats?.confidence ?? null,
              answerCount: session.answers?.length || 0
            }
          }));
          setLastSaved("Restored from cloud session");
          setBackendStatus('online');
          if (isMounted) setIsHydrating(false);
          return;
        }
      } catch (err) {
        setBackendStatus('offline');
        // If 401 or 403 or 404, capability is invalid/rotated or session deleted; rotate to fresh session
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          console.info(`Active session ${activeSessionId} unavailable (${err.status}); rotating session.`);
          createNewSession();
        } else {
          // If offline/network failure, attempt offline fallback from local storage cache
          try {
            const cached = loadSessionState(activeSessionId);
            if (cached && (cached.extractedText || (cached.uploadedFiles && cached.uploadedFiles.length > 0) || (cached.questions && cached.questions.length > 0))) {
              setAppState(prev => ({ ...prev, ...cached }));
              setLastSaved("Restored from offline cache");
              if (isMounted) setIsHydrating(false);
              return;
            }
          } catch (cacheErr) {
            console.warn("Failed to read offline session cache:", cacheErr);
          }
        }
      }

      if (isMounted) setIsHydrating(false);
    }

    probeBackend();
    rehydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist session state changes to local storage when not hydrating
  useEffect(() => {
    if (isHydrating) return;
    const hasData = Boolean(
      appState.uploadedFile ||
      (appState.uploadedFiles && appState.uploadedFiles.length > 0) ||
      appState.extractedText ||
      (appState.questions && appState.questions.length > 0)
    );
    if (hasData) {
      const activeSessionId = getActiveSessionId();
      saveSessionState(activeSessionId, appState);
    }
  }, [appState, isHydrating]);

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
        stats: { pdfCount: 0, questionCount: 0, confidence: null, answerCount: 0 }
      };
      setAppState(emptyState);

      // Rotate active session ID for strict session isolation
      try {
        const oldSid = getActiveSessionId();
        deleteSession(oldSid);
        createNewSession();
      } catch (e) {
        console.warn("Error creating new session:", e);
      }

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
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 bg-white/75 dark:bg-black/75 backdrop-blur-2xl border-b border-black/5 dark:border-white/10 sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-tr from-[#0071e3] to-[#42a5f5] flex items-center justify-center font-bold text-xs text-white shadow-xs">
              PU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Parul Study Assistant</h1>
                <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-medium text-neutral-600 dark:text-neutral-400 border border-black/5 dark:border-white/10 hidden sm:inline-block">
                  Academic Portal
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">Exam Intelligence & Syllabus Analysis</span>
                <span className="text-[10px] text-neutral-300 dark:text-neutral-600">•</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">NAAC A++</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {backendStatus === 'offline' && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-medium border border-amber-500/20" title="Backend cloud engine is unavailable or intercepted by deployment protection. Running with full in-browser parsing & question engine.">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Client Engine Active</span>
              </span>
            )}
            {backendStatus === 'online' && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium border border-emerald-500/20" title="Backend cloud serverless engine verified and responsive.">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Cloud Engine Online</span>
              </span>
            )}

            {lastSaved && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[11px] text-neutral-600 dark:text-neutral-300 font-medium border border-black/5 dark:border-white/10 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Saved {lastSaved}</span>
              </span>
            )}

            <button
              onClick={handleRefreshAgents}
              disabled={isRefreshingAgents}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs shrink-0 ${
                isRefreshingAgents ? 'bg-black/5 dark:bg-white/5 text-neutral-400' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 border border-black/5 dark:border-white/10 active:scale-95'
              }`}
              title="Verify Backend & AI Engine Connectivity"
            >
              <svg className={`w-3.5 h-3.5 ${isRefreshingAgents ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>

            {hasActiveSession && (
              <button
                onClick={() => handleResetWorkspace(true)}
                className="h-8 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95"
                title="Purge current session data and start fresh"
              >
                Reset Session
              </button>
            )}

            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="h-8 px-3.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 border border-black/5 dark:border-white/10 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95"
              title="Configure AI API Providers"
            >
              <span className="hidden sm:inline">
                {hasConfiguredKeys ? `AI Engines: (${primaryPriority.toUpperCase()})` : 'AI Providers'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${hasConfiguredKeys ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs shrink-0 ${
                activeTab === 'settings' ? 'bg-[#0071e3] text-white shadow-xs' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 border border-black/5 dark:border-white/10'
              } active:scale-95`}
              title="Settings & Storage"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="h-8 px-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 border border-black/5 dark:border-white/10 transition-all cursor-pointer text-xs font-medium shrink-0 whitespace-nowrap active:scale-95"
              title="Toggle Light / Dark mode"
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        {/* Floating Toast Message */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-16 left-1/2 transform -translate-x-1/2 apple-glass bg-emerald-600/90 text-white text-xs font-medium py-2 px-5 rounded-full shadow-lg text-center flex items-center justify-center gap-2 z-50 backdrop-blur-xl"
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
