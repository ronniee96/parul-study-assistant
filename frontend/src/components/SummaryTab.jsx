import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import MarkdownViewer from './MarkdownViewer';
import { apiFetch } from '../utils/apiClient';

export default function SummaryTab({ appState = {}, setActiveTab, apiKeys = {}, primaryPriority = 'gemini' }) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('summary');
  const extractedText = appState.extractedText || '';
  const hasDocuments = Boolean(extractedText.trim());
  const sourceTopics = useMemo(() => [...new Set((appState.extractedDocuments || []).flatMap(doc => [
    ...(doc.headings || []), ...(doc.topics || []), ...(doc.definitions || []).map(item => item.term || item.title).filter(Boolean),
  ]))], [appState.extractedDocuments]);

  useEffect(() => {
    let active = true;
    if (!hasDocuments) {
      setSummaryData(null);
      setError('');
      return () => { active = false; };
    }

    setSummaryData(null);
    setError('');
    setLoading(true);
    const keys = Object.fromEntries(Object.entries(apiKeys || {}).filter(([, key]) => typeof key === 'string' && key.trim().length > 5));
    const preferredOrder = [primaryPriority, ...Object.keys(keys).filter(key => key !== primaryPriority)].filter(Boolean);
    apiFetch('/api/v1/summarize', {
      method: 'POST',
      body: JSON.stringify({ text: extractedText, style: 'comprehensive', max_length: 2500, api_keys: keys, preferred_order: preferredOrder }),
    }).then(result => {
      if (active) {
        setSummaryData(result);
        setActiveView('summary');
      }
    }).catch(err => {
      if (active) setError(err.message || 'Could not generate a summary from the configured AI provider.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [extractedText, hasDocuments, apiKeys, primaryPriority]);

  const getActiveContent = () => {
    if (!summaryData) return '';
    if (activeView === 'key_points') return (summaryData.key_points || []).map((point, index) => `${index + 1}. ${point}`).join('\n\n');
    if (activeView === 'source_topics') return sourceTopics.length ? sourceTopics.map(topic => `- ${topic}`).join('\n') : 'No structured headings or terms were extracted from the source documents.';
    return summaryData.summary || '';
  };

  const downloadPdf = () => {
    const content = getActiveContent();
    if (!content) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const title = appState.uploadedFiles?.map(file => file.name).join(', ') || appState.uploadedFile?.name || 'Study notes';
    doc.setFontSize(16);
    doc.text('Study Assistant — Source Summary', 105, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text(title, 18, 24);
    const lines = doc.splitTextToSize(content.replace(/###?\s*/g, '').replace(/\*\*/g, ''), 175);
    let y = 34;
    lines.forEach(line => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, 18, y);
      y += 5;
    });
    doc.save('Study_Summary.pdf');
  };

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Source-based study summary</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Summaries use the configured AI provider. Extracted topics below come directly from uploaded documents.</p>
        </div>
        {summaryData && <button onClick={downloadPdf} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">Export current view</button>}
      </div>

      {!hasDocuments ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">No readable study material</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Upload a document with extractable text to create a summary.</p>
          <button onClick={() => setActiveTab?.('upload')} className="mt-5 px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl">Go to Upload</button>
        </div>
      ) : loading ? (
        <div role="status" className="glass-card p-8 rounded-2xl">Generating a source-based summary…</div>
      ) : error ? (
        <div role="alert" className="p-6 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p>{error}</p>
          <p className="mt-2 text-sm">Configure a provider key in Settings, then return to this tab.</p>
        </div>
      ) : summaryData && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border bg-white dark:bg-gray-900"><span className="block text-xs text-gray-500">Source words</span><strong>{extractedText.split(/\s+/).filter(Boolean).length}</strong></div>
            <div className="p-3.5 rounded-2xl border bg-white dark:bg-gray-900"><span className="block text-xs text-gray-500">Summary words</span><strong>{summaryData.word_count ?? '—'}</strong></div>
            <div className="p-3.5 rounded-2xl border bg-white dark:bg-gray-900"><span className="block text-xs text-gray-500">Key points returned</span><strong>{summaryData.key_points?.length ?? 0}</strong></div>
          </div>
          <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl border">
            {[
              ['summary', 'AI summary'], ['key_points', 'Key points'], ['source_topics', 'Extracted topics'],
            ].map(([view, label]) => <button key={view} onClick={() => setActiveView(view)} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeView === view ? 'bg-white dark:bg-gray-800 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}>{label}</button>)}
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <MarkdownViewer content={getActiveContent()} />
          </div>
          {summaryData.note && <p className="text-xs text-gray-500">{summaryData.note}</p>}
        </div>
      )}
    </div>
  );
}
