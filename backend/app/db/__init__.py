"""
Relational Database & Migration Package
Supports Neon PostgreSQL (serverless pooled / HTTP SQL) with local SQLite relational fallback.
"""

from app.db.database import DatabaseEngine, get_db_engine, is_production_runtime, normalize_neon_connection_url
from app.db.migrator import MigrationRunner
from app.db.models import (
    SchemaMigration,
    StudySession,
    SessionDocument,
    ProcessingJob,
    SessionQuestion,
    MODEL_REGISTRY,
    verify_models_match_migration_sql,
    verify_models_match_live_db,
)

__all__ = [
    "DatabaseEngine",
    "get_db_engine",
    "is_production_runtime",
    "normalize_neon_connection_url",
    "MigrationRunner",
    "SchemaMigration",
    "StudySession",
    "SessionDocument",
    "ProcessingJob",
    "SessionQuestion",
    "MODEL_REGISTRY",
    "verify_models_match_migration_sql",
    "verify_models_match_live_db",
]
