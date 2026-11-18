import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IconSearch,
  IconBot,
  IconPen,
  IconGrammar,
  IconBookOpen,
  IconFileText,
  IconDiagram,
  IconDatabase,
  IconSpreadsheet,
  IconCpu,
  IconFolder,
  IconBarChart,
  IconClock,
  IconArrowRight,
  IconSparkles
} from './StudentIcons';

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
    {
      id: 'plagiarism',
      title: 'Plagiarism & Originality',
      tag: 'Originality',
      Icon: IconSearch,
      desc: 'Deterministic n-gram indexing, source overlap verification, and citation audits.',
      accent: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd]'
    },
    {
      id: 'ai_text',
      title: 'AI Text Analysis',
      tag: 'Detection',
      Icon: IconBot,
      desc: 'Evaluate sentence perplexity, burstiness distribution, and synthetic generation risk.',
      accent: 'bg-[#af52de]/10 text-[#af52de] dark:text-[#bf5af2]'
    },
    {
      id: 'paraphrase',
      title: 'Academic Paraphraser',
      tag: 'Synthesis',
      Icon: IconPen,
      desc: '10 scholarly writing modes with technical terminology locking and voice preservation.',
      accent: 'bg-[#34c759]/10 text-[#28cd41] dark:text-[#30d158]'
    },
    {
      id: 'grammar',
      title: 'Grammar & Clarity',
      tag: 'Precision',
      Icon: IconGrammar,
      desc: 'Sentence rhythm, syntactic conciseness, academic vocabulary, and tone refinement.',
      accent: 'bg-[#ff9500]/10 text-[#ff9500] dark:text-[#ff9f0a]'
    },
    {
      id: 'assignment',
      title: 'Assignment & Thesis Hub',
      tag: 'Structure',
      Icon: IconBookOpen,
      desc: 'Hierarchical chapter outlines, literature review structures, and citation formats.',
      accent: 'bg-[#5856d6]/10 text-[#5856d6] dark:text-[#5e5ce6]'
    },
    {
      id: 'resume',
      title: 'ATS Resume Builder',
      tag: 'Career',
      Icon: IconFileText,
      desc: 'Institutional ATS-optimized resumes with keyword scoring and live print formatting.',
      accent: 'bg-[#30b0c7]/10 text-[#30b0c7] dark:text-[#40c8e0]'
    },
    {
      id: 'flowchart',
      title: 'Diagram & Mermaid Studio',
      tag: 'Architecture',
      Icon: IconDiagram,
      desc: 'Interactive process flows, sequence diagrams, class models, and state charts.',
      accent: 'bg-[#ff2d55]/10 text-[#ff2d55] dark:text-[#ff375f]'
    },
    {
      id: 'database',
      title: 'Database Schema Designer',
      tag: 'Data Modeling',
      Icon: IconDatabase,
      desc: 'Normalized 3NF relational schemas, relationship graphs, and SQL DDL scripts.',
      accent: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd]'
    },
    {
      id: 'spreadsheet',
      title: 'Spreadsheet & Data Hub',
      tag: 'Analytics',
      Icon: IconSpreadsheet,
      desc: 'CSV dataset statistics, automated data cleansing, and dynamic Excel formulas.',
      accent: 'bg-[#34c759]/10 text-[#28cd41] dark:text-[#30d158]'
    },
    {
      id: 'engineering',
      title: 'Engineering Calculations',
      tag: 'Computation',
      Icon: IconCpu,
      desc: 'Thermodynamics, fluid mechanics, structural formulas, and unit conversions.',
      accent: 'bg-[#ff9500]/10 text-[#ff9500] dark:text-[#ff9f0a]'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Apple Liquid Frosted Glass Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/95 via-white/80 to-blue-50/40 dark:from-[#1c1c1e]/90 dark:via-[#1c1c1e]/75 dark:to-blue-950/20 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] dark:text-[#388bfd] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] dark:bg-[#388bfd] animate-pulse" />
            <span>Student Academic Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
            Academic Productivity & Research Toolkit
          </h1>
          <p className="text-[13px] md:text-sm text-[#86868b] dark:text-[#98989d] leading-relaxed">
            Verify academic originality, improve writing clarity, generate diagrams, design relational databases, analyze dataset spreadsheets, and build ATS-friendly resumes.
          </p>
        </div>
      </div>

      {/* Apple Frosted Glass KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Documents Uploaded', val: metrics.total_documents, Icon: IconFolder, color: 'text-[#0071e3] dark:text-[#388bfd]', bg: 'bg-[#0071e3]/10' },
          { label: 'Active Projects', val: metrics.active_projects, Icon: IconBookOpen, color: 'text-[#af52de] dark:text-[#bf5af2]', bg: 'bg-[#af52de]/10' },
          { label: 'Reports Generated', val: metrics.reports_generated, Icon: IconBarChart, color: 'text-[#34c759] dark:text-[#30d158]', bg: 'bg-[#34c759]/10' },
          { label: 'Saved Resumes', val: metrics.saved_resumes, Icon: IconFileText, color: 'text-[#30b0c7] dark:text-[#40c8e0]', bg: 'bg-[#30b0c7]/10' },
          { label: 'Diagrams Created', val: metrics.diagrams_created, Icon: IconDiagram, color: 'text-[#ff9500] dark:text-[#ff9f0a]', bg: 'bg-[#ff9500]/10' }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/75 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-[#86868b] dark:text-[#98989d] truncate">
                {item.label}
              </span>
              <div className={`w-7 h-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                <item.Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
              {loading ? '...' : item.val}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Launch Bento Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
            <IconSparkles className="w-4 h-4 text-[#0071e3] dark:text-[#388bfd]" />
            <span>Academic Tools & Studios</span>
          </h2>
          <span className="text-xs text-[#86868b] dark:text-[#98989d]">
            10 interactive modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {QUICK_TOOLS.map(tool => (
            <motion.div
              key={tool.id}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onNavigate(tool.id)}
              className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] hover:border-black/20 dark:hover:border-white/25 hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${tool.accent} flex items-center justify-center transition-transform group-hover:scale-105`}>
                    <tool.Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b] dark:text-[#98989d]">
                    {tool.tag}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight group-hover:text-[#0071e3] dark:group-hover:text-[#388bfd] transition-colors">
                  {tool.title}
                </h3>
                <p className="text-[13px] text-[#86868b] dark:text-[#98989d] leading-relaxed line-clamp-2 mt-1">
                  {tool.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs font-medium text-[#0071e3] dark:text-[#388bfd]">
                <span>Open Tool</span>
                <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/75 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] shadow-xs space-y-3">
        <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
          <IconClock className="w-4 h-4 text-[#86868b] dark:text-[#98989d]" />
          <span>Recent Academic Activity</span>
        </h3>
        {metrics.recent_activity && metrics.recent_activity.length > 0 ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
            {metrics.recent_activity.map((act, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{act.title}</div>
                  <div className="text-[11px] text-[#86868b] dark:text-[#98989d]">{act.detail}</div>
                </div>
                <div className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                  {new Date(act.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#86868b] dark:text-[#98989d] py-3 text-center">
            No recent activity yet. Upload a document or launch a tool above to begin.
          </p>
        )}
      </div>
    </div>
  );
}
