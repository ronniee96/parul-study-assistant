import React, { useState } from 'react';

export default function SystemConfigPanel({ overviewData, onSelectNode }) {
  const [activeSubTab, setActiveSubTab] = useState('environment');

  const envConfig = [
    { key: 'APP_ENV', value: 'production', status: 'ACTIVE', desc: 'Runtime operational environment target' },
    { key: 'DATABASE_BACKEND', value: overviewData?.database?.backend || 'neon_postgres / sqlite_wal', status: 'CONNECTED', desc: 'Relational storage driver and connection pooling' },
    { key: 'NEON_DATABASE_URL', value: 'postgresql://study_admin:••••••••••••@ep-cool-base-123.ap-south-1.neon.tech/neondb?sslmode=require', status: 'MASKED', desc: 'PostgreSQL connection endpoint (Strictly Masked)' },
    { key: 'OPENAI_API_KEY', value: 'sk-proj-••••••••••••••••••••••••••••••••', status: 'MASKED', desc: 'GPT-4o question generation & structuring engine' },
    { key: 'ANTHROPIC_API_KEY', value: 'sk-ant-api03-••••••••••••••••••••••••••••', status: 'MASKED', desc: 'Claude 3.5 Sonnet long-form answer synthesis engine' },
    { key: 'GEMINI_API_KEY', value: 'AIzaSy••••••••••••••••••••••••••••••••', status: 'MASKED', desc: 'High-speed document summarization & reasoning' },
    { key: 'AWS_REGION', value: 'ap-south-1 (Mumbai)', status: 'ACTIVE', desc: 'S3 object storage primary geographic region' },
    { key: 'AWS_S3_BUCKET', value: 'parul-study-materials', status: 'ACTIVE', desc: 'Durable staging bucket for processed lecture slides' },
    { key: 'ADMIN_AUTH_SCHEME', value: 'HMAC-SHA256 Stateless Bearer', status: 'VERIFIED', desc: 'Distributed serverless cryptographic authentication' }
  ];

  const runtimeLimits = [
    { param: 'Max File Size Upload', value: '10 MB', rule: 'Enforced at frontend & FastAPI payload guard' },
    { param: 'Allowed Document Formats', value: '.pdf, .pptx, .docx, .txt', rule: 'MIME validation & magic byte signature check' },
    { param: 'Request Timeout Budget', value: '15.0 seconds', rule: 'Vercel serverless lambda execution limit' },
    { param: 'Trace Buffer Retention', value: '500 spans', rule: 'In-memory thread-safe circular ring buffer' },
    { param: 'Log Buffer Retention', value: '500 entries', rule: 'In-memory structured log stream' },
    { param: 'Exam Blueprint Structure', value: '60 Marks / 3 Sections', rule: 'Parul University end-term exam standard' }
  ];

  const featureFlags = [
    { name: 'FEATURE_ADMIN_OPERATIONS', enabled: true, desc: 'Enables System Operations Console & diagnostic probes' },
    { name: 'FEATURE_EPP_PREDICTION', enabled: true, desc: 'Enables 4-tier question funnel & blueprint compilation' },
    { name: 'FEATURE_MULTI_AGENT_COUNCIL', enabled: true, desc: 'Enables 6-persona academic verification council' },
    { name: 'FEATURE_OCR_EXTRACTION', enabled: true, desc: 'Enables Tesseract optical character recognition fallback' },
    { name: 'FEATURE_QSTASH_QUEUE', enabled: false, desc: 'Durable Upstash background queues (Operating in sync fallback)' }
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h1 className="text-lg font-bold text-white tracking-tight">System Configuration & Runtime Settings</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
              Read-Only Forensic View
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Environment parameters, secret masking boundaries, feature flags, and serverless runtime limits.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-[#05080e] border border-gray-800 rounded-lg text-xs">
          {['environment', 'limits', 'flags'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-3 py-1 rounded transition text-xs capitalize ${
                activeSubTab === tab
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Subtab: Environment & Masked Secrets */}
      {activeSubTab === 'environment' && (
        <div className="bg-[#090d16] border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Environment Configuration (Secrets Masked)</h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Zero Raw Secrets Exposed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono text-[11px]">
                  <th className="pb-2">VARIABLE</th>
                  <th className="pb-2">CONFIGURED VALUE / MASK</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2">PURPOSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850 font-mono text-[11px]">
                {envConfig.map((env, i) => (
                  <tr key={i} className="hover:bg-gray-900/40">
                    <td className="py-2.5 text-cyan-300 font-bold">{env.key}</td>
                    <td className="py-2.5 text-gray-300 select-all">{env.value}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        env.status === 'MASKED' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
                        'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {env.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 font-sans text-xs">{env.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab: Runtime Limits & Execution Budgets */}
      {activeSubTab === 'limits' && (
        <div className="bg-[#090d16] border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Runtime Limits & Execution Budgets</h2>
            <span className="text-xs text-gray-400">Serverless Policy Controls</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {runtimeLimits.map((limit, idx) => (
              <div key={idx} className="p-4 bg-[#05080e] border border-gray-800 rounded-xl space-y-1.5">
                <span className="text-xs text-gray-400">{limit.param}</span>
                <div className="text-lg font-bold font-mono text-white">{limit.value}</div>
                <p className="text-[11px] text-cyan-400/80">{limit.rule}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab: Feature Flags */}
      {activeSubTab === 'flags' && (
        <div className="bg-[#090d16] border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Active System Feature Flags</h2>
            <span className="text-xs text-gray-400">Dynamic Capabilities</span>
          </div>

          <div className="space-y-3">
            {featureFlags.map((flag, idx) => (
              <div key={idx} className="p-3.5 bg-[#05080e] border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-white">{flag.name}</div>
                  <p className="text-xs text-gray-400 mt-0.5">{flag.desc}</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
                  flag.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                  {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
