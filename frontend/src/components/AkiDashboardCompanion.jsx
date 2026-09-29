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
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(() => Math.floor(Math.random() * ANIME_CHEER_QUOTES.length));
  const [actionState, setActionState] = useState('idle'); // 'idle' | 'jumping'
  const [emotes, setEmotes] = useState([]);
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

  // Auto-hide speech bubble 3 seconds after each new quote is shown
  useEffect(() => {
    if (!isExpanded) return;
    const hideTimer = setTimeout(() => setIsExpanded(false), 3000);
    return () => clearTimeout(hideTimer);
  }, [currentQuoteIdx]); // only resets timer when quote changes, not on every render


  const activeQuote = ANIME_CHEER_QUOTES[currentQuoteIdx] || ANIME_CHEER_QUOTES[0];

  // Dynamic 100% Automatic Pose Matching based on active quote and anime lore (Default Auto)
  const getAkiPoseImage = () => {
    // 1. Direct pose attribute on quote
    if (activeQuote?.pose) {
      const p = activeQuote.pose.toLowerCase();
      if (p === 'jojo') return '/aki_jojo.png';
      if (p === 'power') return '/aki_power.png';
      if (p === 'jutsu') return '/aki_jutsu.png';
      if (p === 'thinking') return '/aki_thinking.png';
      if (p === 'shy') return '/aki_shy.png';
      if (p === 'sasageyo') return '/aki_sasageyo.png';
      if (p === 'victory') return '/aki_victory.png';
      if (p === 'love') return '/aki_love.png';
      if (p === 'sleeping') return '/aki_sleeping.png';
    }

    const text = ((activeQuote?.romaji || '') + ' ' + (activeQuote?.english || '') + ' ' + (activeQuote?.author || '') + ' ' + (activeQuote?.badge || '') + ' ' + (activeQuote?.sfx || '')).toLowerCase();
    
    // JoJo's Bizarre Adventure (Menacing, Jotaro, Giorno, Dio, Joseph, Ora Ora, Muda Muda)
    if (text.includes('jojo') || text.includes('jotaro') || text.includes('giorno') || text.includes('dio') || text.includes('ora') || text.includes('muda') || text.includes('yare yare') || text.includes('daze') || text.includes('star platinum') || text.includes('bizarre') || text.includes('menacing')) {
      return '/aki_jojo.png';
    }

    // Power-Up / Super Saiyan (Dragon Ball, Genkai toppa, aura, electric energy)
    if (text.includes('genkai') || text.includes('super saiyan') || text.includes('dragon ball') || text.includes('goku') || text.includes('vegeta') || text.includes('power') || text.includes('surpass') || text.includes('unbreakable') || text.includes('toppa')) {
      return '/aki_power.png';
    }

    // Shinobi Jutsu hand signs (Naruto, ninja, chakra, nindo, tiger seal)
    if (text.includes('ninja') || text.includes('naruto') || text.includes('jutsu') || text.includes('shinobi') || text.includes('nindo') || text.includes('dattebayo') || text.includes('hokage') || text.includes('sasuke') || text.includes('kakashi')) {
      return '/aki_jutsu.png';
    }

    // Thinking / Detective genius pose (L, Death Note, Detective Conan, deduction, analysis)
    if (text.includes('think') || text.includes('detective') || text.includes('conan') || text.includes('death note') || text.includes('lawliet') || text.includes('analysis') || text.includes('logic') || text.includes('seikai') || text.includes('strategy') || text.includes('deduction')) {
      return '/aki_thinking.png';
    }

    // Shy / Blushing bashful pose
    if (text.includes('shy') || text.includes('blush') || text.includes('embarrass') || text.includes('sweet') || text.includes('gentle') || text.includes('bashful') || text.includes('komi') || text.includes('hinata') || text.includes('anya')) {
      return '/aki_shy.png';
    }

    // Attack on Titan salute ("Shinzo o Sasageyo!")
    if (text.includes('sasageyo') || text.includes('titan') || text.includes('erwin') || text.includes('eren') || text.includes('scout') || text.includes('dedicate')) {
      return '/aki_sasageyo.png';
    }

    // Victory & Champion peace signs
    if (text.includes('victory') || text.includes('win') || text.includes('katsu') || text.includes('champion') || text.includes('plus ultra') || text.includes('smash') || text.includes('all might') || text.includes('conquer')) {
      return '/aki_victory.png';
    }

    // Love & Heart & Kizuna
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
    setIsExpanded(true); // always show bubble when Aki is clicked

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
      x: (Math.random() - 0.5) * 30,
      y: -10 - Math.random() * 25
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
    /* ── OUTER: fixed width 190px, overflow-hidden, nothing bleeds outside viewport ── */
    <div className="fixed bottom-3 right-3 z-40 select-none flex flex-col items-end pointer-events-none w-[190px] overflow-visible">

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SPEECH BUBBLE — above Aki's head, slides up, fully contained      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex flex-col items-start text-left w-full select-none mb-1"
          >
            {/* ── Controls row (tiny, on top of the text column) ── */}
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              <span className="text-[9px] font-extrabold tracking-wide text-pink-600 dark:text-pink-300 bg-white/75 dark:bg-black/70 px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                🌸 Aki
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowChatInput(!showChatInput); }}
                className="text-[10px] text-gray-700 dark:text-gray-200 hover:text-pink-600 cursor-pointer bg-white/75 dark:bg-black/70 rounded-full px-1.5 py-0.5 backdrop-blur-xs"
                title="Ask Aki a quick study question"
              >💬</button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRedirectToFeedback(); }}
                className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-white/75 dark:bg-black/70 px-1.5 py-0.5 rounded-full backdrop-blur-xs cursor-pointer hover:bg-rose-100"
                title="Report issue to Divyanshu Ji & Squad"
              >🚨</button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 text-[10px] px-1.5 py-0.5 cursor-pointer bg-white/75 dark:bg-black/70 rounded-full backdrop-blur-xs"
                title="Hide speech"
              >✕</button>
            </div>

            {/* ── Chat input mode ── */}
            {showChatInput ? (
              <div
                className="w-full p-2 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-pink-400/40 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {akiChatReply ? (
                  <p className="text-[11px] text-gray-800 dark:text-gray-200 mb-2 leading-snug">
                    🌸 <strong>Aki:</strong> {akiChatReply}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">
                    Ask Aki anything!
                  </p>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSendAkiQuery(); }} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask Aki..."
                    className="flex-1 px-2 py-1 text-xs bg-white dark:bg-gray-950 border border-pink-300 dark:border-pink-800 rounded-lg focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isAskingAki || !userQuery.trim()}
                    className="px-2 py-1 bg-pink-600 text-white font-bold text-[10px] rounded-lg cursor-pointer disabled:opacity-50"
                  >Send</button>
                </form>
              </div>
            ) : (
              /* ── FROSTED GLASS SPEECH BUBBLE — clearly readable above Aki's head ── */
              <div
                className="flex flex-col items-start text-left cursor-pointer bg-white/92 dark:bg-gray-950/92 backdrop-blur-md border border-pink-300/60 dark:border-pink-700/60 rounded-2xl rounded-br-sm px-3 py-2 shadow-lg"
                onClick={handleAkiClick}
                title="Click to cycle quote & watch Aki jump! 🌸"
              >
                {/* 1. ROMAJI on top */}
                <p className="font-mono font-black text-[11px] uppercase tracking-wide text-purple-700 dark:text-purple-300 leading-tight break-words w-full">
                  ⚡ {activeQuote.romaji}
                </p>

                {/* 2. English translation */}
                <p className="font-sans font-semibold text-[11px] text-gray-900 dark:text-white leading-snug mt-1 break-words w-full">
                  "{activeQuote.english}"
                </p>

                {/* 3. Author */}
                <span className="text-[9px] text-gray-500 dark:text-gray-400 font-semibold mt-1">
                  — {activeQuote.author}
                </span>

                {/* 4. Aki voice line */}
                <p className="text-[10px] text-pink-600 dark:text-pink-300 font-medium leading-snug mt-1 break-words w-full">
                  🌸 "{activeQuote.voice}"
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN — AKI FIGURE (fixed right-edge, no overlap with text)  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="pointer-events-auto flex flex-col items-center relative cursor-pointer group overflow-hidden" style={{paddingTop: '40px', marginTop: '-40px'}}>

        {/* Floating Emote Particles — scoped inside Aki's column, no page bleed */}
        <AnimatePresence>
          {emotes.map((em) => (
            <motion.div
              key={em.id}
              initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1.2, x: em.x, y: em.y }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute -top-4 pointer-events-none font-bold text-xs select-none z-50 text-pink-500 whitespace-nowrap drop-shadow-xs"
            >
              {em.icon}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Mascot: Organic Anime Movement + Eye Blink + Trampoline Jump */}
        <motion.div
          animate={
            actionState === 'jumping'
              ? { y: [0, 8, -48, 6, -18, 0], scaleY: [1, 0.72, 1.26, 0.88, 1.05, 1], scaleX: [1, 1.26, 0.84, 1.10, 0.98, 1], rotate: [0, -8, 8, -4, 0] }
              : isTalking
              ? { y: [0, -3, 1, -2, 0], rotate: [0, -2, 2, -1, 0], scaleY: [1, 1.03, 0.98, 1] }
              : { y: [0, -4, 0], scaleY: isBlinking ? [1, 0.96, 1] : [1, 1.025, 1], scaleX: [1, 0.99, 1], rotate: [0, 1.2, -1.2, 0] }
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
          title="Click Aki to jump & cheer! 🌸"
        >
          <div className="w-24 h-32 sm:w-28 sm:h-36 relative flex items-center justify-center">
            <motion.img
              key={currentPoseImg}
              initial={{ opacity: 0.85, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1, scaleY: isBlinking ? 0.96 : 1 }}
              transition={{ duration: 0.18 }}
              src={currentPoseImg}
              alt="Aki - Anime Companion"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xl transition-transform group-hover:scale-105"
            />
          </div>

          {/* Ground shadow */}
          <motion.div
            animate={
              actionState === 'jumping'
                ? { scale: [1, 1.3, 0.4, 1.1, 0.7, 1], opacity: [0.35, 0.45, 0.12, 0.4, 0.2, 0.35] }
                : { scale: [1, 0.85, 1], opacity: [0.35, 0.25, 0.35] }
            }
            transition={
              actionState === 'jumping'
                ? { duration: 0.9, ease: "easeInOut" }
                : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
            }
            className="w-14 h-2 rounded-full bg-black/40 blur-xs mt-0.5"
          />
        </motion.div>

        {/* Pill toggle to show/hide speech */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 px-2.5 py-0.5 rounded-full bg-pink-500/90 hover:bg-pink-600 text-white font-extrabold text-[9px] shadow-md backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
          title={isExpanded ? 'Hide Aki speech' : 'Show Aki speech'}
        >
          <span>🌸</span>
          <span>Aki {isExpanded ? '▾' : '▴'}</span>
        </div>
      </div>

    </div>
  );
}
