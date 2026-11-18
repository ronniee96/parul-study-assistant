import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function AssignmentAssistant() {
  const [topic, setTopic] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('bachelor');
  const [citationFormat, setCitationFormat] = useState('IEEE');
  const [targetWordCount, setTargetWordCount] = useState(3000);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please provide a research or assignment topic.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/projects/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          degree_level: degreeLevel,
          citation_format: citationFormat,
          target_word_count: Number(targetWordCount)
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Outline generation failed.');
      }

      const data = await res.json();
      setOutline(data);
    } catch (err) {
      setError(err.message || 'Error generating project outline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📚</span>
            <span>Assignment, Thesis & Research Paper Architect</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Generate formal academic table of contents, methodology frameworks, section word allocations, and citation templates.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <span>🏛️</span>
          <span>University Curriculum Aligned</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Assignment / Thesis Research Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Real-Time Anomaly Detection in IoT Edge Computing using TinyML"
            className="w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Academic Tier
            </label>
            <select
              value={degreeLevel}
              onChange={(e) => setDegreeLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="undergraduate">B.Tech / Undergraduate</option>
              <option value="postgraduate">M.Tech / Master's Thesis</option>
              <option value="doctoral">PhD / Doctoral Dissertation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Citation Standard
            </label>
            <select
              value={citationFormat}
              onChange={(e) => setCitationFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="IEEE">IEEE (Engineering standard)</option>
              <option value="APA7">APA 7th Edition</option>
              <option value="MLA9">MLA 9th Edition</option>
              <option value="Harvard">Harvard Referencing</option>
              <option value="Chicago">Chicago Manual of Style</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Target Length (Words)
            </label>
            <input
              type="number"
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(e.target.value)}
              step={500}
              min={1000}
              max={50000}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Architecting Thesis Blueprint...</span>
            </>
          ) : (
            <>
              <span>📚</span>
              <span>Generate Academic Outline & Framework</span>
            </>
          )}
        </button>
      </form>

      {outline && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {outline.title || topic}
              </h3>
              <p className="text-xs text-neutral-400">
                Format: {outline.citation_format || citationFormat} • Target: {outline.target_word_count || targetWordCount} words
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const text = JSON.stringify(outline, null, 2);
                navigator.clipboard.writeText(text);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition"
            >
              Export JSON Outline
            </button>
          </div>

          {/* Section Blueprint */}
          {outline.sections && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Structured Chapter Outline & Word Distribution
              </h4>
              <div className="space-y-2">
                {outline.sections.map((sec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{sec.title}</span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 pl-7">
                        {sec.description || sec.summary}
                      </p>
                    </div>
                    <div className="shrink-0 pl-7 md:pl-0 text-xs font-mono text-indigo-400 font-semibold">
                      ~{sec.allocated_words || Math.round(targetWordCount / outline.sections.length)} words
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Methodology Framework */}
          {outline.methodology_notes && (
            <div className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Methodology & Data Collection Strategy
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {outline.methodology_notes}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
