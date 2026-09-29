import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/apiClient';

// Easy, funny, student-friendly Romaji & English greetings
const FUNNY_AWAKE_GREETINGS = [
  {
    greeting: "Fuwaaaa~ (Big Yawn)! Konnichiwa! 🌸",
    voice: "Aki is wide awake and fully energized! What syllabus topic are we destroying today? Let's get full marks on that test! 🚀📚",
    badge: "⚡ 100% Energy"
  },
  {
    greeting: "Ohayo gozaimasu! Eh?! Exam is near?! (O_O)",
    voice: "Daijoubu (no panic)! Aki-chan has your back with Section A, B, and C blueprints! Drop your PDF below and let's get to work! 🎯✨",
    badge: "🛡️ Zero Panic"
  },
  {
    greeting: "Yaho~! Aki reporting for duty! 🌸",
    voice: "Did somebody ask for 10/10 marks in case studies? Hand over your lecture slides and let's turn them into top semester scores! 🏆📝",
    badge: "📝 10/10 Case Studies"
  },
  {
    greeting: "Sugoi! You woke me up just in time! (≧◡≦)",
    voice: "Sleep mode OFF, genius study mode ON! Let's generate 300 practice questions and a 1-page fast revision cheat sheet! 💡✨",
    badge: "🧠 Genius Mode"
  },
  {
    greeting: "Ikimasho~! (Let's goooo!) 🏃‍♀️💨",
    voice: "Aki's Antigravity AI brain is synchronized with Parul University syllabi! Tell me what task you want me to do! 💖🔥",
    badge: "🔥 Ready to Ace"
  },
  {
    greeting: "Moshimoshi! Aki is online! 📱🌸",
    voice: "Ready to study like a champion? Upload your course notes or let me predict your end-term question paper right now! 🎓🌟",
    badge: "🌟 Top Ranker"
  }
];

// Client-side Web Audio API chime synthesizer for wake-up sparkle
function playWakeUpChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1108.73, 1318.51, 1760]; // E5 -> A5 -> C#6 -> E6 -> A6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.39);
    });
  } catch (e) {
    // Audio context may be muted or require user gesture
  }
}

