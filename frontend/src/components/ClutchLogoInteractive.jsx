import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Web Audio API synthesizer for a crisp, punchy cartoon crocodile crunch & chomp sound.
 * Multi-layered: heavy jaw snap, dual filtered crispy crunch noise bursts, and resonant sub thud.
 */
export function playCrunchChompSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.9, now);
    master.connect(ctx.destination);

    // 1. Initial Jaw Clack & Bone Snap (triangle drop 420Hz -> 65Hz)
    const jawOsc = ctx.createOscillator();
    jawOsc.type = 'triangle';
    jawOsc.frequency.setValueAtTime(420, now);
    jawOsc.frequency.exponentialRampToValueAtTime(65, now + 0.12);

    const jawGain = ctx.createGain();
    jawGain.gain.setValueAtTime(0.95, now);
    jawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    jawOsc.connect(jawGain);
    jawGain.connect(master);
    jawOsc.start(now);
    jawOsc.stop(now + 0.14);

    // 2. Primary Crunchy Apple/Cracker Burst (shaped bandpass noise)
    const bufferSize = Math.floor(ctx.sampleRate * 0.19);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.032));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1700, now);
    bandpass.frequency.exponentialRampToValueAtTime(450, now + 0.15);
    bandpass.Q.setValueAtTime(3.0, now);

    noiseSource.connect(bandpass);
    bandpass.connect(master);
    noiseSource.start(now);

    // 3. Second Munch / Crisp Chatter Burst
    const crackleBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.17), ctx.sampleRate);
    const cData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < cData.length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.025));
      cData[i] = (Math.random() * 2 - 1) * decay;
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(2600, now + 0.04);

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0, now);
    crackleGain.gain.setValueAtTime(0.75, now + 0.04);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    crackleSource.connect(hpFilter);
    hpFilter.connect(crackleGain);
    crackleGain.connect(master);
    crackleSource.start(now + 0.04);

    // 4. Low Sub Punch for heavy alligator jaw weight
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.17);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + 0.18);

    // Clean up AudioContext
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 450);
  } catch (err) {
    console.debug('Crunch sound synthesizer notice:', err);
  }
}

