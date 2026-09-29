import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'upload', label: 'Upload', icon: '📎', gradient: 'from-blue-400 to-indigo-500' },
  { id: 'squad', label: 'AI Agent Squad', icon: '🤖', gradient: 'from-fuchsia-500 to-indigo-600' },
  { id: 'capture', label: 'Screen Capture', icon: '📸', gradient: 'from-purple-400 to-pink-500' },
  { id: 'summary', label: 'Summary & Notes', icon: '📝', gradient: 'from-teal-400 to-green-500' },
  { id: 'research', label: 'Academic Hub', icon: '🌐', gradient: 'from-sky-400 to-blue-600' },
  { id: 'questions', label: 'Question Bank', icon: '❓', gradient: 'from-green-400 to-emerald-500' },
  { id: 'predictor', label: 'Exam Predictor', icon: '🎯', gradient: 'from-amber-400 to-orange-500' },
  { id: 'answers', label: 'Answer Bank', icon: '✅', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'adaptive', label: 'Smart Learning', icon: '🧠', gradient: 'from-violet-400 to-purple-500' },
  { id: 'transparency', label: 'AI Process & Audit', icon: '🔍', gradient: 'from-emerald-400 to-teal-600' },
  { id: 'plan', label: 'Study Plan', icon: '📅', gradient: 'from-rose-400 to-red-500' },
  { id: 'settings', label: 'Settings & Help', icon: '⚙️', gradient: 'from-slate-500 to-zinc-700' },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  return (
    <motion.div 
      animate={{ width: collapsed ? 80 : 260 }}
      className="hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300 z-10"
    >
      <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto px-3">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative group
                ${isActive ? 'bg-gray-50 dark:bg-gray-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              title={collapsed ? tab.label : ''}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className={`absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b ${tab.gradient}`} 
                />
              )}
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${tab.gradient} text-white shadow-sm shrink-0`}>
                <span className="text-xl">{tab.icon}</span>
              </div>
              {!collapsed && (
                <span className={`font-medium text-sm whitespace-nowrap transition-colors ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Maker / Coder Credit */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-gradient-to-br from-primary-50 to-indigo-50/50 dark:from-gray-800/80 dark:to-gray-800/40 border border-primary-200/60 dark:border-gray-700/60 transition-all">
        {!collapsed ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                RM
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block leading-tight">
                  Rohan Mitra
                </span>
                <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium block leading-none">
                  Maker & Lead AI Coder
                </span>
              </div>
            </div>
            <div className="mt-1 pt-1 border-t border-primary-200/40 dark:border-gray-700/40 flex items-center justify-between text-[9px] text-gray-500 dark:text-gray-400">
              <span>AI Agents Architect</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Maker: Rohan Mitra (AI Architect & Coder)">
            <span className="text-lg">👨‍💻</span>
          </div>
        )}
      </div>

      {/* Aki Issue & Help Assistant Widget */}
      <div 
        onClick={() => {
          setActiveTab('settings');
          setTimeout(() => {
            const el = document.getElementById('student-feedback-form');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
              el.classList.add('ring-4', 'ring-pink-500', 'transition-all');
              setTimeout(() => el.classList.remove('ring-4', 'ring-pink-500'), 3000);
            }
          }, 250);
        }}
        className={`mx-3 mb-2 rounded-xl transition-all cursor-pointer group ${
          !collapsed 
            ? 'p-2.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-300/60 dark:border-pink-800 flex items-center gap-2'
            : 'p-1.5 flex justify-center hover:scale-110'
        }`}
        title="Facing an issue or need help? Aki will redirect you to Rohan's feedback form!"
      >
        <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0 overflow-hidden border border-pink-300">
          <img src="/aki.png" alt="Aki" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-pink-700 dark:text-pink-300">Aki Assistant</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-200/70 dark:bg-pink-900 text-pink-800 dark:text-pink-200 font-extrabold">Help</span>
            </div>
            <span className="text-[10px] text-gray-600 dark:text-gray-400 block truncate group-hover:text-pink-600 dark:group-hover:text-pink-300 font-medium">
              🚨 Facing an Issue? Tell Rohan →
            </span>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-center">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
    </motion.div>
  );
}
