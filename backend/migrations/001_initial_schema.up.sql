-- 001_initial_schema.up.sql
-- Versioned relational schema for Parul Study Assistant
-- Compatible with Neon PostgreSQL (serverless pooled) and SQLite 3

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
    session_id TEXT PRIMARY KEY,
    capability_hash TEXT NOT NULL,
    capability_version INTEGER NOT NULL DEFAULT 1,
    user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    extracted_text TEXT NOT NULL DEFAULT '',
    summary_json TEXT,
    predicted_paper_json TEXT,
    ranked_questions_json TEXT NOT NULL DEFAULT '[]',
    answers_json TEXT NOT NULL DEFAULT '[]',
    captures_json TEXT NOT NULL DEFAULT '[]',
    stats_json TEXT NOT NULL DEFAULT '{}',
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS session_documents (
    document_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    content_hash TEXT NOT NULL,
    s3_bucket TEXT,
    s3_region TEXT NOT NULL DEFAULT 'ap-south-1',
    s3_object_key TEXT,
    storage_status TEXT NOT NULL DEFAULT 'UPLOADED',
    extracted_text TEXT NOT NULL DEFAULT '',
    pages_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES study_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_documents_session_id
    ON session_documents(session_id);

CREATE INDEX IF NOT EXISTS idx_session_documents_content_hash
    ON session_documents(session_id, content_hash);

CREATE TABLE IF NOT EXISTS processing_jobs (
    job_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    qstash_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    result_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (session_id) REFERENCES study_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES session_documents(document_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_session_id
    ON processing_jobs(session_id);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id
    ON processing_jobs(document_id);

CREATE TABLE IF NOT EXISTS session_questions (
    question_uid TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    document_id TEXT,
    job_id TEXT,
    content_hash TEXT,
    question_index INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    topic TEXT NOT NULL,
    marks INTEGER NOT NULL DEFAULT 2,
    confidence REAL NOT NULL DEFAULT 0.0,
    source_pages_json TEXT NOT NULL DEFAULT '[]',
    source_snippet TEXT,
    question_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES study_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_questions_session_id
    ON session_questions(session_id);

CREATE INDEX IF NOT EXISTS idx_session_questions_document_id
    ON session_questions(session_id, document_id);
