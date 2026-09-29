import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SessionManagerModal({
  isOpen,
  onClose,
  currentSessionId,
  sessions,
  onSwitchSession,
  onCreateNewSession,
  onDeleteSession
}) {
  const [newSessionName, setNewSessionName] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    onCreateNewSession(newSessionName.trim() || 'New Study Session');
    setNewSessionName('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-850 dark:to-gray-850">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📁</span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Study Sessions & Subject Workspaces
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Switch between subjects without losing any documents or answers
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Create New Session Bar */}
          <form onSubmit={handleCreate} className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 flex gap-2">
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="E.g. Financial Management, Cost Accounting..."
              className="flex-1 px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span>
              <span>New Session</span>
            </button>
          </form>

          {/* Session List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
            {(!sessions || sessions.length === 0) ? (
              <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
                No saved sessions found. Create a new session above!
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                const dateStr = sess.updatedAt
                  ? new Date(sess.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Recent';

                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      if (!isActive) onSwitchSession(sess.id);
                    }}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 shadow-xs'
                        : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📖</span>
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {sess.name}
                        </h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>Updated: {dateStr}</span>
                        {sess.stats && (
                          <span>
                            • {sess.stats.pdfCount || 0} PDFs • {sess.stats.questionCount || 0} Questions
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isActive && (
                        <button
                          onClick={() => onSwitchSession(sess.id)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Load
                        </button>
                      )}
                      {sessions.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete session "${sess.name}"? This cannot be undone.`)) {
                              onDeleteSession(sess.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer text-xs"
                          title="Delete Session"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
