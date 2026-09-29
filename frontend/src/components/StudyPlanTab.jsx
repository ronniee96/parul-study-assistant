import React from 'react';

export default function StudyPlanTab({ appState = {}, setActiveTab }) {
  const hasDocuments = Boolean(appState?.extractedText || appState?.uploadedFile || (appState?.uploadedFiles && appState.uploadedFiles.length > 0));
  const subjectName = appState?.uploadedFiles?.length 
    ? appState.uploadedFiles.map(f => f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")).join(" & ") 
    : (appState?.uploadedFile?.name?.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") || "Course Syllabus");

  const topics = appState?.questions?.map(q => q.topic).filter((v, i, a) => a.indexOf(v) === i) || [];
  const top1 = topics[0] || "Foundational Concepts & Principles";
  const top2 = topics[1] || "Core Methodologies & Formulations";
  const top3 = topics[2] || "Advanced Analytical Models";
  const top4 = topics[3] || "Case Analysis & Problem Solving";

  const plan = [
    { day: "Day 1", focus: `Module 1 Foundations: ${top1}`, color: "from-blue-400 to-blue-500", hours: "2.5 hrs" },
    { day: "Day 2", focus: `Module 2 Formulations: ${top2}`, color: "from-purple-400 to-purple-500", hours: "3.0 hrs" },
    { day: "Day 3", focus: `300 Question Bank & MCQ Drills: ${top3}`, color: "from-green-400 to-green-500", hours: "2.5 hrs" },
    { day: "Day 4", focus: `Analytical Caselets & Critical Review: ${top4}`, color: "from-amber-400 to-amber-500", hours: "3.0 hrs" },
    { day: "Day 5", focus: `Full 40-Mark Timed Parul University Mock Exam for ${subjectName}`, color: "from-red-400 to-red-500", hours: "1.5 hrs" },
  ];

  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 glass-card max-w-2xl mx-auto my-8">
        <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-4xl mb-4 text-rose-600 dark:text-rose-400">
          📅
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Active Session Documents</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
          Upload your course syllabus or lecture slides in the <strong>Upload</strong> tab to generate a custom day-by-day revision schedule tailored to your exam.
        </p>
        <button
          onClick={() => setActiveTab && setActiveTab('upload')}
          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <span>📎</span>
          <span>Go to Upload Tab</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full p-4 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📅 5-Day Targeted Study Timeline</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Optimized milestone roadmap for <strong>{subjectName}</strong> based on Parul University syllabus weightage.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-bold border border-primary-200 dark:border-primary-800">
          Total Prep: 12.5 Hours
        </span>
      </div>
      
      <div className="flex flex-col gap-4 relative mt-2">
        <div className="absolute left-6 top-4 bottom-4 w-1 bg-gray-200 dark:bg-gray-800 rounded-full z-0"></div>
        {plan.map((item, i) => (
          <div key={i} className="relative z-10 flex items-center gap-6">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold shadow-md shrink-0`}>
              {i+1}
            </div>
            <div className="glass-card flex-1 p-5 border-l-4" style={{ borderLeftColor: 'transparent' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{item.day}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  ⏱️ {item.hours}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{item.focus}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl">
        <h3 className="font-bold text-rose-800 dark:text-rose-400 mb-1">💡 Parul University Exam Scoring Strategy</h3>
        <p className="text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
          For Section A (20 Marks), focus on exact 2-line definitions and structured step-by-step problem formulations. For Section B 6-mark caselets, always identify limiting bottleneck constraints and state the decision rule before formulating the final recommendation.
        </p>
      </div>
    </div>
  );
}
