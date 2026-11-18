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
import {
  IconAcademicCap,
  IconSearch,
  IconBot,
  IconPen,
  IconGrammar,
  IconBookOpen,
  IconFileText,
  IconDiagram,
  IconDatabase,
  IconSpreadsheet,
  IconCpu,
  IconFolder,
  IconBarChart,
  IconSliders
} from './StudentIcons';

const NAV_MODULES = [
  { id: 'dashboard', label: 'Academic Hub', Icon: IconAcademicCap },
  { id: 'plagiarism', label: 'Plagiarism Checker', Icon: IconSearch },
  { id: 'ai_text', label: 'AI Text Analysis', Icon: IconBot },
  { id: 'paraphrase', label: 'Academic Paraphraser', Icon: IconPen },
  { id: 'grammar', label: 'Grammar & Clarity', Icon: IconGrammar },
  { id: 'assignment', label: 'Thesis & Assignment', Icon: IconBookOpen },
  { id: 'resume', label: 'ATS Resume Builder', Icon: IconFileText },
  { id: 'flowchart', label: 'Diagram Studio', Icon: IconDiagram },
  { id: 'database', label: 'Database Designer', Icon: IconDatabase },
  { id: 'spreadsheet', label: 'Spreadsheet Hub', Icon: IconSpreadsheet },
  { id: 'engineering', label: 'Engineering Toolkit', Icon: IconCpu },
  { id: 'documents', label: 'Document Library', Icon: IconFolder },
  { id: 'reports', label: 'Reports & History', Icon: IconBarChart },
  { id: 'settings', label: 'Preferences', Icon: IconSliders }
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7]">
      {/* Apple Liquid Frosted Glass Top Bar */}
      <div className="h-14 border-b border-black/[0.06] dark:border-white/[0.08] px-6 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#161617]/80 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3] dark:text-[#388bfd]">
            <IconAcademicCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
              <span>Student Academic Toolkit</span>
              <span className="px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] text-[10px] font-medium border border-[#0071e3]/20">
                Active Suite
              </span>
            </div>
            <div className="text-[11px] text-[#86868b] dark:text-[#98989d]">
              Parul University Student Productivity & Research Platform
            </div>
          </div>
        </div>

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/60 dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-medium transition shadow-2xs"
          >
            ← Return to Main Study Assistant
          </button>
        )}
      </div>

      {/* Main Toolkit Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Apple macOS-Style Sidebar Navigation */}
        <div className="w-64 border-r border-black/[0.06] dark:border-white/[0.08] p-3 space-y-1 overflow-y-auto shrink-0 bg-white/50 dark:bg-[#121214]/50 backdrop-blur-xl">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
            Academic Modules
          </div>
          {NAV_MODULES.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                    : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <item.Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#86868b] dark:text-[#98989d]'}`} />
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
