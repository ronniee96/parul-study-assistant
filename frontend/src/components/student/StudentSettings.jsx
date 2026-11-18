import React, { useState } from 'react';

export default function StudentSettings() {
  const [citationFormat, setCitationFormat] = useState('IEEE');
  const [degreeTier, setDegreeTier] = useState('bachelor');
  const [defaultTone, setDefaultTone] = useState('formal_academic');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('student_pref_citation', citationFormat);
    localStorage.setItem('student_pref_tier', degreeTier);
    localStorage.setItem('student_pref_tone', defaultTone);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span>⚙️</span>
          <span>Academic Workspace Settings & Preferences</span>
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Configure default citation styling, university degree level, and privacy preferences.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <span>✓</span>
          <span>Preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Default University Citation Standard
          </label>
          <select
            value={citationFormat}
            onChange={(e) => setCitationFormat(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="IEEE">IEEE (Faculty of Engineering & Technology)</option>
            <option value="APA7">APA 7th Edition (Science & Business)</option>
            <option value="MLA9">MLA 9th Edition (Humanities)</option>
            <option value="Harvard">Harvard Referencing Style</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Academic Curriculum Level
          </label>
          <select
            value={degreeTier}
            onChange={(e) => setDegreeTier(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="bachelor">B.Tech / Bachelor's Level</option>
            <option value="master">M.Tech / Master's Level</option>
            <option value="doctoral">PhD / Doctoral Dissertation Level</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Default Paraphrasing Tone
          </label>
          <select
            value={defaultTone}
            onChange={(e) => setDefaultTone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="formal_academic">Formal Academic (Standard)</option>
            <option value="technical">Technical & Engineering (Formula-locked)</option>
            <option value="concise">Concise & Dense</option>
            <option value="journal_ready">Peer-Reviewed Journal Style</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white font-semibold text-xs transition"
        >
          Save Academic Preferences
        </button>
      </form>
    </div>
  );
}
