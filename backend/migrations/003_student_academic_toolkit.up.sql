-- 003_student_academic_toolkit.up.sql
-- Relational tables for Student Academic Toolkit
-- Supports PostgreSQL (Neon pooled) and SQLite 3

CREATE TABLE IF NOT EXISTS student_academic_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'student_default',
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    extracted_text TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_plagiarism_reports (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    document_name TEXT NOT NULL,
    similarity_score REAL NOT NULL,
    analyzed_words INTEGER NOT NULL,
    matched_passages_json TEXT NOT NULL,
    missing_citations_count INTEGER DEFAULT 0,
    citation_notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_ai_analyses (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    document_name TEXT NOT NULL,
    ai_probability REAL NOT NULL,
    perplexity_score REAL NOT NULL,
    burstiness_score REAL NOT NULL,
    repetitive_patterns_json TEXT NOT NULL,
    summary_verdict TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_paraphrase_records (
    id TEXT PRIMARY KEY,
    original_text TEXT NOT NULL,
    rewritten_text TEXT NOT NULL,
    mode TEXT NOT NULL,
    preserved_terms_json TEXT,
    accepted INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_grammar_checks (
    id TEXT PRIMARY KEY,
    document_name TEXT,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    error_count INTEGER NOT NULL,
    suggestions_json TEXT NOT NULL,
    readability_score REAL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_academic_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'student_default',
    project_type TEXT NOT NULL,
    title TEXT NOT NULL,
    abstract TEXT,
    outline_json TEXT,
    sections_json TEXT,
    citations_json TEXT,
    citation_style TEXT DEFAULT 'APA',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'student_default',
    title TEXT NOT NULL,
    template_type TEXT NOT NULL,
    personal_info_json TEXT NOT NULL,
    education_json TEXT NOT NULL,
    experience_json TEXT NOT NULL,
    skills_json TEXT NOT NULL,
    projects_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_diagrams (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'student_default',
    title TEXT NOT NULL,
    diagram_type TEXT NOT NULL,
    mermaid_code TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_database_designs (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'student_default',
    title TEXT NOT NULL,
    db_engine TEXT DEFAULT 'postgresql',
    schema_json TEXT NOT NULL,
    generated_sql TEXT NOT NULL,
    normalization_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_spreadsheet_analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'student_default',
    filename TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    column_count INTEGER NOT NULL,
    summary_stats_json TEXT NOT NULL,
    suggested_formulas_json TEXT,
    created_at TEXT NOT NULL
);
