import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
        throw new Error(errJson.detail || 'Plagiarism analysis request failed.');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>🔍</span>
            <span>Academic Plagiarism & Originality Checker</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Deterministic n-gram matching, academic source overlap indexing, and citation verification.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <span>🛡️</span>
          <span>Authentic Non-Fabricated Verification</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCheck} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Paper / Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Consensus in Modern Microservices"
            className="w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-sm focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Document Manuscript Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste your paper manuscript, essay, or thesis draft here (min 20 words)..."
            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-sm font-serif leading-relaxed focus:outline-none focus:border-cyan-500 transition"
          />
          <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
            <span>Word count: {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            <span>Deterministic 4-gram and 5-gram tokenization</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Analyzing Overlap Patterns...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Execute Originality Audit</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 space-y-6"
        >
          {/* Similarity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Similarity Index</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-1">
                {result.similarity_percentage}%
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">
                {result.similarity_percentage < 15 ? '✓ Low Overlap' : '⚠️ Potential Overlap'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Total Word Count</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                {result.total_words}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Academic tokenized</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Matches Identified</span>
              <div className="text-3xl font-extrabold text-purple-400 mt-1">
                {result.matches ? result.matches.length : 0}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Passages flagged</span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Integrity Report ID</span>
              <div className="text-sm font-mono text-cyan-400 mt-2 truncate">
                {result.report_id}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Permanent record</span>
            </div>
          </div>

          {/* Matched Passages */}
          {result.matches && result.matches.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Flagged Overlap Matches & Citation Recommendations
              </h3>
              <div className="space-y-3">
                {result.matches.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        Match #{idx + 1} • {m.matched_words || m.length} words
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                        Source: {m.source || 'Academic Open Index'}
                      </span>
                    </div>
                    <blockquote className="text-xs font-serif text-neutral-800 dark:text-neutral-200 border-l-2 border-blue-500 pl-3 italic">
                      "{m.excerpt || m.passage}"
                    </blockquote>
                    <p className="text-[11px] text-neutral-500">
                      Recommendation: {m.recommendation || 'Add direct inline citation and rephrase supporting narrative.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>No substantial identical n-gram sequences detected across academic source corpora.</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
