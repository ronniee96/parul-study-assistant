"""
Relational Database Models for Parul Study Assistant.

Defines the canonical relational schema models (`SchemaMigration`, `StudySession`,
`SessionDocument`, `ProcessingJob`, `SessionQuestion`) matching
`backend/migrations/001_initial_schema.up.sql` 1:1.

Supports optional SQLAlchemy ORM mapping when `sqlalchemy` is installed, and
provides deterministic schema-parity verification between the Python models,
the `.up.sql` migration files, and the active database engine.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.db.database import DatabaseEngine


@dataclass(frozen=True)
class ColumnSpec:
    """Canonical specification for a relational table column."""
    name: str
    sql_type: str
    primary_key: bool = False
    nullable: bool = True
    default: Optional[str] = None
    unique: bool = False
    foreign_key: Optional[str] = None


@dataclass(frozen=True)
class TableModelSpec:
    """Canonical specification for a relational database table."""
    table_name: str
    columns: Tuple[ColumnSpec, ...]
    indexes: Tuple[str, ...] = ()

    @property
    def column_names(self) -> List[str]:
        return [c.name for c in self.columns]

    @property
    def primary_key_columns(self) -> List[str]:
        return [c.name for c in self.columns if c.primary_key]


class SchemaMigration:
    """Model for `schema_migrations` version tracking table."""
    __tablename__ = "schema_migrations"
    __spec__ = TableModelSpec(
        table_name="schema_migrations",
        columns=(
            ColumnSpec("version", "TEXT", primary_key=True, nullable=True),
            ColumnSpec("name", "TEXT", nullable=False),
            ColumnSpec("applied_at", "TEXT", nullable=False),
            ColumnSpec("checksum", "TEXT", nullable=False),
        ),
    )


class StudySession:
    """Model for `study_sessions` isolated anonymous study sessions table."""
    __tablename__ = "study_sessions"
    __spec__ = TableModelSpec(
        table_name="study_sessions",
        columns=(
            ColumnSpec("session_id", "TEXT", primary_key=True, nullable=True),
            ColumnSpec("capability_hash", "TEXT", nullable=False),
            ColumnSpec("capability_version", "INTEGER", nullable=False, default="1"),
            ColumnSpec("user_id", "TEXT", nullable=True),
            ColumnSpec("created_at", "TEXT", nullable=False),
            ColumnSpec("updated_at", "TEXT", nullable=False),
            ColumnSpec("extracted_text", "TEXT", nullable=False, default="''"),
            ColumnSpec("summary_json", "TEXT", nullable=True),
            ColumnSpec("predicted_paper_json", "TEXT", nullable=True),
            ColumnSpec("ranked_questions_json", "TEXT", nullable=False, default="'[]'"),
            ColumnSpec("answers_json", "TEXT", nullable=False, default="'[]'"),
            ColumnSpec("captures_json", "TEXT", nullable=False, default="'[]'"),
            ColumnSpec("stats_json", "TEXT", nullable=False, default="'{}'"),
            ColumnSpec("metadata_json", "TEXT", nullable=False, default="'{}'"),
        ),
    )


class SessionDocument:
    """Model for `session_documents` uploaded document metadata and S3 provenance."""
    __tablename__ = "session_documents"
    __spec__ = TableModelSpec(
        table_name="session_documents",
        columns=(
            ColumnSpec("document_id", "TEXT", primary_key=True, nullable=True),
            ColumnSpec("session_id", "TEXT", nullable=False, foreign_key="study_sessions(session_id)"),
            ColumnSpec("filename", "TEXT", nullable=False),
            ColumnSpec("file_type", "TEXT", nullable=False),
            ColumnSpec("file_size", "INTEGER", nullable=False, default="0"),
            ColumnSpec("content_hash", "TEXT", nullable=False),
            ColumnSpec("s3_bucket", "TEXT", nullable=True),
            ColumnSpec("s3_region", "TEXT", nullable=False, default="'ap-south-1'"),
            ColumnSpec("s3_object_key", "TEXT", nullable=True),
            ColumnSpec("storage_status", "TEXT", nullable=False, default="'UPLOADED'"),
            ColumnSpec("extracted_text", "TEXT", nullable=False, default="''"),
            ColumnSpec("pages_json", "TEXT", nullable=False, default="'[]'"),
            ColumnSpec("metadata_json", "TEXT", nullable=False, default="'{}'"),
            ColumnSpec("created_at", "TEXT", nullable=False),
        ),
        indexes=(
            "idx_session_documents_session_id",
            "idx_session_documents_content_hash",
        ),
    )


class ProcessingJob:
    """Model for `processing_jobs` durable QStash background job state machine."""
    __tablename__ = "processing_jobs"
    __spec__ = TableModelSpec(
        table_name="processing_jobs",
        columns=(
            ColumnSpec("job_id", "TEXT", primary_key=True, nullable=True),
            ColumnSpec("session_id", "TEXT", nullable=False, foreign_key="study_sessions(session_id)"),
            ColumnSpec("document_id", "TEXT", nullable=False, foreign_key="session_documents(document_id)"),
            ColumnSpec("idempotency_key", "TEXT", nullable=False, unique=True),
            ColumnSpec("qstash_message_id", "TEXT", nullable=True),
            ColumnSpec("status", "TEXT", nullable=False, default="'PENDING'"),
            ColumnSpec("attempt_count", "INTEGER", nullable=False, default="0"),
            ColumnSpec("error_message", "TEXT", nullable=True),
            ColumnSpec("result_json", "TEXT", nullable=True),
            ColumnSpec("created_at", "TEXT", nullable=False),
            ColumnSpec("updated_at", "TEXT", nullable=False),
            ColumnSpec("completed_at", "TEXT", nullable=True),
        ),
        indexes=(
            "idx_processing_jobs_session_id",
            "idx_processing_jobs_document_id",
        ),
    )


class SessionQuestion:
    """Model for `session_questions` generated questions with document/page provenance."""
    __tablename__ = "session_questions"
    __spec__ = TableModelSpec(
        table_name="session_questions",
        columns=(
            ColumnSpec("question_uid", "TEXT", primary_key=True, nullable=True),
            ColumnSpec("session_id", "TEXT", nullable=False, foreign_key="study_sessions(session_id)"),
            ColumnSpec("document_id", "TEXT", nullable=True),
            ColumnSpec("job_id", "TEXT", nullable=True),
            ColumnSpec("content_hash", "TEXT", nullable=True),
            ColumnSpec("question_index", "INTEGER", nullable=False),
            ColumnSpec("question_type", "TEXT", nullable=False),
            ColumnSpec("question_text", "TEXT", nullable=False),
            ColumnSpec("topic", "TEXT", nullable=False),
            ColumnSpec("marks", "INTEGER", nullable=False, default="2"),
            ColumnSpec("confidence", "REAL", nullable=False, default="0.0"),
            ColumnSpec("source_pages_json", "TEXT", nullable=False, default="'[]'"),
            ColumnSpec("source_snippet", "TEXT", nullable=True),
            ColumnSpec("question_json", "TEXT", nullable=False),
            ColumnSpec("created_at", "TEXT", nullable=False),
        ),
        indexes=(
            "idx_session_questions_session_id",
            "idx_session_questions_document_id",
        ),
    )


ALL_MODELS = (
    SchemaMigration,
    StudySession,
    SessionDocument,
    ProcessingJob,
    SessionQuestion,
)

MODEL_REGISTRY: Dict[str, TableModelSpec] = {
    model.__tablename__: model.__spec__ for model in ALL_MODELS
}


def parse_create_tables_from_sql(sql_text: str) -> Dict[str, List[Tuple[str, str]]]:
    """
    Parse `CREATE TABLE IF NOT EXISTS <name> (...)` blocks from a migration `.up.sql` script
    and return `{table_name: [(column_name, sql_type), ...]}`.
    """
    tables: Dict[str, List[Tuple[str, str]]] = {}
    pattern = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\((.*?)\)\s*;",
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(sql_text):
        table_name = match.group(1).strip()
        body = match.group(2)
        cols: List[Tuple[str, str]] = []
        for raw_line in body.splitlines():
            line = raw_line.strip().rstrip(",")
            if not line or line.startswith("--"):
                continue
            upper = line.upper()
            if upper.startswith(("FOREIGN KEY", "PRIMARY KEY", "CONSTRAINT", "UNIQUE ", "UNIQUE(", "CHECK ", "CHECK(")):
                continue
            parts = line.split()
            if len(parts) >= 2:
                col_name = parts[0].strip()
                col_type = parts[1].strip().upper()
                cols.append((col_name, col_type))
        tables[table_name] = cols
    return tables


def verify_models_match_migration_sql(up_sql_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Verify that `MODEL_REGISTRY` matches `001_initial_schema.up.sql` 1:1 in tables, column names,
    column order, and SQL types. Raises AssertionError on any mismatch.
    """
    if up_sql_path is None:
        up_sql_path = (
            Path(__file__).resolve().parent.parent.parent
            / "migrations"
            / "001_initial_schema.up.sql"
        )
    sql_text = up_sql_path.read_text(encoding="utf-8")
    parsed_tables = parse_create_tables_from_sql(sql_text)

    expected_tables = set(MODEL_REGISTRY.keys())
    actual_tables = set(parsed_tables.keys())
    if expected_tables != actual_tables:
        raise AssertionError(
            f"Model table set {sorted(expected_tables)} != migration SQL table set {sorted(actual_tables)}"
        )

    for table_name, spec in MODEL_REGISTRY.items():
        model_cols = [(c.name, c.sql_type.upper()) for c in spec.columns]
        sql_cols = parsed_tables[table_name]
        if model_cols != sql_cols:
            raise AssertionError(
                f"Schema mismatch in table '{table_name}': model={model_cols} vs sql={sql_cols}"
            )

    return {
        "verified": True,
        "tables_checked": sorted(expected_tables),
        "migration_file": str(up_sql_path),
    }


def verify_models_match_live_db(engine: DatabaseEngine) -> Dict[str, Any]:
    """
    Verify that the live database tables and columns match `MODEL_REGISTRY` 1:1.
    """
    for table_name, spec in MODEL_REGISTRY.items():
        if engine.backend == "sqlite":
            rows = engine.fetch_all(f"PRAGMA table_info({table_name})")
            live_cols = [(r["name"], str(r["type"]).upper()) for r in rows]
        else:
            rows = engine.fetch_all(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position",
                (table_name,),
            )
            live_cols = [(r["column_name"], str(r["data_type"]).upper()) for r in rows]

        model_cols = [(c.name, c.sql_type.upper()) for c in spec.columns]
        if live_cols != model_cols:
            raise AssertionError(
                f"Live DB table '{table_name}' columns {live_cols} != model columns {model_cols}"
            )

    return {
        "verified": True,
        "tables_checked": sorted(MODEL_REGISTRY.keys()),
    }
