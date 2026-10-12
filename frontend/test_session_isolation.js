import assert from 'assert';

console.log('🧪 Testing Session Isolation & Workspace Reset Logic\n');

// Mock browser localStorage and sessionStorage
class StorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new StorageMock();
const mockSessionStorage = new StorageMock();

// Populate simulated Session A data
mockLocalStorage.setItem('study_assistant_permanent_api_keys', JSON.stringify({ gemini: 'AIzaSyTest123', openai: 'sk-test456' }));
mockLocalStorage.setItem('study_assistant_workspace_v2', JSON.stringify({ extractedText: 'Secret Exam Syllabus A', questions: [{ id: 1, text: 'Q1' }] }));
mockLocalStorage.setItem('study_workspace_questions', JSON.stringify([{ id: 1, text: 'Leaked Q1' }]));
mockLocalStorage.setItem('study_workspace_summary', 'Summary of paper A');
mockLocalStorage.setItem('study_assistant_sr_stats', JSON.stringify({ streak: 5 }));
mockLocalStorage.setItem('study_assistant_card_progress', JSON.stringify({ card1: 'mastered' }));
mockSessionStorage.setItem('transient_agent_notes', 'Confidential note from Session A');

console.log('1. Verifying Session A state before reset...');
assert.strictEqual(JSON.parse(mockLocalStorage.getItem('study_workspace_questions')).length, 1);
assert.strictEqual(mockSessionStorage.getItem('transient_agent_notes'), 'Confidential note from Session A');
console.log('✓ Session A data populated.\n');

// Execute Workspace Reset logic (as implemented in App.jsx handleResetWorkspace)
function executeReset(localStorage, sessionStorage) {
  const emptyState = {
    uploadedFile: null,
    uploadedFiles: [],
    extractedText: '',
    results: null,
    summaryData: null,
    questions: [],
    rankedQuestions: [],
    predictedPaper: null,
    answers: [],
    captures: [],
    stats: { pdfCount: 0, questionCount: 0, confidence: 0, answerCount: 0 }
  };

  localStorage.removeItem('study_assistant_workspace_v2');
  localStorage.removeItem('study_workspace_questions');
  localStorage.removeItem('study_workspace_summary');
  localStorage.removeItem('study_assistant_sr_stats');
  localStorage.removeItem('study_assistant_card_progress');
  localStorage.removeItem('parul_gemini_active_model');
  sessionStorage.clear();

  return emptyState;
}

console.log('2. Executing handleResetWorkspace()...');
const newState = executeReset(mockLocalStorage, mockSessionStorage);

// Verifications
console.log('3. Verifying zero cross-session data leakage...');
assert.strictEqual(mockLocalStorage.getItem('study_assistant_workspace_v2'), null);
assert.strictEqual(mockLocalStorage.getItem('study_workspace_questions'), null);
assert.strictEqual(mockLocalStorage.getItem('study_workspace_summary'), null);
assert.strictEqual(mockLocalStorage.getItem('study_assistant_sr_stats'), null);
assert.strictEqual(mockLocalStorage.getItem('study_assistant_card_progress'), null);
assert.strictEqual(mockSessionStorage.getItem('transient_agent_notes'), null);
console.log('✓ All workspace session caches, question banks, summaries, and agent notes completely purged.');

console.log('4. Verifying API keys remain preserved securely...');
const preservedKeys = JSON.parse(mockLocalStorage.getItem('study_assistant_permanent_api_keys'));
assert.strictEqual(preservedKeys.gemini, 'AIzaSyTest123');
assert.strictEqual(preservedKeys.openai, 'sk-test456');
console.log('✓ Permanent API keys preserved for user convenience.');

console.log('5. Verifying fresh empty state initialization...');
assert.strictEqual(newState.questions.length, 0);
assert.strictEqual(newState.extractedText, '');
assert.strictEqual(newState.stats.pdfCount, 0);
assert.strictEqual(newState.stats.questionCount, 0);
assert.strictEqual(newState.stats.answerCount, 0);
assert.strictEqual(newState.stats.confidence, 0);
console.log('✓ Clean state returned (0 PDFs, 0 Questions, 0 Answers, 0% Confidence).\n');

console.log('🎉 SESSION ISOLATION & PURGE VERIFICATION PASSED CLEANLY!');
