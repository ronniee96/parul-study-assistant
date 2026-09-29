import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/apiClient';

const SUPPORTED_PROVIDERS = ['gemini', 'openai', 'anthropic', 'perplexity'];

export default function TransparencyAuditTab({ appState = {}, apiKeys = {}, primaryPriority = 'gemini', openApiKeyModal }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pipeline = appState.pipelineData;
  const configured = SUPPORTED_PROVIDERS.filter(provider => typeof apiKeys[provider] === 'string' && apiKeys[provider].trim().length > 5);
  const documentCount = appState.extractedDocuments?.length || appState.uploadedFiles?.length || (appState.uploadedFile ? 1 : 0);

  const refreshAuditTrail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/research/audit-trail');
      setLogs(data.success && Array.isArray(data.logs) ? data.logs : []);
    } catch (err) {
      setError(err.message || 'Audit trail is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAuditTrail(); }, []);

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transparency & run status</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Shows saved provider configuration and results returned by actual pipeline runs. A saved key is not proof that the provider accepted it.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openApiKeyModal} className="px-4 py-2 rounded-xl border text-sm font-semibold">Provider settings</button>
          <button onClick={refreshAuditTrail} disabled={loading} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh audit trail'}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Readable source documents', documentCount],
          ['Saved supported provider keys', configured.length],
          ['Generated candidates', pipeline?.candidate_universe_count ?? 'Not run'],
          ['AI candidates reviewed', pipeline?.adversarial_reviewed_count ?? 'Not run'],
        ].map(([label, value]) => <div key={label} className="p-4 rounded-2xl border bg-white dark:bg-gray-900"><span className="block text-xs text-gray-500">{label}</span><strong className="text-xl">{value}</strong></div>)}
      </div>

      <section className="p-5 rounded-2xl border bg-white dark:bg-gray-900">
        <h3 className="font-bold">Provider and review status</h3>
        <p className="mt-2 text-sm">Preferred provider: <strong>{primaryPriority}</strong></p>
        <p className="mt-1 text-sm">Saved supported keys: {configured.length ? configured.join(', ') : 'none'}</p>
        <p className="mt-1 text-sm">Last adversarial review: <strong>{pipeline?.adversarial_review_status || 'not run'}</strong></p>
        {pipeline?.methodology_notes?.map((note, index) => <p key={index} className="mt-2 text-xs text-gray-600 dark:text-gray-400">{note}</p>)}
      </section>

      <section className="p-5 rounded-2xl border bg-white dark:bg-gray-900">
        <div className="flex justify-between items-center gap-3">
          <h3 className="font-bold">Backend audit trail</h3>
          <span className="text-xs text-gray-500">{logs.length} records</span>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{error}</p>}
        {!error && logs.length === 0 && <p className="mt-3 text-sm text-gray-500">No audit events were returned.</p>}
        <div className="mt-3 flex flex-col gap-2">
          {logs.map((log, index) => (
            <article key={log.id || index} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/70">
              <p className="font-semibold text-sm">{log.action || log.type || log.event || 'Recorded activity'}</p>
              {(log.created_at || log.timestamp) && <p className="text-[11px] text-gray-500">{log.created_at || log.timestamp}</p>}
              {(log.summary || log.message || log.query) && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 break-words">{log.summary || log.message || log.query}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
