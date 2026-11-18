import React, { useState } from 'react';
import { motion } from 'framer-motion';

const TONES = [
  { id: 'formal_academic', label: 'Formal Academic', icon: '🎓', desc: 'Scholarly vocabulary, rigorous syntax, objective voice' },
  { id: 'concise', label: 'Concise & Direct', icon: '✂️', desc: 'Eliminates filler words, maximizes informational density' },
  { id: 'expanded', label: 'Expanded & Detailed', icon: '📖', desc: 'Elaborates arguments with contextual transitions' },
  { id: 'technical', label: 'Technical & Engineering', icon: '⚙️', desc: 'Preserves exact mathematical and engineering formulas' },
  { id: 'thesis_defense', label: 'Thesis Defense', icon: '🏛️', desc: 'Defensive, precise assertions with evidentiary backing' },
  { id: 'literature_review', label: 'Literature Review', icon: '📚', desc: 'Synthesizes past literature with balanced scholarly perspective' },
  { id: 'accessible', label: 'Undergraduate Accessible', icon: '💡', desc: 'Clear, straightforward explanations of complex ideas' },
  { id: 'passive_to_active', label: 'Active Voice Converter', icon: '⚡', desc: 'Converts passive constructions to dynamic active verbs' },
  { id: 'persuasive', label: 'Persuasive Research', icon: '🎯', desc: 'Compelling rhetoric for grant proposals and introductions' },
  { id: 'journal_ready', label: 'Peer-Reviewed Journal', icon: '🏆', desc: 'Top-tier academic journal conventions and tone' }
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
        throw new Error(errJson.detail || 'Paraphrase request failed.');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>✍️</span>
            <span>Academic Tone & Style Paraphraser</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Transform draft prose into peer-reviewed scholarly prose with technical term locking.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span>🔒</span>
          <span>Technical Terminology Preserved</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Tone Selection Pills */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
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
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-white/40 dark:bg-black/30 border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold">
                  <span>{tone.icon}</span>
                  <span className="truncate">{tone.label}</span>
                </div>
                <p className="text-[10px] text-neutral-400 line-clamp-2 leading-tight">
                  {tone.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preserved Terms Input */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
          Preserved Technical Terms (Comma Separated)
        </label>
        <input
          type="text"
          value={preservedTerms}
          onChange={(e) => setPreservedTerms(e.target.value)}
          placeholder="e.g. Byzantine fault tolerance, LSTM, O(n log n), Navier-Stokes"
          className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs font-mono focus:outline-none focus:border-emerald-500 transition"
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          These exact terms will be strictly preserved in their original form without synonym substitution.
        </p>
      </div>

      {/* Side-by-side workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Original Manuscript Text</span>
            <span className="text-[11px] text-neutral-400">
              {originalText.trim() ? originalText.trim().split(/\s+/).length : 0} words
            </span>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={10}
            placeholder="Paste your original draft here..."
            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-sm font-serif leading-relaxed focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Paraphrased Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Paraphrased Academic Output</span>
            {paraphrasedText && (
              <button
                type="button"
                onClick={copyToClipboard}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <span>{copied ? '✓ Copied' : '📋 Copy'}</span>
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              value={paraphrasedText}
              readOnly
              rows={10}
              placeholder="Refined scholarly prose will appear here..."
              className="w-full px-4 py-3 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-sm font-serif leading-relaxed text-neutral-800 dark:text-neutral-200 focus:outline-none"
            />
            {loading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
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
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          <span>✍️</span>
          <span>Apply Academic Transformation</span>
        </button>
      </div>
    </div>
  );
}
