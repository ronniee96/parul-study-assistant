import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconDatabase,
  IconZap,
  IconCopy,
  IconCheck,
  IconX
} from './StudentIcons';

export default function DatabaseDesigner() {
  const [description, setDescription] = useState(
    'Create an academic course enrollment platform with Students, Faculty, Courses, Department, Grades, and Classroom Scheduling.'
  );
  const [dbEngine, setDbEngine] = useState('postgresql');
  const [normalizationLevel, setNormalizationLevel] = useState('3NF');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide application requirements to synthesize a database schema.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/database/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          db_engine: dbEngine,
          normalization_level: normalizationLevel
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Database schema design failed.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error generating schema.');
    } finally {
      setLoading(false);
    }
  };

  const copySql = () => {
    if (!result || !result.ddl_sql) return;
    navigator.clipboard.writeText(result.ddl_sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] flex items-center justify-center shrink-0">
              <IconDatabase className="w-4 h-4" />
            </div>
            <span>Relational Database Schema Designer (3NF)</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Transform business specifications into normalized relational schemas, entity attributes, foreign keys, and production SQL DDL.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] dark:text-[#388bfd] text-xs font-medium">
          <IconZap className="w-4 h-4" />
          <span>3NF Normalization Guaranteed</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
            System / Application Data Requirements
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe entities, relationships, attributes, and transactional needs..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs font-mono text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#98989d] leading-relaxed focus:outline-none focus:border-[#0071e3] transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
              Target Relational SQL Dialect
            </label>
            <select
              value={dbEngine}
              onChange={(e) => setDbEngine(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
            >
              <option value="postgresql">PostgreSQL (Neon / Supabase standard)</option>
              <option value="mysql">MySQL 8.0</option>
              <option value="sqlite">SQLite 3 (WAL Mode)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-1.5">
              Normalization Constraint Level
            </label>
            <select
              value={normalizationLevel}
              onChange={(e) => setNormalizationLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
            >
              <option value="3NF">Third Normal Form (3NF - Zero Transitive Dependencies)</option>
              <option value="BCNF">Boyce-Codd Normal Form (BCNF)</option>
              <option value="2NF">Second Normal Form (2NF)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Normalizing Entities & Generating Foreign Keys...</span>
            </>
          ) : (
            <>
              <IconDatabase className="w-4 h-4" />
              <span>Generate 3NF Relational DDL</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
              <span>SQL DDL Schema Output</span>
              <span className="px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] font-mono text-[11px]">
                {dbEngine.toUpperCase()}
              </span>
            </h3>
            <button
              type="button"
              onClick={copySql}
              className="px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied SQL</span>
                </>
              ) : (
                <>
                  <IconCopy className="w-3.5 h-3.5" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/[0.04] dark:bg-black/60 border border-black/[0.06] dark:border-white/[0.08] overflow-x-auto">
            <pre className="text-xs font-mono text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed">
              {result.ddl_sql}
            </pre>
          </div>

          {result.normalization_notes && (
            <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-1">
              <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Normalization Rationale
              </h4>
              <p className="text-xs text-[#86868b] dark:text-[#98989d]">
                {result.normalization_notes}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
