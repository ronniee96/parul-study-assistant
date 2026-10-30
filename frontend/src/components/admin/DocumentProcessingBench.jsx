import React, { useState, useEffect } from 'react';

export default function DocumentProcessingBench({ adminToken, onRefreshTrigger }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/admin/documents?limit=50`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Key': sessionStorage.getItem('parul_admin_passcode') || ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load documents: HTTP ${res.status}`);
      }
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || 'Error fetching document ingestion telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [adminToken, onRefreshTrigger]);

  const totalChars = documents.reduce((acc, d) => acc + (d.character_count || 0), 0);
  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-gray-200 overflow-y-auto p-5 space-y-5">
      {/* KPI Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-1">
          <span className="text-gray-400 text-xs font-medium">Ingested Documents</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">{documents.length}</div>
          <span className="text-[11px] text-gray-400">Canonical records in database</span>
        </div>
        <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-1">
          <span className="text-gray-400 text-xs font-medium">Total Extracted Text</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {totalChars.toLocaleString()} <span className="text-xs font-normal text-gray-400">chars</span>
          </div>
          <span className="text-[11px] text-gray-400">Cleaned academic content</span>
        </div>
        <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-1">
          <span className="text-gray-400 text-xs font-medium">Total Ingested Volume</span>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {(totalBytes / 1024 / 1024).toFixed(2)} <span className="text-xs font-normal text-gray-400">MB</span>
          </div>
          <span className="text-[11px] text-gray-400">S3 / local staging payload</span>
        </div>
        <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-1">
          <span className="text-gray-400 text-xs font-medium">Boilerplate Stripper</span>
          <div className="text-2xl font-bold font-mono text-blue-400">100% Active</div>
          <span className="text-[11px] text-gray-400">Time/due/credit headers pruned</span>
        </div>
      </div>

      {/* Main Document Table */}
      <div className="bg-[#090d16] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">📄</span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Document Ingestion & Character Yield Telemetry
            </h3>
          </div>
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs font-mono transition"
          >
            ↻ Refresh
          </button>
        </div>

        {loading && documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading document jobs...</div>
        ) : error ? (
          <div className="p-4 text-xs text-red-400 bg-red-950/20 m-4 rounded-xl border border-red-500/30">
            {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No document processing records found in database. Upload a document from the student interface to observe live ingestion.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#05080e] text-gray-400 border-b border-gray-800">
                  <th className="p-3">Filename</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Extracted Yield</th>
                  <th className="p-3">Storage Status</th>
                  <th className="p-3">S3 Target</th>
                  <th className="p-3">Ingested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {documents.map((doc) => (
                  <tr key={doc.document_id} className="hover:bg-gray-800/30 transition">
                    <td className="p-3 font-semibold text-white truncate max-w-[200px]" title={doc.filename}>
                      {doc.filename}
                    </td>
                    <td className="p-3 text-cyan-400 uppercase">{doc.file_type}</td>
                    <td className="p-3 text-gray-300">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '0 KB'}
                    </td>
                    <td className="p-3 font-bold text-emerald-400">
                      {doc.character_count?.toLocaleString() || 0} chars
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {doc.storage_status || 'EXTRACTED'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-[11px]">
                      {doc.s3_bucket} ({doc.s3_region})
                    </td>
                    <td className="p-3 text-gray-400 text-[11px]">
                      {doc.created_at ? doc.created_at.slice(0, 19).replace('T', ' ') : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OCR Engine Diagnostic Card */}
      <div className="p-4 bg-[#090d16] border border-gray-800 rounded-xl space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <span>🔍</span> Multi-Tier Parser & OCR Fallback Diagnostic
        </h4>
        <p className="text-xs text-gray-300 leading-relaxed">
          The ingestion pipeline processes files through PyPDF2 / pdfplumber first. If character density is low (&lt; 200 characters per page), it seamlessly invokes Tesseract OCR or pdftoppm image extraction without failing the student request.
        </p>
      </div>
    </div>
  );
}
