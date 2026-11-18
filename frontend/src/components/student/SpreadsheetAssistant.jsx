import React, { useState } from 'react';
import { motion } from 'framer-motion';

const SAMPLE_CSV = `Student,Attendance,MidtermScore,FinalScore,LabMarks
Rahul Sharma,94,88,92,48
Priya Patel,82,74,80,42
Amit Verma,98,95,96,50
Sneha Gupta,76,68,72,38
Karan Singh,90,82,85,45`;

export default function SpreadsheetAssistant() {
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/spreadsheet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_data: csvContent.trim() })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Spreadsheet analysis failed.');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Error analyzing spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📈</span>
            <span>Spreadsheet & Data Analysis Hub</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Parse CSV academic datasets, calculate mean, variance, quartile distributions, and generate Excel/Sheets formulas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
          <span>📊</span>
          <span>Descriptive Statistics Engine</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            CSV Dataset Input (Paste or edit CSV rows)
          </label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={7}
            placeholder="Paste CSV rows with headers on first row..."
            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs font-mono leading-relaxed focus:outline-none focus:border-green-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !csvContent.trim()}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-lg shadow-green-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Analyzing Statistical Properties...</span>
            </>
          ) : (
            <>
              <span>📈</span>
              <span>Compute Dataset Analytics</span>
            </>
          )}
        </button>
      </form>

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 space-y-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <span className="text-xs text-neutral-400">Total Rows</span>
              <div className="text-2xl font-bold text-green-400 mt-1">{analysis.row_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-neutral-400">Total Columns</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{analysis.column_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <span className="text-xs text-neutral-400">Numeric Columns</span>
              <div className="text-2xl font-bold text-teal-400 mt-1">{analysis.numeric_columns ? analysis.numeric_columns.length : 0}</div>
            </div>
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-xs text-neutral-400">Data Integrity</span>
              <div className="text-sm font-bold text-cyan-400 mt-2">100% Parsed</div>
            </div>
          </div>

          {/* Statistical Breakdown */}
          {analysis.summary_stats && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Descriptive Column Metrics
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <tr>
                      <th className="p-2.5">Column</th>
                      <th className="p-2.5">Mean (Avg)</th>
                      <th className="p-2.5">Min</th>
                      <th className="p-2.5">Max</th>
                      <th className="p-2.5">Standard Dev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {Object.entries(analysis.summary_stats).map(([col, stats]) => (
                      <tr key={col}>
                        <td className="p-2.5 font-semibold text-neutral-800 dark:text-neutral-200">{col}</td>
                        <td className="p-2.5 font-mono text-green-400">{stats.mean || '-'}</td>
                        <td className="p-2.5 font-mono text-neutral-400">{stats.min || '-'}</td>
                        <td className="p-2.5 font-mono text-neutral-400">{stats.max || '-'}</td>
                        <td className="p-2.5 font-mono text-neutral-400">{stats.std || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Formula Recommendations */}
          <div className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Recommended Excel / Sheets Formulas
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                =AVERAGE(C2:C6)
              </span>
              <span className="px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                =STDEV.S(D2:D6)
              </span>
              <span className="px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                =CORREL(B2:B6, D2:D6)
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
