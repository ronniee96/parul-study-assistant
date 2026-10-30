import React, { useState, useEffect } from 'react';

export default function SessionIntegrityPanel({ adminToken, onRefreshTrigger }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [auditing, setAuditing] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/admin/sessions?limit=50`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load sessions: HTTP ${res.status}`);
      }
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message || 'Error fetching session metadata');
    } finally {
      setLoading(false);
    }
  };

  const runIntegrityAudit = async () => {
    setAuditing(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/admin/action/verify-integrity`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      const data = await res.json();
      setAuditResult(data);
    } catch (err) {
      setAuditResult({ error: err.message });
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [adminToken, onRefreshTrigger]);

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-gray-200 overflow-y-auto p-5 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🛡</span> Session Isolation & Cryptographic Capability Integrity
          </h2>
          <p className="text-xs text-gray-400">
            Anonymous student sessions enforced by server-issued 256-bit HMAC capability tokens with zero raw token storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={runIntegrityAudit}
            disabled={auditing}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition disabled:opacity-50"
          >
            {auditing ? (
              <>
                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <span>✓ Run Non-Destructive Integrity Audit</span>
              </>
            )}
          </button>
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Audit Result Display */}
      {auditResult && (
        <div className="p-4 bg-[#090d16] border border-emerald-500/40 rounded-xl space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-sm">
                {auditResult.audit_passed ? '✓ FORENSIC AUDIT PASSED' : '⚠ AUDIT WARNINGS DETECTED'}
              </span>
              <span className="text-gray-400 text-[11px]">({auditResult.timestamp})</span>
            </div>
            <button
              onClick={() => setAuditResult(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {auditResult.checks?.map((chk, i) => (
              <div
                key={i}
                className="p-3 bg-black/40 rounded-lg border border-gray-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{chk.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      chk.passed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {chk.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{chk.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-[#090d16] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">📋</span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Active Anonymous Sessions ({sessions.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span>●</span> Zero Raw Tokens Stored Server-Side
          </span>
        </div>

        {loading && sessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading session telemetry...</div>
        ) : error ? (
          <div className="p-4 text-xs text-red-400 bg-red-950/20 m-4 rounded-xl border border-red-500/30">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No active sessions registered in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#05080e] text-gray-400 border-b border-gray-800">
                  <th className="p-3">Session ID</th>
                  <th className="p-3">Cap. Ver</th>
                  <th className="p-3">Capability Hash (Digest)</th>
                  <th className="p-3">Documents</th>
                  <th className="p-3">Extracted Yield</th>
                  <th className="p-3">Artifacts</th>
                  <th className="p-3">Isolation Status</th>
                  <th className="p-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {sessions.map((sess) => (
                  <tr key={sess.session_id} className="hover:bg-gray-800/30 transition">
                    <td className="p-3 font-semibold text-cyan-300">{sess.session_id}</td>
                    <td className="p-3 text-gray-300">v{sess.capability_version || 1}</td>
                    <td className="p-3 text-purple-300 text-[11px] select-all">
                      {sess.capability_hash_masked}
                    </td>
                    <td className="p-3 text-white font-bold">{sess.document_count || 0}</td>
                    <td className="p-3 text-emerald-400 font-bold">
                      {sess.extracted_character_count?.toLocaleString() || 0} chars
                    </td>
                    <td className="p-3 text-gray-300">
                      <span className="flex items-center gap-1">
                        {sess.has_summary && <span title="Summary Generated">📝</span>}
                        {sess.has_predicted_paper && <span title="Predicted Paper Generated">🎯</span>}
                        {!sess.has_summary && !sess.has_predicted_paper && <span className="text-gray-400">—</span>}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ISOLATED
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-[11px]">
                      {sess.updated_at ? sess.updated_at.slice(0, 19).replace('T', ' ') : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
