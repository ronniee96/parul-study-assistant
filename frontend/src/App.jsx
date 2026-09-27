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
import { motion } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // App state
  const [appState, setAppState] = useState({
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
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const renderTab = () => {
    switch (activeTab) {
      case 'upload': return <UploadTab appState={appState} setAppState={setAppState} />;
      case 'capture': return <ScreenCaptureTab appState={appState} setAppState={setAppState} />;
      case 'summary': return <SummaryTab appState={appState} setAppState={setAppState} />;
      case 'questions': return <QuestionEngineTab appState={appState} setAppState={setAppState} />;
      case 'predictor': return <ExamPredictorTab appState={appState} setAppState={setAppState} setActiveTab={setActiveTab} />;
      case 'answers': return <AnswerBankTab appState={appState} setAppState={setAppState} />;
      case 'adaptive': return <AdaptiveTab appState={appState} setAppState={setAppState} />;
      case 'plan': return <StudyPlanTab appState={appState} setAppState={setAppState} />;
      default: return <UploadTab appState={appState} setAppState={setAppState} />;
    }
  };

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
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Parul Study Assistant</h1>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
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
    </div>
  );
}