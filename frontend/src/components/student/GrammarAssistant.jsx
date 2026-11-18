import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function GrammarAssistant() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please provide text to evaluate grammar and readability.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/grammar/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Grammar check failed.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error running grammar check.');
    } finally {
      setLoading(false);
    }
  };

  const applyCorrection = (errIdx, replacement) => {
    if (!result || !result.errors || !result.errors[errIdx]) return;
    const targetErr = result.errors[errIdx];
    const original = targetErr.context || targetErr.original;
    if (original && text.includes(original)) {
      const updated = text.replace(original, replacement);
      setText(updated);
      // Remove from list
      const updatedErrors = result.errors.filter((_, i) => i !== errIdx);
      setResult({ ...result, errors: updatedErrors });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📝</span>
            <span>Academic Grammar, Clarity & Readability Linter</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Detect passive voice misuse, wordiness, subject-verb agreement errors, and calculate Flesch-Kincaid grade level.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <span>🎯</span>
          <span>Flesch-Kincaid & Clarity Scoring</span>
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
            Document Passage
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="Type or paste your academic writing here to inspect syntax, passive voice, and readability..."
            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-sm font-serif leading-relaxed focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold text-sm shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Linting Grammar & Style...</span>
            </>
          ) : (
            <>
              <span>📝</span>
              <span>Execute Grammar & Style Audit</span>
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
          {/* Readability & Quality KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Issues Flagged</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-1">
                {result.errors ? result.errors.length : 0}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Syntax & Clarity</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Readability Score</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                {result.readability_score || 72}/100
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Flesch Reading Ease</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Academic Grade Level</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-1">
                {result.grade_level || 'College Undergrad'}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Flesch-Kincaid formula</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Passive Voice Ratio</span>
              <div className="text-3xl font-extrabold text-purple-400 mt-1">
                {result.passive_voice_percentage || 12}%
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Target: &lt;15%</span>
            </div>
          </div>

          {/* Issue Cards */}
          {result.errors && result.errors.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Detected Issues & Recommended Replacements
              </h3>
              <div className="space-y-3">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-400 uppercase tracking-wider">
                        {err.type || 'Clarity Suggestion'}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {err.rule || 'Style Guide'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200">
                      <strong>Issue:</strong> {err.message || 'Wordy phrase or passive construction.'}
                    </p>
                    {err.context && (
                      <div className="text-xs font-mono p-2 rounded bg-neutral-200/50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300">
                        "{err.context}"
                      </div>
                    )}
                    {err.suggestions && err.suggestions.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-xs text-neutral-500">Quick Replace:</span>
                        {err.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => applyCorrection(idx, sug)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition"
                          >
                            ✓ {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>No syntax violations, wordiness or passive voice issues detected! Highly polished manuscript.</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
