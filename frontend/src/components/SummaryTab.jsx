import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function SummaryTab({ appState, setAppState }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const generateSummary = async () => {
    setLoading(true);
    // Mock API Call
    setTimeout(() => {
      setSummary({
        text: "This document covers the fundamental principles of software engineering. It highlights the importance of clean architecture, modular design, and robust testing methodologies. Key takeaways include the application of SOLID principles and agile development cycles to improve software maintainability and team velocity.",
        keyPoints: ["Clean Architecture", "SOLID Principles", "Agile Methodologies", "Testing Strategies"],
        wordCount: 450,
        readingTime: "2 mins"
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Summary & Notes</h2>
      </div>

      {!appState.uploadedFile ? (
        <div className="glass-card flex-1 flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
          Please upload a document first.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Current File: {appState.uploadedFile.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ready to generate comprehensive summary</p>
            </div>
            <button 
              onClick={generateSummary}
              disabled={loading}
              className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Generate Summary'}
            </button>
          </div>

          {summary && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex flex-col gap-4">
              <div className="flex gap-4 mb-2">
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300">Words: {summary.wordCount}</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300">Read time: {summary.readingTime}</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg">
                {summary.text}
              </p>
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Key Takeaways</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.keyPoints.map((kp, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-teal-400 to-green-500 text-white rounded-full text-sm font-medium shadow-sm">
                      {kp}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
