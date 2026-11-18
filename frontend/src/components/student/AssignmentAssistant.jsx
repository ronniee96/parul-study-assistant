import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconBookOpen,
  IconAcademicCap,
  IconCopy,
  IconCheck,
  IconX
} from './StudentIcons';
import { formatApiError } from './studentUtils';

export default function AssignmentAssistant() {
  const [topic, setTopic] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('bachelor');
  const [citationFormat, setCitationFormat] = useState('IEEE');
  const [targetWordCount, setTargetWordCount] = useState(3000);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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
        throw new Error(formatApiError(errJson, 'Outline generation failed.'));
      }

      const data = await res.json();
      setOutline(data);
    } catch (err) {
      setError(err.message || 'Error generating project outline.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!outline) return;
    navigator.clipboard.writeText(JSON.stringify(outline, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5856d6]/10 text-[#5856d6] dark:text-[#5e5ce6] flex items-center justify-center shrink-0">
              <IconBookOpen className="w-4 h-4" />
            </div>
            <span>Assignment, Thesis & Research Paper Architect</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Generate formal academic table of contents, methodology frameworks, section word allocations, and citation templates.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#5856d6]/10 border border-[#5856d6]/20 text-[#5856d6] dark:text-[#5e5ce6] text-xs font-medium">
          <IconAcademicCap className="w-4 h-4" />
          <span>University Curriculum Aligned</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Assignment / Thesis Research Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Real-Time Anomaly Detection in IoT Edge Computing using TinyML"
            className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-sm text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] focus:outline-none focus:border-[#5856d6] transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
              Academic Tier
            </label>
            <select
              value={degreeLevel}
              onChange={(e) => setDegreeLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#5856d6]"
            >
              <option value="undergraduate">B.Tech / Undergraduate</option>
              <option value="postgraduate">M.Tech / Master's Thesis</option>
              <option value="doctoral">PhD / Doctoral Dissertation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
              Citation Standard
            </label>
            <select
              value={citationFormat}
              onChange={(e) => setCitationFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#5856d6]"
            >
              <option value="IEEE">IEEE (Engineering standard)</option>
              <option value="APA7">APA 7th Edition</option>
              <option value="MLA9">MLA 9th Edition</option>
              <option value="Harvard">Harvard Referencing</option>
              <option value="Chicago">Chicago Manual of Style</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
              Target Length (Words)
            </label>
            <input
              type="number"
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(e.target.value)}
              step={500}
              min={1000}
              max={50000}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#5856d6]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#5856d6] hover:bg-[#4b48c6] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Architecting Thesis Blueprint...</span>
            </>
          ) : (
            <>
              <IconBookOpen className="w-4 h-4" />
              <span>Generate Academic Outline & Framework</span>
            </>
          )}
        </button>
      </form>

      {outline && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {outline.title || topic}
              </h3>
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                Format: {outline.citation_format || citationFormat} • Target: {outline.target_word_count || targetWordCount} words
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-[#5856d6]/10 border border-[#5856d6]/20 text-[#5856d6] dark:text-[#5e5ce6] text-xs font-medium hover:bg-[#5856d6]/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied JSON</span>
                </>
              ) : (
                <>
                  <IconCopy className="w-3.5 h-3.5" />
                  <span>Export JSON Outline</span>
                </>
              )}
            </button>
          </div>

          {/* Section Blueprint */}
          {outline.sections && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Structured Chapter Outline & Word Distribution
              </h4>
              <div className="space-y-2">
                {outline.sections.map((sec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-[#5856d6]/10 text-[#5856d6] dark:text-[#5e5ce6] text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{sec.title}</span>
                      </div>
                      <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1 pl-7">
                        {sec.description || sec.summary}
                      </p>
                    </div>
                    <div className="shrink-0 pl-7 md:pl-0 text-xs font-mono text-[#5856d6] dark:text-[#5e5ce6] font-semibold">
                      ~{sec.allocated_words || Math.round(targetWordCount / outline.sections.length)} words
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Methodology Framework */}
          {outline.methodology_notes && (
            <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
              <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Methodology & Data Collection Strategy
              </h4>
              <p className="text-xs text-[#86868b] dark:text-[#98989d] leading-relaxed">
                {outline.methodology_notes}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
