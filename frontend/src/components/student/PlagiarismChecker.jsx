import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconSearch,
  IconShield,
  IconCheck,
  IconAlertTriangle,
  IconX
} from './StudentIcons';
import { formatApiError } from './studentUtils';

export default function PlagiarismChecker() {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim().split(/\s+/).length < 20) {
      setError('Please provide at least 20 words for meaningful n-gram similarity analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/plagiarism/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          document_title: title.trim() || 'Untitled Academic Paper'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(formatApiError(errJson, 'Plagiarism analysis request failed.'));
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error running plagiarism check.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] flex items-center justify-center shrink-0">
              <IconSearch className="w-4 h-4" />
            </div>
            <span>Academic Plagiarism & Originality Checker</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Deterministic n-gram matching, academic source overlap indexing, and citation verification.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] dark:text-[#388bfd] text-xs font-medium">
          <IconShield className="w-4 h-4" />
          <span>Authentic Source Verification</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCheck} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Paper / Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Consensus in Modern Microservices"
            className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-sm text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] focus:outline-none focus:border-[#0071e3] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Document Manuscript Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste your paper manuscript, essay, or thesis draft here (min 20 words)..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-sm text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] font-serif leading-relaxed focus:outline-none focus:border-[#0071e3] transition"
          />
          <div className="flex items-center justify-between text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            <span>Word count: {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            <span>Deterministic 4-gram and 5-gram tokenization</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Overlap Patterns...</span>
            </>
          ) : (
            <>
              <IconSearch className="w-4 h-4" />
              <span>Execute Originality Audit</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-6"
        >
          {/* Similarity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Similarity Index</span>
              <div className="text-3xl font-bold text-[#0071e3] dark:text-[#388bfd] mt-1 tracking-tight">
                {result.similarity_percentage}%
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1 flex items-center gap-1">
                {result.similarity_percentage < 15 ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Low Overlap</span>
                  </>
                ) : (
                  <>
                    <IconAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Potential Overlap</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Total Word Count</span>
              <div className="text-3xl font-bold text-[#28cd41] dark:text-[#30d158] mt-1 tracking-tight">
                {result.total_words}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Academic tokenized</span>
            </div>

            <div className="p-4 rounded-xl bg-[#af52de]/10 border border-[#af52de]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Matches Identified</span>
              <div className="text-3xl font-bold text-[#af52de] dark:text-[#bf5af2] mt-1 tracking-tight">
                {result.matches ? result.matches.length : 0}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Passages flagged</span>
            </div>

            <div className="p-4 rounded-xl bg-[#30b0c7]/10 border border-[#30b0c7]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Integrity Report ID</span>
              <div className="text-sm font-mono text-[#30b0c7] dark:text-[#40c8e0] mt-2 truncate">
                {result.report_id}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Permanent record</span>
            </div>
          </div>

          {/* Matched Passages */}
          {result.matches && result.matches.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Flagged Overlap Matches & Citation Recommendations
              </h3>
              <div className="space-y-3">
                {result.matches.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        Match #{idx + 1} • {m.matched_words || m.length} words
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] font-mono text-[11px]">
                        Source: {m.source || 'Academic Open Index'}
                      </span>
                    </div>
                    <blockquote className="text-xs font-serif text-[#1d1d1f] dark:text-[#f5f5f7] border-l-2 border-[#0071e3] pl-3 italic">
                      "{m.excerpt || m.passage}"
                    </blockquote>
                    <p className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                      Recommendation: {m.recommendation || 'Add direct inline citation and rephrase supporting narrative.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 text-[#28cd41] dark:text-[#30d158] text-xs flex items-center gap-2">
              <IconCheck className="w-4 h-4 shrink-0" />
              <span>No substantial identical n-gram sequences detected across academic source corpora.</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
