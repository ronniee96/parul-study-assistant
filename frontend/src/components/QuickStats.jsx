import React from 'react';
import { formatConfidencePercent } from '../utils/confidenceFormatter';

export default function QuickStats({ stats = {} }) {
  const safeStats = stats || {};
  return (
    <footer className="h-14 bg-white/75 dark:bg-black/75 backdrop-blur-2xl border-t border-black/5 dark:border-white/10 flex items-center justify-around px-6 md:px-10 pr-28 lg:pr-40 text-xs md:text-sm shrink-0 transition-colors duration-300 z-30">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs"></span>
        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{safeStats.pdfCount ?? 0}</span>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">PDFs</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500 shadow-xs"></span>
        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{safeStats.questionCount ?? 0}</span>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">Questions</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"></span>
        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          {formatConfidencePercent(safeStats.confidence)}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">Confidence</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{safeStats.answerCount ?? 0}</span>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">Answers</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-black/5 dark:border-white/10 text-[11px] text-neutral-500 dark:text-neutral-400">
        <span>Created by <strong className="text-[#1d1d1f] dark:text-white font-medium">Rohan Mitra</strong></span>
        <span className="px-2.5 py-0.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 text-[10px] font-medium border border-black/5 dark:border-white/10">
          AI Architect & Lead Coder
        </span>
      </div>
    </footer>
  );
}

