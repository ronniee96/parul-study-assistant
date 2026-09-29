/**
 * Centralized API Client and Session Storage Manager
 * Guarantees strict user isolation and multi-session persistence across browser reloads.
 */

const USER_ID_KEY = 'study_assistant_user_id';
const ACTIVE_SESSION_ID_KEY = 'study_assistant_active_session_id';
const SESSIONS_INDEX_KEY = 'study_assistant_sessions_index';
const SESSION_PREFIX = 'study_assistant_session_data_';

function createId(prefix) {
  const value = globalThis.crypto?.randomUUID?.();
  if (value) return `${prefix}_${value}`;
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (bytes.some(byte => byte !== 0)) return `${prefix}_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Get or create a persistent anonymous user UUID for strict tenant isolation
 */
export function getUserId() {
  try {
    let uid = localStorage.getItem(USER_ID_KEY);
    if (!uid) {
      uid = createId('usr');
      localStorage.setItem(USER_ID_KEY, uid);
    }
    return uid;
  } catch {
    return 'usr_guest_default';
  }
}

/**
 * Get or create the active session ID
 */
export function getActiveSessionId() {
  try {
    let sid = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (!sid) {
      sid = createId('sess');
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, sid);
      // Register in sessions index
      registerSession(sid, 'Current Study Session');
    }
    return sid;
  } catch {
    return 'sess_default';
  }
}

/**
 * Set the currently active session ID
 */
export function setActiveSessionId(sessionId) {
  try {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
  } catch (e) {
    console.warn('Failed to set active session ID:', e);
  }
}

/**
 * List all saved sessions for the current user
 */
export function listSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Register or update session metadata in the index
 */
export function registerSession(sessionId, name = 'Study Session', stats = null) {
  try {
    const sessions = listSessions();
    const existingIndex = sessions.findIndex(s => s.id === sessionId);
    const meta = {
      id: sessionId,
      name: name || `Session ${sessions.length + 1}`,
      updatedAt: Date.now(),
      stats: stats || { pdfCount: 0, questionCount: 0, confidence: 0, answerCount: 0 }
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...meta, updatedAt: Date.now() };
    } else {
      sessions.unshift(meta);
    }

    localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.warn('Failed to register session in index:', e);
    return [];
  }
}

/**
 * Save complete session state to local storage
 */
export function saveSessionState(sessionId, state) {
  if (!sessionId || !state) return;
  try {
    const key = SESSION_PREFIX + sessionId;
    // Strip giant binary blobs if any, retain text & generated structures
    const toSave = {
      uploadedFile: state.uploadedFile ? { name: state.uploadedFile.name, size: state.uploadedFile.size } : null,
      uploadedFiles: (state.uploadedFiles || []).map(f => ({ name: f.name, size: f.size })),
      extractedText: state.extractedDocuments?.length ? '' : (state.extractedText || ''),
      extractedDocuments: state.extractedDocuments || [],
      pastPapers: state.pastPapers || [],
      examProfile: state.examProfile || null,
      pipelineData: state.pipelineData || null,
      legacyPipelineData: state.legacyPipelineData || null,
      results: state.results ? {
        total_files: state.results.total_files,
        total_word_count: state.results.total_word_count,
        total_character_count: state.results.total_character_count,
        files: (state.results.files || []).map(file => ({
          document_id: file.document_id,
          filename: file.filename,
          file_type: file.file_type,
          word_count: file.word_count,
          character_count: file.character_count,
          success: file.success,
          error: file.error
        }))
      } : null,
      summaryData: state.summaryData || null,
      questions: state.questions || [],
      rankedQuestions: state.rankedQuestions || [],
      predictedPaper: state.predictedPaper || null,
      answers: state.answers || [],
      captures: (state.captures || []).slice(0, 15), // keep thumbnail captures
      paperPattern: state.paperPattern || null,
      stats: state.stats || { pdfCount: 0, questionCount: 0, confidence: 0, answerCount: 0 }
    };
    localStorage.setItem(key, JSON.stringify(toSave));

    // Update index with subject or file name
    let sessionName = 'Study Session';
    if (state.uploadedFile?.name) {
      sessionName = state.uploadedFile.name.replace(/\.[^/.]+$/, "");
    } else if (state.uploadedFiles?.length > 0) {
      sessionName = `${state.uploadedFiles[0].name.replace(/\.[^/.]+$/, "")} (+${state.uploadedFiles.length - 1})`;
    }
    registerSession(sessionId, sessionName, state.stats);
  } catch (e) {
    console.warn('Failed to save session state:', e);
  }
}

/**
 * Load session state from local storage
 */
export function loadSessionState(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + sessionId);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state.extractedText && state.extractedDocuments?.length) {
      state.extractedText = state.extractedDocuments
        .map((doc, index) => `=== [DOCUMENT ${index + 1}: ${doc.filename}] ===\n${doc.text || ''}`)
        .join('\n\n');
    }
    if (state.pipelineData && state.pipelineData.evidence_pipeline_version !== 1) {
      state.legacyPipelineData = state.pipelineData;
      state.pipelineData = null;
      state.predictedPaper = null;
      state.rankedQuestions = [];
      state.questionStages = null;
      state.stats = { ...state.stats, questionCount: state.questions?.length || 0, evidenceScore: null };
      const removeOldScores = item => {
        const clean = { ...item };
        ['confidence', 'confidence_label', 'evidence_score', 'historical_evidence', 'current_material_evidence', 'university_pattern_evidence', 'pros_evidence', 'cons_evidence', 'risk_analysis'].forEach(key => delete clean[key]);
        return clean;
      };
      state.questions = (state.questions || []).map(removeOldScores);
      state.answers = (state.answers || []).map(removeOldScores);
    }
    return state;
  } catch (e) {
    console.warn(`Failed to load session ${sessionId}:`, e);
    return null;
  }
}

/**
 * Delete a session and its saved state
 */
export function deleteSession(sessionId) {
  try {
    localStorage.removeItem(SESSION_PREFIX + sessionId);
    const sessions = listSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.warn('Failed to delete session:', e);
    return [];
  }
}

/**
 * Create a new isolated session and set it as active
 */
export function createNewSession(name = 'New Study Session') {
  const newId = createId('sess');
  setActiveSessionId(newId);
  registerSession(newId, name);
  return newId;
}

/**
 * Authenticated API Fetch wrapper that automatically attaches
 * X-User-ID and X-Session-ID headers and normalizes error envelopes.
 */
export async function apiFetch(url, options = {}) {
  const userId = getUserId();
  const sessionId = getActiveSessionId();
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const requestUrl = apiBase.endsWith('/api/v1') && url.startsWith('/api/v1/')
    ? `${apiBase}${url.slice('/api/v1'.length)}`
    : apiBase && url.startsWith('/') ? `${apiBase}${url}` : url;

  const headers = new Headers(options.headers || {});
  headers.set('X-User-ID', userId);
  headers.set('X-Session-ID', sessionId);

  // Default content-type to application/json if sending JSON string body and not already set
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body);
      headers.set('Content-Type', 'application/json');
    } catch {
      // not JSON string
    }
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers
  });

  // Handle non-OK responses gracefully
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.error?.message || errorJson.message || errorDetail;
    } catch {
      // Body might be plain text or HTML error
      try {
        const text = await response.text();
        if (text && text.length < 200) errorDetail = text;
      } catch {
        // ignore
      }
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  // Parse JSON response
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return response;
}
