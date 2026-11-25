import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * High-fidelity Web Audio API synthesizer for cartoon crocodile crunch & chomp bite sound.
 * Zero-latency, 100% client-side, no audio files or network requests required.
 */
export function playCrunchChompSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Master volume
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.85, now);
    master.connect(ctx.destination);

    // 1. Initial Jaw Clack & Punch (triangle drop from 360Hz down to 60Hz)
    const jawOsc = ctx.createOscillator();
    jawOsc.type = 'triangle';
    jawOsc.frequency.setValueAtTime(380, now);
    jawOsc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    const jawGain = ctx.createGain();
    jawGain.gain.setValueAtTime(0.9, now);
    jawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    jawOsc.connect(jawGain);
    jawGain.connect(master);
    jawOsc.start(now);
    jawOsc.stop(now + 0.14);

    // 2. Primary Crunch Burst (bandpass noise simulating crunchy bite)
    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.035));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1600, now);
    bandpass.frequency.exponentialRampToValueAtTime(500, now + 0.14);
    bandpass.Q.setValueAtTime(2.5, now);

    noiseSource.connect(bandpass);
    bandpass.connect(master);
    noiseSource.start(now);

    // 3. Secondary Crisp Crackle (high frequency cracker/apple crunch)
    const crackleBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.16), ctx.sampleRate);
    const cData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < cData.length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.028));
      cData[i] = (Math.random() * 2 - 1) * decay;
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(2400, now + 0.03);

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0, now);
    crackleGain.gain.setValueAtTime(0.7, now + 0.035);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    crackleSource.connect(hpFilter);
    hpFilter.connect(crackleGain);
    crackleGain.connect(master);
    crackleSource.start(now + 0.035);

    // 4. Low Sub Punch for cartoon weight
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + 0.17);

    // Automatically clean up context after audio finishes
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

    // Play synthesized crunchy bite sound
    playCrunchChompSound();

    // Generate burst of crunchy crumbs
    const newCrumbs = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.3) * 60,
      y: (Math.random() - 0.5) * 45,
      size: Math.random() * 5 + 3,
      color: ['#e05338', '#4ade80', '#fbbf24', '#f87171', '#22c55e'][Math.floor(Math.random() * 5)],
      rotation: Math.random() * 360
    }));
    setCrumbs(newCrumbs);

    // Reset animations
    setTimeout(() => setShowChompBadge(false), 650);
    setTimeout(() => setCrumbs([]), 700);
    setTimeout(() => setIsChomping(false), 450);
  };

  return (
    <div
      onClick={handleChomp}
      title="Click the crocodile to CHOMP the Clutch logo!"
      className="flex items-center gap-2.5 relative select-none cursor-pointer group"
    >
      {/* 🐊 Animated Crocodile Mascot */}
      <motion.div
        animate={
          isChomping
            ? {
                x: [0, 16, 20, 2, 0],
                y: [0, -4, 2, 0],
                rotate: [0, -12, 14, -4, 0],
                scaleX: [1, 1.18, 0.88, 1.05, 1],
                scaleY: [1, 0.82, 1.22, 0.95, 1]
              }
            : {
                x: 0,
                y: 0,
                rotate: 0,
                scaleX: 1,
                scaleY: 1
              }
        }
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        whileHover={{ scale: 1.08, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        className="relative shrink-0"
      >
        <img
          src="/clutch-mascot-transparent.png"
          alt="Clutch Crocodile Mascot"
          className={`${compact ? 'h-7 w-auto' : 'h-10 w-auto'} object-contain drop-shadow-xs transition-transform`}
        />

        {/* Comic CHOMP popup bubble */}
        <AnimatePresence>
          {showChompBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4, y: 0, rotate: -15 }}
              animate={{ opacity: 1, scale: 1.2, y: -24, rotate: -8 }}
              exit={{ opacity: 0, scale: 0.7, y: -34 }}
              transition={{ duration: 0.35, ease: 'backOut' }}
              className="absolute -top-1 -right-3 px-2 py-0.5 rounded-full bg-[#e05338] text-white text-[10px] font-black uppercase tracking-wider shadow-lg border border-white/40 pointer-events-none z-50 whitespace-nowrap flex items-center gap-1"
            >
              <span>CHOMP!</span>
              <span>🐊💥</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 💥 Flying Crunch Crumbs Container */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none z-40">
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
              transition={{ duration: 0.55, ease: 'easeOut' }}
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

      {/* 🔤 Animated Clutch Wordmark & Tagline (Reacts to the Bite) */}
      <motion.div
        animate={
          isChomping
            ? {
                x: [0, 8, -6, 4, -2, 0],
                rotate: [0, 3, -4, 2, 0],
                scale: [1, 0.88, 1.08, 0.98, 1]
              }
            : {
                x: 0,
                rotate: 0,
                scale: 1
              }
        }
        transition={{ duration: 0.4, delay: 0.08, ease: 'easeInOut' }}
        className="flex flex-col justify-center"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-base font-black tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] leading-none transition-colors group-hover:text-[#e05338] dark:group-hover:text-[#ff6b4a]">
            Clutch
          </span>
          <span className="text-[10px] font-extrabold tracking-wider text-[#e05338] uppercase leading-none">
            STUDY? SOLVED
          </span>
          {!compact && (
            <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[9px] font-medium text-neutral-600 dark:text-neutral-400 border border-black/5 dark:border-white/10 hidden sm:inline-block leading-tight">
              Academic Portal
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">
            Exam Intelligence &amp; Syllabus Analysis
          </span>
          {!compact && (
            <>
              <span className="text-[10px] text-neutral-300 dark:text-neutral-600 hidden sm:inline">•</span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal hidden sm:inline">
                Academic Suite
              </span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
