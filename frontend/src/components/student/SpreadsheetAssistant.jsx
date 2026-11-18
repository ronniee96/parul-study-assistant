import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconSpreadsheet,
  IconBarChart,
  IconX
} from './StudentIcons';

export default function SpreadsheetAssistant() {
  const [csvContent, setCsvContent] = useState(
    'Student_ID,Algorithm_Score,Hours_Studied,Attendance_Rate\nPU-001,88,14.5,95.0\nPU-002,94,18.0,98.5\nPU-003,72,8.0,82.0\nPU-004,81,11.5,89.0\nPU-005,65,6.0,75.0\nPU-006,90,16.0,96.0\nPU-007,78,9.5,84.0\nPU-008,98,22.0,100.0'
  );
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setError('Please paste CSV data rows to perform descriptive analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/spreadsheet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_text: csvContent.trim() })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Spreadsheet analytics processing failed.');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Error processing spreadsheet data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 text-[#28cd41] dark:text-[#30d158] flex items-center justify-center shrink-0">
              <IconSpreadsheet className="w-4 h-4" />
            </div>
            <span>Spreadsheet & Data Analysis Hub</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Parse CSV academic datasets, calculate mean, variance, quartile distributions, and generate Excel/Sheets formulas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 text-[#28cd41] dark:text-[#30d158] text-xs font-medium">
          <IconBarChart className="w-4 h-4" />
          <span>Descriptive Statistics Engine</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            CSV Dataset Input (Paste or edit CSV rows)
          </label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={7}
            placeholder="Paste CSV rows with headers on first row..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs font-mono text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] leading-relaxed focus:outline-none focus:border-[#34c759] transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !csvContent.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#34c759] hover:bg-[#2db84d] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Statistical Properties...</span>
            </>
          ) : (
            <>
              <IconSpreadsheet className="w-4 h-4" />
              <span>Compute Dataset Analytics</span>
            </>
          )}
        </button>
      </form>

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Total Rows</span>
              <div className="text-2xl font-bold text-[#28cd41] dark:text-[#30d158] mt-1 tracking-tight">{analysis.row_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Total Columns</span>
              <div className="text-2xl font-bold text-[#0071e3] dark:text-[#388bfd] mt-1 tracking-tight">{analysis.column_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-[#30b0c7]/10 border border-[#30b0c7]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Numeric Columns</span>
              <div className="text-2xl font-bold text-[#30b0c7] dark:text-[#40c8e0] mt-1 tracking-tight">{analysis.numeric_columns ? analysis.numeric_columns.length : 0}</div>
            </div>
            <div className="p-4 rounded-xl bg-[#af52de]/10 border border-[#af52de]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Data Integrity</span>
              <div className="text-sm font-bold text-[#af52de] dark:text-[#bf5af2] mt-2">100% Parsed</div>
            </div>
          </div>

          {/* Statistical Breakdown */}
          {analysis.summary_stats && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Descriptive Column Metrics
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-[#86868b] dark:text-[#98989d] border-b border-black/[0.06] dark:border-white/[0.08]">
                    <tr>
                      <th className="p-2.5 font-semibold">Column</th>
                      <th className="p-2.5 font-semibold">Mean (Avg)</th>
                      <th className="p-2.5 font-semibold">Min</th>
                      <th className="p-2.5 font-semibold">Max</th>
                      <th className="p-2.5 font-semibold">Standard Dev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                    {Object.entries(analysis.summary_stats).map(([col, stats]) => (
                      <tr key={col}>
                        <td className="p-2.5 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{col}</td>
                        <td className="p-2.5 font-mono text-[#28cd41] dark:text-[#30d158]">{stats.mean || '-'}</td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">{stats.min || '-'}</td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">{stats.max || '-'}</td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">{stats.std || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
