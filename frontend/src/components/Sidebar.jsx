import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'upload', label: 'Upload', icon: '📎', gradient: 'from-blue-400 to-indigo-500' },
  { id: 'capture', label: 'Screen Capture', icon: '📸', gradient: 'from-purple-400 to-pink-500' },
  { id: 'summary', label: 'Summary & Notes', icon: '📝', gradient: 'from-teal-400 to-green-500' },
  { id: 'questions', label: 'Question Bank', icon: '❓', gradient: 'from-green-400 to-emerald-500' },
  { id: 'predictor', label: 'Exam Predictor', icon: '🎯', gradient: 'from-amber-400 to-orange-500' },
  { id: 'answers', label: 'Answer Bank', icon: '✅', gradient: 'from-cyan-400 to-blue-500' },
  { id: 'adaptive', label: 'Smart Learning', icon: '🧠', gradient: 'from-violet-400 to-purple-500' },
  { id: 'plan', label: 'Study Plan', icon: '📅', gradient: 'from-rose-400 to-red-500' },
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-center">
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
