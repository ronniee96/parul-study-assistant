-- 001_initial_schema.down.sql
-- Reversible DOWN migration for Parul Study Assistant initial schema

DROP INDEX IF EXISTS idx_session_questions_document_id;
DROP INDEX IF EXISTS idx_session_questions_session_id;
DROP TABLE IF EXISTS session_questions;

DROP INDEX IF EXISTS idx_processing_jobs_document_id;
DROP INDEX IF EXISTS idx_processing_jobs_session_id;
DROP TABLE IF EXISTS processing_jobs;

DROP INDEX IF EXISTS idx_session_documents_content_hash;
DROP INDEX IF EXISTS idx_session_documents_session_id;
DROP TABLE IF EXISTS session_documents;

DROP TABLE IF EXISTS study_sessions;
