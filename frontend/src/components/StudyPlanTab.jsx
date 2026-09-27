import React from 'react';

export default function StudyPlanTab() {
  const plan = [
    { day: "Day 1", focus: "Core Concepts (Chapters 1-3)", color: "from-blue-400 to-blue-500" },
    { day: "Day 2", focus: "Advanced Topics & Architectures", color: "from-purple-400 to-purple-500" },
    { day: "Day 3", focus: "Practice Past Papers (MCQs)", color: "from-green-400 to-green-500" },
    { day: "Day 4", focus: "Review Weak Areas & Flashcards", color: "from-amber-400 to-amber-500" },
    { day: "Day 5", focus: "Mock Exam (Full Length)", color: "from-red-400 to-red-500" },
  ];

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">5-Day Study Timeline</h2>
      
      <div className="flex flex-col gap-4 relative">
        <div className="absolute left-6 top-4 bottom-4 w-1 bg-gray-200 dark:bg-gray-800 rounded-full z-0"></div>
        {plan.map((item, i) => (
          <div key={i} className="relative z-10 flex items-center gap-6">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold shadow-md shrink-0`}>
              {i+1}
            </div>
            <div className="glass-card flex-1 p-5 border-l-4" style={{ borderLeftColor: 'transparent' }}>
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{item.day}</h3>
              <p className="text-gray-600 dark:text-gray-400">{item.focus}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl">
        <h3 className="font-bold text-rose-800 dark:text-rose-400 mb-2">💡 Pro Tip</h3>
        <p className="text-rose-700 dark:text-rose-300 text-sm">
          Stick to 45-minute focus sessions followed by 10-minute breaks. Keep hydrated and get 8 hours of sleep before exam day!
        </p>
      </div>
    </div>
  );
}
