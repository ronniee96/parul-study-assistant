import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function StudentDashboard({ onNavigate }) {
  const [metrics, setMetrics] = useState({
    total_documents: 0,
    active_projects: 0,
    reports_generated: 0,
    saved_resumes: 0,
    diagrams_created: 0,
    recent_activity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/v1/student/dashboard/metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.debug('Dashboard metrics error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  const QUICK_TOOLS = [
    { id: 'plagiarism', title: 'Plagiarism & Similarity', icon: '🔍', desc: 'Verify citations and n-gram similarity against academic sources', color: 'from-blue-500/20 to-cyan-500/10 border-cyan-500/30 text-cyan-400' },
    { id: 'ai_text', title: 'AI Text Analysis', icon: '🤖', desc: 'Evaluate perplexity, burstiness, and sentence structure variance', color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400' },
    { id: 'paraphrase', title: 'Academic Paraphraser', icon: '✍️', desc: '10 academic tones with technical terminology preservation', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400' },
    { id: 'grammar', title: 'Grammar & Clarity', icon: '📝', desc: 'Clarity, conciseness, readability and vocabulary improvement', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400' },
    { id: 'assignment', title: 'Assignment & Thesis Hub', icon: '📚', desc: 'Outlines, table of contents, and APA/MLA/IEEE citations', color: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-400' },
    { id: 'resume', title: 'ATS Resume Builder', icon: '📄', desc: '6 professional student resume templates with keyword scoring', color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400' },
    { id: 'flowchart', title: 'Diagram & Mermaid Studio', icon: '📐', desc: 'Process flows, UML, ERD, and system architecture diagrams', color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400' },
    { id: 'database', title: 'Database Schema Designer', icon: '🗄️', desc: 'Normalized 3NF relational schema and SQL DDL generator', color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400' },
    { id: 'spreadsheet', title: 'Spreadsheet & Data Hub', icon: '📈', desc: 'CSV statistics, data cleaning, and dynamic formula helper', color: 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400' },
    { id: 'engineering', title: 'Engineering Calculations', icon: '⚙️', desc: 'Fluid flow, thermodynamics, mechanics, and mass balances', color: 'from-amber-500/20 to-yellow-500/10 border-yellow-500/30 text-yellow-400' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-cyan-900/20 to-neutral-900/60 border border-cyan-500/30 p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-cyan-950/20">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Student Academic Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Academic Productivity & Research Toolkit
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Verify academic originality, improve writing clarity, generate diagrams, design relational databases, analyze dataset spreadsheets, and build ATS-friendly resumes.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Documents Uploaded', val: metrics.total_documents, icon: '📁', color: 'text-cyan-400' },
          { label: 'Active Projects', val: metrics.active_projects, icon: '📚', color: 'text-purple-400' },
          { label: 'Reports Generated', val: metrics.reports_generated, icon: '📊', color: 'text-emerald-400' },
          { label: 'Saved Resumes', val: metrics.saved_resumes, icon: '📄', color: 'text-teal-400' },
          { label: 'Diagrams Created', val: metrics.diagrams_created, icon: '📐', color: 'text-amber-400' }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 rounded-2xl bg-white/5 dark:bg-black/40 border border-neutral-200/20 dark:border-neutral-800/80 backdrop-blur-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="truncate">{item.label}</span>
              <span className="text-base">{item.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${item.color}`}>
              {loading ? '...' : item.val}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Launch Tool Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span>⚡</span>
          <span>Quick Launch Academic Tools</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {QUICK_TOOLS.map(tool => (
            <motion.div
              key={tool.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(tool.id)}
              className={`p-5 rounded-2xl bg-gradient-to-br ${tool.color} border backdrop-blur-xl cursor-pointer transition shadow-lg shadow-black/10 flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-2xl">{tool.icon}</span>
                  <span className="text-xs font-semibold opacity-70 group-hover:opacity-100 transition">Open ➔</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1 tracking-wide">{tool.title}</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">{tool.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="p-5 rounded-2xl bg-white/5 dark:bg-black/40 border border-neutral-200/20 dark:border-neutral-800/80 backdrop-blur-xl space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span>🕒</span>
          <span>Recent Academic Activity</span>
        </h3>
        {metrics.recent_activity && metrics.recent_activity.length > 0 ? (
          <div className="divide-y divide-neutral-800/60 text-xs">
            {metrics.recent_activity.map((act, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-neutral-200">{act.title}</div>
                  <div className="text-[11px] text-neutral-400">{act.detail}</div>
                </div>
                <div className="text-[11px] text-neutral-500">{new Date(act.timestamp).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-3 text-center">
            No recent activity yet. Upload a document or launch a tool above to begin.
          </p>
        )}
      </div>
    </div>
  );
}
