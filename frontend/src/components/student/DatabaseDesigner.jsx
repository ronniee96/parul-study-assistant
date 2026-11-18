import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function DatabaseDesigner() {
  const [description, setDescription] = useState(
    'E-commerce academic bookstore where students can browse textbooks, place orders with multiple line items, leave course reviews, and apply discount coupons.'
  );
  const [dbEngine, setDbEngine] = useState('postgresql');
  const [normalizationLevel, setNormalizationLevel] = useState('3NF');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

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
      setError(err.message || 'Error designing schema.');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>🗄️</span>
            <span>Relational Database Schema Designer (3NF)</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Transform business specifications into normalized relational schemas, entity attributes, foreign keys, and production SQL DDL.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <span>⚡</span>
          <span>3NF Normalization Guaranteed</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            System / Application Data Requirements
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe entities, relationships, attributes, and transactional needs..."
            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs font-mono leading-relaxed focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Target Relational SQL Dialect
            </label>
            <select
              value={dbEngine}
              onChange={(e) => setDbEngine(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="postgresql">PostgreSQL (Neon / Supabase standard)</option>
              <option value="mysql">MySQL 8.0</option>
              <option value="sqlite">SQLite 3 (WAL Mode)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Normalization Constraint Level
            </label>
            <select
              value={normalizationLevel}
              onChange={(e) => setNormalizationLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
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
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Normalizing Entities & Generating Foreign Keys...</span>
            </>
          ) : (
            <>
              <span>🗄️</span>
              <span>Generate 3NF Relational DDL</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>SQL DDL Schema Output</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-mono text-[11px]">
                {dbEngine.toUpperCase()}
              </span>
            </h3>
            <button
              type="button"
              onClick={copySql}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 transition"
            >
              {copied ? '✓ Copied SQL DDL' : '📋 Copy SQL'}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 overflow-x-auto shadow-inner">
            <pre className="text-xs font-mono text-cyan-300 leading-relaxed">
              {result.ddl_sql}
            </pre>
          </div>

          {result.normalization_notes && (
            <div className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Normalization Rationale
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {result.normalization_notes}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
