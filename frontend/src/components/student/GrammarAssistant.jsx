import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconGrammar,
  IconTarget,
  IconCheck,
  IconX
} from './StudentIcons';
import { formatApiError } from './studentUtils';

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
        throw new Error(formatApiError(errJson, 'Grammar check failed.'));
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
      const updatedErrors = result.errors.filter((_, i) => i !== errIdx);
      setResult({ ...result, errors: updatedErrors });
    }
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 text-[#ff9500] dark:text-[#ff9f0a] flex items-center justify-center shrink-0">
              <IconGrammar className="w-4 h-4" />
            </div>
            <span>Academic Grammar, Clarity & Readability Linter</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Detect passive voice misuse, wordiness, subject-verb agreement errors, and calculate Flesch-Kincaid grade level.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ff9500]/10 border border-[#ff9500]/20 text-[#ff9500] dark:text-[#ff9f0a] text-xs font-medium">
          <IconTarget className="w-4 h-4" />
          <span>Flesch-Kincaid & Clarity Scoring</span>
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
            Document Passage
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="Type or paste your academic writing here to inspect syntax, passive voice, and readability..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-sm text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] font-serif leading-relaxed focus:outline-none focus:border-[#ff9500] transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#ff9500] hover:bg-[#e68600] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Linting Grammar & Style...</span>
            </>
          ) : (
            <>
              <IconGrammar className="w-4 h-4" />
              <span>Execute Grammar & Style Audit</span>
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
          {/* Readability & Quality KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#ff9500]/10 border border-[#ff9500]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Issues Flagged</span>
              <div className="text-3xl font-bold text-[#ff9500] dark:text-[#ff9f0a] mt-1 tracking-tight">
                {result.errors ? result.errors.length : 0}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Syntax & Clarity</span>
            </div>

            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Readability Score</span>
              <div className="text-3xl font-bold text-[#28cd41] dark:text-[#30d158] mt-1 tracking-tight">
                {result.readability_score || 72}/100
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Flesch Reading Ease</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Academic Grade Level</span>
              <div className="text-3xl font-bold text-[#0071e3] dark:text-[#388bfd] mt-1 tracking-tight">
                {result.grade_level || 'College Undergrad'}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Flesch-Kincaid formula</span>
            </div>

            <div className="p-4 rounded-xl bg-[#af52de]/10 border border-[#af52de]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Passive Voice Ratio</span>
              <div className="text-3xl font-bold text-[#af52de] dark:text-[#bf5af2] mt-1 tracking-tight">
                {result.passive_voice_percentage || 12}%
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Target: &lt;15%</span>
            </div>
          </div>

          {/* Issue Cards */}
          {result.errors && result.errors.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Detected Issues & Recommended Replacements
              </h3>
              <div className="space-y-3">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#ff9500] dark:text-[#ff9f0a] uppercase tracking-wider text-[11px]">
                        {err.type || 'Clarity Suggestion'}
                      </span>
                      <span className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                        {err.rule || 'Style Guide'}
                      </span>
                    </div>
                    <p className="text-xs text-[#1d1d1f] dark:text-[#f5f5f7]">
                      <strong>Issue:</strong> {err.message || 'Wordy phrase or passive construction.'}
                    </p>
                    {err.context && (
                      <div className="text-xs font-mono p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-[#f5f5f7]">
                        "{err.context}"
                      </div>
                    )}
                    {err.suggestions && err.suggestions.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-xs text-[#86868b] dark:text-[#98989d]">Quick Replace:</span>
                        {err.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => applyCorrection(idx, sug)}
                            className="px-2.5 py-1 rounded-lg bg-[#34c759]/10 border border-[#34c759]/20 text-[#28cd41] dark:text-[#30d158] text-xs font-medium hover:bg-[#34c759]/20 transition cursor-pointer flex items-center gap-1"
                          >
                            <IconCheck className="w-3 h-3" />
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 text-[#28cd41] dark:text-[#30d158] text-xs flex items-center gap-2">
              <IconCheck className="w-4 h-4 shrink-0" />
              <span>No syntax violations, wordiness or passive voice issues detected! Highly polished manuscript.</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
