import React, { useState } from 'react';
import { createQuestionPaperPDF } from '../utils/pdfGenerator';
import { motion } from 'framer-motion';

export default function ExamPredictorTab({ appState, setAppState, setActiveTab }) {
  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState(null);

  const predictExam = () => {
    setLoading(true);
    setTimeout(() => {
      setPaper({
        metadata: { subject: "Software Engineering", totalMarks: 60, time: "3 hrs", confidence: 92 },
        sections: [
          {
            title: "Section A (2 marks each)",
            questions: [
              { question: "Define Agile Methodology.", marks: 2, confidence: 95 },
              { question: "What is a design pattern?", marks: 2, confidence: 90 }
            ]
          },
          {
            title: "Section B (5 marks each)",
            questions: [
              { question: "Explain the SOLID principles with examples.", marks: 5, confidence: 88 },
              { question: "Describe the MVC architecture.", marks: 5, confidence: 94 }
            ]
          }
        ]
      });
      setAppState(prev => ({
        ...prev,
        stats: { ...prev.stats, confidence: 92 }
      }));
      setLoading(false);
    }, 2000);
  };

  const handleDownload = () => {
    if (!paper) return;
    const flatQuestions = paper.sections.flatMap(s => s.questions);
    createQuestionPaperPDF(flatQuestions, paper.metadata);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Exam Predictor Dashboard</h2>
      </div>

      {!paper ? (
        <div className="glass-card p-8 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-4xl">🎯</div>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            Upload past papers and course materials to let our AI predict your upcoming exam.
          </p>
          <button 
            onClick={predictExam}
            disabled={loading}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-lg"
          >
            {loading ? 'Analyzing Trends...' : 'Predict Exam'}
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6">
          <div className="glass-card p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-2 border-amber-200 dark:border-amber-900/50">
            <div className="text-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">PARUL UNIVERSITY</h1>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-2">{paper.metadata.subject}</h2>
              <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                <span>Total Marks: {paper.metadata.totalMarks}</span>
                <span>Time: {paper.metadata.time}</span>
              </div>
              <div className="mt-4 inline-block px-4 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 font-bold rounded-full border border-green-200 dark:border-green-800">
                AI Confidence Score: {paper.metadata.confidence}%
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {paper.sections.map((sec, i) => (
                <div key={i}>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-3">{sec.title}</h3>
                  <div className="flex flex-col gap-4">
                    {sec.questions.map((q, j) => (
                      <div key={j} className="flex items-start justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-gray-800 dark:text-gray-200 font-medium"><span className="mr-2">{j+1}.</span>{q.question}</p>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">[{q.marks} marks]</span>
                          <span className="text-xs confidence-high px-2 py-0.5 rounded">🎯 {q.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleDownload} className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold transition-colors">
              Download Predicted Paper
            </button>
            <button onClick={() => setActiveTab('answers')} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors">
              Get All Answers
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
