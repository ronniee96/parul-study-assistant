import React, { useState } from 'react';
import {
  IconBarChart,
  IconCheck
} from './StudentIcons';

export default function ReportsHistory() {
  const [reports] = useState([
    { id: 'rep_001', type: 'Plagiarism Audit', title: 'Byzantine Fault Tolerance in Raft', score: '3.2% similarity', status: 'Passed', date: 'Nov 18, 2026' },
    { id: 'rep_002', type: 'AI Variance', title: 'TinyML Edge Computing Overview', score: '18% AI probability', status: 'Human Natural', date: 'Nov 17, 2026' },
    { id: 'rep_003', type: 'Grammar Linter', title: 'Cloud Infrastructure Lab Report', score: '94/100 Readability', status: 'Clean', date: 'Nov 16, 2026' }
  ]);

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 text-[#28cd41] dark:text-[#30d158] flex items-center justify-center shrink-0">
              <IconBarChart className="w-4 h-4" />
            </div>
            <span>Academic Reports & Audit History</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Permanent archive of all plagiarism evaluations, linguistic variance checks, and grammar linting logs.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-[#86868b] dark:text-[#98989d] border-b border-black/[0.06] dark:border-white/[0.08]">
            <tr>
              <th className="p-3.5 font-semibold">Report ID</th>
              <th className="p-3.5 font-semibold">Audit Type</th>
              <th className="p-3.5 font-semibold">Document Title</th>
              <th className="p-3.5 font-semibold">Result Metric</th>
              <th className="p-3.5 font-semibold">Status</th>
              <th className="p-3.5 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
            {reports.map(r => (
              <tr key={r.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition">
                <td className="p-3.5 font-mono text-[#0071e3] dark:text-[#388bfd] font-semibold">{r.id}</td>
                <td className="p-3.5 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{r.type}</td>
                <td className="p-3.5 text-[#86868b] dark:text-[#98989d]">{r.title}</td>
                <td className="p-3.5 font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">{r.score}</td>
                <td className="p-3.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34c759]/10 text-[#28cd41] dark:text-[#30d158] font-semibold text-[11px]">
                    <IconCheck className="w-3 h-3" />
                    <span>{r.status}</span>
                  </span>
                </td>
                <td className="p-3.5 text-[#86868b] dark:text-[#98989d]">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
