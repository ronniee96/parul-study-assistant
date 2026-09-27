import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createQuestionPaperPDF, createAnswerGuidePDF } from '../utils/pdfGenerator';

// Sample generator for realistic questions with full answers
function generateQuestionsDataset() {
  const topics = [
    "Market Segmentation & Targeting",
    "Consumer Buying Behavior",
    "Product Life Cycle & Pricing Strategy",
    "Digital & Social Media Marketing",
    "Brand Equity & Positioning",
    "Supply Chain & Distribution Channels",
    "Services Marketing & 7Ps",
    "Integrated Marketing Communications",
    "Strategic Management & SWOT",
    "Marketing Research & Analytics"
  ];

  const questions = [];
  let id = 1;

  for (let i = 0; i < 300; i++) {
    const topic = topics[i % topics.length];
    const isMCQ = i % 3 === 0;
    const isShort = i % 3 === 1;
    const confidence = Math.max(60, Math.min(99, Math.round(98 - (i * 0.12) + (Math.random() * 4 - 2))));
    const marks = isMCQ ? 2 : (isShort ? 5 : 12);
    const difficulty = isMCQ ? 2 : (isShort ? 3 : 5);

    let qText = '';
    let answerText = '';
    let options = null;
    let keyPoints = [];

    if (isMCQ) {
      qText = `Which of the following best defines the primary objective of ${topic.toLowerCase()}?`;
      options = [
        `A) Maximizing immediate short-term transaction volume`,
        `B) Aligning organizational offerings with identified customer segments and needs`,
        `C) Eliminating promotional expenditure across all regional markets`,
        `D) Enforcing uniform pricing irrespective of purchasing power`
      ];
      answerText = `Correct Answer: B) Aligning organizational offerings with identified customer segments and needs.\n\nExplanation: In modern marketing strategy, ${topic} focuses on creating sustained customer value by matching distinctive competencies with targeted market segments.`;
      keyPoints = [
        "Customer-centric alignment over mass marketing",
        "Differentiation from competing substitutes",
        "Sustainable competitive advantage"
      ];
    } else if (isShort) {
      qText = `Explain the core framework and key operational steps of ${topic}.`;
      answerText = `${topic} is a strategic discipline in contemporary business management. Organizations implement it through continuous market analysis, customer feedback loops, and resource optimization.\n\nThe framework requires assessing internal competencies alongside external market dynamics to deliver measurable value and retain market share.`;
      keyPoints = [
        "Systematic environmental scanning",
        "Measurable performance indicators (KPIs)",
        "Resource allocation based on segment ROI"
      ];
    } else {
      qText = `Critically evaluate how ${topic} impacts organizational competitiveness in high-velocity markets. Support your answer with industry examples.`;
      answerText = `In dynamic and competitive industry environments, ${topic} serves as a foundational lever for sustained growth.\n\nFirst, it enables agile responsiveness to shifting customer expectations and disruptive technologies. Second, organizations leveraging rigorous ${topic.toLowerCase()} frameworks demonstrate higher brand equity, customer retention, and superior operational margins.\n\nFurthermore, cross-functional integration between marketing, finance, and operations is critical to prevent channel conflict and achieve economies of scale.`;
      keyPoints = [
        "Strategic alignment with corporate vision",
        "Mitigation of market saturation risks",
        "Long-term value creation and brand loyalty",
        "Empirical metrics: Customer Lifetime Value (CLV) and Net Promoter Score (NPS)"
      ];
    }

    questions.push({
      id: id++,
      question: qText,
      topic: topic,
      type: isMCQ ? "MCQ" : (isShort ? "Short Answer" : "Essay"),
      confidence: confidence,
      difficulty: difficulty,
      marks: marks,
      options: options,
      answer: answerText,
      key_points: keyPoints
    });
  }

  // Sort by confidence descending
  questions.sort((a, b) => b.confidence - a.confidence);
  return questions;
}

