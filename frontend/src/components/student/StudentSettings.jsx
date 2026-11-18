import React, { useState } from 'react';
import {
  IconSliders,
  IconCheck
} from './StudentIcons';

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
      {/* Apple Header */}
      <div className="pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] flex items-center justify-center shrink-0">
            <IconSliders className="w-4 h-4" />
          </div>
          <span>Academic Workspace Settings & Preferences</span>
        </h2>
        <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
          Configure default citation styling, university degree level, and privacy preferences.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl text-[#28cd41] dark:text-[#30d158] text-xs flex items-center gap-2">
          <IconCheck className="w-4 h-4 shrink-0" />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Default University Citation Standard
          </label>
          <select
            value={citationFormat}
            onChange={(e) => setCitationFormat(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
          >
            <option value="IEEE">IEEE (Faculty of Engineering & Technology)</option>
            <option value="APA7">APA 7th Edition (Science & Business)</option>
            <option value="MLA9">MLA 9th Edition (Humanities)</option>
            <option value="Harvard">Harvard Referencing Style</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Academic Curriculum Level
          </label>
          <select
            value={degreeTier}
            onChange={(e) => setDegreeTier(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
          >
            <option value="bachelor">B.Tech / Bachelor's Level</option>
            <option value="master">M.Tech / Master's Level</option>
            <option value="doctoral">PhD / Doctoral Dissertation Level</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            Default Paraphrasing Tone
          </label>
          <select
            value={defaultTone}
            onChange={(e) => setDefaultTone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
          >
            <option value="formal_academic">Formal Academic (Standard)</option>
            <option value="technical">Technical & Engineering (Formula-locked)</option>
            <option value="concise">Concise & Dense</option>
            <option value="journal_ready">Peer-Reviewed Journal Style</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-sm transition cursor-pointer"
        >
          Save Academic Preferences
        </button>
      </form>
    </div>
  );
}
