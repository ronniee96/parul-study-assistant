import React, { useState, useEffect } from 'react';
import {
  IconFolder,
  IconX
} from './StudentIcons';

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/student/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.debug('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

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
          document_type: 'notes'
        })
      });

      if (!res.ok) {
        throw new Error('Upload failed.');
      }

      setUploadTitle('');
      setUploadText('');
      await fetchDocuments();
    } catch (err) {
      setError(err.message || 'Error uploading document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`/api/v1/student/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(documents.filter(d => d.id !== docId));
      }
    } catch (err) {
      console.debug('Error deleting document:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:text-[#388bfd] flex items-center justify-center shrink-0">
              <IconFolder className="w-4 h-4" />
            </div>
            <span>Student Academic Document Repository</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Store, manage, and retrieve academic drafts, assignments, research manuscripts, and coursework notes.
          </p>
        </div>
        <div className="text-xs font-semibold text-[#86868b] dark:text-[#98989d]">
          Total Documents: <span className="text-[#1d1d1f] dark:text-[#f5f5f7] font-bold">{documents.length}</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload card */}
      <form onSubmit={handleUpload} className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
          Upload New Document to Workspace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Document title (e.g. Distributed Database Notes)"
            className="md:col-span-1 px-3 py-2 rounded-xl bg-white/80 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
          />
          <input
            type="text"
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            placeholder="Document content excerpt or summary text..."
            className="md:col-span-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !uploadTitle.trim() || !uploadText.trim()}
          className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <IconFolder className="w-3.5 h-3.5" />
          <span>{uploading ? 'Storing...' : 'Save to Library'}</span>
        </button>
      </form>

      {/* Document table */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-[#86868b] dark:text-[#98989d] border-b border-black/[0.06] dark:border-white/[0.08]">
            <tr>
              <th className="p-3.5 font-semibold">Document Title</th>
              <th className="p-3.5 font-semibold">Type</th>
              <th className="p-3.5 font-semibold">Word Count</th>
              <th className="p-3.5 font-semibold">Uploaded</th>
              <th className="p-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#86868b] dark:text-[#98989d]">Loading documents...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#86868b] dark:text-[#98989d]">No documents uploaded yet.</td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition">
                  <td className="p-3.5 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{doc.title}</td>
                  <td className="p-3.5 font-mono text-[11px] text-[#86868b] dark:text-[#98989d] uppercase">{doc.document_type || 'manuscript'}</td>
                  <td className="p-3.5 font-mono text-[#0071e3] dark:text-[#388bfd]">{doc.word_count || 0}</td>
                  <td className="p-3.5 text-[#86868b] dark:text-[#98989d]">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Today'}</td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition cursor-pointer"
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
