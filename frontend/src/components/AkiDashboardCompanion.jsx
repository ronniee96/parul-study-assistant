import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Authentic Japanese & English anime cheer quotes with Kanji, Romaji, and English translation
export const AKI_CHEER_QUOTES = [
  {
    id: 'q-1',
    kanji: "限界を超えろ！今ここで！",
    romaji: "Genkai o koero! Ima koko de!",
    english: "Surpass your limits! Right here, right now!",
    author: "Yami Sukehiro — Black Clover (ブラッククローバー)",
    badge: "⚡ Plus Ultra Spirit",
    color: "from-amber-400 via-orange-500 to-red-500",
    glow: "rgba(245, 158, 11, 0.4)",
    sfx: "Genkai Toppa! (限界突破！)",
    voice: "Push through that last topic! You have the brains and the grit to crush this syllabus! 💥📚"
  },
  {
    id: 'q-2',
    kanji: "お前の信じる、お前を信じろ！",
    romaji: "Omae no shinjiru, omae o shinjiro!",
    english: "Believe in the you that believes in yourself!",
    author: "Kamina — Gurren Lagann (天元突破グレンラガン)",
    badge: "🔥 Unstoppable Drive",
    color: "from-red-500 via-rose-500 to-pink-500",
    glow: "rgba(239, 68, 68, 0.4)",
    sfx: "Gattai da~! (合体だー！)",
    voice: "Trust your preparation. Even if an exam question looks scary, trust your instincts and knowledge! 🔥✨"
  },
  {
    id: 'q-3',
    kanji: "諦めたらそこで試合終了ですよ",
    romaji: "Akirametara soko de shiai shūryō desu yo",
    english: "If you give up now, the game is already over.",
    author: "Coach Anzai — Slam Dunk (スラムダンク)",
    badge: "🏆 Champion Mentality",
    color: "from-emerald-400 via-teal-500 to-cyan-500",
    glow: "rgba(16, 185, 129, 0.4)",
    sfx: "Katsu zo~! (勝つぞー！)",
    voice: "Stay calm when reading Section C case studies. Break down the problem step-by-step and capture every mark! 🏀🎯"
  },
  {
    id: 'q-4',
    kanji: "勝つまで諦めない、それが俺の忍道だ！",
    romaji: "Katsu made akiramenai, sore ga ore no nindō da!",
    english: "Never giving up until I win — that is my ninja way!",
    author: "Naruto Uzumaki (NARUTO -ナルト-)",
    badge: "🍥 Shinobi Determination",
    color: "from-orange-400 via-amber-500 to-yellow-500",
    glow: "rgba(249, 115, 22, 0.4)",
    sfx: "Dattebayo~! (だってばよ！)",
    voice: "Believe it! You've prepared thoroughly with the AI squad. You have the exact knowledge needed to ace this test! 🍥⚔️"
  },
  {
    id: 'q-5',
    kanji: "さらに向こうへ、Plus Ultra！",
    romaji: "Sara ni mukō e, Purusu Urutora!",
    english: "Go beyond, Plus Ultra!",
    author: "All Might — My Hero Academia (僕のヒーローアカデミア)",
    badge: "🦸 Heroic Courage",
    color: "from-blue-500 via-indigo-500 to-violet-500",
    glow: "rgba(99, 102, 241, 0.4)",
    sfx: "Plus Ultra! (更に向こうへ！)",
    voice: "Give your 100% and then give one more push! Outstanding marks are waiting for you! 🌟🦸‍♂️"
  },
  {
    id: 'q-6',
    kanji: "未来は今、君の手の中にある",
    romaji: "Mirai wa ima, kimi no te no naka ni aru",
    english: "The future is right here in your hands.",
    author: "Steins;Gate (シュタインズ・ゲート)",
    badge: "🌌 Divergence 1.048%",
    color: "from-cyan-400 via-sky-500 to-blue-500",
    glow: "rgba(14, 165, 233, 0.4)",
    sfx: "El Psy Kongroo! (運命石の扉)",
    voice: "Every minute of study recalibrates your future towards success! Top semester scores are in your destiny! ⏱️🌌"
  },
  {
    id: 'q-7',
    kanji: "一期一会",
    romaji: "Ichigo Ichie",
    english: "Treasure this moment — each encounter happens only once.",
    author: "Classical Japanese Proverb (茶道 一期一会)",
    badge: "🌸 Zen Serenity",
    color: "from-pink-400 via-fuchsia-500 to-purple-500",
    glow: "rgba(236, 72, 153, 0.4)",
    sfx: "Kizuna~! (絆！)",
    voice: "Take a deep breath and center your focus. Your preparation is your masterpiece — let it shine gracefully! 🍵🌸"
  },
  {
    id: 'q-8',
    kanji: "心臓を捧げよ！",
    romaji: "Shinzō o sasageyo!",
    english: "Dedicate your heart with absolute conviction!",
    author: "Commander Erwin — Attack on Titan (進撃の巨人)",
    badge: "⚔️ Titan Conqueror",
    color: "from-indigo-500 via-purple-600 to-slate-700",
    glow: "rgba(99, 102, 241, 0.4)",
    sfx: "Sasageyo~! (捧げよー！)",
    voice: "Dedicate full focus to your 3-hour exam! Clear all doubts, cite core theories, and conquer the semester! 🛡️⚡"
  }
];

