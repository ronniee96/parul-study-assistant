import React, { useState } from 'react';

export default function AdaptiveTab() {
  const [consented, setConsented] = useState(false);

  if (!consented) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="glass-card max-w-md p-8 text-center flex flex-col gap-6">
          <div className="text-5xl">🧠</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Smart Learning Engine</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We use your test scores and learning pace to build a personalized study algorithm. 
            Do you consent to tracking your learning metrics locally?
          </p>
          <button 
            onClick={() => setConsented(true)}
            className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold transition-colors shadow-lg"
          >
            Enable Smart Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Learning Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 flex flex-col gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Accuracy</span>
          <span className="text-3xl font-bold text-violet-500">78%</span>
          <span className="text-sm text-green-500">↑ 5% this week</span>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Study Streak</span>
          <span className="text-3xl font-bold text-orange-500">4 Days</span>
          <span className="text-sm text-gray-500">Keep it up!</span>
        </div>
        <div className="glass-card p-6 flex flex-col gap-2 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Weak Topic</span>
          <span className="text-xl font-bold text-red-600 dark:text-red-400">Database Normalization</span>
          <button className="mt-2 text-sm px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg">Practice Now</button>
        </div>
      </div>

      <div className="glass-card p-6 mt-4">
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-4">Algorithm Suggestion</h3>
        <p className="text-gray-700 dark:text-gray-300">
          Based on your recent performance, we suggest increasing the difficulty of MCQ questions.
          You have mastered the foundational concepts of Software Engineering.
        </p>
      </div>
    </div>
  );
}
