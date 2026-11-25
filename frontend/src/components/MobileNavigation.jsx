import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ClutchLogoInteractive from './ClutchLogoInteractive';
import { formatConfidencePercent } from '../utils/confidenceFormatter';

const PRIMARY_BOTTOM_TABS = [
  {
    id: 'upload',
    label: 'Upload',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    )
  },
  {
    id: 'questions',
    label: 'Questions',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  },
  {
    id: 'predictor',
    label: 'Predictor',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    )
  },
  {
    id: 'student_toolkit',
    label: 'Academic Hub',
    badge: '15 Tools',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    )
  }
];

const ALL_MODULES = [
  { id: 'upload', label: 'Upload Materials', category: 'Study Workspace' },
  { id: 'summary', label: 'Summary & Notes', category: 'Study Workspace' },
  { id: 'questions', label: 'Question Bank', category: 'Exam Prep' },
  { id: 'predictor', label: 'Exam Predictor', category: 'Exam Prep' },
  { id: 'answers', label: 'Model Answers', category: 'Exam Prep' },
  { id: 'adaptive', label: 'Adaptive Recall', category: 'Exam Prep' },
  { id: 'research', label: 'Academic Repository', category: 'Research' },
  { id: 'squad', label: 'Verification Council', category: 'Research' },
  { id: 'capture', label: 'Screen Capture', category: 'Research' },
  { id: 'transparency', label: 'Algorithm Transparency', category: 'Auditing' },
  { id: 'plan', label: 'Revision Schedule', category: 'Auditing' },
  { id: 'settings', label: 'Settings & Storage', category: 'Platform' },
  { id: 'admin_operations', label: 'Operations Console', category: 'Platform' },
];

export function MobileBottomBar({ activeTab, setActiveTab, onOpenMenu }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.1] px-2 py-1.5 flex items-center justify-around shadow-lg safe-area-pb">
      {PRIMARY_BOTTOM_TABS.map((tab) => {
        const isActive =
          activeTab === tab.id ||
          (tab.id === 'student_toolkit' && activeTab.startsWith('student_'));

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-w-[58px] ${
              isActive
                ? 'text-[#0071e3] dark:text-[#388bfd] font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mobileActiveTabGlow"
                className="absolute inset-0 bg-[#0071e3]/10 dark:bg-[#388bfd]/15 rounded-xl -z-10"
              />
            )}
            <div className="relative">
              {tab.icon}
              {tab.badge && !isActive && (
                <span className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-[#0071e3]" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* More / Menu Drawer Button */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer min-w-[58px]"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
      </button>
    </nav>
  );
}

export function MobileDrawer({ isOpen, onClose, activeTab, setActiveTab, stats = {} }) {
  const safeStats = stats || {};
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Sliding Glass Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="md:hidden fixed inset-x-0 bottom-0 max-h-[88vh] bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl rounded-t-3xl border-t border-black/[0.1] dark:border-white/[0.15] z-50 flex flex-col shadow-2xl safe-area-pb"
          >
            {/* Grab Handle */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Header in Drawer */}
            <div className="px-5 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <ClutchLogoInteractive compact={true} />
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-600 dark:text-neutral-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Session Stats Bar */}
            <div className="grid grid-cols-4 gap-2 mx-4 my-2.5 p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-center">
              <div>
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">{safeStats.pdfCount ?? 0}</div>
                <div className="text-[9px] text-neutral-400 font-medium">PDFs</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">{safeStats.questionCount ?? 0}</div>
                <div className="text-[9px] text-neutral-400 font-medium">Questions</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">{formatConfidencePercent(safeStats.confidence)}</div>
                <div className="text-[9px] text-neutral-400 font-medium">Confidence</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">{safeStats.answerCount ?? 0}</div>
                <div className="text-[9px] text-neutral-400 font-medium">Answers</div>
              </div>
            </div>

            {/* Student Suite Banner in Drawer */}
            <div className="p-4 mx-4 my-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    🎓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Student Academic Suite
                    </h4>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      15 dedicated research &amp; engineering tools
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('student_toolkit');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Open Suite →
                </button>
              </div>
            </div>

            {/* Scrollable Navigation List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">
                All Application Modules
              </div>
              <div className="grid grid-cols-2 gap-1.5 pb-4">
                {ALL_MODULES.map((mod) => {
                  const isActive = activeTab === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(mod.id);
                        onClose();
                      }}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium transition cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? 'bg-[#0071e3] text-white font-bold shadow-xs'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="truncate">{mod.label}</span>
                      <span className={`text-[9px] mt-1 ${isActive ? 'text-white/80' : 'text-neutral-400'}`}>
                        {mod.category}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legal & App Links */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-neutral-400 px-2 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('privacy');
                    onClose();
                  }}
                  className="hover:text-[#0071e3]"
                >
                  Privacy Policy
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('terms');
                    onClose();
                  }}
                  className="hover:text-[#0071e3]"
                >
                  Terms &amp; Conditions
                </button>
                <span>•</span>
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                  Clutch 2.4
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