export default function AkiFrontpageHero({ setActiveTab, scrollToUpload }) {
  const [isAwake, setIsAwake] = useState(false);
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [actionState, setActionState] = useState('idle'); // 'idle' | 'waking'
  const [emotes, setEmotes] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [isExecutingTask, setIsExecutingTask] = useState(false);
  const [taskResponse, setTaskResponse] = useState(null);

  // Trigger Aki Wake-up Action
  const handleWakeUp = () => {
    playWakeUpChime();
    setIsAwake(true);
    setActionState('waking');
    setGreetingIdx(prev => (prev + 1) % FUNNY_AWAKE_GREETINGS.length);

    // Burst cute wake-up emotes
    const emoteIcons = ['⭐', '🌸', '✨', '💖', '❗', '🎉', '💫', '(O_O)/'];
    const newEmotes = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      icon: emoteIcons[Math.floor(Math.random() * emoteIcons.length)],
      x: (Math.random() - 0.5) * 90,
      y: -25 - Math.random() * 50
    }));
    setEmotes(newEmotes);

    setTimeout(() => {
      setActionState('idle');
      setEmotes([]);
    }, 1200);
  };

  // Put Aki back to sleep
  const handlePutToSleep = (e) => {
    e.stopPropagation();
    setIsAwake(false);
    setTaskResponse(null);
  };

  // Direct redirection to Feedback Form
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

  // Ask Aki to start a task via Antigravity backend
  const handleStartTask = async (e) => {
    if (e) e.preventDefault();
    if (!taskInput.trim()) return;

    setIsExecutingTask(true);
    handleWakeUp();

    try {
      const data = await apiFetch('/api/v1/aki/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: taskInput.trim() })
      });

      setTaskResponse({
        task: taskInput.trim(),
        answer: data.response || "Aki is on it!",
        targetTab: data.targetTab || 'upload'
      });
    } catch {
      // Offline fallback handling
      const lower = taskInput.toLowerCase();
      let ans = "Hai! Aki received your task! Let's get right to work on your exam preparation! 🌸";
      let tab = 'predictor';

      if (lower.includes('issue') || lower.includes('problem') || lower.includes('bug') || lower.includes('help')) {
        ans = "Gomen ne! (Sorry about that!) If anything is confusing, buggy, or difficult, let me redirect you straight to Rohan Mitra's feedback form so he can fix it for you right now! 💌🏃‍♀️💨";
        tab = 'settings';
      } else if (lower.includes('upload') || lower.includes('file') || lower.includes('pdf')) {
        ans = "Hai hai! Drop your course syllabus notes or slides into the upload box right below, and our 6 AI agents will parse every page!";
        tab = 'upload';
      } else if (lower.includes('question') || lower.includes('300')) {
        ans = "Yosh! Generating practice questions aligned with Bloom's Taxonomy! Head over to the Question Bank tab!";
        tab = 'questions';
      } else if (lower.includes('predict') || lower.includes('paper')) {
        ans = "Exam prediction engine activated! Let's view the predicted questions for Section A (2M), Section B (5M), and Section C (10M)!";
        tab = 'predictor';
      }

      setTaskResponse({
        task: taskInput.trim(),
        answer: ans,
        targetTab: tab
      });
    } finally {
      setIsExecutingTask(false);
      setTaskInput('');
    }
  };

  const activeGreeting = FUNNY_AWAKE_GREETINGS[greetingIdx] || FUNNY_AWAKE_GREETINGS[0];

  return (
    <div className="w-full rounded-3xl p-5 md:p-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-300/40 dark:border-pink-800/40 backdrop-blur-md relative overflow-hidden shadow-sm mb-2">
      
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* AKI MASCOT: SLEEPING VS AWAKE (TRAMPOLINE JUMP + PARTICLES)        */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center shrink-0 relative cursor-pointer group" onClick={handleWakeUp}>
          
          {/* Floating Emotes on Wake-up */}
          <AnimatePresence>
            {emotes.map((em) => (
              <motion.div
                key={em.id}
                initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1.3, x: em.x, y: em.y }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute -top-4 pointer-events-none font-bold text-lg select-none z-50 text-pink-500"
              >
                {em.icon}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Sleeping Floating Zzz Bubbles when Asleep */}
          {!isAwake && (
            <div className="absolute -top-2 right-2 flex flex-col items-center pointer-events-none select-none z-20">
              <motion.span
                animate={{ y: [0, -14, -22], opacity: [0, 1, 0], scale: [0.7, 1, 1.2] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
                className="font-bold text-xs text-indigo-500 dark:text-indigo-400"
              >
                💤 zzz...
              </motion.span>
              <motion.span
                animate={{ y: [0, -10, -18], opacity: [0, 1, 0], scale: [0.6, 0.9, 1.1] }}
                transition={{ repeat: Infinity, duration: 2.8, delay: 0.8, ease: "easeOut" }}
                className="font-bold text-[10px] text-pink-500 dark:text-pink-400"
              >
                ( ˘ω˘ ) 💤
              </motion.span>
            </div>
          )}

          {/* Mascot Image with Animation */}
          <motion.div
            animate={
              actionState === 'waking'
                ? {
                    y: [0, 8, -46, 6, -16, 0],
                    scaleY: [1, 0.72, 1.28, 0.88, 1.05, 1],
                    scaleX: [1, 1.28, 0.84, 1.10, 0.98, 1],
                    rotate: [0, -10, 10, -4, 0]
                  }
                : isAwake
                ? {
                    y: [0, -8, 0],
                    rotate: [0, 2, -2, 0]
                  }
                : {
                    // Gentle sleeping breathing motion
                    y: [0, 4, 0],
                    scaleY: [1, 0.97, 1],
                    rotate: [0, 1, 0]
                  }
            }
            transition={
              actionState === 'waking'
                ? { duration: 0.9, ease: "easeInOut" }
                : isAwake
                ? { repeat: Infinity, duration: 2.6, ease: "easeInOut" }
                : { repeat: Infinity, duration: 3.8, ease: "easeInOut" }
            }
            className="w-32 h-40 sm:w-36 sm:h-44 relative flex items-center justify-center"
            title={isAwake ? "Aki is awake! Click for another greeting 🌸" : "Shh... Aki is asleep! Click to wake her up! 💤"}
          >
            <img
              src={isAwake ? "/aki_victory.png" : "/aki_sleeping.png"}
              alt="Aki - Anime Companion"
              className={`w-full h-full object-contain select-none pointer-events-none drop-shadow-xl transition-all duration-300 ${
                isAwake ? 'brightness-105 group-hover:scale-105' : 'brightness-95'
              }`}
            />
          </motion.div>

          {/* Dynamic 3D Ground Shadow */}
          <motion.div
            animate={
              actionState === 'waking'
                ? { scale: [1, 1.3, 0.35, 1.1, 0.7, 1], opacity: [0.35, 0.45, 0.1, 0.4, 0.2, 0.35] }
                : isAwake
                ? { scale: [1, 0.85, 1], opacity: [0.35, 0.25, 0.35] }
                : { scale: [1, 0.95, 1], opacity: [0.3, 0.35, 0.3] }
            }
            transition={
              actionState === 'waking'
                ? { duration: 0.9, ease: "easeInOut" }
                : { repeat: Infinity, duration: isAwake ? 2.6 : 3.8, ease: "easeInOut" }
            }
            className="w-20 h-2.5 rounded-full bg-black/40 blur-xs mt-0.5"
          />

          {/* Status Badge Toggle */}
          <div className="mt-2 px-3 py-1 rounded-full text-[10px] font-extrabold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer bg-white/90 dark:bg-gray-900/90 border border-pink-300/80 dark:border-pink-800 text-pink-700 dark:text-pink-300">
            <span>{isAwake ? '🌸' : '💤'}</span>
            <span>{isAwake ? 'Aki • Active & Awake!' : 'Aki is Sleeping • Tap to Wake'}</span>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* SPEECH DESK & TASK EXECUTION                                      */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 w-full flex flex-col gap-3">
          
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-200/50 dark:border-pink-900/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{isAwake ? '✨' : '💤'}</span>
              <div>
                <h3 className="text-base font-extrabold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {isAwake ? "Aki (秋) — Ready to Help You Ace Exams!" : "Shh... Aki is taking a power nap! ( ˘ω˘ )"}
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  {isAwake ? "Click any task below or ask Aki anything in plain English/Romaji!" : "Click Aki or the button on the right to wake her up!"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isAwake ? (
                <button
                  onClick={handleWakeUp}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⏰</span>
                  <span>Wake Up Aki! (起こして！)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleWakeUp}
                    className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 dark:bg-pink-950/70 dark:hover:bg-pink-900/70 text-pink-700 dark:text-pink-300 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Get another funny greeting"
                  >
                    <span>🎲</span>
                    <span>Another Greeting</span>
                  </button>
                  <button
                    onClick={handlePutToSleep}
                    className="px-2.5 py-1 bg-gray-200/80 hover:bg-gray-300/80 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Put Aki back to sleep"
                  >
                    <span>💤</span>
                    <span>Take a nap</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Content (Sleeping Zzz Note vs Awake Japanese-English Greeting) */}
          <AnimatePresence mode="wait">
            {!isAwake ? (
              <motion.div
                key="sleeping"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-gray-700 dark:text-gray-300 flex flex-col gap-1.5"
              >
                <p className="italic font-medium text-indigo-900 dark:text-indigo-200">
                  "Zzz... ( ˘ω˘ ) ... Mnya mnya... just 5 more minutes senpai... zzz..."
                </p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                  Aki was up late studying with the 6 AI Professors! Tap or click Aki to wake her up, and she'll instantly help you index your lecture slides, formulate 300 practice questions, or predict your semester exam paper!
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`awake-${greetingIdx}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-pink-300/60 dark:border-pink-800/60 flex flex-col gap-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm md:text-base text-pink-600 dark:text-pink-400">
                    {activeGreeting.greeting}
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300">
                    {activeGreeting.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                  🌸 {activeGreeting.voice}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Response Box if Aki was asked to do a task */}
          {taskResponse && (
            <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-400/40 text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-bold text-pink-700 dark:text-pink-300 text-[11px]">
                <span>🌸 Aki Task Output: "{taskResponse.task}"</span>
                <button
                  onClick={() => setTaskResponse(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line text-[11px]">
                {taskResponse.answer}
              </p>
              {taskResponse.targetTab && (
                <button
                  onClick={() => {
                    if (taskResponse.targetTab === 'upload' && scrollToUpload) {
                      scrollToUpload();
                    } else if (taskResponse.targetTab === 'settings') {
                      handleRedirectToFeedback();
                    } else {
                      setActiveTab(taskResponse.targetTab);
                    }
                  }}
                  className="self-start px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer mt-1"
                >
                  Take me to {taskResponse.targetTab.toUpperCase()} →
                </button>
              )}
            </div>
          )}

          {/* Quick-Action Task Bar & Issue Redirection */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
              ⚡ Quick Tasks:
            </span>

            <button
              onClick={() => {
                handleWakeUp();
                if (scrollToUpload) scrollToUpload();
              }}
              className="px-2.5 py-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>📎</span>
              <span>Upload Lecture Slides</span>
            </button>

            <button
              onClick={() => {
                handleWakeUp();
                setActiveTab('predictor');
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>🎯</span>
              <span>Predict Exam Paper</span>
            </button>

            <button
              onClick={() => {
                handleWakeUp();
                setActiveTab('questions');
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>❓</span>
              <span>Generate 300 Questions</span>
            </button>

            <button
              onClick={() => {
                handleWakeUp();
                setActiveTab('summary');
              }}
              className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>📝</span>
              <span>1-Page Summary</span>
            </button>

            {/* Direct Feedback Form Redirection Button */}
            <button
              onClick={handleRedirectToFeedback}
              className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer ml-auto"
              title="Facing any issue or bug? Report directly to creator Rohan Mitra!"
            >
              <span>🚨</span>
              <span>Facing Any Issue? Tell Rohan</span>
            </button>
          </div>

          {/* Interactive "Start Task" Prompt Box */}
          <form onSubmit={handleStartTask} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Ask Aki to start any task (e.g., 'Predict exam paper', 'Facing an issue', 'Explain 10M case study')..."
              className="flex-1 px-3.5 py-2 bg-white/90 dark:bg-gray-950/90 border border-pink-300/60 dark:border-pink-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 font-sans"
            />
            <button
              type="submit"
              disabled={isExecutingTask || !taskInput.trim()}
              className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>{isExecutingTask ? '⚡' : '🚀'}</span>
              <span>Start Task</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
