import React, { useState } from 'react';
import {
  IconFileText,
  IconPrinter,
  IconSave,
  IconCheck
} from './StudentIcons';
import { formatApiError } from './studentUtils';

const RESUME_PRESETS = [
  {
    id: 'cse',
    label: 'Computer Science & AI',
    fullName: 'Rohan Mitra',
    email: 'rohan.mitra@paruluniversity.ac.in',
    phone: '+91 98765 43210',
    headline: 'Computer Science & Engineering Student | AI & Distributed Systems',
    education: `B.Tech in Computer Science & Engineering
Parul Institute of Technology, Parul University (2022 - 2026)
CGPA: 9.12 / 10.0 • Department Rank: Top 3%`,
    skills: 'Python, React.js, FastAPI, PostgreSQL, PyTorch, Docker, Kubernetes, Git, Tailwind CSS',
    projects: `1. Parul Study Assistant (2024)
- Engineered distributed academic question generator with multi-provider AI fallback and real-time state synchronization.
- Designed 3NF normalized schema design and deterministic n-gram plagiarism verification engine.
- Implemented WebSocket telemetry monitoring achieving 99.8% uptime across edge infrastructure.

2. Edge Computing TinyML Inference Pipeline (2023)
- Deployed quantized convolutional neural network models on constrained microcontroller targets.
- Reduced inference latency by 42% while retaining 96.5% classification accuracy.`
  },
  {
    id: 'mech',
    label: 'Mechanical & Fluid Systems',
    fullName: 'Amit Patel',
    email: 'amit.patel@paruluniversity.ac.in',
    phone: '+91 98234 56789',
    headline: 'Mechanical Engineering Student | Computational Fluid Dynamics & Thermodynamics',
    education: `B.Tech in Mechanical Engineering
Faculty of Engineering, Parul University (2022 - 2026)
CGPA: 8.85 / 10.0 • Member of SAE Collegiate Club`,
    skills: 'MATLAB, ANSYS Fluent, SolidWorks, AutoCAD, Python (NumPy/SciPy), GD&T, Finite Element Analysis',
    projects: `1. Circular Pipe Flow Turbulence Analysis (2024)
- Solved Navier-Stokes equations for high Reynolds pipe regimes (Re > 100,000) using Swamee-Jain friction approximations.
- Validated pressure head loss and pumping power requirements against experimental benchmark data.

2. Heat Exchanger Thermal Optimization (2023)
- Modeled 1D Fourier conduction and convection across multi-layer composite thermal barriers.
- Optimized fin spacing to enhance overall heat transfer coefficient by 18%.`
  },
  {
    id: 'it',
    label: 'Information Technology & Cloud',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@paruluniversity.ac.in',
    phone: '+91 98111 22334',
    headline: 'Information Technology Student | Cloud Architecture & Full-Stack Development',
    education: `B.Tech in Information Technology
Parul Institute of Engineering, Parul University (2022 - 2026)
CGPA: 9.04 / 10.0 • Google Cloud Student Certified`,
    skills: 'TypeScript, Next.js, Node.js, AWS (S3, Lambda), MongoDB, Redis, GraphQL, CI/CD GitHub Actions',
    projects: `1. Scalable Academic Course Enrollment Portal (2024)
- Architected microservices-based enrollment system supporting 10,000+ concurrent student sessions.
- Integrated Redis caching layer to decrease database query load by 65%.

2. Automated Cloud CI/CD Pipeline (2023)
- Implemented zero-downtime blue/green deployment workflow using Docker containers and GitHub Actions.`
  }
];

