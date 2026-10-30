import React, { useState } from 'react';

export default function AdminAuthModal({ isOpen, onClose, onAuthenticated, currentPasscode = '' }) {
  const [passcode, setPasscode] = useState(currentPasscode || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the Admin Master Passcode.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const authUrl = `${apiBase}/api/v1/admin/auth`;

      const res = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error('Access Denied: Invalid Master Passcode.');
        }
        throw new Error(`Authentication failed (HTTP ${res.status}). Check server status.`);
      }

      const data = await res.json();
      if (data.authorized && data.token) {
        sessionStorage.setItem('parul_admin_token', data.token);
        sessionStorage.setItem('parul_admin_expires', data.expires_at || '');
        sessionStorage.setItem('parul_admin_passcode', passcode.trim());
        onAuthenticated(data.token, data);
        onClose();
      } else {
        throw new Error('Authentication succeeded but no authorization token was issued.');
      }
    } catch (err) {
      setError(err.message || 'Network error verifying admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#090d16] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/40 p-6 text-gray-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">SecOps Verification</h2>
              <p className="text-xs text-gray-400">Parul Study Assistant Operations Console</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Admin Master Passcode
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(null);
              }}
              placeholder="Enter master passcode (e.g. parul-admin-secops-2026)"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#05080e] border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition"
            />
            <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
              <span>🔒</span> Validated server-side using constant-time cryptographic digest.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <span className="text-red-400 font-bold">✕</span>
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <span>Unlock Console</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
