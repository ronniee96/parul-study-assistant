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
import APIKeyModal from './components/APIKeyModal';
import { motion } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  
  // API Keys state with persistence
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('study_assistant_api_keys');
      return saved ? JSON.parse(saved) : { gemini: '', openai: '', claude: '' };
    } catch {
      return { gemini: '', openai: '', claude: '' };
    }
  });

  const [primaryPriority, setPrimaryPriority] = useState(() => {
    return localStorage.getItem('study_assistant_primary_priority') || 'gemini';
  });

  const handleSaveApiKeys = (keys, priority) => {
    setApiKeys(keys);
    if (priority) setPrimaryPriority(priority);
    localStorage.setItem('study_assistant_api_keys', JSON.stringify(keys));
    if (priority) localStorage.setItem('study_assistant_primary_priority', priority);
  };
  
  // App state with automatic persistence for instant preview
  const [appState, setAppState] = useState(() => {
    try {
      const saved = localStorage.getItem('study_assistant_workspace_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          stats: parsed.stats || { pdfCount: 0, questionCount: 0, confidence: 0, answerCount: 0 }
        };
      }
    } catch (e) {
      console.warn("Failed to restore saved workspace:", e);
    }
    return {
      uploadedFile: null,
      extractedText: '',
      results: null,
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
    };
  });

  const [lastSaved, setLastSaved] = useState(null);

  // Auto-save app state to localStorage whenever it changes (debounced to ensure smooth UI)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stateToSave = {
          uploadedFile: appState.uploadedFile ? {
            name: appState.uploadedFile.name,
            size: appState.uploadedFile.size,
            type: appState.uploadedFile.type
          } : null,
          extractedText: appState.extractedText,
          results: appState.results,
          questions: appState.questions,
          rankedQuestions: appState.rankedQuestions,
          predictedPaper: appState.predictedPaper,
          answers: appState.answers,
          captures: appState.captures,
          stats: appState.stats
        };
        localStorage.setItem('study_assistant_workspace_v2', JSON.stringify(stateToSave));
        if (appState.uploadedFile || appState.extractedText || (appState.questions && appState.questions.length > 0)) {
          setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.warn("Could not auto-save workspace to localStorage:", err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [appState]);

  const handleResetWorkspace = () => {
    if (window.confirm("Are you sure you want to reset your current study session? (Your saved API keys will remain intact)")) {
      const emptyState = {
        uploadedFile: null,
        extractedText: '',
        results: null,
        questions: [],
        rankedQuestions: [],
        predictedPaper: null,
        answers: [],
        captures: [],
        stats: { pdfCount: 0, questionCount: 0, confidence: 0, answerCount: 0 }
      };
      setAppState(emptyState);
      localStorage.removeItem('study_assistant_workspace_v2');
      setActiveTab('upload');
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderTab = () => {
    switch (activeTab) {
      case 'upload': 
        return <UploadTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} />;
      case 'capture': 
        return <ScreenCaptureTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} apiKeys={apiKeys} openApiKeyModal={() => setApiKeyModalOpen(true)} />;
      case 'summary': 
        return <SummaryTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} apiKeys={apiKeys} openApiKeyModal={() => setApiKeyModalOpen(true)} />;
      case 'questions': 
        return <QuestionEngineTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} apiKeys={apiKeys} primaryPriority={primaryPriority} openApiKeyModal={() => setApiKeyModalOpen(true)} />;
      case 'predictor': 
        return <ExamPredictorTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} apiKeys={apiKeys} primaryPriority={primaryPriority} openApiKeyModal={() => setApiKeyModalOpen(true)} />;
      case 'answers': 
        return <AnswerBankTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} apiKeys={apiKeys} openApiKeyModal={() => setApiKeyModalOpen(true)} />;
      case 'adaptive': 
        return <AdaptiveTab appState={appState} setAppState={setAppState} />;
      case 'plan': 
        return <StudyPlanTab appState={appState} setAppState={setAppState} />;
      default: 
        return <UploadTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} />;
    }
  };

  const hasConfiguredKeys = Object.values(apiKeys).some(k => k && k.trim().length > 5);

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
              <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none">Parul Study Assistant</h1>
              <span className="text-[10px] text-blue-100 font-medium tracking-wider uppercase">Exam Predictor & Syllabus AI</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {lastSaved && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] text-white/90 font-medium border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                <span>Saved {lastSaved}</span>
              </span>
            )}

            {appState.uploadedFile && (
              <button
                onClick={handleResetWorkspace}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/25 text-[11px] font-semibold transition-all text-white/90 border border-white/20 cursor-pointer"
                title="Start a new document session (keeps your API keys)"
              >
                🔄 New Session
              </button>
            )}

            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-all flex items-center gap-2 border border-white/30 cursor-pointer shadow-sm"
              title="Configure Google Gemini, ChatGPT, and Claude API Keys with Auto-Switching"
            >
              <span>🔑</span>
              <span className="hidden sm:inline">
                {hasConfiguredKeys ? `AI Engines: Active (${primaryPriority.toUpperCase()})` : 'Connect AI Keys'}
              </span>
              <span className={`w-2 h-2 rounded-full ${hasConfiguredKeys ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`}></span>
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-xs"
              title="Toggle Light / Dark mode"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto h-full"
          >
            {renderTab()}
          </motion.div>
        </main>
        
        <QuickStats stats={appState.stats} />
      </div>

      <APIKeyModal 
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        apiKeys={apiKeys}
        onSaveApiKeys={handleSaveApiKeys}
      />
    </div>
  );
}