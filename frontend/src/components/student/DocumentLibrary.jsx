import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/student/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.debug('Fetch docs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadText.trim()) return;

    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          text_content: uploadText.trim(),
          document_type: 'manuscript'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save document.');
      }

      setUploadTitle('');
      setUploadText('');
      fetchDocs();
    } catch (err) {
      setError(err.message || 'Upload error.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await fetch(`/api/v1/student/documents/${docId}`, { method: 'DELETE' });
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.debug('Delete doc error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📁</span>
            <span>Student Academic Document Repository</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Store, manage, and retrieve academic drafts, assignments, research manuscripts, and coursework notes.
          </p>
        </div>
        <div className="text-xs font-semibold text-neutral-500">
          Total Documents: <span className="text-neutral-900 dark:text-white">{documents.length}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Upload card */}
      <form onSubmit={handleUpload} className="p-5 rounded-2xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
        <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
          Upload New Document to Workspace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Document title (e.g. Distributed Database Notes)"
            className="md:col-span-1 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
          />
          <input
            type="text"
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            placeholder="Document content excerpt or summary text..."
            className="md:col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !uploadTitle.trim() || !uploadText.trim()}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>📁</span>
          <span>{uploading ? 'Storing...' : 'Save to Library'}</span>
        </button>
      </form>

      {/* Document table */}
      <div className="rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              <th className="p-3.5">Document Title</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Word Count</th>
              <th className="p-3.5">Uploaded</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-neutral-400">Loading documents...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-neutral-400">No documents uploaded yet.</td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <td className="p-3.5 font-semibold text-neutral-800 dark:text-neutral-200">{doc.title}</td>
                  <td className="p-3.5 font-mono text-[11px] text-neutral-500 uppercase">{doc.document_type || 'manuscript'}</td>
                  <td className="p-3.5 font-mono text-cyan-400">{doc.word_count || 0}</td>
                  <td className="p-3.5 text-neutral-400">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Today'}</td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
