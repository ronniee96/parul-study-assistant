import React from 'react';

export default function QuickStats({ stats }) {
  return (
    <div className="h-14 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-4 md:px-8 text-sm md:text-base shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors duration-300">
      <div className="flex items-center gap-2">
        <span className="text-xl">📄</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.pdfCount}</span>
        <span className="hidden md:inline text-gray-500 dark:text-gray-400">PDFs</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl">❓</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.questionCount}</span>
        <span className="hidden md:inline text-gray-500 dark:text-gray-400">Questions</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl">🎯</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.confidence}%</span>
        <span className="hidden md:inline text-gray-500 dark:text-gray-400">Confidence</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl">✅</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.answerCount}</span>
        <span className="hidden md:inline text-gray-500 dark:text-gray-400">Answers</span>
      </div>
    </div>
  );
}
