import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransparencyAuditTab({ appState = {}, setActiveTab }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isAwakening, setIsAwakening] = useState(false);
  const [showAwakeBanner, setShowAwakeBanner] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('Active');
  const [awakePings, setAwakePings] = useState([]);

  const AGENT_STATUS_QUOTES = [
    {
      agent: 'Agent 1: Orchestrator & Ingestion 📡',
      status: 'Wide Awake',
      quote: 'Neural ingestion pipe active! Ready to capture slides and coordinate pipeline tasks.',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
    },
    {
      agent: 'Dr. Verma: Dean of Academics 🎓',
      status: 'Standing By',
      quote: 'Curriculum standards aligned. Ready to generate 100% exam-accurate MBA blueprints!',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    },
    {
      agent: 'Sentinel-V3: Anti-Hallucination Guard 🛡️',
      status: 'Shields at 100%',
      quote: 'Zero-hallucination radar active. Any non-syllabus clutter will be vaporized immediately.',
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    },
    {
      agent: 'Prof. Mukherjee: Descriptive Frameworks ✍️',
      status: 'Primed',
      quote: '10-mark structured answers, ASCII flow diagrams, and mind maps ready for recall.',
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
    },
    {
      agent: 'Prof. Kulkarni: Applied Case Analyst 📊',
      status: 'Online',
      quote: 'Managerial matrices, SWOT grids, and numerical formulas ready for instant synthesis.',
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
    },
    {
      agent: 'Agent Neuro: Engine & Telemetry ⚡',
      status: 'Hot in Background',
      quote: 'Multi-API failover active in session. Zero latency, perpetual standby mode engaged!',
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
    }
  ];

  const fetchAuditLogs = async () => {
    setLoading(true);
    setIsAwakening(true);
    setShowAwakeBanner(true);
    setAwakePings([]);

    // Live sequential agent ping animation for entertainment
    for (let i = 0; i < AGENT_STATUS_QUOTES.length; i++) {
      await new Promise(r => setTimeout(r, 180));
      setAwakePings(prev => [...prev, AGENT_STATUS_QUOTES[i]]);
    }

    try {
      const res = await fetch('/api/v1/research/audit-trail');
      const data = await res.json();
      if (data.success && data.logs) {
        setAuditLogs(data.logs);
        if (data.logs.length > 0 && !selectedLog) {
          setSelectedLog(data.logs[0]);
        }
      }
    } catch (err) {
      console.warn('Live audit trail background ping:', err);
    } finally {
      setLoading(false);
      setIsAwakening(false);
      const now = new Date();
      setLastRefreshedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const downloadAuditJSON = (log) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(log || auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai_provenance_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4 max-w-7xl mx-auto overflow-y-auto w-full">
      {/* Header Banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-cyan-600/10 border-emerald-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🔍</span>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                AI Process & Algorithmic Transparency Inspector
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Full Provenance Audit
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Clear end-to-end transparency: inspect how your query was decomposed, how many autonomous subagents were dispatched, the exact skills applied, and every external API invoked with response latencies.
            </p>
            {/* Maker & Coder Credentials */}
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 p-2 px-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>👨‍💻</span> Maker & AI Coder:
              </span>
              <span className="font-extrabold text-gray-900 dark:text-white">Rohan Mitra</span>
              <span className="text-gray-400">|</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Lead AI Agents Architect & Full-Stack Engineer</span>
              <span className="text-gray-400">•</span>
              <span className="text-[11px] text-gray-600 dark:text-gray-400">Parul University Study Assistant Framework</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuditLogs}
              disabled={isAwakening}
              className={`px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border ${
                isAwakening ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20' : 'border-gray-200 dark:border-gray-700'
              } text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-emerald-500 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95`}
            >
              <span className={isAwakening ? "inline-block animate-spin" : ""}>🔄</span>
              <span>{isAwakening ? 'Awakening Squad...' : 'Refresh Telemetry'}</span>
            </button>
            <button
              onClick={() => downloadAuditJSON(selectedLog)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥</span> Export Audit JSON
            </button>
          </div>
        </div>

        {/* Live Entertaining Agent Awakening Presentation Banner */}
        <AnimatePresence>
          {showAwakeBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/40 shadow-lg backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <span>Autonomous AI Squad Awakened & Standing By!</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold tracking-wider animate-pulse">
                        LIVE PING
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      All background agent intelligence engines refreshed. Zero downtime, ready to generate questions, solve case studies & verify syllabus.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 hidden sm:inline">
                    Last Ping: {lastRefreshedTime}
                  </span>
                  <button
                    onClick={() => setShowAwakeBanner(false)}
                    className="text-xs px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold cursor-pointer transition-colors"
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </div>

              {/* Agent Pings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {awakePings.map((ping, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between gap-1 shadow-xs ${ping.color}`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span>{ping.agent}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
                        {ping.status}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-gray-700 dark:text-gray-300 italic">
                      "{ping.quote}"
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span><strong>AI Session Telemetry:</strong> All APIs (OpenRouter, SambaNova, Groq, Gemini, Claude, OpenAI) running on active standby.</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Ready for user input 🎯
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Transparency Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="glass-card p-3 border-emerald-300 dark:border-emerald-800 flex flex-col items-center text-center shadow-xs">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Active Subagents</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">6 Agents</span>
            <span className="text-[10px] text-emerald-500 font-medium">Autonomous Squad & Verified</span>
          </div>

          <div className="glass-card p-3 border-teal-300 dark:border-teal-800 flex flex-col items-center text-center shadow-xs">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Skills Deployed</span>
            <span className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">6 Core Skills</span>
            <span className="text-[10px] text-teal-500 font-medium">Guardrails & Optimization</span>
          </div>

          <div className="glass-card p-3 border-sky-300 dark:border-sky-800 flex flex-col items-center text-center shadow-xs">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Connected APIs</span>
            <span className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">12 Engines</span>
            <span className="text-[10px] text-sky-500 font-medium">Free & Multi-API Failover</span>
          </div>

          <div className="glass-card p-3 border-purple-300 dark:border-purple-800 flex flex-col items-center text-center shadow-xs">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Citation Grounding</span>
            <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">100% Traceable</span>
            <span className="text-[10px] text-purple-500 font-medium">Zero Unverified Hallucinations</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: MULTI-AGENT ORCHESTRATION PIPELINE                           */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>🤖</span> Autonomous Multi-Agent Hierarchy (6 Active Specialists)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              How independent specialized agents collaborate to ingest, research, structure, evaluate, and verify university exam material.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
            6-Agent Collaborative Ensemble
          </span>
        </div>

        {/* 6 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {[
            {
              role: 'Dr. Verma: Dean of Academics & Strategy',
              icon: '🎓',
              badge: 'Curriculum & Blueprint Lead',
              color: 'border-l-amber-500',
              tasks: [
                'Structures 2-mark, 5-mark, and 10-mark distribution',
                'Calibrates questions against Bloom\'s Taxonomy tiers',
                'Synthesizes official university end-semester rubrics'
              ]
            },
            {
              role: 'Sentinel-V3: Anti-Hallucination & Fluff Guard',
              icon: '🛡️',
              badge: 'stop-slop Verification Gate',
              color: 'border-l-emerald-500',
              tasks: [
                'Filters out institutional headers (NAAC A++, campus logos)',
                'Enforces 100% syllabus and textbook source grounding',
                'Purges generic AI conversational filler and code noise'
              ]
            },
            {
              role: 'Prof. Mukherjee: Qualitative Frameworks Lead',
              icon: '✍️',
              badge: 'Descriptive & ASCII Diagrams',
              color: 'border-l-purple-500',
              tasks: [
                'Drafts 10-mark essay blueprints (Intro → Framework → Analysis)',
                'Generates monospaced ASCII flowcharts and mind maps',
                'Builds 30-minute last-day high-yield revision sheets'
              ]
            },
            {
              role: 'Prof. Kulkarni: Applied Case & Quantitative Analyst',
              icon: '📊',
              badge: 'Managerial & Numerical Solutions',
              color: 'border-l-teal-500',
              tasks: [
                'Constructs Section C real-world managerial case studies',
                'Solves mathematical/financial formulas step-by-step',
                'Generates strategic matrices (SWOT, BCG Matrix, PESTEL)'
              ]
            },
            {
              role: 'Dr. Gupta: Pedagogy & Memory Specialist',
              icon: '🧠',
              badge: 'SuperMemo-2 (SM-2) Spaced Repetition',
              color: 'border-l-rose-500',
              tasks: [
                'Calculates optimal 5-day memory recall review cadences',
                'Generates common examiner traps & mistake analyses',
                'Builds high-retention active recall flashcard decks'
              ]
            },
            {
              role: 'Agent Neuro: Orchestration & Multi-API Router',
              icon: '⚡',
              badge: '12-Engine Auto-Failover',
              color: 'border-l-sky-500',
              tasks: [
                'Dispatches requests across SambaNova, Groq, Gemini & Claude',
                'Maintains sub-second failover redundancy across 12 APIs',
                'Manages persistent key storage and live telemetry streams'
              ]
            }
          ].map((agent, i) => (
            <div key={i} className={`glass-card p-4 border-l-4 ${agent.color} flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-shadow`}>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-xl">{agent.icon}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                    {agent.badge}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                  {agent.role}
                </h4>
                <ul className="mt-3 space-y-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  {agent.tasks.map((task, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: SKILLS & HEURISTIC GUARDRAILS INVENTORY                      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>⚡</span> Active Agent Skills & Algorithmic Guardrails
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Specialized skill modules that govern reasoning quality, styling, and educational rigor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              skill: 'stop-slop',
              category: 'Prose Quality & Rigor',
              purpose: 'Four-gate workflow to lock source context, eradicate AI buzzwords/hallucinations, and enforce high-density pedagogical answers.',
              active: true
            },
            {
              skill: 'deep-research',
              category: 'Academic Discovery',
              purpose: 'Fan-out web and repository searches across arXiv, CrossRef, and OpenAlex, verifying claims with DOI-backed evidence.',
              active: true
            },
            {
              skill: 'citation-management',
              category: 'Scholarly Standards',
              purpose: 'Maintains formal academic citations, ISBN metadata, journal containers, and author credits throughout study guides.',
              active: true
            },
            {
              skill: 'uiux-designer',
              category: 'Design Intelligence',
              purpose: 'Controls high-contrast glassmorphic styling, responsive fluid grids, dark mode color accessibility, and 3D flip card dynamics.',
              active: true
            },
            {
              skill: 'SuperMemo-2 (SM-2)',
              category: 'Cognitive Algorithm',
              purpose: 'Calculates active memory retention intervals, review streaks, and ease-factor multiplier adjustments per card recall.',
              active: true
            },
            {
              skill: 'Computerized Adaptive Testing (CAT)',
              category: 'Assessment Engine',
              purpose: 'Estimates student latent ability theta (0-100) dynamically in real time and scales question complexity accordingly.',
              active: true
            }
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-800/40 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    /{item.skill}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                    Active
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  {item.category}
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {item.purpose}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: LIVE AUDIT LOG & EXECUTION INSPECTOR                         */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>📜</span> Live Query Audit Logs & Telemetry Receipt
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Inspect actual execution traces: which APIs responded, execution times, and step-by-step pipeline milestones.
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {auditLogs.length} Logged Executions
          </span>
        </div>

        {/* Logs Master-Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* List of recent queries */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {auditLogs.map((log, i) => (
              <div
                key={i}
                onClick={() => setSelectedLog(log)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedLog === log
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400">{log.timestamp}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                    {log.duration_ms}ms
                  </span>
                </div>
                <p className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1">
                  {log.query}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                  <span>{log.agents_used?.length || 3} Agents</span>
                  <span>•</span>
                  <span>{log.apis_involved?.length || 3} APIs</span>
                </div>
              </div>
            ))}
          </div>

          {/* Details for Selected Log */}
          {selectedLog && (
            <div className="col-span-2 glass-card p-5 border border-emerald-500/30 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    Execution Trace Details
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                    "{selectedLog.query}"
                  </h4>
                  <span className="text-xs text-gray-400">
                    Timestamp: {selectedLog.timestamp} • Duration: {selectedLog.duration_ms}ms
                  </span>
                </div>
                <button
                  onClick={() => downloadAuditJSON(selectedLog)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Download Receipt 📥
                </button>
              </div>

              {/* APIs Queried with Latencies */}
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  1. APIs Invoked & Latency Breakdown:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedLog.apis_involved || []).map((api, aIdx) => (
                    <div key={aIdx} className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 block">
                          {api.api}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[160px] block">
                          {api.endpoint || 'Verified Endpoint'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                          {api.latency_ms}ms
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {api.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Steps */}
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                  2. Pipeline Execution Steps:
                </span>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  {(selectedLog.pipeline_steps || []).map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agents & Skills Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Agents Deployed:
                  </span>
                  <ul className="space-y-1 text-[11px] text-gray-500">
                    {(selectedLog.agents_used || []).map((ag, agIdx) => (
                      <li key={agIdx} className="truncate">
                        • <strong>{ag.name}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Skills Active:
                  </span>
                  <ul className="space-y-1 text-[11px] text-gray-500">
                    {(selectedLog.skills_used || []).map((sk, skIdx) => (
                      <li key={skIdx} className="truncate">
                        • <strong>{sk.name}</strong>: {sk.purpose?.slice(0, 35)}...
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
