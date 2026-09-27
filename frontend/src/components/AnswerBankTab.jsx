import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createAnswerGuidePDF } from '../utils/pdfGenerator';

export default function AnswerBankTab({ appState }) {
  const [expandedId, setExpandedId] = useState(null);

  // Mock data
  const answers = [
    {
      id: 1,
      question: "Explain the SOLID principles with examples.",
      confidence: 95,
      difficulty: 4,
      answer: "SOLID is an acronym for five object-oriented design principles...",
      key_points: ["Single Responsibility", "Open-Closed", "Liskov Substitution", "Interface Segregation", "Dependency Inversion"],
      word_count: 250
    },
    {
      id: 2,
      question: "Define Agile Methodology.",
      confidence: 88,
      difficulty: 2,
      answer: "Agile is an iterative approach to software development...",
      key_points: ["Iterative", "Flexibility", "Customer Collaboration"],
      word_count: 100
    }
  ];

  const handleDownload = () => {
    createAnswerGuidePDF(answers, { subject: "Predicted Topics" });
  };

  const copyToClipboard = (item) => {
    navigator.clipboard.writeText(`Q: ${item.question}\nA: ${item.answer}`);
    alert("Copied to clipboard");
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Top 25 Q&A Viewer</h2>
        <button onClick={handleDownload} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium">
          Download Study Guide PDF
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {answers.map(ans => (
          <div key={ans.id} className="glass-card overflow-hidden border border-gray-200 dark:border-gray-700">
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex justify-between items-center"
              onClick={() => setExpandedId(expandedId === ans.id ? null : ans.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${ans.confidence > 90 ? 'confidence-high' : 'confidence-medium'}`}>
                    {ans.confidence}% Confidence
                  </span>
                  <span className="text-amber-500 text-sm">{'★'.repeat(ans.difficulty)}{'☆'.repeat(5-ans.difficulty)}</span>
                </div>
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{ans.question}</h3>
              </div>
              <div className="ml-4 text-gray-400">
                {expandedId === ans.id ? '▲' : '▼'}
              </div>
            </div>

            <AnimatePresence>
              {expandedId === ans.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                >
                  <div className="p-4 flex flex-col gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Ideal Answer</h4>
                      <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{ans.answer}</p>
                    </div>
                    
                    {ans.key_points && (
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Points to Remember</h4>
                        <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-200 flex flex-col gap-1">
                          {ans.key_points.map((kp, i) => <li key={i}>{kp}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Target length: ~{ans.word_count} words</span>
                      <button 
                        onClick={() => copyToClipboard(ans)}
                        className="text-sm px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        Copy Q&A
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