export default function ClutchLogoInteractive({ compact = false }) {
  const [isChomping, setIsChomping] = useState(false);
  const [crumbs, setCrumbs] = useState([]);
  const [showChompBadge, setShowChompBadge] = useState(false);

  const handleChomp = (e) => {
    e?.stopPropagation();
    if (isChomping) return;

    setIsChomping(true);
    setShowChompBadge(true);

    // Play crisp cartoon crunch sound
    playCrunchChompSound();

    // Spawn colorful crunchy crumbs blasting out from the logo text
    const newCrumbs = Array.from({ length: 16 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.2) * 80 + 20,
      y: (Math.random() - 0.5) * 55,
      size: Math.random() * 6 + 3,
      color: ['#e05338', '#4ade80', '#fbbf24', '#f87171', '#22c55e', '#ffffff'][Math.floor(Math.random() * 6)],
      rotation: Math.random() * 360
    }));
    setCrumbs(newCrumbs);

    // Reset chomp states
    setTimeout(() => setShowChompBadge(false), 700);
    setTimeout(() => setCrumbs([]), 800);
    setTimeout(() => setIsChomping(false), 550);
  };

  return (
    <div
      onClick={handleChomp}
      title="Click the crocodile to BITE the Clutch logo!"
      className="flex items-center gap-2 sm:gap-2.5 relative select-none cursor-pointer group active:scale-[0.98] transition-transform"
    >
      {/* 🐊 Crocodile Mascot (Lunges Forward to Bite the Logo) */}
      <motion.div
        animate={
          isChomping
            ? {
                x: [0, 24, 28, 8, 0],
                y: [0, -4, 2, 0],
                rotate: [0, -14, 18, -4, 0],
                scaleX: [1, 1.25, 0.88, 1.05, 1],
                scaleY: [1, 0.8, 1.25, 0.95, 1]
              }
            : {
                x: 0,
                y: 0,
                rotate: 0,
                scaleX: 1,
                scaleY: 1
              }
        }
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        whileHover={{ scale: 1.08, rotate: -2 }}
        whileTap={{ scale: 0.92 }}
        className="relative shrink-0 z-30"
      >
        <img
          src="/clutch-mascot-transparent.png"
          alt="Clutch Crocodile Mascot"
          className={`${compact ? 'h-7' : 'h-8 sm:h-10'} w-auto object-contain drop-shadow-xs transition-transform`}
        />

        {/* Comic CHOMP popup bubble */}
        <AnimatePresence>
          {showChompBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3, y: 5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1.2, y: -26, rotate: -8 }}
              exit={{ opacity: 0, scale: 0.6, y: -36 }}
              transition={{ duration: 0.35, ease: 'backOut' }}
              className="absolute -top-2 left-6 px-2.5 py-0.5 rounded-full bg-[#e05338] text-white text-[10px] font-black uppercase tracking-wider shadow-xl border border-white/40 pointer-events-none z-50 whitespace-nowrap flex items-center gap-1"
            >
              <span>CHOMP!</span>
              <span>🐊💥</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 💥 Flying Crunch Crumbs Burst */}
      <div className="absolute left-10 sm:left-12 top-1/2 -translate-y-1/2 pointer-events-none z-40">
        <AnimatePresence>
          {crumbs.map((crumb) => (
            <motion.span
              key={crumb.id}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 0.2,
                x: crumb.x,
                y: crumb.y,
                rotate: crumb.rotation
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                width: crumb.size,
                height: crumb.size,
                backgroundColor: crumb.color
              }}
              className="absolute rounded-sm shadow-xs inline-block"
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 🔤 Logo Text Container With Crocodile Biting Jaws Overlay */}
      <div className="relative flex flex-col justify-center">
        {/* Animated Crocodile Jaws Clamping Directly Onto the Logo Name */}
        <AnimatePresence>
          {isChomping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center -left-3 -right-3"
            >
              {/* Upper Crocodile Jaw with Sharp Cartoon Teeth */}
              <motion.div
                initial={{ y: -32, opacity: 0, scaleY: 0.5 }}
                animate={{ y: [-32, 2, 0, -18, -32], opacity: [0, 1, 1, 0.7, 0], scaleY: [0.5, 1, 1, 0.7, 0.5] }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute top-[-10px] left-0 right-0 flex justify-center"
              >
                <svg className="w-24 h-6 text-[#22c55e] filter drop-shadow-md" viewBox="0 0 100 24" fill="none">
                  {/* Green Upper Snout */}
                  <path d="M0 0 Q50 -6 100 0 L96 14 Q50 18 4 14 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
                  {/* Sharp White Teeth */}
                  <polygon points="12,14 16,23 20,14" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="26,14 30,24 34,14" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="40,15 44,24 48,15" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="54,15 58,24 62,15" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="68,14 72,24 76,14" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="82,14 86,23 90,14" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                </svg>
              </motion.div>

              {/* Lower Crocodile Jaw with Sharp Cartoon Teeth */}
              <motion.div
                initial={{ y: 32, opacity: 0, scaleY: 0.5 }}
                animate={{ y: [32, -2, 0, 18, 32], opacity: [0, 1, 1, 0.7, 0], scaleY: [0.5, 1, 1, 0.7, 0.5] }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute bottom-[-10px] left-0 right-0 flex justify-center"
              >
                <svg className="w-24 h-6 text-[#16a34a] filter drop-shadow-md" viewBox="0 0 100 24" fill="none">
                  {/* Green Lower Jaw & Pink Gum */}
                  <path d="M4 10 Q50 6 96 10 L100 24 Q50 30 0 24 Z" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />
                  <path d="M8 10 Q50 7 92 10 L94 16 Q50 14 6 16 Z" fill="#f472b6" opacity="0.8" />
                  {/* Sharp White Lower Teeth */}
                  <polygon points="18,10 22,1 26,10" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="32,10 36,0 40,10" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="46,9 50,0 54,9" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="60,9 64,0 68,9" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                  <polygon points="74,10 78,0 82,10" fill="#ffffff" stroke="#052e16" strokeWidth="0.8" />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🔤 Logo Text (Squashes, Shakes & Jitters Under the Bite) */}
        <motion.div
          animate={
            isChomping
              ? {
                  x: [0, 8, -6, 5, -2, 0],
                  scaleY: [1, 0.65, 1.18, 0.95, 1],
                  scaleX: [1, 1.15, 0.9, 1.05, 1],
                  rotate: [0, 4, -4, 2, 0]
                }
              : {
                  x: 0,
                  scaleY: 1,
                  scaleX: 1,
                  rotate: 0
                }
          }
          transition={{ duration: 0.45, delay: 0.06, ease: 'easeInOut' }}
        >
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg font-black tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] leading-none transition-colors group-hover:text-[#e05338] dark:group-hover:text-[#ff6b4a]">
              Clutch
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider text-[#e05338] uppercase leading-none">
              STUDY? SOLVED
            </span>
            {!compact && (
              <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[9px] font-medium text-neutral-600 dark:text-neutral-400 border border-black/5 dark:border-white/10 hidden md:inline-block leading-tight">
                Academic Portal
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-normal truncate max-w-[170px] sm:max-w-none">
              Exam Intelligence &amp; Syllabus Analysis
            </span>
            {!compact && (
              <>
                <span className="text-[10px] text-neutral-300 dark:text-neutral-600 hidden lg:inline">•</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal hidden lg:inline">
                  Academic Suite
                </span>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
