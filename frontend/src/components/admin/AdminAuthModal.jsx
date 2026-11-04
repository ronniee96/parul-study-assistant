import React, { useState, useEffect } from 'react';

/**
 * Helper to convert ArrayBuffer to Base64
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Helper to convert Base64 to Uint8Array
 */
function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function AdminAuthModal({ isOpen, onClose, onAuthenticated, currentPasscode = '' }) {
  const [passcode, setPasscode] = useState(currentPasscode || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Biometrics & WebAuthn state
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [touchIdAvailable, setTouchIdAvailable] = useState(false);
  const [isPasskeyEnrolled, setIsPasskeyEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('touchid'); // 'touchid' | 'register' | 'passcode'

  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '').replace(/\/+$/, '');

  // 1. Detect platform authenticator (Touch ID) and enrollment status on mount
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function checkBiometrics() {
      const hasWebAuthn = typeof window !== 'undefined' && !!(window.PublicKeyCredential && navigator.credentials);
      if (mounted) setWebAuthnSupported(hasWebAuthn);

      if (hasWebAuthn) {
        try {
          if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            const platformAvail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (mounted) setTouchIdAvailable(platformAvail);
          } else {
            if (mounted) setTouchIdAvailable(true);
          }
        } catch {
          if (mounted) setTouchIdAvailable(true);
        }
      }

      // Check local storage for existing enrollment
      const localEnrolled = localStorage.getItem('parul_admin_passkey_enrolled') === 'true';

      // Check backend status for sync across updates
      let serverEnrolled = false;
      try {
        const res = await fetch(`${apiBase}/api/v1/admin/passkey/status`);
        if (res.ok) {
          const statusData = await res.json();
          serverEnrolled = !!statusData.registered;
        }
      } catch {
        // Fallback to local storage if offline/cold start
      }

      const enrolled = localEnrolled || serverEnrolled;
      if (mounted) {
        setIsPasskeyEnrolled(enrolled);
        // Default to Touch ID if enrolled or if Touch ID hardware is available
        if (enrolled) {
          setActiveTab('touchid');
        } else if (hasWebAuthn) {
          setActiveTab('register');
        } else {
          setActiveTab('passcode');
        }
      }
    }

    checkBiometrics();
    return () => { mounted = false; };
  }, [isOpen, apiBase]);

  if (!isOpen) return null;

  /**
   * 2. Authenticate with Mac Touch ID / WebAuthn Biometrics
   * Zero passwords required.
   */
  const handleTouchIdLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error('WebAuthn / Passkeys not supported by this browser.');
      }

      // Fetch or generate random challenge
      let challengeBytes;
      try {
        const chalRes = await fetch(`${apiBase}/api/v1/admin/passkey/challenge`, { method: 'POST' });
        if (chalRes.ok) {
          const chalData = await chalRes.json();
          challengeBytes = new TextEncoder().encode(chalData.challenge);
        }
      } catch {
        // Local entropy fallback
      }
      if (!challengeBytes) {
        challengeBytes = new Uint8Array(32);
        window.crypto.getRandomValues(challengeBytes);
      }

      // Check stored credential id if available
      const storedCredId = localStorage.getItem('parul_admin_passkey_cred_id');
      const allowList = [];
      if (storedCredId) {
        try {
          allowList.push({
            type: 'public-key',
            id: base64ToBuffer(storedCredId),
            transports: ['internal'],
          });
        } catch {
          // Allow discovering resident key
        }
      }

      const getOptions = {
        publicKey: {
          challenge: challengeBytes,
          rpId: window.location.hostname || undefined,
          allowCredentials: allowList.length > 0 ? allowList : undefined,
          userVerification: 'required', // Demands Touch ID biometric touch
          timeout: 60000,
        },
      };

      // Native macOS prompt pops up for Touch ID
      const credential = await navigator.credentials.get(getOptions);
      if (!credential) {
        throw new Error('Touch ID authentication was canceled or timed out.');
      }

      // Verify assertion with backend
      const verifyRes = await fetch(`${apiBase}/api/v1/admin/passkey/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential_id: credential.id,
          raw_id: bufferToBase64(credential.rawId),
          client_data_json: bufferToBase64(credential.response.clientDataJSON),
          authenticator_data: bufferToBase64(credential.response.authenticatorData),
          signature: bufferToBase64(credential.response.signature),
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Touch ID verification failed on server.');
      }

      const data = await verifyRes.json();
      if (data.authorized && data.token) {
        setSuccessMsg('Touch ID Verified! Unlocking SecOps Console...');
        sessionStorage.setItem('parul_admin_token', data.token);
        sessionStorage.setItem('parul_admin_expires', data.expires_at || '');
        localStorage.setItem('parul_admin_passkey_enrolled', 'true');
        localStorage.setItem('parul_admin_passkey_cred_id', bufferToBase64(credential.rawId));

        setTimeout(() => {
          onAuthenticated(data.token, data);
          onClose();
        }, 300);
      } else {
        throw new Error('Passkey verification succeeded but no session token was issued.');
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Touch ID prompt canceled. Touch your Mac fingerprint sensor to retry.');
      } else {
        setError(err.message || 'Touch ID verification error.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 3. One-Time Passkey Enrollment
   * Binds Touch ID permanently so no passwords are ever needed again.
   */
  const handleRegisterPasskey = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error('WebAuthn / Passkeys not supported by this browser.');
      }

      const challengeBytes = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBytes);
      const userHandle = new Uint8Array(16);
      window.crypto.getRandomValues(userHandle);

      const createOptions = {
        publicKey: {
          challenge: challengeBytes,
          rp: {
            name: 'Parul Study Assistant SecOps',
            id: window.location.hostname || undefined,
          },
          user: {
            id: userHandle,
            name: 'admin@parul.internal',
            displayName: 'SecOps Master Administrator',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Enforce Mac Touch ID hardware enclave
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      };

      // Native macOS Touch ID registration prompt
      const credential = await navigator.credentials.create(createOptions);
      if (!credential) {
        throw new Error('Passkey creation was canceled.');
      }

      const rawIdB64 = bufferToBase64(credential.rawId);

      // Register with backend
      const regRes = await fetch(`${apiBase}/api/v1/admin/passkey/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: passcode.trim() || undefined,
          credential_id: credential.id,
          raw_id: rawIdB64,
          device_name: 'Mac Touch ID Enclave',
        }),
      });

      if (!regRes.ok) {
        const errJson = await regRes.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to register passkey with backend.');
      }

      const data = await regRes.json();
      if (data.authorized && data.token) {
        // Permanently persist enrollment
        localStorage.setItem('parul_admin_passkey_enrolled', 'true');
        localStorage.setItem('parul_admin_passkey_cred_id', rawIdB64);
        localStorage.setItem('parul_admin_passkey_name', 'Mac Touch ID Enclave');
        localStorage.setItem('parul_admin_passkey_date', new Date().toISOString());

        setIsPasskeyEnrolled(true);
        setActiveTab('touchid');
        setSuccessMsg('Touch ID Enrolled! Unlocking Console...');

        sessionStorage.setItem('parul_admin_token', data.token);
        sessionStorage.setItem('parul_admin_expires', data.expires_at || '');

        setTimeout(() => {
          onAuthenticated(data.token, data);
          onClose();
        }, 500);
      } else {
        throw new Error('Registration completed but no session token was issued.');
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Enrollment was canceled. Touch your Mac fingerprint sensor to retry.');
      } else {
        setError(err.message || 'Passkey enrollment error.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4. Traditional Master Passcode Fallback
   */
  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the Admin Master Passcode.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#090d16] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 p-6 text-gray-200 relative overflow-hidden">
        {/* Subtle cyber background grid accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shadow-lg shadow-cyan-500/10">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                SecOps Biometric Verification
              </h2>
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

        {/* Mode Navigation Tabs */}
        <div className="flex gap-1.5 p-1 bg-[#05080e] rounded-xl border border-gray-800/80 mt-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setActiveTab('touchid'); setError(null); }}
            className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'touchid'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>👆</span>
            <span>Touch ID</span>
            {isPasskeyEnrolled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Enrolled" />
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>🪪</span>
            <span>{isPasskeyEnrolled ? 'Re-enroll' : 'Setup Passkey'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('passcode'); setError(null); }}
            className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'passcode'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>🔑</span>
            <span>Passcode</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start gap-2 animate-fadeIn">
            <span className="text-red-400 font-bold mt-0.5">✕</span>
            <span>{error}</span>
          </div>
        )}

        {/* ─── TAB 1: TOUCH ID LOGIN (PRIMARY & DEFAULT) ──────────────────── */}
        {activeTab === 'touchid' && (
          <div className="mt-5 space-y-5 animate-fadeIn">
            <div className="flex flex-col items-center justify-center py-4 text-center">
              {/* Biometric glowing radar graphic */}
              <div
                onClick={handleTouchIdLogin}
                className="relative cursor-pointer group flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center transition transform group-hover:scale-105 group-active:scale-95 shadow-xl shadow-cyan-500/20">
                  <div className="w-18 h-18 rounded-full bg-cyan-400/10 flex items-center justify-center">
                    <svg
                      className={`w-12 h-12 ${loading ? 'text-cyan-300 animate-pulse' : 'text-cyan-400 group-hover:text-cyan-200'} transition`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 001.077 4m13.846-4a7.99 7.99 0 00-.776-3.415M12 11V7a2 2 0 012-2h1"
                      />
                    </svg>
                  </div>
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping pointer-events-none opacity-30" />
              </div>

              <div className="mt-3.5 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Mac Touch ID Passkey Ready</span>
                </div>
                <p className="text-xs text-gray-400">
                  Tap below or touch the fingerprint graphic to verify.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTouchIdLogin}
              disabled={loading}
              className="w-full py-3.5 px-5 text-sm font-bold rounded-xl bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-white shadow-xl shadow-cyan-600/30 transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Touch Mac Sensor Now...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">👆</span>
                  <span>Unlock with Mac Touch ID</span>
                  <span>➔</span>
                </>
              )}
            </button>

            <div className="pt-1 text-center">
              <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <span>🔒</span> Hardware Enclave biometric cryptographic assertion. No passwords required.
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ONE-TIME PASSKEY SETUP ──────────────────────────────── */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterPasskey} className="mt-5 space-y-4 animate-fadeIn">
            <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                <span>🪪</span>
                <span>One-Time Mac Passkey Setup</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Touch your Mac keyboard sensor once to enroll your fingerprint as the master administrative passkey.
                After this single setup, you will never need a password again.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Initial Master Passcode Authorization
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
              <p className="text-[11px] text-gray-400 mt-1.5">
                Authorize this one-time biometric binding using the master passcode.
              </p>
            </div>

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
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Touch Mac Sensor to Register...</span>
                  </>
                ) : (
                  <>
                    <span>👆</span>
                    <span>Register Mac Touch ID</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ─── TAB 3: PASSCODE FALLBACK ───────────────────────────────────── */}
        {activeTab === 'passcode' && (
          <form onSubmit={handlePasscodeSubmit} className="mt-5 space-y-4 animate-fadeIn">
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
                    <span>Verifying...</span>
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
        )}
      </div>
    </div>
  );
}
