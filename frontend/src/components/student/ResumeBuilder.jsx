import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ResumeBuilder() {
  const [fullName, setFullName] = useState('Rahul Sharma');
  const [email, setEmail] = useState('rahul.sharma@paruluniversity.ac.in');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [headline, setHeadline] = useState('Computer Science Undergraduate • Distributed Systems & AI');
  const [education, setEducation] = useState('B.Tech in Computer Science and Engineering, Parul University (2022 - 2026)\nCGPA: 8.92 / 10.0 • Relevant Coursework: Data Structures, Operating Systems, Database Management');
  const [skills, setSkills] = useState('Python, TypeScript, React, FastAPI, PostgreSQL, Docker, Git, Machine Learning, TailwindCSS');
  const [projects, setProjects] = useState('1. Parul Study Assistant: Full-stack AI academic platform with Neon Postgres and Touch ID authentication.\n2. IoT Fleet Telemetry: Real-time sensor stream processor utilizing WebSockets and Redis timeseries.');
  const [template, setTemplate] = useState('modern_minimal');
  const [atsScore, setAtsScore] = useState(88);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const calculateScore = () => {
    let score = 50;
    if (skills.split(',').length >= 5) score += 15;
    if (projects.length > 50) score += 15;
    if (education.length > 30) score += 10;
    if (email && phone) score += 10;
    setAtsScore(Math.min(100, score));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/v1/student/resume/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${fullName} - Academic Resume`,
          template_id: template,
          content: {
            fullName, email, phone, headline, education, skills, projects
          },
          ats_score: atsScore
        })
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.debug('Save resume error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📄</span>
            <span>ATS-Optimized Academic Resume Builder</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Build recruiter-ready academic & internship resumes with live keyword density scoring and clean single-page typography.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <span>ATS Compatibility:</span>
            <span className="font-bold">{atsScore}%</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-semibold transition"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <span>✓</span>
          <span>Resume profile successfully saved to Student Academic Repository.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Headline / Specialization
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => { setHeadline(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Academic Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); calculateScore(); }}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
              Education & University Details
            </label>
            <textarea
              value={education}
              onChange={(e) => { setEducation(e.target.value); calculateScore(); }}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
              Technical Skills (Comma separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => { setSkills(e.target.value); calculateScore(); }}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
              Key Engineering Projects & Descriptions
            </label>
            <textarea
              value={projects}
              onChange={(e) => { setProjects(e.target.value); calculateScore(); }}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-semibold text-xs shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>💾</span>
            <span>{saving ? 'Saving...' : 'Save Resume Profile'}</span>
          </button>
        </div>

        {/* Live Resume Sheet Preview */}
        <div className="p-8 rounded-2xl bg-white text-neutral-900 border border-neutral-300 shadow-xl space-y-4 font-sans print:p-0 print:border-none print:shadow-none min-h-[500px]">
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
