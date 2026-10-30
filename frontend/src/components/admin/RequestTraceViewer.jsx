import React, { useState, useEffect } from 'react';

export default function RequestTraceViewer({ adminToken, onRefreshTrigger }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTraces = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/admin/traces?limit=100`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load traces: HTTP ${res.status}`);
      }
      const data = await res.json();
      setTraces(data.traces || []);
      if (data.traces && data.traces.length > 0 && !selectedTrace) {
        setSelectedTrace(data.traces[0]);
      }
    } catch (err) {
      setError(err.message || 'Error fetching request telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, [adminToken, onRefreshTrigger]);

  const filteredTraces = traces.filter((t) => {
    if (filterStatus === '2XX' && (t.status_code < 200 || t.status_code >= 300)) return false;
    if (filterStatus === '4XX' && (t.status_code < 400 || t.status_code >= 500)) return false;
    if (filterStatus === '5XX' && t.status_code < 500) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchPath = t.path?.toLowerCase().includes(q);
      const matchId = t.trace_id?.toLowerCase().includes(q);
      const matchMethod = t.method?.toLowerCase().includes(q);
      if (!matchPath && !matchId && !matchMethod) return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-gray-200">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-gray-800 bg-[#090d16] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">⚡</span>
            <h2 className="text-sm font-bold text-white tracking-wide">Request Tracing Engine</h2>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-gray-800">
            {filteredTraces.length} recorded
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Search path, trace ID, method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-[#05080e] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 w-56 font-mono"
          />

          <div className="flex rounded-lg bg-[#05080e] border border-gray-800 p-0.5 text-xs font-mono">
            {['ALL', '2XX', '4XX', '5XX'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded transition ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTraces}
            disabled={loading}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition text-xs"
            title="Refresh Traces"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Main Split Body: Left List + Right Waterfall Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List */}
        <div className="w-1/2 border-r border-gray-800 overflow-y-auto">
          {loading && traces.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading request traces...</div>
          ) : error ? (
            <div className="p-4 text-xs text-red-400 bg-red-950/20 m-4 rounded-xl border border-red-500/30">
              {error}
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No request traces found matching filter.</div>
          ) : (
            <div className="divide-y divide-gray-800/60 font-mono text-xs">
              {filteredTraces.map((trc) => {
                const isSelected = selectedTrace?.trace_id === trc.trace_id;
                const isSuccess = trc.status_code >= 200 && trc.status_code < 400;
                const isError = trc.status_code >= 500;

                return (
                  <div
                    key={trc.trace_id}
                    onClick={() => setSelectedTrace(trc)}
                    className={`p-3.5 cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/30 border-l-2 border-cyan-400'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isError
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {trc.method} {trc.status_code}
                        </span>
                        <span className="text-gray-200 font-medium truncate max-w-[220px]">
                          {trc.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{trc.trace_id}</span>
                        <span>•</span>
                        <span>{trc.timestamp?.slice(11, 19)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-cyan-400">{trc.duration_ms}ms</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail / Waterfall Drawer */}
        <div className="w-1/2 p-5 overflow-y-auto bg-[#05080e] text-xs">
          {selectedTrace ? (
            <div className="space-y-5">
              {/* Trace Header */}
              <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                      {selectedTrace.method}
                    </span>
                    <span className="font-mono text-sm font-semibold text-white">
                      {selectedTrace.path}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                      selectedTrace.status_code < 400
                        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
                        : 'text-red-400 border-red-500/40 bg-red-950/30'
                    }`}
                  >
                    HTTP {selectedTrace.status_code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400 pt-1">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Correlation ID:</span>
                    <span className="text-cyan-300">{selectedTrace.trace_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Total Latency:</span>
                    <span className="text-white font-bold">{selectedTrace.duration_ms} ms</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Timestamp:</span>
                    <span className="text-gray-300">{selectedTrace.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Session Context:</span>
                    <span className="text-gray-300">{selectedTrace.session_id || 'Global/Health'}</span>
                  </div>
                </div>
              </div>

              {/* Waterfall Execution Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Execution Waterfall & Stages
                  </h4>
                  <span className="text-[11px] font-mono text-gray-400">
                    {selectedTrace.stages?.length || 0} stages
                  </span>
                </div>

                <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-3 font-mono">
                  {selectedTrace.stages?.map((stage, idx) => {
                    const pct = Math.max(
                      8,
                      Math.min(100, Math.round((stage.duration_ms / (selectedTrace.duration_ms || 1)) * 100))
                    );

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-300 font-semibold">{stage.name}</span>
                          <span className="text-cyan-400">{stage.duration_ms} ms ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              stage.status === 'failed'
                                ? 'bg-red-500'
                                : idx % 2 === 0
                                ? 'bg-cyan-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security & Data Redaction Evidence */}
              <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <span>🔒</span> Zero-Secret Redaction Enforced
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Session capability tokens, Authorization Bearer credentials, student document texts, and API keys are strictly redacted from telemetry records before serialization.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
              Select a trace from the left panel to inspect execution waterfall.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
