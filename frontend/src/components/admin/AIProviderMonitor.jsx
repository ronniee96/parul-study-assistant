import React, { useState, useEffect } from 'react';

export default function AIProviderMonitor({ adminToken, onRefreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [probeResult, setProbeResult] = useState(null);
  const [probing, setProbing] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/admin/ai-providers`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load AI providers: HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Error fetching AI provider status');
    } finally {
      setLoading(false);
    }
  };

  const runHealthProbe = async () => {
    setProbing(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/admin/system-health`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      const resJson = await res.json();
      setProbeResult(resJson);
    } catch (err) {
      setProbeResult({ error: err.message });
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [adminToken, onRefreshTrigger]);

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-gray-200 overflow-y-auto p-5 space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🧠</span> Multi-Engine AI Orchestration & Failover Operations
          </h2>
          <p className="text-xs text-gray-400">
            Real-time multi-model topology with automated HTTP 429 quota failover to academic syllabi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={runHealthProbe}
            disabled={probing}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-950/40 flex items-center gap-2 transition disabled:opacity-50"
          >
            {probing ? (
              <>
                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Probing...
              </>
            ) : (
              <>
                <span>⚡ Run Dependency Probe</span>
              </>
            )}
          </button>
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Failover Pipeline Overview Banner */}
      <div className="p-4 bg-[#090d16] border border-cyan-500/20 rounded-xl space-y-2">
        <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
          Active Failover Pathway (Left to Right)
        </span>
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono py-1">
          <span className="px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded-lg">
            1. Google Gemini 1.5/2.0
          </span>
          <span className="text-gray-500">➔</span>
          <span className="px-3 py-1 bg-blue-950/60 border border-blue-500/40 text-blue-300 rounded-lg">
            2. OpenAI GPT-4o-mini
          </span>
          <span className="text-gray-500">➔</span>
          <span className="px-3 py-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded-lg">
            3. Anthropic Claude 3.5
          </span>
          <span className="text-gray-500">➔</span>
          <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-lg">
            4. Parul Syllabus Harvester (Zero-Cost Local)
          </span>
        </div>
      </div>

      {/* Provider Cards */}
      {loading && !data ? (
        <div className="p-12 text-center text-xs text-gray-400">Loading AI provider metrics...</div>
      ) : error ? (
        <div className="p-4 text-xs text-red-400 bg-red-950/20 rounded-xl border border-red-500/30">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.providers?.map((prov) => {
            const isConfigured = prov.configured;

            return (
              <div
                key={prov.id}
                className="p-5 bg-[#090d16] border border-gray-800 rounded-xl space-y-4 hover:border-gray-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white">{prov.name}</h3>
                    <span className="text-[11px] text-gray-400">{prov.tier}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isConfigured
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-gray-400 bg-gray-500/10 border-gray-500/30'
                    }`}
                  >
                    ● {isConfigured ? 'READY' : 'UNCONFIGURED'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 bg-black/40 rounded border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block">Active Model Target:</span>
                    <span className="text-cyan-300 font-semibold">{prov.active_model}</span>
                  </div>

                  <div className="p-2 bg-black/40 rounded border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block">Candidate Models:</span>
                    <span className="text-gray-300 text-[11px]">{prov.models?.join(', ')}</span>
                  </div>

                  <div className="p-2 bg-black/40 rounded border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block">Failover Condition:</span>
                    <span className="text-amber-300 text-[11px]">{prov.rate_limit_policy}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800">
                  <span>Auth: {prov.auth_type}</span>
                  <span className="text-cyan-400 font-mono">Status: {prov.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Probe Diagnostic Output Drawer */}
      {probeResult && (
        <div className="p-4 bg-black/60 border border-cyan-500/30 rounded-xl space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-cyan-400 font-bold">Probe Execution Diagnostic Output</span>
            <button
              onClick={() => setProbeResult(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap p-2 bg-[#05080e] rounded border border-gray-800 text-[11px]">
            {JSON.stringify(probeResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
