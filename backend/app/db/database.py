"""
Relational Database Engine for Parul Study Assistant.

Production Target:
- Neon PostgreSQL with serverless-compatible connection pooling (`-pooler` endpoint + `sslmode=require`),
  supporting both `psycopg2`/`psycopg` pooled connections and the Neon Serverless HTTP SQL API (`httpx`).

Local Development / Test Fallback:
- When `DATABASE_URL` / `NEON_DATABASE_URL` is not set (or uses `sqlite://`), runs the exact same
  versioned SQL schema and queries against local `sqlite3` with `PRAGMA foreign_keys = ON` and WAL mode.
"""

import os
import re
import sqlite3
import logging
import threading
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import Any, Dict, List, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)


def is_production_runtime() -> bool:
    """
    Detect whether the application is executing in a production environment.
    When true, silent fallback to in-memory or ephemeral filesystem persistence is forbidden.
    """
    if os.getenv("VERCEL", "").strip().lower() in ("1", "true"):
        return True
    if os.getenv("VERCEL_ENV", "").strip().lower() == "production":
        return True
    if os.getenv("APP_ENV", "").strip().lower() == "production":
        return True
    if os.getenv("ENV", "").strip().lower() == "production":
        return True
    return False


def normalize_neon_connection_url(raw_url: str, require_ssl: bool = True) -> str:
    """
    Ensure PostgreSQL / Neon URLs include `sslmode=require` for serverless security.
    """
    if not raw_url or not raw_url.startswith(("postgres://", "postgresql://")):
        return raw_url

    parsed = urlparse(raw_url)
    scheme = "postgresql" if parsed.scheme == "postgres" else parsed.scheme
    query_params = parse_qs(parsed.query, keep_blank_values=True)
    if require_ssl and "sslmode" not in query_params:
        query_params["sslmode"] = ["require"]

    encoded_query = urlencode(query_params, doseq=True)
    return urlunparse((scheme, parsed.netloc, parsed.path, parsed.params, encoded_query, parsed.fragment))


