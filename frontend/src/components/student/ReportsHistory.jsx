import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ReportsHistory() {
  const [reports, setReports] = useState([
    { id: 'rep_001', type: 'Plagiarism Audit', title: 'Byzantine Fault Tolerance in Raft', score: '3.2% similarity', status: 'Passed', date: 'Nov 18, 2026' },
    { id: 'rep_002', type: 'AI Variance', title: 'TinyML Edge Computing Overview', score: '18% AI probability', status: 'Human Natural', date: 'Nov 17, 2026' },
    { id: 'rep_003', type: 'Grammar Linter', title: 'Cloud Infrastructure Lab Report', score: '94/100 Readability', status: 'Clean', date: 'Nov 16, 2026' }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📊</span>
            <span>Academic Reports & Audit History</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Permanent archive of all plagiarism evaluations, linguistic variance checks, and grammar linting logs.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              <th className="p-3.5">Report ID</th>
              <th className="p-3.5">Audit Type</th>
              <th className="p-3.5">Document Title</th>
              <th className="p-3.5">Result Metric</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {reports.map(r => (
              <tr key={r.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                <td className="p-3.5 font-mono text-cyan-400">{r.id}</td>
                <td className="p-3.5 font-semibold text-neutral-800 dark:text-neutral-200">{r.type}</td>
                <td className="p-3.5 text-neutral-600 dark:text-neutral-300">{r.title}</td>
                <td className="p-3.5 font-mono">{r.score}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">
                    {r.status}
                  </span>
                </td>
                <td className="p-3.5 text-neutral-400">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
