import React, { useState } from 'react';
import StudentDashboard from './StudentDashboard';
import PlagiarismChecker from './PlagiarismChecker';
import AITextAnalysis from './AITextAnalysis';
import AcademicParaphraser from './AcademicParaphraser';
import GrammarAssistant from './GrammarAssistant';
import AssignmentAssistant from './AssignmentAssistant';
import ResumeBuilder from './ResumeBuilder';
import DiagramBuilder from './DiagramBuilder';
import DatabaseDesigner from './DatabaseDesigner';
import SpreadsheetAssistant from './SpreadsheetAssistant';
import EngineeringToolkit from './EngineeringToolkit';
import DocumentLibrary from './DocumentLibrary';
import ReportsHistory from './ReportsHistory';
import StudentSettings from './StudentSettings';

const NAV_MODULES = [
  { id: 'dashboard', label: 'Academic Hub', icon: '🏠' },
  { id: 'plagiarism', label: 'Plagiarism Checker', icon: '🔍' },
  { id: 'ai_text', label: 'AI Text Analysis', icon: '🤖' },
  { id: 'paraphrase', label: 'Academic Paraphraser', icon: '✍️' },
  { id: 'grammar', label: 'Grammar & Clarity', icon: '📝' },
  { id: 'assignment', label: 'Thesis & Assignment', icon: '📚' },
  { id: 'resume', label: 'ATS Resume Builder', icon: '📄' },
  { id: 'flowchart', label: 'Diagram Studio', icon: '📐' },
  { id: 'database', label: 'Database Designer', icon: '🗄️' },
  { id: 'spreadsheet', label: 'Spreadsheet Hub', icon: '📈' },
  { id: 'engineering', label: 'Engineering Toolkit', icon: '⚙️' },
  { id: 'documents', label: 'Document Library', icon: '📁' },
  { id: 'reports', label: 'Reports & History', icon: '📊' },
  { id: 'settings', label: 'Preferences', icon: '🔧' }
];

export default function StudentToolkitShell({ initialSubTab = 'dashboard', onExit }) {
  const [currentTab, setCurrentTab] = useState(initialSubTab);

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <StudentDashboard onNavigate={setCurrentTab} />;
      case 'plagiarism':
        return <PlagiarismChecker />;
      case 'ai_text':
        return <AITextAnalysis />;
      case 'paraphrase':
        return <AcademicParaphraser />;
      case 'grammar':
        return <GrammarAssistant />;
      case 'assignment':
        return <AssignmentAssistant />;
      case 'resume':
        return <ResumeBuilder />;
      case 'flowchart':
        return <DiagramBuilder />;
      case 'database':
        return <DatabaseDesigner />;
      case 'spreadsheet':
        return <SpreadsheetAssistant />;
      case 'engineering':
        return <EngineeringToolkit />;
      case 'documents':
        return <DocumentLibrary />;
      case 'reports':
        return <ReportsHistory />;
      case 'settings':
        return <StudentSettings />;
      default:
        return <StudentDashboard onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50 dark:bg-[#07090e] text-neutral-900 dark:text-neutral-100">
      {/* Top Bar for Student Academic Toolkit */}
      <div className="h-14 border-b border-neutral-200/80 dark:border-neutral-800 px-6 flex items-center justify-between shrink-0 bg-white/60 dark:bg-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold text-sm">
            🎓
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Student Academic Toolkit</span>
              <span className="px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 text-[10px] font-semibold border border-cyan-500/20">
                Active Suite
              </span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Parul University Student Productivity & Research Platform
            </div>
          </div>
        </div>

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition"
          >
            ← Return to Main Study Assistant
          </button>
        )}
      </div>

      {/* Main Toolkit Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sub-navigation sidebar */}
        <div className="w-64 border-r border-neutral-200/80 dark:border-neutral-800 p-3 space-y-1 overflow-y-auto shrink-0 bg-neutral-100/40 dark:bg-black/20">
          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Academic Modules
          </div>
          {NAV_MODULES.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {renderActiveView()}
          </div>
        </div>
      </div>
    </div>
  );
}
