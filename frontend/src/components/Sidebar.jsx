import React from 'react';
import { motion } from 'framer-motion';

const SVG_ICONS = {
  upload: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  squad: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  capture: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  summary: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  research: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  questions: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  predictor: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  answers: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  adaptive: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  transparency: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plan: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  admin: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

const TABS = [
  { id: 'upload', label: 'Upload Materials', iconKey: 'upload' },
  { id: 'squad', label: 'Verification Council', iconKey: 'squad' },
  { id: 'capture', label: 'Screen Capture', iconKey: 'capture' },
  { id: 'summary', label: 'Summary & Notes', iconKey: 'summary' },
  { id: 'research', label: 'Academic Repository', iconKey: 'research' },
  { id: 'questions', label: 'Question Bank', iconKey: 'questions' },
  { id: 'predictor', label: 'Exam Predictor', iconKey: 'predictor' },
  { id: 'answers', label: 'Model Answers', iconKey: 'answers' },
  { id: 'adaptive', label: 'Adaptive Recall', iconKey: 'adaptive' },
  { id: 'transparency', label: 'Algorithm Transparency', iconKey: 'transparency' },
  { id: 'plan', label: 'Revision Schedule', iconKey: 'plan' },
  { id: 'settings', label: 'Settings & Storage', iconKey: 'settings' },
  { id: 'admin_operations', label: 'Operations Console', iconKey: 'admin' },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  return (
    <motion.div
      animate={{ width: collapsed ? 76 : 250 }}
      className="hidden md:flex flex-col bg-white/60 dark:bg-black/40 backdrop-blur-2xl border-r border-black/5 dark:border-white/10 shadow-xs transition-colors duration-300 z-10"
    >
      <div className="flex-1 py-5 flex flex-col gap-1 overflow-y-auto px-2.5">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative group cursor-pointer active:scale-[0.98]
                ${isActive
                  ? 'bg-black/5 dark:bg-white/10 text-[#0071e3] dark:text-[#388bfd] font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'}`}
              title={collapsed ? tab.label : ''}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#0071e3]"
                />
              )}
              <div className={`flex items-center justify-center w-7 h-7 rounded-[8px] shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#0071e3] text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 group-hover:bg-black/10 dark:group-hover:bg-white/10 group-hover:text-neutral-800 dark:group-hover:text-neutral-200'
              }`}>
                {SVG_ICONS[tab.iconKey]}
              </div>
              {!collapsed && (
                <span className="text-xs whitespace-nowrap">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Institutional Legal & Academic Footer */}
      {!collapsed ? (
        <div className="p-3 mx-2.5 mb-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-xl text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] text-[11px]">Parul University</span>
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mb-2">
            Academic Question & Blueprint Engine
          </p>
          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-black/5 dark:border-white/10">
            <button
              onClick={() => setActiveTab('privacy')}
              className="text-neutral-500 hover:text-[#0071e3] dark:text-neutral-400 dark:hover:text-[#388bfd] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              onClick={() => setActiveTab('terms')}
              className="text-neutral-500 hover:text-[#0071e3] dark:text-neutral-400 dark:hover:text-[#388bfd] transition-colors cursor-pointer"
            >
              Terms
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setActiveTab('privacy')}
            title="Privacy Policy & Terms"
            className="w-7 h-7 rounded-[8px] bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] font-semibold text-neutral-500 cursor-pointer"
          >
            PU
          </button>
        </div>
      )}

      {/* Sidebar Collapse Toggle */}
      <div className="p-2 border-t border-black/5 dark:border-white/10 flex justify-center">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 transition-colors flex items-center justify-center cursor-pointer text-xs"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
    </motion.div>
  );
}
