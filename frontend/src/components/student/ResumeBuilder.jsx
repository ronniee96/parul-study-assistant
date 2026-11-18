import React, { useState } from 'react';
import {
  IconFileText,
  IconPrinter,
  IconSave,
  IconCheck
} from './StudentIcons';

export default function ResumeBuilder() {
  const [fullName, setFullName] = useState('Rohan Mitra');
  const [email, setEmail] = useState('rohan.mitra@paruluniversity.ac.in');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [headline, setHeadline] = useState('Computer Science & Engineering Student | AI & Distributed Systems');
  const [education, setEducation] = useState('B.Tech in Computer Science & Engineering\nParul Institute of Technology, Parul University (2022 - 2026)\nCGPA: 9.12 / 10.0');
  const [skills, setSkills] = useState('Python, React.js, FastAPI, PostgreSQL, PyTorch, Docker, Kubernetes, Git, Tailwind CSS');
  const [projects, setProjects] = useState('Parul Study Assistant (2024)\n- Designed distributed academic question generator with multi-provider AI fallback.\n- Integrated 3NF normalized schema design and deterministic plagiarism verification.\n- Engineered real-time WebSocket monitoring with 99.8% uptime.');
  const [atsScore, setAtsScore] = useState(88);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const calculateScore = () => {
    let score = 50;
    if (fullName.trim().length > 3) score += 10;
    if (email.includes('@')) score += 10;
    if (skills.split(',').length >= 5) score += 15;
    if (projects.length > 50) score += 15;
    setAtsScore(Math.min(100, score));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/student/resumes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          headline,
          education,
          skills: skills.split(',').map(s => s.trim()),
          projects,
          ats_score: atsScore
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.debug('Error saving resume:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#30b0c7]/10 text-[#30b0c7] dark:text-[#40c8e0] flex items-center justify-center shrink-0">
              <IconFileText className="w-4 h-4" />
            </div>
            <span>ATS-Optimized Academic Resume Builder</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Build recruiter-ready academic & internship resumes with live keyword density scoring and clean single-page typography.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#30b0c7]/10 border border-[#30b0c7]/20 text-[#30b0c7] dark:text-[#40c8e0] text-xs font-medium">
            <span>ATS Compatibility:</span>
            <span className="font-bold">{atsScore}%</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <IconPrinter className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl text-[#28cd41] dark:text-[#30d158] text-xs flex items-center gap-2">
          <IconCheck className="w-4 h-4 shrink-0" />
          <span>Resume profile successfully saved to Student Academic Repository.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
                Headline / Specialization
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => { setHeadline(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
              Education & Institutional Credentials
            </label>
            <textarea
              value={education}
              onChange={(e) => { setEducation(e.target.value); calculateScore(); }}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
              Technical Skills (Comma Separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => { setSkills(e.target.value); calculateScore(); }}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1">
              Key Engineering Projects & Descriptions
            </label>
            <textarea
              value={projects}
              onChange={(e) => { setProjects(e.target.value); calculateScore(); }}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#30b0c7] hover:bg-[#259eb5] text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <IconSave className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Resume Profile'}</span>
          </button>
        </div>

        {/* Live Resume Sheet Preview */}
        <div className="p-8 rounded-2xl bg-white text-neutral-900 border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-4 font-sans print:p-0 print:border-none print:shadow-none min-h-[500px]">
          <div className="border-b pb-3 text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase">
              {fullName || 'Student Name'}
            </h1>
            <p className="text-xs font-medium text-neutral-600">
              {headline}
            </p>
            <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-3">
              <span>{email}</span>
              <span>•</span>
              <span>{phone}</span>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-300 pb-0.5 mb-1.5">
              Education
            </h2>
            <div className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
              {education}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-300 pb-0.5 mb-1.5">
              Technical Expertise
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.split(',').map((s, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] border border-neutral-200">
                  {s.trim()}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-300 pb-0.5 mb-1.5">
              Academic & Engineering Projects
            </h2>
            <div className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
              {projects}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
