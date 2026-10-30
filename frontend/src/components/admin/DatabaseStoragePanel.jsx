import React, { useState, useEffect } from 'react';

export default function DatabaseStoragePanel({ adminToken, onRefreshTrigger }) {
  const [dbData, setDbData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const headers = {
        Authorization: `Bearer ${adminToken}`,
        'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
      };

      const [dbRes, jobsRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/admin/database`, { headers }),
        fetch(`${apiBase}/api/v1/admin/jobs?limit=25`, { headers })
      ]);

      if (!dbRes.ok) throw new Error(`Database status failed (HTTP ${dbRes.status})`);
      const dbJson = await dbRes.json();
      setDbData(dbJson);

      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json();
        setJobs(jobsJson.jobs || []);
      }
    } catch (err) {
      setError(err.message || 'Error fetching database and storage diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminToken, onRefreshTrigger]);

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-gray-200 overflow-y-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>💾</span> Relational Database & S3 Storage Persistence Diagnostics
          </h2>
          <p className="text-xs text-gray-400">
            Production Neon PostgreSQL (pooled with SSL) / Local SQLite WAL parity, and ap-south-1 S3 staging.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs font-mono transition"
        >
          ↻ Refresh
        </button>
      </div>

      {loading && !dbData ? (
        <div className="p-12 text-center text-xs text-gray-400">Loading persistence diagnostics...</div>
      ) : error ? (
        <div className="p-4 text-xs text-red-400 bg-red-950/20 rounded-xl border border-red-500/30">
          {error}
        </div>
      ) : (
        <>
          {/* Main Top Cards: Engine + S3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Engine Card */}
            <div className="p-5 bg-[#090d16] border border-gray-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  Relational Engine
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ● CONNECTED
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Backend Driver:</span>
                  <span className="text-white font-bold">{dbData?.database_engine?.backend}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Connection Latency:</span>
                  <span className="text-cyan-300 font-bold">{dbData?.database_engine?.latency_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Serverless Pooler:</span>
                  <span className="text-white">{dbData?.database_engine?.is_pooled ? 'Yes (sslmode=require)' : 'Local / Direct'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Schema Migration:</span>
                  <span className="text-emerald-300 truncate max-w-[260px]">{dbData?.database_engine?.latest_migration}</span>
                </div>
              </div>

              <div className="p-2 bg-black/40 rounded border border-gray-800 text-[10px] text-gray-400 break-all select-all">
                {dbData?.database_engine?.database_url_masked}
              </div>
            </div>

            {/* S3 Storage Card */}
            <div className="p-5 bg-[#090d16] border border-gray-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px]">
                  Object Storage & Staging
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  ap-south-1
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Bucket:</span>
                  <span className="text-white font-bold">{dbData?.storage?.s3_bucket}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">AWS Region:</span>
                  <span className="text-white">{dbData?.storage?.s3_region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Local Staged Files:</span>
                  <span className="text-cyan-300 font-bold">{dbData?.storage?.staging_files_count || 0} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Staging Volume:</span>
                  <span className="text-white">
                    {((dbData?.storage?.staging_bytes || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="p-2 bg-black/40 rounded border border-gray-800 text-[10px] text-gray-400 break-all">
                Staging path: {dbData?.storage?.staging_dir}
              </div>
            </div>
          </div>

          {/* Relational Tables Grid */}
          <div className="bg-[#090d16] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-gray-800 bg-[#05080e]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Canonical Relational Tables
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#05080e] text-gray-400 border-b border-gray-800">
                    <th className="p-3">Table Name</th>
                    <th className="p-3">Row Count</th>
                    <th className="p-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {dbData?.tables?.map((tbl) => (
                    <tr key={tbl.table_name} className="hover:bg-gray-800/30 transition">
                      <td className="p-3 font-semibold text-cyan-300">{tbl.table_name}</td>
                      <td className="p-3 text-white font-bold">{tbl.row_count}</td>
                      <td className="p-3 text-emerald-400 uppercase text-[11px]">● {tbl.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Background Jobs Machine */}
          <div className="bg-[#090d16] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-gray-800 bg-[#05080e] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Background Processing Jobs (QStash / Local Queue)
              </h3>
              <span className="text-[11px] font-mono text-gray-400">{jobs.length} jobs</span>
            </div>
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-mono">
                No active or failed background jobs in the queue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#05080e] text-gray-400 border-b border-gray-800">
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Idempotency Key</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Attempts</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {jobs.map((job) => (
                      <tr key={job.job_id} className="hover:bg-gray-800/30 transition">
                        <td className="p-3 font-semibold text-white">{job.job_id}</td>
                        <td className="p-3 text-cyan-300 text-[11px]">{job.idempotency_key}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">{job.attempt_count}</td>
                        <td className="p-3 text-gray-400 text-[11px]">
                          {job.created_at ? job.created_at.slice(0, 19).replace('T', ' ') : 'Now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