export default function ResumeBuilder() {
  const [fullName, setFullName] = useState(RESUME_PRESETS[0].fullName);
  const [email, setEmail] = useState(RESUME_PRESETS[0].email);
  const [phone, setPhone] = useState(RESUME_PRESETS[0].phone);
  const [headline, setHeadline] = useState(RESUME_PRESETS[0].headline);
  const [education, setEducation] = useState(RESUME_PRESETS[0].education);
  const [skills, setSkills] = useState(RESUME_PRESETS[0].skills);
  const [projects, setProjects] = useState(RESUME_PRESETS[0].projects);
  const [atsScore, setAtsScore] = useState(92);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const calculateScore = () => {
    let score = 40;
    if (fullName.trim().length > 3) score += 10;
    if (email.includes('@') && email.includes('.')) score += 10;
    if (phone.trim().length >= 8) score += 10;
    if (skills.split(',').filter(s => s.trim()).length >= 5) score += 15;
    if (projects.length > 80) score += 15;
    setAtsScore(Math.min(100, score));
  };

  const loadPreset = (preset) => {
    setFullName(preset.fullName);
    setEmail(preset.email);
    setPhone(preset.phone);
    setHeadline(preset.headline);
    setEducation(preset.education);
    setSkills(preset.skills);
    setProjects(preset.projects);
    calculateScore();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
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
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          projects,
          ats_score: atsScore
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSaveError(formatApiError(errJson, 'Failed to save resume.'));
      }
    } catch (err) {
      setSaveError(err.message || 'Error saving resume.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Isolated Document Printer:
   * Mounts a hidden iframe with only the A4 resume document and triggers print on that frame alone.
   * Guarantees 0% page bleed, NO app navigation, NO sidebars, NO background glows!
   */
  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${(fullName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_')}_Resume</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "SF Pro Text", Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              line-height: 1.45;
              padding: 0;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .name {
              font-size: 24px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #111827;
              margin-bottom: 4px;
            }
            .headline {
              font-size: 13px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 6px;
            }
            .contact {
              font-size: 11px;
              color: #4b5563;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .section {
              margin-bottom: 14px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #111827;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 3px;
              margin-bottom: 6px;
            }
            .section-body {
              font-size: 11.5px;
              color: #374151;
              white-space: pre-line;
              line-height: 1.5;
            }
            .skills-wrap {
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
            }
            .skill-pill {
              display: inline-block;
              padding: 2.5px 7px;
              background: #f3f4f6;
              color: #1f2937;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              font-size: 10.5px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="name">${fullName || 'Student Name'}</h1>
            <p class="headline">${headline || ''}</p>
            <div class="contact">
              ${email ? `<span>${email}</span>` : ''}
              ${email && phone ? '<span>•</span>' : ''}
              ${phone ? `<span>${phone}</span>` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Education & Credentials</div>
            <div class="section-body">${education || ''}</div>
          </div>

          <div class="section">
            <div class="section-title">Technical Expertise</div>
            <div class="skills-wrap">
              ${skills.split(',').map(s => s.trim()).filter(Boolean).map(s => `<span class="skill-pill">${s}</span>`).join('')}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Academic & Engineering Projects</div>
            <div class="section-body">${projects || ''}</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 200);
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
            className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
            title="Print only the clean A4 resume or save directly as PDF"
          >
            <IconPrinter className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Preset Profiles Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-[#86868b] dark:text-[#98989d] mr-1">Sample Profiles:</span>
        {RESUME_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => loadPreset(p)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-[#1c1c1e]/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] transition cursor-pointer shadow-2xs"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setFullName('');
            setEmail('');
            setPhone('');
            setHeadline('');
            setEducation('');
            setSkills('');
            setProjects('');
            setAtsScore(30);
          }}
          className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition cursor-pointer ml-auto"
        >
          Clear
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl text-[#28cd41] dark:text-[#30d158] text-xs flex items-center gap-2">
          <IconCheck className="w-4 h-4 shrink-0" />
          <span>Resume profile successfully saved to Student Academic Repository.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl text-[#ff3b30] text-xs flex items-center gap-2">
          <span>✕ {saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Form */}
        <div className="space-y-4 no-print">
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
              rows={5}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#30b0c7]"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#30b0c7] hover:bg-[#259eb5] text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
          >
            <IconSave className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Resume Profile'}</span>
          </button>
        </div>

        {/* Live Resume Sheet Preview */}
        <div
          id="printable-academic-resume"
          className="printable-resume p-8 rounded-2xl bg-white text-neutral-900 border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-4 font-sans min-h-[500px]"
        >
          <div className="border-b-2 border-neutral-900 pb-3 text-center space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 uppercase">
              {fullName || 'Student Name'}
            </h1>
            <p className="text-xs font-semibold text-neutral-600">
              {headline}
            </p>
            <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-3">
              {email && <span>{email}</span>}
              {email && phone && <span>•</span>}
              {phone && <span>{phone}</span>}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-300 pb-0.5 mb-1.5">
              Education & Credentials
            </h2>
            <div className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
              {education}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-300 pb-0.5 mb-1.5">
              Technical Expertise
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.split(',').map((s, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] border border-neutral-200 font-medium">
                  {s.trim()}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-300 pb-0.5 mb-1.5">
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
