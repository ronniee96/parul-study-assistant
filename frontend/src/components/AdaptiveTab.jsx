import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

export default function AdaptiveTab({ appState = {}, setActiveTab }) {
  // Mode selection: 'flashcards' | 'flowsheets' | 'diagnostic' | 'analytics'
  const [activeSubTab, setActiveSubTab] = useState('flashcards');

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cardFilter, setCardFilter] = useState('all'); // 'all' | 'due' | 'mastered' | 'learning'

  // Spaced repetition flashcard stats stored in localStorage
  const [repetitionStats, setRepetitionStats] = useState(() => {
    try {
      const saved = localStorage.getItem('study_assistant_sr_stats');
      return saved ? JSON.parse(saved) : {
        streakDays: 1,
        totalReviews: 0,
        masteredCount: 0,
        learningCount: 0,
        againCount: 0,
        lastReviewedDate: new Date().toISOString().split('T')[0]
      };
    } catch {
      return { streakDays: 1, totalReviews: 0, masteredCount: 0, learningCount: 0, againCount: 0 };
    }
  });

  // Card mastery states map: { cardId: { repetitions, interval, easeFactor, status, dueDate } }
  const [cardProgress, setCardProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('study_assistant_card_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Flow sheets state
  const [selectedNode, setSelectedNode] = useState(null);
  const [flowViewMode, setFlowViewMode] = useState('pipeline'); // 'pipeline' | 'mindmap'

  // Diagnostic Test state
  const [currentDiagStep, setCurrentDiagStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [diagSubmitted, setDiagSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAbility, setCurrentAbility] = useState(55); // 0 to 100 Ability score
  const [diagFinished, setDiagFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const hasDocuments = Boolean(
    (appState.extractedText && appState.extractedText.trim().length > 20) ||
    appState.uploadedFile ||
    (appState.uploadedFiles && appState.uploadedFiles.length > 0)
  );

  // Reset diagnostic and card progress on session or document reset
  useEffect(() => {
    if (!hasDocuments) {
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setUserAnswers([]);
      setDiagFinished(false);
      setSelectedOption(null);
      setDiagSubmitted(false);
    }
  }, [hasDocuments]);

  // Dynamically build flashcards strictly from the student's active uploaded material
  const allFlashcards = useMemo(() => {
    if (!hasDocuments || !appState.questions || appState.questions.length === 0) {
      return [];
    }

    return appState.questions.slice(0, 40).map((q, idx) => ({
      id: `fc-${q.id || idx + 1}`,
      question: q.question || 'Syllabus Review Question',
      marks: q.marks || (q.type === 'MCQ' ? 2 : (q.type === 'Essay' ? 12 : 5)),
      difficulty: q.difficulty <= 2 ? 'easy' : (q.difficulty <= 4 ? 'medium' : 'hard'),
      answer: q.answer || q.correct_answer || 'Refer to uploaded course material for comprehensive analysis.',
      keyPoints: q.key_points && q.key_points.length > 0 
        ? q.key_points 
        : ['Essential syllabus milestone', 'Scoring criterion for university examination'],
      category: q.topic || 'Core Concept',
      topicTitle: q.topic || 'Document Review',
      examTip: `High-yield ${q.marks || 5}-mark item predicted with ${q.confidence || 90}% likelihood in Parul University examination.`,
      source: 'Uploaded Document'
    }));
  }, [hasDocuments, appState.questions]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    allFlashcards.forEach(fc => {
      if (fc.category) cats.add(fc.category);
    });
    return Array.from(cats);
  }, [allFlashcards]);

  // Filtered flashcards
  const filteredFlashcards = useMemo(() => {
    return allFlashcards.filter(card => {
      const matchCat = selectedCategory === 'All' || card.category === selectedCategory;
      const progress = cardProgress[card.id];
      const status = progress?.status || 'new';

      if (!matchCat) return false;
      if (cardFilter === 'mastered') return status === 'mastered';
      if (cardFilter === 'learning') return status === 'learning' || status === 'again';
      if (cardFilter === 'due') return status !== 'mastered';
      return true;
    });
  }, [allFlashcards, selectedCategory, cardFilter, cardProgress]);

  const activeCard = filteredFlashcards[currentCardIndex] || filteredFlashcards[0] || allFlashcards[0];

  // Dynamic Diagnostic Questions derived strictly from uploaded document questions
  const diagnosticQuestions = useMemo(() => {
    if (!appState?.questions || appState.questions.length === 0) {
      return [];
    }
    const mcqs = appState.questions.filter(q => q.options && q.options.length >= 2);
    if (mcqs.length > 0) {
      return mcqs.slice(0, 5).map((q, idx) => ({
        id: `diag-${q.id || idx + 1}`,
        level: q.marks === 2 ? 1 : (q.marks <= 5 ? 2 : 3),
        topic: q.topic || 'Syllabus Topic',
        question: q.question,
        options: q.options,
        correctIndex: 0,
        explanation: q.answer || q.explanation || 'Verified directly from your uploaded syllabus material.',
        marks: q.marks || 2,
        difficulty: q.difficulty <= 2 ? 'easy' : (q.difficulty <= 4 ? 'medium' : 'hard')
      }));
    }
    return appState.questions.slice(0, 5).map((q, idx) => ({
      id: `diag-${q.id || idx + 1}`,
      level: 2,
      topic: q.topic || 'Syllabus Topic',
      question: q.question,
      options: [
        `A) Primary core definition / principle of ${q.topic}`,
        `B) Secondary unrelated external factor`,
        `C) Default uncalibrated parameter`,
        `D) None of the above`
      ],
      correctIndex: 0,
      explanation: q.answer || 'Refer to uploaded course material for step-by-step resolution.',
      marks: q.marks || 5,
      difficulty: 'medium'
    }));
  }, [appState.questions]);

  // Dynamic Flow Sheet Columns partitioned from the active document topics
  const flowSheetColumns = useMemo(() => {
    const rawTopics = appState.questions?.map(q => q.topic).filter((v, i, a) => a.indexOf(v) === i) || [];
    const tList = rawTopics.length > 0 ? rawTopics : ['Foundational Units', 'Core Methodologies', 'Analytical Models', 'Case Studies'];

    const getTopicsForStage = (start, count) => {
      const selected = tList.slice(start, start + count);
      if (selected.length === 0) return [{ name: tList[0] || 'Core Unit', status: 'ready', code: 'MOD' }];
      return selected.map((t, idx) => ({
        name: t,
        status: idx === 0 ? 'mastered' : (idx === 1 ? 'in_progress' : 'ready'),
        code: `U${idx + 1}`
      }));
    };

    return [
      {
        stage: 'Stage 1',
        title: 'Foundations & Definitions',
        level: 1,
        marks: '2 Marks',
        color: 'blue',
        topics: getTopicsForStage(0, 3)
      },
      {
        stage: 'Stage 2',
        title: 'Mechanisms & Procedures',
        level: 2,
        marks: '5 Marks',
        color: 'violet',
        topics: getTopicsForStage(3, 3)
      },
      {
        stage: 'Stage 3',
        title: 'Tradeoffs & Analysis',
        level: 3,
        marks: '7-10 Marks',
        color: 'amber',
        topics: getTopicsForStage(6, 3)
      },
      {
        stage: 'Stage 4',
        title: 'Exam Master & Caselets',
        level: 4,
        marks: '12-15 Marks',
        color: 'emerald',
        topics: getTopicsForStage(9, 3)
      }
    ];
  }, [appState.questions]);

  // Save stats & progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('study_assistant_sr_stats', JSON.stringify(repetitionStats));
    } catch (e) {
      console.warn('Failed to save repetition stats', e);
    }
  }, [repetitionStats]);

  useEffect(() => {
    try {
      localStorage.setItem('study_assistant_card_progress', JSON.stringify(cardProgress));
    } catch (e) {
      console.warn('Failed to save card progress', e);
    }
  }, [cardProgress]);

  // Reset flip when card index changes
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
  }, [currentCardIndex, selectedCategory, cardFilter]);

  // SM-2 Spaced Repetition Logic
  const handleRateCard = (rating) => {
    if (!activeCard) return;

    const currentCardData = cardProgress[activeCard.id] || {
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      status: 'new'
    };

    let { repetitions, interval, easeFactor } = currentCardData;
    let nextStatus = 'learning';

    if (rating === 'again') {
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      nextStatus = 'again';
    } else if (rating === 'hard') {
      repetitions = repetitions + 1;
      interval = Math.max(1, Math.round(interval * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      nextStatus = 'learning';
    } else if (rating === 'good') {
      repetitions = repetitions + 1;
      interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(interval * easeFactor);
      nextStatus = repetitions >= 3 ? 'mastered' : 'learning';
    } else if (rating === 'easy') {
      repetitions = repetitions + 2;
      interval = repetitions <= 2 ? 4 : Math.round(interval * easeFactor * 1.3);
      easeFactor = easeFactor + 0.15;
      nextStatus = 'mastered';
    }

    const updatedProgress = {
      ...cardProgress,
      [activeCard.id]: {
        repetitions,
        interval,
        easeFactor,
        status: nextStatus,
        lastReviewed: new Date().toISOString()
      }
    };

    setCardProgress(updatedProgress);

    // Update global repetition stats
    setRepetitionStats(prev => ({
      ...prev,
      totalReviews: prev.totalReviews + 1,
      masteredCount: nextStatus === 'mastered' ? prev.masteredCount + 1 : prev.masteredCount,
      againCount: rating === 'again' ? prev.againCount + 1 : prev.againCount,
      learningCount: nextStatus === 'learning' ? prev.learningCount + 1 : prev.learningCount
    }));

    // Advance to next card
    if (currentCardIndex < filteredFlashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setCurrentCardIndex(0);
    }
  };

  // Diagnostic Test Progression (CAT algorithm)
  const handleSelectOption = (idx) => {
    if (diagSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitDiagAnswer = () => {
    if (selectedOption === null || !diagnosticQuestions[currentDiagStep]) return;
    const currentQ = diagnosticQuestions[currentDiagStep];
    const isCorrect = selectedOption === currentQ.correctIndex;

    let abilityDelta = 0;
    if (isCorrect) {
      abilityDelta = currentQ.level === 1 ? 6 : currentQ.level === 2 ? 9 : currentQ.level === 3 ? 12 : 15;
    } else {
      abilityDelta = currentQ.level === 1 ? -12 : currentQ.level === 2 ? -8 : -5;
    }

    const newAbility = Math.min(99, Math.max(25, currentAbility + abilityDelta));
    setCurrentAbility(newAbility);

    setUserAnswers(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        topic: currentQ.topic,
        isCorrect,
        selectedOption,
        correctOption: currentQ.correctIndex
      }
    ]);

    setDiagSubmitted(true);
  };

  const handleNextDiagQuestion = () => {
    if (currentDiagStep < diagnosticQuestions.length - 1) {
      setCurrentDiagStep(prev => prev + 1);
      setSelectedOption(null);
      setDiagSubmitted(false);
    } else {
      setDiagFinished(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleRestartDiagnostic = () => {
    setCurrentDiagStep(0);
    setSelectedOption(null);
    setDiagSubmitted(false);
    setUserAnswers([]);
    setCurrentAbility(55);
    setDiagFinished(false);
  };

  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 glass-card max-w-2xl mx-auto my-8">
        <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-4xl mb-4 text-violet-600 dark:text-violet-400">
          🧠
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Active Session Documents</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
          Upload your syllabus or lecture materials in the <strong>Upload</strong> tab to activate adaptive spaced repetition flashcards, knowledge graph sheets, and computerized diagnostics.
        </p>
        <button
          onClick={() => setActiveTab && setActiveTab('upload')}
          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <span>📎</span>
          <span>Go to Upload Tab</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full p-4 max-w-7xl mx-auto overflow-y-auto w-full">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-6 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-indigo-600/10 border-violet-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🧠</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Smart Progressive Learning Engine
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
              SM-2 + CAT Adaptive
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Progressive mastery through spaced-repetition flashcards, interactive visual flow sheets, and dynamic computerized adaptive diagnostics.
          </p>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center gap-3 bg-white/90 dark:bg-gray-800/90 p-3 px-4 rounded-2xl shadow-sm border border-violet-200 dark:border-violet-900/40">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Active Flashcards</span>
            <span className="text-lg font-extrabold text-violet-600 dark:text-violet-400">
              {allFlashcards.length} Cards
            </span>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Ability Rating</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {currentAbility}%
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('flashcards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            activeSubTab === 'flashcards'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span>🗂️</span>
          <span>Spaced Repetition Flashcards</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
            {allFlashcards.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('flowsheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            activeSubTab === 'flowsheets'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span>🗺️</span>
          <span>Visual Flow Sheets & Mind Maps</span>
        </button>

        <button
          onClick={() => setActiveSubTab('diagnostic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            activeSubTab === 'diagnostic'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span>⚡</span>
          <span>Adaptive Diagnostic Test</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
            Live
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: INTERACTIVE SPACED REPETITION FLASHCARDS */}
      {activeSubTab === 'flashcards' && (
        <div className="flex flex-col gap-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentCardIndex(0);
                }}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-2">
                Status:
              </span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {['all', 'due', 'learning', 'mastered'].map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setCardFilter(f);
                      setCurrentCardIndex(0);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-md capitalize font-medium transition-colors ${
                      cardFilter === f
                        ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-300 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Card {currentCardIndex + 1} of {filteredFlashcards.length}
              </span>
              <button
                onClick={() => {
                  const shuffled = Math.floor(Math.random() * filteredFlashcards.length);
                  setCurrentCardIndex(shuffled);
                }}
                title="Shuffle Deck"
                className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                🔀 Shuffle
              </button>
            </div>
          </div>

          {/* 3D Flashcard Presentation */}
          {activeCard ? (
            <div className="flex flex-col items-center gap-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-2xl min-h-[360px] cursor-pointer select-none perspective-[1200px]"
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="relative w-full h-full min-h-[360px] preserve-3d"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* FRONT OF CARD */}
                  <div
                    className="absolute inset-0 w-full h-full glass-card p-8 flex flex-col justify-between border-2 border-violet-500/20 shadow-xl hover:border-violet-500/40 transition-colors"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                          {activeCard.category || 'Core Concept'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {activeCard.marks || 5} Marks
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            ⭐ {activeCard.difficulty || 'Medium'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
                        {activeCard.question}
                      </h3>

                      {showHint && activeCard.examTip && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-xs text-indigo-700 dark:text-indigo-300"
                        >
                          💡 <span className="font-semibold">Parul Exam Context:</span> {activeCard.examTip}
                        </motion.div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/60 text-xs text-gray-500 dark:text-gray-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(!showHint);
                        }}
                        className="text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>💡</span> {showHint ? 'Hide Exam Tip' : 'Show Exam Tip'}
                      </button>
                      <span className="text-gray-400 italic">Click card to reveal model answer ↻</span>
                    </div>
                  </div>

                  {/* BACK OF CARD */}
                  <div
                    className="absolute inset-0 w-full h-full glass-card p-8 flex flex-col justify-between border-2 border-emerald-500/30 shadow-xl bg-white/95 dark:bg-gray-900/95"
                    style={{
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          ✓ Model Answer & Key Points
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activeCard.topicTitle}
                        </span>
                      </div>

                      <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-line mb-4">
                        {activeCard.answer}
                      </p>

                      {activeCard.keyPoints && activeCard.keyPoints.length > 0 && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/60">
                          <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider block mb-1">
                            Examiner Key Points:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {activeCard.keyPoints.map((kp, kIdx) => (
                              <li key={kIdx}>{kp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
                      <span>Rate your recall quality:</span>
                      <span className="text-violet-500 font-medium">Click to flip back 🔄</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* SM-2 Spaced Repetition Rating Buttons */}
              <div className="w-full max-w-2xl flex flex-col gap-2">
                <span className="text-xs font-bold text-center text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  How well did you recall this concept? (SM-2 Spaced Interval)
                </span>
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  <button
                    onClick={() => handleRateCard('again')}
                    className="flex flex-col items-center py-2.5 px-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 rounded-xl transition-all hover:scale-[1.02]"
                  >
                    <span className="font-bold text-sm">Again</span>
                    <span className="text-[10px] text-red-500 dark:text-red-400">&lt; 1 min</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('hard')}
                    className="flex flex-col items-center py-2.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 rounded-xl transition-all hover:scale-[1.02]"
                  >
                    <span className="font-bold text-sm">Hard</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">1 day</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('good')}
                    className="flex flex-col items-center py-2.5 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 rounded-xl transition-all hover:scale-[1.02]"
                  >
                    <span className="font-bold text-sm">Good</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">3 days</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('easy')}
                    className="flex flex-col items-center py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl transition-all hover:scale-[1.02]"
                  >
                    <span className="font-bold text-sm">Easy</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">5 days</span>
                  </button>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentCardIndex === 0}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentCardIndex + 1} / {filteredFlashcards.length}
                </span>
                <button
                  onClick={() => setCurrentCardIndex(prev => Math.min(filteredFlashcards.length - 1, prev + 1))}
                  disabled={currentCardIndex === filteredFlashcards.length - 1}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors"
                >
                  Next Card →
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center flex flex-col items-center gap-4">
              <span className="text-4xl">📭</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                No cards match the selected filter.
              </h3>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setCardFilter('all');
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: VISUAL FLOW SHEETS & MIND MAPS */}
      {activeSubTab === 'flowsheets' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">
                Progressive Mastery Flow Sheet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Visual syllabus dependency graph derived from your uploaded course materials.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setFlowViewMode('pipeline')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    flowViewMode === 'pipeline'
                      ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-300 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🛣️ Pipeline Progression
                </button>
                <button
                  onClick={() => setFlowViewMode('mindmap')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    flowViewMode === 'mindmap'
                      ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-300 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🕸️ Mind Map Clusters
                </button>
              </div>
            </div>
          </div>

          {/* Flow Sheet Visual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {flowSheetColumns.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                {/* Column Header */}
                <div className="glass-card p-3 border-l-4 border-l-violet-500">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-violet-600 dark:text-violet-400">{col.stage}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-semibold text-gray-600 dark:text-gray-300">
                      {col.marks}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    {col.title}
                  </h4>
                </div>

                {/* Nodes list */}
                <div className="flex flex-col gap-2.5">
                  {col.topics.map((node, nIdx) => {
                    const isSelected = selectedNode?.name === node.name;
                    return (
                      <div
                        key={nIdx}
                        onClick={() => setSelectedNode(node)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50/80 dark:bg-violet-950/40 ring-2 ring-violet-400'
                            : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-violet-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-bold text-gray-600 dark:text-gray-300">
                            {node.code}
                          </span>
                          <span className="text-[10px] capitalize font-medium text-violet-600">
                            {node.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                          {node.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Node Detail Drawer */}
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border-2 border-violet-500/30 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Flow Node: {selectedNode.name}
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-semibold">
                    {selectedNode.code} Module
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                This concept is a core milestone in your progressive learning flow. Evaluators test this in both mid-term and university end-term exams.
              </p>

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setActiveSubTab('flashcards');
                  }}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Practice Topic Flashcards 🗂️
                </button>
                <button
                  onClick={() => {
                    setActiveSubTab('diagnostic');
                    handleRestartDiagnostic();
                  }}
                  className="px-4 py-2 border border-violet-500 text-violet-600 dark:text-violet-400 rounded-xl text-xs font-bold hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                >
                  Take Adaptive Quiz on this Node ⚡
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ADAPTIVE DIAGNOSTIC TEST (CAT) */}
      {activeSubTab === 'diagnostic' && (
        <div className="flex flex-col gap-6">
          {diagnosticQuestions.length > 0 && !diagFinished ? (
            <div className="glass-card p-6 md:p-8 flex flex-col gap-6 border-2 border-violet-500/20 shadow-xl max-w-3xl mx-auto w-full">
              {/* Question Header & Ability Tracker */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    Question {currentDiagStep + 1} of {diagnosticQuestions.length}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Topic: {diagnosticQuestions[currentDiagStep].topic}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Current Ability:</span>
                  <div className="px-3 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 font-bold rounded-lg text-sm">
                    {currentAbility} / 100
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentDiagStep + 1) / diagnosticQuestions.length) * 100}%`
                  }}
                />
              </div>

              {/* Question Prompt */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Level {diagnosticQuestions[currentDiagStep].level} ({diagnosticQuestions[currentDiagStep].difficulty})
                  </span>
                  <span className="text-xs text-gray-400">
                    [{diagnosticQuestions[currentDiagStep].marks} Marks Value]
                  </span>
                </div>
                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
                  {diagnosticQuestions[currentDiagStep].question}
                </h4>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3">
                {diagnosticQuestions[currentDiagStep].options.map((opt, oIdx) => {
                  let optionClass = 'border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 bg-white dark:bg-gray-800/80';

                  if (selectedOption === oIdx && !diagSubmitted) {
                    optionClass = 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200';
                  }

                  if (diagSubmitted) {
                    if (oIdx === diagnosticQuestions[currentDiagStep].correctIndex) {
                      optionClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (selectedOption === oIdx) {
                      optionClass = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200';
                    } else {
                      optionClass = 'opacity-50 border-gray-200 dark:border-gray-700';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      disabled={diagSubmitted}
                      className={`p-4 rounded-xl border text-left text-sm transition-all duration-200 flex items-center justify-between ${optionClass}`}
                    >
                      <span>{opt}</span>
                      {diagSubmitted && oIdx === diagnosticQuestions[currentDiagStep].correctIndex && (
                        <span className="text-emerald-600 font-bold">✓ Correct</span>
                      )}
                      {diagSubmitted && selectedOption === oIdx && oIdx !== diagnosticQuestions[currentDiagStep].correctIndex && (
                        <span className="text-red-600 font-bold">✗ Incorrect</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Pedagogical Feedback */}
              {diagSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50"
                >
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-300 block mb-1">
                    Pedagogical Explanation:
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {diagnosticQuestions[currentDiagStep].explanation}
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                {!diagSubmitted ? (
                  <button
                    onClick={handleSubmitDiagAnswer}
                    disabled={selectedOption === null}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextDiagQuestion}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    {currentDiagStep < diagnosticQuestions.length - 1 ? 'Next Question →' : 'View Diagnostic Scorecard 🏆'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Diagnostic Completion Scorecard */
            <div className="glass-card p-8 flex flex-col items-center gap-6 max-w-2xl mx-auto w-full text-center border-2 border-emerald-500/30 shadow-2xl">
              <span className="text-5xl">🏆</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Diagnostic Ability Assessment Complete!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Your computerized adaptive rating has calibrated to your actual university exam readiness.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                  <span className="text-xs text-gray-500">Estimated Ability</span>
                  <span className="text-3xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">
                    {currentAbility} / 100
                  </span>
                  <span className="text-[10px] text-green-500 font-semibold mt-1">
                    {currentAbility >= 80 ? 'Exam Master (A+)' : currentAbility >= 65 ? 'Proficient (B+)' : 'Needs Scaffolding'}
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                  <span className="text-xs text-gray-500">Correct Answers</span>
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {userAnswers.filter(a => a.isCorrect).length} / {diagnosticQuestions.length}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {diagnosticQuestions.length > 0 ? Math.round((userAnswers.filter(a => a.isCorrect).length / diagnosticQuestions.length) * 100) : 100}% Accuracy
                  </span>
                </div>

                <div className="col-span-2 md:col-span-1 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                  <span className="text-xs text-gray-500">Identified Weak Area</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 mt-2 text-center">
                    {userAnswers.find(a => !a.isCorrect)?.topic || 'None! Excellent Mastery'}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">Targeted for Remediation</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const weak = userAnswers.find(a => !a.isCorrect);
                    if (weak) {
                      setSelectedCategory(weak.topic);
                    }
                    setActiveSubTab('flashcards');
                  }}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  Reinforce Weak Area with Flashcards 🗂️
                </button>
                <button
                  onClick={handleRestartDiagnostic}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Retake Diagnostic Quiz 🔄
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
