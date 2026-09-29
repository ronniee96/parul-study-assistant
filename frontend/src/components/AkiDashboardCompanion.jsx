import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIME_CHEER_QUOTES } from '../utils/animeQuotes';

// Client-side Web Audio API synthesizer for adorable anime chime sound on click
function playAnimeSparkleChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Sweet pentatonic sparkle chords (A5 -> C#6 -> E6 -> A6)
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
    // Audio context may require user gesture
  }
}

export default function AkiDashboardCompanion({
  appState = {},
  setActiveTab = () => {},
  apiKeys = {}
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(() => Math.floor(Math.random() * ANIME_CHEER_QUOTES.length));
  const [actionState, setActionState] = useState('idle'); // 'idle' | 'jumping'
  const [emotes, setEmotes] = useState([]);
  const [manualPose, setManualPose] = useState(null); // null (auto) | '/aki_sasageyo.png' | '/aki_victory.png' | '/aki_love.png' | '/aki.png'
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [isAskingAki, setIsAskingAki] = useState(false);
  const [akiChatReply, setAkiChatReply] = useState(null);

  // Natural Eye Blinking cycle every 3.8 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  const activeQuote = ANIME_CHEER_QUOTES[currentQuoteIdx] || ANIME_CHEER_QUOTES[0];

  // Dynamic Pose Matching based on active quote or state
  const getAkiPoseImage = () => {
    if (manualPose) return manualPose;
    const text = ((activeQuote?.romaji || '') + ' ' + (activeQuote?.english || '') + ' ' + (activeQuote?.author || '')).toLowerCase();
    
    // Attack on Titan salute ("Shinzo o Sasageyo!")
    if (text.includes('sasageyo') || text.includes('titan') || text.includes('erwin') || text.includes('eren')) {
      return '/aki_sasageyo.png';
    }
    // Victory & Champion peace signs
    if (text.includes('victory') || text.includes('win') || text.includes('katsu') || text.includes('champion') || text.includes('plus ultra') || text.includes('smash')) {
      return '/aki_victory.png';
    }
    // Love & Heart & Kindness
    if (text.includes('love') || text.includes('heart') || text.includes('kizuna') || text.includes('kindness') || text.includes('believe') || text.includes('peace') || text.includes('yume')) {
      return '/aki_love.png';
    }
    return '/aki.png';
  };

  const currentPoseImg = getAkiPoseImage();

  // Trigger high-energy interactive click action on Aki
  const handleAkiClick = () => {
    playAnimeSparkleChime();
    setActionState('jumping');
    setIsTalking(true);

    // Randomize to a brand-new quote from the 50 quotes!
    setCurrentQuoteIdx(prev => {
      let next;
      do {
        next = Math.floor(Math.random() * ANIME_CHEER_QUOTES.length);
      } while (next === prev && ANIME_CHEER_QUOTES.length > 1);
      return next;
    });

    // Burst ONLY English & Romaji cheer emotes (NO Japanese characters!)
    const emoteIcons = ['✨', '💖', '⭐', '🌸', '🎉', 'GANBARE! 🔥', 'FIGHT! 💪', 'LET\'S GO! 🚀', 'PLUS ULTRA! ⚡', 'YOU GOT THIS! ⭐', 'SASAGEYO! ⚔️'];
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
      setIsTalking(false);
    }, 1400);
  };

  // Redirect to Rohan's Feedback Form
  const handleRedirectToFeedback = () => {
    setActiveTab('settings');
    setTimeout(() => {
      const el = document.getElementById('student-feedback-form');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.classList.add('ring-4', 'ring-pink-500', 'transition-all');
        setTimeout(() => el.classList.remove('ring-4', 'ring-pink-500'), 3000);
      }
    }, 250);
  };

  // Ask Aki AI Agent (Google Antigravity & Study Agent)
  const handleSendAkiQuery = async (customPrompt) => {
    const q = customPrompt || userQuery;
    if (!q || !q.trim()) return;

    setIsAskingAki(true);
    handleAkiClick();

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
        setAkiChatReply(data.response || data.message || "Aki processed your request!");
      } else {
        throw new Error("Offline fallback");
      }
    } catch {
      setAkiChatReply("Daijoubu! Aki is right here with you! Let's conquer this semester exam together! 🌸💪");
    } finally {
      setIsAskingAki(false);
      setUserQuery('');
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-40 select-none flex flex-col items-end pointer-events-none">
      
      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* COMPACT MANGA / ANIME CHAT BUBBLE (LIGHTWEIGHT, NO HEAVY OVERWHELM)   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mb-2 w-[280px] sm:w-[320px] rounded-2xl p-3 sm:p-3.5 backdrop-blur-md bg-white/85 dark:bg-gray-950/85 border border-pink-400/40 dark:border-pink-500/30 shadow-[0_8px_24px_rgba(244,114,182,0.18)] text-gray-800 dark:text-gray-100 flex flex-col gap-2 relative"
          >
            {/* Speech Bubble Arrow Tail pointing down right towards Aki */}
            <div className="absolute -bottom-2 right-10 w-0 h-0 border-x-6 border-x-transparent border-t-8 border-t-white/85 dark:border-t-gray-950/85 drop-shadow-xs"></div>

            {/* Compact Header: Name, Mood & Minimize */}
            <div className="flex items-center justify-between border-b border-pink-200/50 dark:border-pink-900/40 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🌸</span>
                <span className="font-extrabold text-xs tracking-wide bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
                  Aki
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-100/90 dark:bg-pink-950/90 text-pink-700 dark:text-pink-300 font-bold border border-pink-300/40">
                  {activeQuote.badge?.split(' ')[0] || '🌸'} Cheer
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowChatInput(!showChatInput)}
                  className={`p-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                    showChatInput ? 'bg-pink-600 text-white' : 'text-gray-500 hover:text-pink-600'
                  }`}
                  title="Ask Aki a quick study question"
                >
                  💬
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 text-[11px] cursor-pointer"
                  title="Minimize chat box"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* CHAT CONTENT */}
            {showChatInput ? (
              /* Quick Question Chat Mode */
              <div className="flex flex-col gap-2 py-1">
                {akiChatReply ? (
                  <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-400/30 text-[11px] leading-relaxed text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                    🌸 <strong>Aki:</strong> {akiChatReply}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-600 dark:text-gray-400">
                    Ask Aki anything about exam prep, 10-mark blueprints, or Antigravity!
                  </p>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAkiQuery();
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask Aki a quick question..."
                    className="flex-1 px-2.5 py-1 bg-white/90 dark:bg-gray-900/90 border border-pink-300/60 dark:border-pink-800 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  <button
                    type="submit"
                    disabled={isAskingAki || !userQuery.trim()}
                    className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    {isAskingAki ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            ) : (
              /* Compact Anime Cheer Card: ENGLISH ON TOP, BIG BOLD ROMAJI SECOND */
              <div className="flex flex-col gap-1.5 py-0.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-300/40 dark:border-pink-800/40 text-center">
                  {/* 1. ENGLISH TRANSLATION IN BIG BOLD LETTERS ON TOP */}
                  <p className="font-black text-xs sm:text-sm tracking-wide uppercase bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-300 dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent font-sans">
                    "{activeQuote.english}"
                  </p>

                  {/* 2. BIG BOLD ROMAJI CATCHPHRASE (EASY TO READ & CHANT) */}
                  <p className="text-[11px] sm:text-xs font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wider mt-0.5 font-mono">
                    ⚡ {activeQuote.romaji}
                  </p>

                  {/* 3. SUBTLE AUTHOR / SOURCE */}
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 block mt-1 font-medium">
                    — {activeQuote.author}
                  </span>
                </div>

                {/* Aki's Short Cheering Voice Line */}
                <p className="text-[10px] text-gray-700 dark:text-gray-300 leading-snug px-0.5">
                  🌸 <strong>Aki:</strong> "{activeQuote.voice}"
                </p>

                {/* Compact Action Buttons */}
                <div className="flex items-center justify-between pt-1 gap-1">
                  <button
                    onClick={handleAkiClick}
                    className="flex-1 py-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-[10px] rounded-lg shadow-2xs transition-transform hover:scale-102 active:scale-98 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>🎲</span>
                    <span>Next Cheer! ✨</span>
                  </button>

                  <button
                    onClick={handleRedirectToFeedback}
                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-300/60 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[9px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Facing any problem on the website? Redirect to Rohan's issue form!"
                  >
                    <span>🚨</span>
                    <span>Issue?</span>
                  </button>
                </div>

                {/* Interactive Pose Switcher Pills */}
                <div className="flex items-center justify-center gap-1 pt-0.5 border-t border-pink-100 dark:border-pink-950/60">
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Pose:</span>
                  <button
                    onClick={() => setManualPose('/aki_sasageyo.png')}
                    className={`px-1.5 py-0.2 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                      manualPose === '/aki_sasageyo.png' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-indigo-600'
                    }`}
                    title="Shinzo o Sasageyo! (Attack on Titan salute)"
                  >
                    ⚔️ Sasageyo
                  </button>
                  <button
                    onClick={() => setManualPose('/aki_victory.png')}
                    className={`px-1.5 py-0.2 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                      manualPose === '/aki_victory.png' ? 'bg-pink-600 text-white' : 'text-gray-500 hover:text-pink-600'
                    }`}
                    title="Victory peace sign"
                  >
                    ✌️ Victory
                  </button>
                  <button
                    onClick={() => setManualPose('/aki_love.png')}
                    className={`px-1.5 py-0.2 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                      manualPose === '/aki_love.png' ? 'bg-rose-600 text-white' : 'text-gray-500 hover:text-rose-600'
                    }`}
                    title="Finger heart love sign"
                  >
                    💖 Love
                  </button>
                  <button
                    onClick={() => setManualPose(null)}
                    className={`px-1 py-0.2 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                      manualPose === null ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-purple-600'
                    }`}
                    title="Auto-match pose to quote"
                  >
                    Auto
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* REALISTIC ANIMATED ANIME MASCOT (AKI) WITH POSES, EYE BLINK & BOB   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="pointer-events-auto flex flex-col items-center relative cursor-pointer group">
        
        {/* Floating Emote Particles during Jump (ONLY English / Romaji emojis) */}
        <AnimatePresence>
          {emotes.map((em) => (
            <motion.div
              key={em.id}
              initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1.25, x: em.x, y: em.y }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute -top-4 pointer-events-none font-bold text-xs sm:text-sm select-none z-50 text-pink-500 whitespace-nowrap drop-shadow-xs"
            >
              {em.icon}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Mascot Wrapper with Organic Anime Movement, Eye Blink & Trampoline Jump */}
        <motion.div
          animate={
            actionState === 'jumping'
              ? {
                  y: [0, 8, -48, 6, -18, 0],
                  scaleY: [1, 0.72, 1.26, 0.88, 1.05, 1],
                  scaleX: [1, 1.26, 0.84, 1.10, 0.98, 1],
                  rotate: [0, -8, 8, -4, 0]
                }
              : isTalking
              ? {
                  // Lively rhythmic bob while speaking / cheering
                  y: [0, -3, 1, -2, 0],
                  rotate: [0, -2, 2, -1, 0],
                  scaleY: [1, 1.03, 0.98, 1]
                }
              : {
                  // Gentle organic anime breathing & hair sway
                  y: [0, -4, 0],
                  scaleY: isBlinking ? [1, 0.96, 1] : [1, 1.025, 1],
                  scaleX: [1, 0.99, 1],
                  rotate: [0, 1.2, -1.2, 0]
                }
          }
          transition={
            actionState === 'jumping'
              ? { duration: 0.9, ease: "easeInOut" }
              : isTalking
              ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
              : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
          }
          onClick={handleAkiClick}
          className="relative flex flex-col items-center"
          title="Click Aki to make her jump & cheer with cool quotes! 🌸"
        >
          {/* Dynamic Anime Mascot Image with smooth pose transitions */}
          <div className="w-24 h-32 sm:w-28 sm:h-36 relative flex items-center justify-center">
            <motion.img
              key={currentPoseImg}
              initial={{ opacity: 0.85, scale: 0.97 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                // Eye blink micro-squash
                scaleY: isBlinking ? 0.96 : 1
              }}
              transition={{ duration: 0.18 }}
              src={currentPoseImg}
              alt="Aki - Anime Companion"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xl transition-transform group-hover:scale-105"
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
            className="w-14 h-2 rounded-full bg-black/40 blur-xs mt-0.5"
          />
        </motion.div>

        {/* Minimalist Floating Pill Toggle */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 px-2.5 py-0.8 rounded-full bg-pink-500/90 hover:bg-pink-600 text-white font-extrabold text-[9px] shadow-md backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
          title={isExpanded ? "Collapse chat bubble" : "Open chat bubble"}
        >
          <span>🌸</span>
          <span>Aki {isExpanded ? '▾' : '▴'}</span>
        </div>
      </div>

    </div>
  );
}
