import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconPen,
  IconLock,
  IconCopy,
  IconCheck,
  IconX,
  IconAcademicCap,
  IconZap,
  IconBookOpen,
  IconCpu,
  IconShield,
  IconFolder,
  IconSparkles,
  IconArrowRight,
  IconTarget,
  IconAward
} from './StudentIcons';
import { formatApiError } from './studentUtils';

const TONES = [
  { id: 'formal_academic', label: 'Formal Academic', Icon: IconAcademicCap, desc: 'Scholarly vocabulary, rigorous syntax, objective voice' },
  { id: 'concise', label: 'Concise & Direct', Icon: IconZap, desc: 'Eliminates filler words, maximizes informational density' },
  { id: 'expanded', label: 'Expanded & Detailed', Icon: IconBookOpen, desc: 'Elaborates arguments with contextual transitions' },
  { id: 'technical', label: 'Technical & Engineering', Icon: IconCpu, desc: 'Preserves exact mathematical and engineering formulas' },
  { id: 'thesis_defense', label: 'Thesis Defense', Icon: IconShield, desc: 'Defensive, precise assertions with evidentiary backing' },
  { id: 'literature_review', label: 'Literature Review', Icon: IconFolder, desc: 'Synthesizes past literature with balanced scholarly perspective' },
  { id: 'accessible', label: 'Undergraduate Accessible', Icon: IconSparkles, desc: 'Clear, straightforward explanations of complex ideas' },
  { id: 'passive_to_active', label: 'Active Voice Converter', Icon: IconArrowRight, desc: 'Converts passive constructions to dynamic active verbs' },
  { id: 'persuasive', label: 'Persuasive Research', Icon: IconTarget, desc: 'Compelling rhetoric for grant proposals and introductions' },
  { id: 'journal_ready', label: 'Peer-Reviewed Journal', Icon: IconAward, desc: 'Top-tier academic journal conventions and tone' }
];

export default function AcademicParaphraser() {
  const [originalText, setOriginalText] = useState('');
  const [selectedTone, setSelectedTone] = useState('formal_academic');
  const [preservedTerms, setPreservedTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [paraphrasedText, setParaphrasedText] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleParaphrase = async (e) => {
    e.preventDefault();
    if (!originalText.trim()) {
      setError('Please provide text to paraphrase.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const termsList = preservedTerms.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/v1/student/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText.trim(),
          tone: selectedTone,
          preserved_terms: termsList
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(formatApiError(errJson, 'Paraphrase request failed.'));
      }

      const data = await res.json();
      setParaphrasedText(data.paraphrased_text || data.text || '');
    } catch (err) {
      setError(err.message || 'Error executing paraphrase.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!paraphrasedText) return;
    navigator.clipboard.writeText(paraphrasedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 text-[#28cd41] dark:text-[#30d158] flex items-center justify-center shrink-0">
              <IconPen className="w-4 h-4" />
            </div>
            <span>Academic Tone & Style Paraphraser</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Transform draft prose into peer-reviewed scholarly prose with technical term locking.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 text-[#28cd41] dark:text-[#30d158] text-xs font-medium">
          <IconLock className="w-4 h-4" />
          <span>Technical Terminology Preserved</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tone Selection Bento Pills */}
      <div>
        <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-2">
          Select Academic Target Tone (10 Modes)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {TONES.map(tone => {
            const isSelected = selectedTone === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => setSelectedTone(tone.id)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm'
                    : 'bg-white/80 dark:bg-[#1c1c1e]/80 border-black/[0.08] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] hover:border-black/20 dark:hover:border-white/25'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-xs font-semibold">
                  <tone.Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#86868b] dark:text-[#98989d]'}`} />
                  <span className="truncate">{tone.label}</span>
                </div>
                <p className={`text-[11px] line-clamp-2 leading-tight ${isSelected ? 'text-white/80' : 'text-[#86868b] dark:text-[#98989d]'}`}>
                  {tone.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preserved Terms Input */}
      <div>
        <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
          Preserved Technical Terms (Comma Separated)
        </label>
        <input
          type="text"
          value={preservedTerms}
          onChange={(e) => setPreservedTerms(e.target.value)}
          placeholder="e.g. Byzantine fault tolerance, LSTM, O(n log n), Navier-Stokes"
          className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs font-mono text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] focus:outline-none focus:border-[#0071e3] transition"
        />
        <p className="text-[11px] text-[#86868b] dark:text-[#98989d] mt-1">
          These exact terms will be strictly preserved in their original form without synonym substitution.
        </p>
      </div>

      {/* Side-by-side workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            <span>Original Manuscript Text</span>
            <span className="text-[11px] text-[#86868b] dark:text-[#98989d]">
              {originalText.trim() ? originalText.trim().split(/\s+/).length : 0} words
            </span>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={10}
            placeholder="Paste your original draft here..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-sm text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] font-serif leading-relaxed focus:outline-none focus:border-[#0071e3] transition"
          />
        </div>

        {/* Paraphrased Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            <span>Paraphrased Academic Output</span>
            {paraphrasedText && (
              <button
                type="button"
                onClick={copyToClipboard}
                className="text-xs text-[#0071e3] dark:text-[#388bfd] hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
              >
                {copied ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              value={paraphrasedText}
              readOnly
              rows={10}
              placeholder="Refined scholarly prose will appear here..."
              className="w-full px-4 py-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-sm font-serif leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] focus:outline-none"
            />
            {loading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2 text-[#0071e3] dark:text-[#388bfd] text-xs font-semibold">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Restructuring Syntax...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleParaphrase}
          disabled={loading || !originalText.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <IconPen className="w-4 h-4" />
          <span>Apply Academic Transformation</span>
        </button>
      </div>
    </div>
  );
}
