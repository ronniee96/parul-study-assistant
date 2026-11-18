import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
        throw new Error(errJson.detail || 'Analysis request failed.');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>🤖</span>
            <span>AI Text Detection & Linguistic Variance Analyzer</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Statistical perplexity simulation, sentence length variance (burstiness), and structural uniformity detection.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <span>📊</span>
          <span>Heuristic & Probabilistic Analysis</span>
        </div>
      </div>

      <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
        <span className="text-amber-400 font-bold mt-0.5">ℹ️</span>
        <p className="leading-relaxed">
          <strong>Ethical Academic Notice:</strong> AI detectors produce statistical estimations based on linguistic variance. They do not provide definitive proof of authorship. Use these metrics as self-editing guidance to increase stylistic richness and human narrative rhythm.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Essay / Paper Passage
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste your essay paragraph or document section here (min 25 words)..."
            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-sm font-serif leading-relaxed focus:outline-none focus:border-purple-500 transition"
          />
          <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
            <span>Word count: {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            <span>Analyzes entropy, burstiness, and formulaic transitional phrases</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Computing Linguistic Entropy...</span>
            </>
          ) : (
            <>
              <span>🤖</span>
              <span>Analyze Stylistic Variance</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Estimated AI Probability</span>
              <div className="text-3xl font-extrabold text-purple-400 mt-1">
                {result.ai_probability}%
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">
                {result.ai_probability > 60 ? '⚠️ High Uniformity' : '✓ Natural Human Flow'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Burstiness (Variance)</span>
              <div className="text-3xl font-extrabold text-cyan-400 mt-1">
                {result.burstiness_score}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">
                Higher = more rhythmic variation
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Perplexity Rating</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                {result.perplexity_rating || 'Moderate'}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Vocabulary unpredictability</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
              <span className="text-xs text-neutral-400">Classification Label</span>
              <div className="text-sm font-bold text-amber-300 mt-2">
                {result.classification || 'Human / Mixed'}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1">Heuristic assessment</span>
            </div>
          </div>

          {result.metrics && (
            <div className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Linguistic Sub-Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500">Average Sentence Length:</span>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {result.metrics.avg_sentence_length || 18} words
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500">Sentence Length StdDev:</span>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {result.metrics.sentence_length_std_dev || 6.2}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500">Formulaic Transition Count:</span>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {result.metrics.repetitive_transitions || 0}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500">Unique Vocabulary Ratio:</span>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {result.metrics.unique_word_ratio || '68%'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Writing Recommendations
              </h3>
              <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
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