// Client-side Web Audio API synthesizer for adorable anime chime sound on click
function playAnimeSparkleChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Sweet pentatonic sparkle chords (A5 -> C#6 -> E6)
    const notes = [880, 1108.73, 1318.51, 1760];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.36);
    });
  } catch (e) {
    // Audio context may be restricted by browser policy before first interaction
  }
}

export default function AkiDashboardCompanion({
  appState = {},
  setActiveTab = () => {},
  apiKeys = {}
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(0);
  const [actionState, setActionState] = useState('idle'); // 'idle' | 'jumping'
  const [emotes, setEmotes] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [isAskingAki, setIsAskingAki] = useState(false);
  const [akiResponse, setAkiResponse] = useState(null);
  const [activeSpeechTab, setActiveSpeechTab] = useState('quote'); // 'quote' | 'context' | 'chat'

  // Pick random quote on initial mount
  useEffect(() => {
    setCurrentQuoteIdx(Math.floor(Math.random() * AKI_CHEER_QUOTES.length));
  }, []);

  const activeQuote = AKI_CHEER_QUOTES[currentQuoteIdx] || AKI_CHEER_QUOTES[0];

  const hasContext = Boolean(
    appState?.uploadedFile ||
    (appState?.uploadedFiles && appState?.uploadedFiles.length > 0) ||
    appState?.extractedText
  );

  const documentName = appState?.uploadedFiles?.[0]?.name || appState?.uploadedFile?.name || 'Syllabus PDF';
  const wordCount = appState?.extractedText ? appState.extractedText.split(/\s+/).filter(Boolean).length : 0;

  // Trigger Aki's dynamic jump, sound chime, emotes, and cycle to next quote!
  const handleAkiClick = () => {
    playAnimeSparkleChime();
    setActionState('jumping');

    // Cycle to next quote
    setCurrentQuoteIdx(prev => (prev + 1) % AKI_CHEER_QUOTES.length);

    // Burst 6 cute floating emotes
    const emoteIcons = ['✨', '💖', '⭐', '🌸', '🎉', '「がんばれー！」', '💫', '🔥'];
    const newEmotes = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      icon: emoteIcons[Math.floor(Math.random() * emoteIcons.length)],
      x: (Math.random() - 0.5) * 80,
      y: -20 - Math.random() * 50
    }));
    setEmotes(newEmotes);

    setTimeout(() => {
      setActionState('idle');
      setEmotes([]);
    }, 1200);
  };

  // Ask Aki AI (Google Antigravity & Study Agent)
  const handleSendAkiQuery = async (customPrompt) => {
    const q = customPrompt || userQuery;
    if (!q || !q.trim()) return;

    setIsAskingAki(true);
    handleAkiClick();
    setActiveSpeechTab('chat');

    try {
      const res = await fetch('/api/v1/aki/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q.trim(),
          context: appState?.extractedText || '',
          api_key: apiKeys?.gemini || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAkiResponse({
          question: q.trim(),
          answer: data.response || "Aki processed your request!",
          targetTab: data.targetTab || 'squad'
        });
      } else {
        throw new Error("Offline fallback");
      }
    } catch {
      // Offline fallback
      const lower = q.toLowerCase();
      let ans = "I'm right here with you! Let's conquer this semester exam together! 🌸✨";
      let tab = 'predictor';

      if (lower.includes('antigravity') || lower.includes('agent')) {
        ans = "Google Antigravity is a next-generation agent-first environment! It unifies Editor View, terminal executions, and browser inspection into collaborative multi-agent workflows.";
        tab = 'squad';
      } else if (lower.includes('case study') || lower.includes('10 mark')) {
        ans = "For 10-mark case studies, use the 4-stage Parul Blueprint: Executive Intro → ASCII Diagram Framework → Deep Analysis → Managerial Takeaway.";
        tab = 'answers';
      } else if (lower.includes('predict') || lower.includes('question')) {
        ans = "You can view Bloom's Taxonomy weighted predictions in the Exam Predictor tab!";
        tab = 'predictor';
      }

      setAkiResponse({
        question: q.trim(),
        answer: ans,
        targetTab: tab
      });
    } finally {
      setIsAskingAki(false);
      setUserQuery('');
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-40 select-none flex flex-col items-end pointer-events-none">
      
      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* FLOATING TRANSPARENT SPEECH / QUOTE / CONTEXT CARD                   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto mb-2 w-[340px] sm:w-[410px] rounded-3xl p-4 sm:p-5 backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border border-pink-400/40 dark:border-pink-500/30 shadow-[0_8px_32px_rgba(244,114,182,0.2)] text-gray-800 dark:text-gray-100 flex flex-col gap-3 relative overflow-hidden"
          >
            {/* Ambient anime gradient glow in top corner */}
            <div 
              className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ background: activeQuote.glow }}
            />

            {/* Header: Name, Tabs & Minimize Button */}
            <div className="flex items-center justify-between gap-2 border-b border-pink-200/50 dark:border-pink-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌸</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      Aki (秋)
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-pink-100/80 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 font-bold text-[9px] border border-pink-300/60 dark:border-pink-800">
                      Antigravity AI
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    Study Assistant & Exam Companion
                  </span>
                </div>
              </div>

              {/* Sub-tabs: Cheer Quote vs PDF Context vs Ask */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveSpeechTab('quote')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeSpeechTab === 'quote'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-100/50 dark:hover:bg-pink-950/50'
                  }`}
                  title="Cheer Quote"
                >
                  💬 Cheer
                </button>
                <button
                  onClick={() => setActiveSpeechTab('context')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeSpeechTab === 'context'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-100/50 dark:hover:bg-pink-950/50'
                  }`}
                  title="PDF Context Radar"
                >
                  🧠 Radar
                </button>
                <button
                  onClick={() => setActiveSpeechTab('chat')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeSpeechTab === 'chat'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-100/50 dark:hover:bg-pink-950/50'
                  }`}
                  title="Ask Antigravity AI"
                >
                  ⚡ Ask
                </button>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 text-xs cursor-pointer ml-1"
                  title="Minimize Aki to desk mascot"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ─── TAB 1: DYNAMIC ANIME CHEER QUOTE ─── */}
            {activeSpeechTab === 'quote' && (
              <div className="flex flex-col gap-2.5">
                {/* Anime Badge & SFX */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-full font-bold bg-pink-100/80 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border border-pink-300/40">
                    {activeQuote.badge}
                  </span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold italic text-[11px]">
                    {activeQuote.sfx}
                  </span>
                </div>

                {/* Japanese Kanji Quote (Cool glowing calligraphy card) */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-300/30 dark:border-pink-700/30 text-center relative overflow-hidden">
                  <p className="font-extrabold text-base sm:text-lg tracking-wide bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-300 dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent font-sans">
                    「{activeQuote.kanji}」
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider mt-0.5">
                    {activeQuote.romaji}
                  </p>
                  <p className="text-xs text-gray-800 dark:text-gray-200 font-semibold mt-1.5 italic">
                    "{activeQuote.english}"
                  </p>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-1 font-medium">
                    — {activeQuote.author}
                  </span>
                </div>

                {/* Aki's Personal Cheering Voice Line */}
                <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-snug">
                  🌸 <strong>Aki:</strong> "{activeQuote.voice}"
                </p>

                {/* Next Quote & Quick Action Buttons */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <button
                    onClick={handleAkiClick}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <span>🎲</span>
                    <span>Next Quote / もう一度</span>
                  </button>

                  <button
                    onClick={() => setActiveSpeechTab('context')}
                    className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                  >
                    Check PDF Radar →
                  </button>
                </div>
              </div>
            )}

            {/* ─── TAB 2: LIVE CONTEXT RADAR & REDIRECTIONS ─── */}
            {activeSpeechTab === 'context' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                    <span>🧠</span> Syllabus Context Radar:
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    hasContext
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {hasContext ? '✓ PDF Loaded' : '○ Out of Context'}
                  </span>
                </div>

                {hasContext ? (
                  <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                    <p className="text-[11px] text-gray-800 dark:text-gray-200">
                      🌸 <strong>Synchronized!</strong> Indexed <em className="font-semibold text-indigo-600 dark:text-indigo-400">{documentName}</em> ({wordCount} words). Let me take you anywhere:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => setActiveTab('predictor')}
                        className="px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        🎯 Predict Exam Paper
                      </button>
                      <button
                        onClick={() => setActiveTab('questions')}
                        className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        ❓ Question Bank
                      </button>
                      <button
                        onClick={() => setActiveTab('summary')}
                        className="px-2 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        📝 1-Page Summary
                      </button>
                      <button
                        onClick={() => setActiveTab('answers')}
                        className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        ✅ Top 25 Answer Bank
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30">
                    <p className="text-[11px] text-gray-800 dark:text-gray-200">
                      💭 <em>No slides in memory yet! (・_・;)</em> Upload your syllabus PDF, or let me redirect you to explore the study platform:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="px-2 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        📎 Upload Syllabus PDF
                      </button>
                      <button
                        onClick={() => setActiveTab('predictor')}
                        className="px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        🎯 Exam Predictor Hub
                      </button>
                      <button
                        onClick={() => setActiveTab('research')}
                        className="px-2 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        🌐 Research Hub
                      </button>
                      <button
                        onClick={() => setActiveTab('capture')}
                        className="px-2 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] text-center shadow-2xs cursor-pointer"
                      >
                        📸 Screen Capture
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 3: ASK AKI (GOOGLE ANTIGRAVITY & STUDY AGENT) ─── */}
            {activeSpeechTab === 'chat' && (
              <div className="flex flex-col gap-2.5">
                {akiResponse ? (
                  <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-400/30 flex flex-col gap-2 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between text-[11px] font-bold text-pink-700 dark:text-pink-300">
                      <span>🌸 Aki's Intelligence Answer:</span>
                      <button
                        onClick={() => setAkiResponse(null)}
                        className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                      {akiResponse.answer}
                    </p>
                    {akiResponse.targetTab && (
                      <button
                        onClick={() => setActiveTab(akiResponse.targetTab)}
                        className="self-start px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Take me to {akiResponse.targetTab.toUpperCase()} →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ⚡ Quick Antigravity Prompts:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "How do I score 10/10 in Case Studies?",
                        "Explain Google Antigravity Agent workflows",
                        "Show 6-Agent AI Squad personas"
                      ].map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendAkiQuery(prompt)}
                          className="px-2 py-0.5 rounded-lg bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 text-[10px] font-medium text-pink-700 dark:text-pink-300 hover:bg-pink-100 cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Prompt Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAkiQuery();
                  }}
                  className="flex items-center gap-1.5 pt-1"
                >
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask Aki anything (Antigravity, 10M case studies, formulas)..."
                    className="flex-1 px-3 py-1.5 bg-white/80 dark:bg-gray-900/80 border border-pink-300/60 dark:border-pink-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 font-sans"
                  />
                  <button
                    type="submit"
                    disabled={isAskingAki || !userQuery.trim()}
                    className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{isAskingAki ? '⚡' : '🚀'}</span>
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* CUTE ANIMATED ANIME FIGURINE (AKI) WITH JUMP & 3D GROUND SHADOW      */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="pointer-events-auto flex flex-col items-center relative cursor-pointer group">
        
        {/* Floating Emote Particles during Jump */}
        <AnimatePresence>
          {emotes.map((em) => (
            <motion.div
              key={em.id}
              initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1.25, x: em.x, y: em.y }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute -top-4 pointer-events-none font-bold text-lg select-none z-50 text-pink-500"
            >
              {em.icon}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Mascot Wrapper with Trampoline Jump Animation */}
        <motion.div
          animate={
            actionState === 'jumping'
              ? {
                  y: [0, 8, -48, 6, -18, 0],
                  scaleY: [1, 0.72, 1.26, 0.88, 1.05, 1],
                  scaleX: [1, 1.26, 0.84, 1.10, 0.98, 1],
                  rotate: [0, -8, 8, -4, 0]
                }
              : {
                  y: [0, -6, 0],
                  rotate: [0, 1, -1, 0]
                }
          }
          transition={
            actionState === 'jumping'
              ? { duration: 0.9, ease: "easeInOut" }
              : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
          }
          onClick={handleAkiClick}
          className="relative flex flex-col items-center"
          title="Click Aki to make her jump & cheer with cool quotes! 🌸"
        >
          {/* Chibi Anime Mascot Image */}
          <div className="w-28 h-36 sm:w-32 sm:h-40 relative flex items-center justify-center">
            <img
              src="/aki.png"
              alt="Aki - Anime Companion"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-2xl transition-transform group-hover:scale-105"
            />
          </div>

          {/* Dynamic 3D Ground Shadow */}
          <motion.div
            animate={
              actionState === 'jumping'
                ? {
                    scale: [1, 1.3, 0.4, 1.1, 0.7, 1],
                    opacity: [0.35, 0.45, 0.12, 0.4, 0.2, 0.35]
                  }
                : {
                    scale: [1, 0.85, 1],
                    opacity: [0.35, 0.25, 0.35]
                  }
            }
            transition={
              actionState === 'jumping'
                ? { duration: 0.9, ease: "easeInOut" }
                : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
            }
            className="w-16 h-2.5 rounded-full bg-black/40 blur-xs mt-0.5"
          />
        </motion.div>

        {/* Minimalist Floating Pill Toggle */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 px-3 py-1 rounded-full bg-pink-500/90 hover:bg-pink-600 text-white font-extrabold text-[10px] shadow-lg backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
          title={isExpanded ? "Collapse quote desk" : "Open quote desk"}
        >
          <span>🌸</span>
          <span>Aki {isExpanded ? '▾' : '▴'}</span>
        </div>
      </div>

    </div>
  );
}