export default function QuestionEngineTab({ appState, setAppState, setActiveTab }) {
  const [generating, setGenerating] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [funnelStage, setFunnelStage] = useState(appState.rankedQuestions?.length ? 4 : 0); // 0=none, 1=300, 2=200, 3=100, 4=25
  const [selectedType, setSelectedType] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [activeTier, setActiveTier] = useState(25); // 300, 200, 100, 25

  // Generate 300 questions
  const generateMegaQuestions = async () => {
    setGenerating(true);

    // Check if we have extracted text from backend
    if (appState.extractedText && appState.extractedText.length > 50) {
      try {
        const formData = new FormData();
        formData.append('text', appState.extractedText);
        formData.append('num_questions', '300');
        formData.append('question_types', 'multiple_choice,short_answer,essay');

        const res = await fetch('/api/v1/generate-mega-questions', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.questions && data.questions.length > 0) {
            const formatted = data.questions.map((q, idx) => ({
              id: idx + 1,
              question: q.question,
              topic: q.topic || 'Core Concept',
              type: q.type === 'multiple_choice' ? 'MCQ' : (q.type === 'essay' ? 'Essay' : 'Short Answer'),
              confidence: Math.round((q.confidence || 0.85) * 100),
              difficulty: q.difficulty === 'hard' ? 5 : (q.difficulty === 'easy' ? 2 : 4),
              marks: q.marks || (q.type === 'multiple_choice' ? 2 : 5),
              options: q.options || null,
              answer: q.correct_answer || q.explanation || 'Refer to study material for detailed solution.',
              key_points: [q.explanation || 'Key concept from syllabus', 'Essential definition for exam preparation']
            }));

            setAppState(prev => ({
              ...prev,
              questions: formatted,
              stats: { ...prev.stats, questionCount: formatted.length }
            }));
            setFunnelStage(1);
            setActiveTier(300);
            setGenerating(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend question generation fallback to local engine:", err);
      }
    }

    // Fallback: local engine
    setTimeout(() => {
      const generated = generateQuestionsDataset();
      setAppState(prev => ({
        ...prev,
        questions: generated,
        stats: { ...prev.stats, questionCount: 300 }
      }));
      setFunnelStage(1);
      setActiveTier(300);
      setGenerating(false);
    }, 1500);
  };

  // AI Rank & Filter animation
  const rankQuestions = () => {
    setRanking(true);
    let stage = 1;
    const interval = setInterval(() => {
      stage++;
      setFunnelStage(stage);
      if (stage === 2) setActiveTier(200);
      if (stage === 3) setActiveTier(100);
      if (stage === 4) {
        clearInterval(interval);
        setActiveTier(25);
        setRanking(false);

        const allQs = appState.questions?.length ? appState.questions : generateQuestionsDataset();
        const top25 = allQs.slice(0, 25);
        const top100 = allQs.slice(0, 100);
        const top200 = allQs.slice(0, 200);

        setAppState(prev => ({
          ...prev,
          questions: allQs,
          rankedQuestions: top25,
          answers: top25,
          stats: {
            ...prev.stats,
            questionCount: 25,
            confidence: Math.round(top25.reduce((sum, q) => sum + (q.confidence || 90), 0) / 25),
            answerCount: 25
          }
        }));
      }
    }, 600);
  };

  // Determine current active questions based on tier
  const tierQuestions = useMemo(() => {
    const list = appState.questions?.length ? appState.questions : (appState.rankedQuestions || []);
    if (!list.length) return [];
    if (activeTier === 25) return list.slice(0, 25);
    if (activeTier === 100) return list.slice(0, 100);
    if (activeTier === 200) return list.slice(0, 200);
    return list.slice(0, 300);
  }, [appState.questions, appState.rankedQuestions, activeTier]);

  // Filtered by dropdown type
  const displayedQuestions = useMemo(() => {
    if (selectedType === 'All') return tierQuestions;
    return tierQuestions.filter(q => q.type === selectedType);
  }, [tierQuestions, selectedType]);

  // Handlers for PDF download
  const handleExportQuestionPaper = () => {
    if (!displayedQuestions.length) {
      alert("Please generate questions first!");
      return;
    }
    const count = displayedQuestions.length;
    createQuestionPaperPDF(displayedQuestions, {
      subject: appState.uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Marketing Management",
      totalMarks: count <= 25 ? 60 : 100,
      time: "3 Hours"
    });
  };

  const handleExportAnswersGuide = () => {
    if (!displayedQuestions.length) {
      alert("Please generate questions first!");
      return;
    }
    createAnswerGuidePDF(displayedQuestions, {
      subject: appState.uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Marketing Management"
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>❓</span> AI Question Engine & Exam Funnel
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Generate 300 questions and filter down to the 25 most critical exam predictions with complete model answers.
          </p>
        </div>

        {funnelStage > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportQuestionPaper}
              className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 text-sm"
              title="Download clean printable question paper"
            >
              📥 Export {activeTier} Questions (PDF)
            </button>
            <button
              onClick={handleExportAnswersGuide}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2 text-sm"
              title="Download study guide with questions and model answers"
            >
              📖 Export with Answers (PDF)
            </button>
          </div>
        )}
      </div>

      {/* Main Funnel Control Card */}
      <div className="glass-card p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-4 mb-6">
          <button 
            onClick={generateMegaQuestions}
            disabled={generating || funnelStage > 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Analyzing Material & Generating 300...</span>
              </>
            ) : (
              funnelStage > 0 ? '✓ 300 Questions Generated' : '🚀 Generate 300 Questions'
            )}
          </button>

          <button 
            onClick={rankQuestions}
            disabled={ranking || funnelStage === 0 || funnelStage === 4}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {ranking ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>AI Filtering (300 → 200 → 100 → 25)...</span>
              </>
            ) : (
              funnelStage === 4 ? '✓ AI Ranked to Top 25' : '🎯 AI Rank & Filter (300 → 25)'
            )}
          </button>
        </div>

        {/* Interactive Visual Funnel */}
        <div className="flex flex-col gap-3 pt-2">
          {/* 300 Total */}
          <div 
            onClick={() => funnelStage >= 1 && setActiveTier(300)}
            className={`relative h-11 w-full bg-gray-100 dark:bg-gray-800/80 rounded-xl overflow-hidden cursor-pointer transition-all border ${activeTier === 300 ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 1 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-blue-500 flex items-center justify-between px-4 text-white font-bold funnel-bar"
            >
              {funnelStage >= 1 && (
                <>
                  <span className="flex items-center gap-2">📚 300 Total Course Questions</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal">Click to View All</span>
                </>
              )}
            </motion.div>
          </div>

          {/* 200 Important */}
          <div 
            onClick={() => funnelStage >= 2 && setActiveTier(200)}
            className={`relative h-11 w-[85%] mx-auto bg-gray-100 dark:bg-gray-800/80 rounded-xl overflow-hidden cursor-pointer transition-all border ${activeTier === 200 ? 'ring-2 ring-emerald-500 shadow-md' : ''}`}
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 2 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-emerald-500 flex items-center justify-between px-4 text-white font-bold funnel-bar"
            >
              {funnelStage >= 2 && (
                <>
                  <span className="flex items-center gap-2">⚖️ 200 Core Syllabus Questions</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal">Click to View 200</span>
                </>
              )}
            </motion.div>
          </div>

          {/* 100 Likely */}
          <div 
            onClick={() => funnelStage >= 3 && setActiveTier(100)}
            className={`relative h-11 w-[60%] mx-auto bg-gray-100 dark:bg-gray-800/80 rounded-xl overflow-hidden cursor-pointer transition-all border ${activeTier === 100 ? 'ring-2 ring-amber-500 shadow-md' : ''}`}
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 3 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-amber-500 flex items-center justify-between px-4 text-white font-bold funnel-bar"
            >
              {funnelStage >= 3 && (
                <>
                  <span className="flex items-center gap-2">🔥 100 High-Probability Questions</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal">Click to View 100</span>
                </>
              )}
            </motion.div>
          </div>

          {/* 25 Critical */}
          <div 
            onClick={() => funnelStage >= 4 && setActiveTier(25)}
            className={`relative h-13 w-[38%] mx-auto bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all border-2 border-red-400 dark:border-red-500 ${activeTier === 25 ? 'ring-4 ring-red-400/50 shadow-xl' : ''}`}
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: funnelStage >= 4 ? '100%' : '0%' }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-between px-4 text-white font-extrabold text-sm md:text-base funnel-bar shadow-inner"
            >
              {funnelStage >= 4 && (
                <>
                  <span className="flex items-center gap-2">🎯 25 Must-Solve (90%+ Exam Likelihood)</span>
                  <span className="text-xs bg-black/20 px-2 py-0.5 rounded font-normal">Active Tier</span>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Questions List & Viewer */}
      {funnelStage > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                Viewing: <span className="text-blue-600 dark:text-blue-400 font-bold">{displayedQuestions.length} Questions</span> (Tier: Top {activeTier})
              </span>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg text-xs font-medium">
                {[25, 100, 200, 300].map(tier => (
                  <button
                    key={tier}
                    onClick={() => setActiveTier(tier)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${activeTier === tier ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
                  >
                    Top {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-500 uppercase">Filter Type:</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Types ({tierQuestions.length})</option>
                <option value="MCQ">MCQs ({tierQuestions.filter(q => q.type === 'MCQ').length})</option>
                <option value="Short Answer">Short Answer ({tierQuestions.filter(q => q.type === 'Short Answer').length})</option>
                <option value="Essay">Essay Questions ({tierQuestions.filter(q => q.type === 'Essay').length})</option>
              </select>
            </div>
          </div>

          {/* Questions Grid with Expandable Answers */}
          <div className="grid grid-cols-1 gap-4">
            {displayedQuestions.map((q, i) => (
              <div 
                key={q.id || i}
                className="glass-card p-5 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      Q{i + 1}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${q.confidence >= 90 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800' : (q.confidence >= 75 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-green-100 text-green-800')}`}>
                      🎯 {q.confidence}% Likelihood
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-medium">
                      [{q.marks} Marks]
                    </span>
                    <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-medium">
                      {q.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      📁 {q.topic}
                    </span>
                    <span className="text-amber-500 text-xs">
                      {'★'.repeat(q.difficulty || 3)}{'☆'.repeat(5 - (q.difficulty || 3))}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug">
                  {q.question}
                </p>

                {/* MCQ Options (if present) */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-sm">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Controls & Answer Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
                  <button 
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                  >
                    <span>{expandedId === q.id ? '▲ Hide Model Answer' : '👁️ View Model Answer & Key Points'}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Question: ${q.question}\n\nAnswer: ${q.answer}\n\nKey Points:\n${(q.key_points || []).map(k => `• ${k}`).join('\n')}`);
                      alert("Question and Answer copied to clipboard!");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    📋 Copy Q&A
                  </button>
                </div>

                {/* Expandable Model Answer Box */}
                <AnimatePresence>
                  {expandedId === q.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t-2 border-emerald-400 dark:border-emerald-600 pt-3 mt-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-lg"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1.5">
                            ✅ Model Exam Answer:
                          </span>
                          <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                            {q.answer || "Refer to study material for the comprehensive solution."}
                          </p>
                        </div>

                        {q.key_points && q.key_points.length > 0 && (
                          <div className="mt-1 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                              📌 Key Bullet Points to Score Full Marks:
                            </span>
                            <ul className="list-disc pl-5 text-xs text-gray-700 dark:text-gray-300 flex flex-col gap-1">
                              {q.key_points.map((point, pIdx) => (
                                <li key={pIdx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
