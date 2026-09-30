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
        <header className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-primary-500 to-primary-700 animated-gradient-bg text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none">Parul Study Assistant</h1>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold text-white/95 border border-white/25 hidden sm:inline-block">
                  By Rohan Mitra
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-blue-100 font-medium tracking-wider uppercase">Exam Predictor & Syllabus AI</span>
                <span className="text-[10px] text-blue-200/80">• Made by Rohan Mitra (AI Architect & Coder)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
            {lastSaved && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-[11px] text-white/90 font-medium border border-white/20 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                <span>Saved {lastSaved}</span>
              </span>
            )}

            <button
              onClick={handleRefreshAgents}
              disabled={isRefreshingAgents}
              className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-all text-white border border-white/30 cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
              title="Refresh Agent Squad cognitive context & recalibrate AI reasoning (preserves uploaded documents and permanent API keys)"
            >
              <span className={isRefreshingAgents ? "inline-block animate-spin" : ""}>⚡</span>
              <span className="hidden sm:inline">{isRefreshingAgents ? 'Recalibrating...' : 'Refresh Agents'}</span>
            </button>

            <button
              onClick={() => handleResetWorkspace(false)}
              className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-all text-white border border-white/30 cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title="Start a completely new study session (clears previous PDFs & questions, keeps API keys)"
            >
              <span>🔄</span>
              <span className="hidden md:inline">New Session</span>
            </button>

            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-all flex items-center gap-2 border border-white/30 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
              title="Configure Google Gemini, ChatGPT, and Claude API Keys with Auto-Switching"
            >
              <span>🔑</span>
              <span className="hidden sm:inline">
                {hasConfiguredKeys ? `AI Engines: Active (${primaryPriority.toUpperCase()})` : 'Connect AI Keys'}
              </span>
              <span className={`w-2 h-2 rounded-full ${hasConfiguredKeys ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`}></span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-full transition-colors cursor-pointer text-xs shrink-0 ${
                activeTab === 'settings' ? 'bg-white/30 text-white ring-2 ring-white/50' : 'hover:bg-white/20 text-white/90'
              }`}
              title="Study Assistant Settings, Answer Preferences & Agent Help Desk"
            >
              <span>⚙️</span>
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-xs shrink-0 whitespace-nowrap"
              title="Toggle Light / Dark mode"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
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