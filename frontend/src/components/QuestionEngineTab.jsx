import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function QuestionEngineTab({ appState, setAppState }) {
  const [generating, setGenerating] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [funnelStage, setFunnelStage] = useState(0); // 0=none, 1=300, 2=200, 3=100, 4=25

  const generateMegaQuestions = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setFunnelStage(1);
      // Mock generating 300
      setAppState(prev => ({
        ...prev,
        stats: { ...prev.stats, questionCount: 300 }
      }));
    }, 2000);
  };

  const rankQuestions = () => {
    setRanking(true);
    let stage = 1;
    const interval = setInterval(() => {
      stage++;
      setFunnelStage(stage);
      if (stage === 4) {
        clearInterval(interval);
        setRanking(false);
        setAppState(prev => ({
          ...prev,
          rankedQuestions: Array(25).fill({ question: "Sample question?", confidence: 95, type: "MCQ", topic: "General", difficulty: 4 }),
          stats: { ...prev.stats, questionCount: 25, confidence: 95 }
        }));
      }
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Question Engine</h2>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            onClick={generateMegaQuestions}
            disabled={generating || funnelStage > 0}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating 300...' : 'Generate 300 Questions'}
          </button>
          <button 
            onClick={rankQuestions}
            disabled={ranking || funnelStage === 0 || funnelStage === 4}
            className="px-6 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {ranking ? 'Ranking AI...' : 'AI Rank & Filter'}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 1 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-blue-500 flex items-center px-4 text-white font-bold funnel-bar"
            >
              {funnelStage >= 1 && '300 Total Generated'}
            </motion.div>
          </div>
          <div className="relative h-10 w-[80%] mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 2 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-green-500 flex items-center px-4 text-white font-bold funnel-bar"
            >
              {funnelStage >= 2 && '200 Important'}
            </motion.div>
          </div>
          <div className="relative h-10 w-[50%] mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 3 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-amber-500 flex items-center px-4 text-white font-bold funnel-bar"
            >
              {funnelStage >= 3 && '100 Likely'}
            </motion.div>
          </div>
          <div className="relative h-12 w-[25%] mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-white/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 4 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-red-500 flex items-center justify-center text-white font-bold text-lg funnel-bar animated-gradient-bg"
            >
              {funnelStage >= 4 && '25 Critical'}
            </motion.div>
          </div>
        </div>
      </div>

      {funnelStage === 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <div className="flex gap-4 mb-2">
            <select className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
              <option>All Types</option>
              <option>MCQ</option>
              <option>Descriptive</option>
            </select>
            <button className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium">
              Export 25 as PDF
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appState.rankedQuestions.slice(0, 4).map((q, i) => (
              <div key={i} className="glass-card p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">Critical</span>
                  <span className="text-amber-500">★★★★☆</span>
                </div>
                <p className="font-medium text-gray-800 dark:text-gray-200">{i+1}. {q.question}</p>
                <div className="mt-auto flex gap-2">
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{q.type}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{q.topic}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
