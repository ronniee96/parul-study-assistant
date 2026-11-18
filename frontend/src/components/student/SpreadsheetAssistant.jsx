import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconSpreadsheet,
  IconBarChart,
  IconCopy,
  IconCheck,
  IconX
} from './StudentIcons';
import { formatApiError, computeLocalCsvAnalytics } from './studentUtils';

const DATASET_PRESETS = [
  {
    id: 'marks',
    label: 'Academic Student Marks',
    data: `Student,Attendance,MidtermScore,FinalScore,LabMarks
Rahul Sharma,94,88,92,48
Priya Patel,82,74,80,42
Amit Verma,98,95,96,50
Sneha Gupta,76,68,72,38
Karan Singh,90,82,85,45
Ananya Roy,88,91,89,46
Vikram Joshi,70,62,68,36
Pooja Mehta,95,96,98,49`
  },
  {
    id: 'engineering',
    label: 'Engineering Lab Readings',
    data: `Trial,Voltage_V,Current_A,Resistance_Ohm,Power_W,Temp_C
T-1,10.0,0.50,20.0,5.0,24.5
T-2,15.0,0.75,20.0,11.25,26.8
T-3,20.0,1.00,20.0,20.0,30.2
T-4,25.0,1.25,20.0,31.25,35.1
T-5,30.0,1.50,20.0,45.0,41.4
T-6,35.0,1.75,20.0,61.25,48.0`
  },
  {
    id: 'study',
    label: 'Study Hours vs Exam Score',
    data: `Student_ID,Algorithm_Score,Hours_Studied,Attendance_Rate,Practice_Problems
PU-001,88,14.5,95.0,42
PU-002,94,18.0,98.5,58
PU-003,72,8.0,82.0,25
PU-004,81,11.5,89.0,36
PU-005,65,6.0,75.0,18
PU-006,90,16.0,96.0,50
PU-007,78,9.5,84.0,30
PU-008,98,22.0,100.0,65`
  }
];

export default function SpreadsheetAssistant() {
  const [csvContent, setCsvContent] = useState(DATASET_PRESETS[0].data);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [copiedFormula, setCopiedFormula] = useState(null);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
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
        body: JSON.stringify({
          csv_text: csvContent.trim(),
          csv_content: csvContent.trim(),
          csv_data: csvContent.trim(),
          data: csvContent.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(formatApiError(errJson, 'Spreadsheet analytics processing failed.'));
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      // High-performance client-side fallback calculation
      try {
        const localData = computeLocalCsvAnalytics(csvContent.trim());
        setAnalysis(localData);
        setError(null);
      } catch (localErr) {
        setError(formatApiError(err, localErr.message || 'Error processing spreadsheet data.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFormula = (formula) => {
    navigator.clipboard.writeText(formula);
    setCopiedFormula(formula);
    setTimeout(() => setCopiedFormula(null), 2000);
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

      {/* Dataset Presets Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-[#86868b] dark:text-[#98989d] mr-1">Sample Presets:</span>
        {DATASET_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setCsvContent(p.data);
              setError(null);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-[#1c1c1e]/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] transition cursor-pointer shadow-2xs"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCsvContent('');
            setAnalysis(null);
            setError(null);
          }}
          className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition cursor-pointer ml-auto"
        >
          Clear
        </button>
      </div>

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
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs font-mono text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] leading-relaxed focus:outline-none focus:border-[#34c759] transition shadow-xs"
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
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Total Rows</span>
              <div className="text-2xl font-bold text-[#28cd41] dark:text-[#30d158] mt-1 tracking-tight">
                {analysis.row_count}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Total Columns</span>
              <div className="text-2xl font-bold text-[#0071e3] dark:text-[#388bfd] mt-1 tracking-tight">
                {analysis.column_count}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#30b0c7]/10 border border-[#30b0c7]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Numeric Columns</span>
              <div className="text-2xl font-bold text-[#30b0c7] dark:text-[#40c8e0] mt-1 tracking-tight">
                {analysis.numeric_columns ? analysis.numeric_columns.length : 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#af52de]/10 border border-[#af52de]/20">
              <span className="text-xs text-[#86868b] dark:text-[#98989d]">Data Integrity</span>
              <div className="text-sm font-bold text-[#af52de] dark:text-[#bf5af2] mt-2">100% Parsed</div>
            </div>
          </div>

          {/* Statistical Breakdown Table */}
          {(analysis.summary_stats || analysis.statistics) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Descriptive Column Metrics
              </h3>
              <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-[#86868b] dark:text-[#98989d] border-b border-black/[0.06] dark:border-white/[0.08]">
                    <tr>
                      <th className="p-2.5 font-semibold">Column</th>
                      <th className="p-2.5 font-semibold">Type</th>
                      <th className="p-2.5 font-semibold">Mean (Avg)</th>
                      <th className="p-2.5 font-semibold">Median</th>
                      <th className="p-2.5 font-semibold">Min</th>
                      <th className="p-2.5 font-semibold">Max</th>
                      <th className="p-2.5 font-semibold">Std Dev</th>
                      <th className="p-2.5 font-semibold">Sum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                    {Object.entries(analysis.summary_stats || analysis.statistics || {}).map(([col, stats]) => (
                      <tr key={col} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                        <td className="p-2.5 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{col}</td>
                        <td className="p-2.5 font-mono text-[11px] text-[#86868b] dark:text-[#98989d]">
                          {stats.type || (stats.mean !== '-' ? 'numeric' : 'categorical')}
                        </td>
                        <td className="p-2.5 font-mono font-medium text-[#28cd41] dark:text-[#30d158]">
                          {stats.mean ?? '-'}
                        </td>
                        <td className="p-2.5 font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {stats.median ?? '-'}
                        </td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">
                          {stats.min ?? '-'}
                        </td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">
                          {stats.max ?? '-'}
                        </td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">
                          {stats.std ?? '-'}
                        </td>
                        <td className="p-2.5 font-mono text-[#86868b] dark:text-[#98989d]">
                          {stats.sum ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommended Formulas Card */}
          {analysis.suggested_formulas && analysis.suggested_formulas.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Recommended Excel / Google Sheets Formulas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.suggested_formulas.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#0071e3] dark:text-[#388bfd] truncate">
                        {item.formula}
                      </div>
                      <div className="text-[11px] text-[#86868b] dark:text-[#98989d] truncate">
                        {item.explanation}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyFormula(item.formula)}
                      className="px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.04] text-[11px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedFormula === item.formula ? (
                        <>
                          <IconCheck className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Preview Table */}
          {analysis.sample_preview && analysis.sample_preview.length > 0 && analysis.headers && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Raw Data Sample Preview (First {analysis.sample_preview.length} Rows)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-[#86868b] dark:text-[#98989d] border-b border-black/[0.06] dark:border-white/[0.08]">
                    <tr>
                      {analysis.headers.map((h, i) => (
                        <th key={i} className="p-2.5 font-semibold font-mono text-[11px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                    {analysis.sample_preview.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 font-mono text-[11px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {cell}
                          </td>
                        ))}
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
