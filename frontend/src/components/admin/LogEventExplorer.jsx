import React, { useState, useEffect } from 'react';

export default function LogEventExplorer({ adminToken, onRefreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const filterParam = levelFilter !== 'ALL' ? `&level=${levelFilter}` : '';
      const res = await fetch(`${apiBase}/api/v1/admin/logs?limit=200${filterParam}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load logs: HTTP ${res.status}`);
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || 'Error fetching system logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [adminToken, levelFilter, onRefreshTrigger]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchMsg = l.message?.toLowerCase().includes(q);
    const matchComp = l.component?.toLowerCase().includes(q);
    const matchCorr = l.correlation_id?.toLowerCase().includes(q);
    return matchMsg || matchComp || matchCorr;
  });

  const levelBadges = {
    AUDIT: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    ERROR: 'bg-red-500/10 text-red-400 border-red-500/30',
    WARN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    INFO: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  };

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-gray-200">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-gray-800 bg-[#090d16] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">📜</span>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Structured Operations & Audit Log Stream
            </h2>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-gray-800">
            {filteredLogs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Search component, message, correlation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-[#05080e] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 w-64 font-mono"
          />

          <div className="flex rounded-lg bg-[#05080e] border border-gray-800 p-0.5 text-xs font-mono">
            {['ALL', 'AUDIT', 'ERROR', 'WARN', 'INFO'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded transition ${
                  levelFilter === lvl
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition text-xs"
            title="Refresh Logs"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Log Entries Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400 font-mono">Loading structured events...</div>
        ) : error ? (
          <div className="p-4 text-xs text-red-400 bg-red-950/20 rounded-xl border border-red-500/30">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400 font-mono">
            No events found matching the selected filters.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <div
                  key={log.id}
                  className="p-3 bg-[#090d16] border border-gray-800/80 rounded-xl hover:border-gray-700 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          levelBadges[log.level] || levelBadges.INFO
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/40 text-cyan-300 border border-cyan-900/40 text-[11px] font-semibold">
                        {log.component}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        {log.timestamp?.slice(11, 23)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] text-gray-400 select-all cursor-pointer hover:text-gray-300"
                        title="Click to copy correlation ID"
                        onClick={() => navigator.clipboard?.writeText?.(log.correlation_id)}
                      >
                        {log.correlation_id}
                      </span>
                      {hasMeta && (
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-[11px] text-gray-400 hover:text-cyan-400 transition"
                        >
                          {isExpanded ? '▲ hide' : '▼ meta'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-200 leading-relaxed text-[12px] break-words">
                    {log.message}
                  </p>

                  {isExpanded && hasMeta && (
                    <pre className="p-2.5 bg-black/60 rounded-lg border border-gray-800 text-[11px] text-cyan-300 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
