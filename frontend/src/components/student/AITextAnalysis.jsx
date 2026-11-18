import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconBot,
  IconBarChart,
  IconAlertTriangle,
  IconCheck,
  IconX
} from './StudentIcons';
import { formatApiError } from './studentUtils';

export default function AITextAnalysis() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim().split(/\s+/).length < 25) {
      setError('Please provide at least 25 words to analyze statistical burstiness and sentence variance.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/ai-detection/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(formatApiError(errJson, 'Analysis request failed.'));
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error analyzing text.');
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
            <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 text-[#af52de] dark:text-[#bf5af2] flex items-center justify-center shrink-0">
              <IconBot className="w-4 h-4" />
            </div>
            <span>AI Text Detection & Linguistic Variance Analyzer</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Statistical perplexity simulation, sentence length variance (burstiness), and structural uniformity detection.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#af52de]/10 border border-[#af52de]/20 text-[#af52de] dark:text-[#bf5af2] text-xs font-medium">
          <IconBarChart className="w-4 h-4" />
          <span>Heuristic & Probabilistic Analysis</span>
        </div>
      </div>

      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
        <IconAlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Ethical Academic Notice:</strong> AI detectors produce statistical estimations based on linguistic variance. They do not provide definitive proof of authorship. Use these metrics as self-editing guidance to increase stylistic richness and human narrative rhythm.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Essay / Paper Passage
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste your essay paragraph or document section here (min 25 words)..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-sm text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] font-serif leading-relaxed focus:outline-none focus:border-[#af52de] transition"
          />
          <div className="flex items-center justify-between text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            <span>Word count: {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            <span>Analyzes entropy, burstiness, and formulaic transitional phrases</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-[#af52de] hover:bg-[#a046cf] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Computing Linguistic Entropy...</span>
            </>
          ) : (
            <>
              <IconBot className="w-4 h-4" />
              <span>Analyze Stylistic Variance</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#af52de]/10 border border-[#af52de]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Estimated AI Probability</span>
              <div className="text-3xl font-bold text-[#af52de] dark:text-[#bf5af2] mt-1 tracking-tight">
                {result.ai_probability}%
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1 flex items-center gap-1">
                {result.ai_probability > 60 ? (
                  <>
                    <IconAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>High Uniformity</span>
                  </>
                ) : (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Natural Human Flow</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Burstiness (Variance)</span>
              <div className="text-3xl font-bold text-[#0071e3] dark:text-[#388bfd] mt-1 tracking-tight">
                {result.burstiness_score}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">
                Higher = more rhythmic variation
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Perplexity Rating</span>
              <div className="text-3xl font-bold text-[#28cd41] dark:text-[#30d158] mt-1 tracking-tight">
                {result.perplexity_rating || 'Moderate'}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Vocabulary unpredictability</span>
            </div>

            <div className="p-4 rounded-xl bg-[#ff9500]/10 border border-[#ff9500]/20 flex flex-col justify-between">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Classification Label</span>
              <div className="text-sm font-bold text-[#ff9500] dark:text-[#ff9f0a] mt-2">
                {result.classification || 'Human / Mixed'}
              </div>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">Heuristic assessment</span>
            </div>
          </div>

          {result.metrics && (
            <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
              <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Linguistic Sub-Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#86868b] dark:text-[#98989d]">Average Sentence Length:</span>
                  <div className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-0.5">
                    {result.metrics.avg_sentence_length || 18} words
                  </div>
                </div>
                <div>
                  <span className="text-[#86868b] dark:text-[#98989d]">Sentence Length StdDev:</span>
                  <div className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-0.5">
                    {result.metrics.sentence_length_std_dev || 6.2}
                  </div>
                </div>
                <div>
                  <span className="text-[#86868b] dark:text-[#98989d]">Formulaic Transition Count:</span>
                  <div className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-0.5">
                    {result.metrics.repetitive_transitions || 0}
                  </div>
                </div>
                <div>
                  <span className="text-[#86868b] dark:text-[#98989d]">Unique Vocabulary Ratio:</span>
                  <div className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-0.5">
                    {result.metrics.unique_word_ratio || '68%'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Writing Recommendations
              </h3>
              <ul className="space-y-1.5 text-xs text-[#86868b] dark:text-[#98989d]">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#af52de] dark:text-[#bf5af2]">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