class DatabaseEngine:
    """
    Unified relational database engine supporting Neon PostgreSQL and SQLite3.
    Uses `?` placeholders in caller queries and automatically rewrites them to
    `$1, $2, ...` (Neon HTTP) or `%s` (psycopg) when executing against PostgreSQL.
    """

    def __init__(self, database_url: Optional[str] = None, sqlite_path: Optional[str] = None):
        env_url = (
            database_url
            or os.getenv("NEON_DATABASE_URL")
            or os.getenv("DATABASE_URL")
            or ""
        ).strip()

        self._lock = threading.RLock()
        self._pg_pool = None
        self._neon_http_endpoint: Optional[str] = None

        if env_url and env_url.startswith(("postgres://", "postgresql://")):
            self.backend = "neon_postgres"
            self.database_url = normalize_neon_connection_url(env_url)
            self.sqlite_path = None
            self._init_postgres_driver()
        else:
            if is_production_runtime():
                raise RuntimeError(
                    "Production database configuration missing: NEON_DATABASE_URL or DATABASE_URL "
                    "(postgresql://...) must be set in production. Silent fallback to in-memory "
                    "or ephemeral filesystem persistence is disabled."
                )
            self.backend = "sqlite"
            if env_url.startswith("sqlite:///"):
                resolved_sqlite = env_url[len("sqlite:///"):]
            elif sqlite_path:
                resolved_sqlite = sqlite_path
            else:
                default_dir = os.getenv("STUDY_DB_DIR", "/tmp/parul_study_db")
                os.makedirs(default_dir, exist_ok=True)
                resolved_sqlite = os.path.join(default_dir, "study_assistant.sqlite3")

            if resolved_sqlite == ":memory:" or "mode=memory" in resolved_sqlite:
                raise RuntimeError(
                    "In-memory SQLite persistence is not permitted; use a durable database file or Neon PostgreSQL."
                )

            self.sqlite_path = os.path.abspath(resolved_sqlite)
            os.makedirs(os.path.dirname(self.sqlite_path), exist_ok=True)
            self.database_url = f"sqlite:///{self.sqlite_path}"

    def _init_postgres_driver(self) -> None:
        """Initialize psycopg2/psycopg connection pool or Neon Serverless HTTP SQL transport."""
        try:
            from psycopg2 import pool as pg_pool  # type: ignore
            self._pg_pool = pg_pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=int(os.getenv("DB_POOL_MAX_CONN", "5")),
                dsn=self.database_url,
            )
            logger.info("Initialized psycopg2 ThreadedConnectionPool for Neon PostgreSQL")
            return
        except ImportError:
            pass

        # Fallback for serverless environments without C-extension psycopg2: Neon HTTP SQL endpoint
        parsed = urlparse(self.database_url)
        host = parsed.hostname or ""
        explicit_http = os.getenv("NEON_HTTP_ENDPOINT", "").strip()
        if explicit_http:
            self._neon_http_endpoint = explicit_http
        elif host:
            self._neon_http_endpoint = f"https://{host}/sql"
        logger.info("Configured Neon Serverless HTTP SQL transport (%s)", self._neon_http_endpoint)

    @property
    def is_neon_postgres(self) -> bool:
        return self.backend == "neon_postgres"

    @property
    def is_pooled_endpoint(self) -> bool:
        if not self.is_neon_postgres:
            return False
        parsed = urlparse(self.database_url)
        return "-pooler." in (parsed.hostname or "") or self._pg_pool is not None or self._neon_http_endpoint is not None

    def get_status(self) -> Dict[str, Any]:
        """Return persistence telemetry for health checks and operational audits."""
        return {
            "persistence_mode": "neon_postgres" if self.is_neon_postgres else "local_sqlite_dev",
            "neon_configured": self.is_neon_postgres,
            "serverless_pooled": self.is_pooled_endpoint,
            "driver": (
                "psycopg2_pool"
                if self._pg_pool is not None
                else ("neon_http_sql" if self._neon_http_endpoint else "sqlite3")
            ),
        }

    def _connect_sqlite(self) -> sqlite3.Connection:
        assert self.sqlite_path is not None
        conn = sqlite3.connect(self.sqlite_path, timeout=15.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    @staticmethod
    def _convert_qmarks_to_pg_Format(sql: str, style: str = "pyformat") -> str:
        """
        Convert `?` parameter markers outside string literals to PostgreSQL `%s` or `$1, $2...`.
        """
        out: List[str] = []
        in_single = False
        in_double = False
        param_idx = 1
        i = 0
        n = len(sql)
        while i < n:
            ch = sql[i]
            if ch == "'" and not in_double:
                out.append(ch)
                if in_single and i + 1 < n and sql[i + 1] == "'":
                    out.append(sql[i + 1])
                    i += 2
                    continue
                in_single = not in_single
            elif ch == '"' and not in_single:
                in_double = not in_double
                out.append(ch)
            elif ch == "?" and not in_single and not in_double:
                if style == "dollar":
                    out.append(f"${param_idx}")
                    param_idx += 1
                else:
                    out.append("%s")
            else:
                out.append(ch)
            i += 1
        return "".join(out)

    def execute_script(self, sql_script: str) -> None:
        """Execute a multi-statement SQL migration script atomically."""
        statements = [
            stmt.strip()
            for stmt in re.split(r";\s*(?:\n|$)", sql_script)
            if stmt.strip() and not all(line.strip().startswith("--") for line in stmt.strip().splitlines())
        ]
        if self.backend == "sqlite":
            with self._lock:
                conn = self._connect_sqlite()
                try:
                    with conn:
                        for stmt in statements:
                            conn.execute(stmt)
                finally:
                    conn.close()
            return

        for stmt in statements:
            self.execute(stmt)

    def execute(self, sql: str, params: Sequence[Any] = ()) -> int:
        """Execute an INSERT / UPDATE / DELETE / DDL statement and return affected row count."""
        if self.backend == "sqlite":
            with self._lock:
                conn = self._connect_sqlite()
                try:
                    with conn:
                        cur = conn.execute(sql, tuple(params))
                        return cur.rowcount
                finally:
                    conn.close()

        if self._pg_pool is not None:
            pg_sql = self._convert_qmarks_to_pg_Format(sql, style="pyformat")
            conn = self._pg_pool.getconn()
            try:
                with conn:
                    with conn.cursor() as cur:
                        cur.execute(pg_sql, tuple(params))
                        return cur.rowcount
            finally:
                self._pg_pool.putconn(conn)

        # Neon Serverless HTTP SQL API
        rows, rowcount = self._execute_neon_http(sql, params)
        return rowcount

    def fetch_one(self, sql: str, params: Sequence[Any] = ()) -> Optional[Dict[str, Any]]:
        """Execute a SELECT query and return the first row as a dictionary, or None."""
        rows = self.fetch_all(sql, params)
        return rows[0] if rows else None

    def fetch_all(self, sql: str, params: Sequence[Any] = ()) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return all rows as dictionaries."""
        if self.backend == "sqlite":
            with self._lock:
                conn = self._connect_sqlite()
                try:
                    cur = conn.execute(sql, tuple(params))
                    return [dict(row) for row in cur.fetchall()]
                finally:
                    conn.close()

        if self._pg_pool is not None:
            pg_sql = self._convert_qmarks_to_pg_Format(sql, style="pyformat")
            conn = self._pg_pool.getconn()
            try:
                with conn:
                    with conn.cursor() as cur:
                        cur.execute(pg_sql, tuple(params))
                        if not cur.description:
                            return []
                        cols = [desc[0] for desc in cur.description]
                        return [dict(zip(cols, row)) for row in cur.fetchall()]
            finally:
                self._pg_pool.putconn(conn)

        rows, _ = self._execute_neon_http(sql, params)
        return rows

    def _execute_neon_http(self, sql: str, params: Sequence[Any] = ()) -> Tuple[List[Dict[str, Any]], int]:
        """Execute parameterized SQL against Neon's Serverless HTTP SQL endpoint."""
        import httpx

        if not self._neon_http_endpoint:
            raise RuntimeError("Neon HTTP SQL endpoint is not configured.")

        dollar_sql = self._convert_qmarks_to_pg_Format(sql, style="dollar")
        headers = {
            "Neon-Connection-String": self.database_url,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "query": dollar_sql,
            "params": list(params),
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(self._neon_http_endpoint, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Neon HTTP SQL error ({resp.status_code}): {resp.text[:250]}")
            data = resp.json()
            rows = data.get("rows") or []
            rowcount = data.get("rowCount", len(rows))
            return rows, int(rowcount or 0)


_default_engine: Optional[DatabaseEngine] = None
_engine_lock = threading.Lock()


def get_db_engine(sqlite_path: Optional[str] = None, force_new: bool = False) -> DatabaseEngine:
    """Get or initialize the global relational database engine and apply pending migrations."""
    global _default_engine
    if force_new or sqlite_path:
        engine = DatabaseEngine(sqlite_path=sqlite_path)
        from app.db.migrator import MigrationRunner
        MigrationRunner(engine).migrate_up()
        if not sqlite_path:
            _default_engine = engine
        return engine

    with _engine_lock:
        if _default_engine is None:
            _default_engine = DatabaseEngine()
            from app.db.migrator import MigrationRunner
            MigrationRunner(_default_engine).migrate_up()
        return _default_engine
