"""
Session Manager Service
Handles anonymous student sessions with server-issued cryptographic capabilities
and relational persistence (Neon PostgreSQL in production, SQLite3 in local dev/test).

SECURITY & TRUST BOUNDARY:
- Students use the application anonymously without creating an OAuth/password account.
- Client-supplied headers like `X-User-ID` are NEVER trusted for authentication or session ownership.
- When a session is created (`POST /api/v1/session/new`), the server generates a 256-bit random capability
  token (`secrets.token_urlsafe(32)`).
- Only the SHA-256 hash (`capability_hash`) is persisted in the database (`study_sessions`). The raw
  capability is returned once at creation (or rotation) and is never stored server-side.
- Every read, write, upload, processing, result, capability rotation, and delete operation requires
  the matching capability token (`X-Session-Capability`), verified in constant time via `hmac.compare_digest`.
"""

import os
import re
import hmac
import json
import uuid
import secrets
import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict, field

from app.db.database import DatabaseEngine, get_db_engine, is_production_runtime
from app.db.migrator import MigrationRunner

logger = logging.getLogger(__name__)

# Valid session IDs must be alphanumeric with dashes or underscores, between 8 and 64 characters
SESSION_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{8,64}$")


class MissingCapabilityError(PermissionError):
    """Raised when a request attempts to access a session without providing X-Session-Capability (HTTP 401)."""


class InvalidCapabilityError(PermissionError):
    """Raised when a provided X-Session-Capability does not match the session's stored hash (HTTP 403)."""


def hash_capability(raw_capability: str) -> str:
    """Compute the SHA-256 hex digest of a raw capability token."""
    return hashlib.sha256(raw_capability.strip().encode("utf-8")).hexdigest()


def generate_capability_token() -> str:
    """Generate a high-entropy 256-bit URL-safe capability token."""
    return secrets.token_urlsafe(32)


@dataclass
class SessionData:
    """Represents all data associated with a single isolated study session."""
    session_id: str
    created_at: str
    updated_at: str
    user_id: Optional[str] = None
    capability_version: int = 1
    session_capability: Optional[str] = None  # Populated ONLY on creation/rotation; never stored in DB
    documents: List[Dict[str, Any]] = field(default_factory=list)
    questions: List[Dict[str, Any]] = field(default_factory=list)
    ranked_questions: List[Dict[str, Any]] = field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None
    predicted_paper: Optional[Dict[str, Any]] = None
    answers: List[Dict[str, Any]] = field(default_factory=list)
    captures: List[Dict[str, Any]] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=lambda: {
        "pdfCount": 0,
        "questionCount": 0,
        "confidence": None,
        "answerCount": 0
    })
    extracted_text: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    _capability_hash: str = field(default="", repr=False)

    def to_public_dict(self) -> Dict[str, Any]:
        """Serialize session state for API responses, excluding internal capability hashes."""
        data = asdict(self)
        data.pop("_capability_hash", None)
        data.pop("session_capability", None)
        return data


class SessionManager:
    """
    Manages isolated study sessions backed by relational database storage (Neon PostgreSQL / SQLite3)
    and server-issued cryptographic capability verification.
    """

    def __init__(self, storage_path: str = "./sessions", db_engine: Optional[DatabaseEngine] = None):
        if is_production_runtime() and db_engine is None and not (
            os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL")
        ):
            raise RuntimeError(
                "Production database configuration missing: NEON_DATABASE_URL or DATABASE_URL "
                "(postgresql://...) must be set in production. Silent fallback to in-memory "
                "or ephemeral filesystem persistence is disabled."
            )
        if os.getenv("VERCEL") and storage_path == "./sessions":
            storage_path = "/tmp/parul_sessions"
        self.storage_path = os.path.abspath(storage_path)
        self.sessions_dir = os.path.abspath(os.path.join(self.storage_path, "sessions"))
        os.makedirs(self.sessions_dir, exist_ok=True)

        if db_engine is not None:
            self.db = db_engine
            MigrationRunner(self.db).migrate_up()
        elif os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL") or storage_path == "./sessions":
            self.db = get_db_engine()
        else:
            sqlite_file = os.path.join(self.storage_path, "study_assistant.sqlite3")
            self.db = DatabaseEngine(sqlite_path=sqlite_file)
            MigrationRunner(self.db).migrate_up()

    def validate_session_id(self, session_id: str) -> bool:
        """Validate session ID format against safe pattern."""
        if not session_id or not isinstance(session_id, str):
            return False
        return bool(SESSION_ID_PATTERN.match(session_id.strip()))

    def _get_session_path(self, session_id: str) -> str:
        """
        Derive verified absolute filesystem path for session artifacts.
        Enforces format validation and resolved-path containment to prevent directory traversal attacks.
        """
        clean_id = (session_id or "").strip()
        if not self.validate_session_id(clean_id):
            raise ValueError(
                f"Invalid session ID format: '{session_id}'. Must be 8-64 alphanumeric characters, underscores, or hyphens."
            )

        base_dir = Path(self.sessions_dir).resolve()
        target_file = (base_dir / f"{clean_id}.json").resolve()

        try:
            target_file.relative_to(base_dir)
        except ValueError:
            raise ValueError(f"Path traversal detected: attempt to escape session directory with ID '{session_id}'")

        if target_file.parent != base_dir:
            raise ValueError(f"Path traversal detected: attempt to escape session directory with ID '{session_id}'")

        return str(target_file)

    def create_session(self, session_id: Optional[str] = None, user_id: Optional[str] = None) -> SessionData:
        """
        Create a new isolated session with a server-issued 256-bit capability token.
        Stores ONLY the SHA-256 hash of the capability in the relational database.
        """
        clean_id = (session_id or "").strip() if session_id else ""
        if clean_id:
            if not self.validate_session_id(clean_id):
                raise ValueError(f"Invalid session ID format: '{session_id}'.")
            existing = self.db.fetch_one(
                "SELECT session_id FROM study_sessions WHERE session_id = ?",
                (clean_id,),
            )
            if existing:
                raise InvalidCapabilityError(
                    f"Session '{clean_id}' already exists and cannot be overwritten without its capability."
                )
            sid = clean_id
        else:
            sid = str(uuid.uuid4())

        raw_capability = generate_capability_token()
        cap_hash = hash_capability(raw_capability)
        now = datetime.now(timezone.utc).isoformat()

        session = SessionData(
            session_id=sid,
            created_at=now,
            updated_at=now,
            user_id=user_id.strip() if user_id else None,
            capability_version=1,
            session_capability=raw_capability,
            _capability_hash=cap_hash,
        )

        self.db.execute(
            """
            INSERT INTO study_sessions (
                session_id, capability_hash, capability_version, user_id,
                created_at, updated_at, extracted_text, summary_json,
                predicted_paper_json, ranked_questions_json, answers_json,
                captures_json, stats_json, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session.session_id,
                cap_hash,
                1,
                session.user_id,
                session.created_at,
                session.updated_at,
                session.extracted_text,
                None,
                None,
                "[]",
                "[]",
                "[]",
                json.dumps(session.stats),
                json.dumps(session.metadata),
            ),
        )
        logger.info("Created isolated session %s (capability_version=1)", sid)
        return session

    def verify_capability(self, session_id: str, capability: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Verify a session's existence and constant-time match of its capability token.
        Returns the database row if valid, or None if the session does not exist.
        Raises:
          - ValueError on malformed session_id (HTTP 400)
          - MissingCapabilityError when capability is absent (HTTP 401)
          - InvalidCapabilityError when capability does not match (HTTP 403)
        """
        clean_id = (session_id or "").strip()
        if not self.validate_session_id(clean_id):
            raise ValueError(f"Invalid session ID format: '{session_id}'.")

        row = self.db.fetch_one(
            "SELECT * FROM study_sessions WHERE session_id = ?",
            (clean_id,),
        )
        if not row:
            return None

        if not capability or not isinstance(capability, str) or not capability.strip():
            logger.warning("Missing capability token for session '%s'", clean_id)
            raise MissingCapabilityError(
                f"Authentication required: missing X-Session-Capability token for session '{clean_id}'"
            )

        candidate_hash = hash_capability(capability)
        stored_hash = str(row.get("capability_hash") or "")
        if not stored_hash or not hmac.compare_digest(candidate_hash, stored_hash):
            logger.warning("Invalid capability token presented for session '%s'", clean_id)
            raise InvalidCapabilityError(
                f"Access denied: invalid or rotated session capability token for session '{clean_id}'"
            )

        return row

    def rotate_capability(self, session_id: str, current_capability: Optional[str]) -> Optional[SessionData]:
        """
        Rotate a session's capability token, immediately invalidating the previous capability.
        Returns the updated SessionData containing the new `session_capability`.
        """
        row = self.verify_capability(session_id, current_capability)
        if not row:
            return None

        new_raw_capability = generate_capability_token()
        new_hash = hash_capability(new_raw_capability)
        new_version = int(row.get("capability_version") or 1) + 1
        now = datetime.now(timezone.utc).isoformat()

        self.db.execute(
            """
            UPDATE study_sessions
            SET capability_hash = ?, capability_version = ?, updated_at = ?
            WHERE session_id = ?
            """,
            (new_hash, new_version, now, session_id.strip()),
        )

        session = self.get_session(session_id, capability=new_raw_capability)
        if session:
            session.session_capability = new_raw_capability
        return session

    def get_session(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[SessionData]:
        """
        Retrieve session by ID from relational storage after verifying its capability token.
        """
        row = self.verify_capability(session_id, capability)
        if not row:
            return None

        sid = row["session_id"]

        # Load relational documents for this session
        doc_rows = self.db.fetch_all(
            """
            SELECT document_id, session_id, filename, file_type, file_size, content_hash,
                   s3_bucket, s3_region, s3_object_key, storage_status, extracted_text,
                   pages_json, metadata_json, created_at
            FROM session_documents
            WHERE session_id = ?
            ORDER BY created_at ASC
            """,
            (sid,),
        )
        documents: List[Dict[str, Any]] = []
        for d in doc_rows:
            doc_meta = self._safe_json_loads(d.get("metadata_json"), {})
            doc_entry = {
                "document_id": d["document_id"],
                "session_id": d["session_id"],
                "filename": d["filename"],
                "file_type": d["file_type"],
                "file_size": d["file_size"],
                "content_hash": d["content_hash"],
                "s3_bucket": d.get("s3_bucket"),
                "s3_region": d.get("s3_region", "ap-south-1"),
                "s3_object_key": d.get("s3_object_key"),
                "storage_status": d.get("storage_status", "UPLOADED"),
                "created_at": d["created_at"],
                **doc_meta,
            }
            documents.append(doc_entry)

        # Load relational questions for this session
        q_rows = self.db.fetch_all(
            """
            SELECT question_json, document_id, job_id, content_hash, source_pages_json, source_snippet
            FROM session_questions
            WHERE session_id = ?
            ORDER BY question_index ASC
            """,
            (sid,),
        )
        questions: List[Dict[str, Any]] = []
        for qr in q_rows:
            q_obj = self._safe_json_loads(qr.get("question_json"), {})
            if isinstance(q_obj, dict) and q_obj:
                q_obj.setdefault("session_id", sid)
                if qr.get("document_id"):
                    q_obj.setdefault("source_document_id", qr["document_id"])
                if qr.get("content_hash"):
                    q_obj.setdefault("content_hash", qr["content_hash"])
                if qr.get("job_id"):
                    q_obj.setdefault("job_id", qr["job_id"])
                questions.append(q_obj)

        stats = self._safe_json_loads(row.get("stats_json"), {
            "pdfCount": len(documents),
            "questionCount": len(questions),
            "confidence": None,
            "answerCount": 0,
        })
        stats["pdfCount"] = len(documents)
        stats["questionCount"] = len(questions)

        return SessionData(
            session_id=sid,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            user_id=row.get("user_id"),
            capability_version=int(row.get("capability_version") or 1),
            session_capability=None,  # Raw capability is never stored or re-emitted on read
            documents=documents,
            questions=questions,
            ranked_questions=self._safe_json_loads(row.get("ranked_questions_json"), []),
            summary=self._safe_json_loads(row.get("summary_json"), None),
            predicted_paper=self._safe_json_loads(row.get("predicted_paper_json"), None),
            answers=self._safe_json_loads(row.get("answers_json"), []),
            captures=self._safe_json_loads(row.get("captures_json"), []),
            stats=stats,
            extracted_text=row.get("extracted_text") or "",
            metadata=self._safe_json_loads(row.get("metadata_json"), {}),
            _capability_hash=row["capability_hash"],
        )

    def get_or_create_session(
        self,
        session_id: Optional[str] = None,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        """
        If `session_id` is provided, strictly validates its existence and capability token
        (never auto-creating a session for an unverified or guessed session_id).
        If `session_id` is None, creates a new session with a fresh capability.
        """
        if session_id:
            session = self.get_session(session_id, capability=capability, user_id=user_id)
            if not session:
                raise KeyError(f"Session '{session_id}' not found")
            return session
        return self.create_session(user_id=user_id)

    def update_session(self, session: SessionData, capability: Optional[str] = None) -> None:
        """
        Persist updated session state and child documents/questions into the relational database.
        Verifies that the caller holds a valid capability (or that `session` was loaded via a verified capability).
        """
        if capability is not None:
            row = self.verify_capability(session.session_id, capability)
            if not row:
                raise KeyError(f"Session '{session.session_id}' not found")
        else:
            row = self.db.fetch_one(
                "SELECT capability_hash FROM study_sessions WHERE session_id = ?",
                (session.session_id,),
            )
            if not row:
                raise KeyError(f"Session '{session.session_id}' not found")
            if not session._capability_hash or not hmac.compare_digest(
                session._capability_hash, str(row.get("capability_hash") or "")
            ):
                raise InvalidCapabilityError(
                    f"Cannot update session '{session.session_id}' without verified capability"
                )

        now = datetime.now(timezone.utc).isoformat()
        session.updated_at = now
        session.stats["pdfCount"] = len(session.documents)
        session.stats["questionCount"] = len(session.questions)
        session.stats["answerCount"] = len(session.answers)

        self.db.execute(
            """
            UPDATE study_sessions
            SET updated_at = ?,
                user_id = ?,
                extracted_text = ?,
                summary_json = ?,
                predicted_paper_json = ?,
                ranked_questions_json = ?,
                answers_json = ?,
                captures_json = ?,
                stats_json = ?,
                metadata_json = ?
            WHERE session_id = ?
            """,
            (
                now,
                session.user_id,
                session.extracted_text or "",
                json.dumps(session.summary, default=str) if session.summary is not None else None,
                json.dumps(session.predicted_paper, default=str) if session.predicted_paper is not None else None,
                json.dumps(session.ranked_questions, default=str),
                json.dumps(session.answers, default=str),
                json.dumps(session.captures, default=str),
                json.dumps(session.stats, default=str),
                json.dumps(session.metadata, default=str),
                session.session_id,
            ),
        )

        # Synchronize relational session_documents
        self._sync_documents(session.session_id, session.documents, now)

        # Synchronize relational session_questions
        self._sync_questions(session.session_id, session.questions, now)

    def _sync_documents(self, session_id: str, documents: List[Dict[str, Any]], now: str) -> None:
        if not documents:
            self.db.execute("DELETE FROM session_documents WHERE session_id = ?", (session_id,))
            return

        active_doc_ids: List[str] = []
        for idx, doc in enumerate(documents):
            doc_id = str(doc.get("document_id") or doc.get("id") or f"{session_id}_doc_{idx + 1}")
            active_doc_ids.append(doc_id)
            filename = str(doc.get("filename") or "uploaded_document")
            file_type = str(doc.get("file_type") or os.path.splitext(filename)[1].lower() or ".txt")
            file_size = int(doc.get("file_size") or 0)
            extracted = str(doc.get("extracted_text") or "")
            content_hash = str(
                doc.get("content_hash")
                or hashlib.sha256((extracted or filename).encode("utf-8")).hexdigest()
            )
            doc["document_id"] = doc_id
            doc["session_id"] = session_id
            doc["content_hash"] = content_hash

            extra_meta = {
                k: v for k, v in doc.items()
                if k not in {
                    "document_id", "session_id", "filename", "file_type", "file_size",
                    "content_hash", "s3_bucket", "s3_region", "s3_object_key",
                    "storage_status", "extracted_text", "pages", "created_at"
                }
            }
            self.db.execute(
                """
                INSERT INTO session_documents (
                    document_id, session_id, filename, file_type, file_size, content_hash,
                    s3_bucket, s3_region, s3_object_key, storage_status, extracted_text,
                    pages_json, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(document_id) DO UPDATE SET
                    filename = excluded.filename,
                    file_type = excluded.file_type,
                    file_size = excluded.file_size,
                    content_hash = excluded.content_hash,
                    s3_bucket = excluded.s3_bucket,
                    s3_region = excluded.s3_region,
                    s3_object_key = excluded.s3_object_key,
                    storage_status = excluded.storage_status,
                    extracted_text = excluded.extracted_text,
                    pages_json = excluded.pages_json,
                    metadata_json = excluded.metadata_json
                """,
                (
                    doc_id,
                    session_id,
                    filename,
                    file_type,
                    file_size,
                    content_hash,
                    doc.get("s3_bucket"),
                    doc.get("s3_region", "ap-south-1"),
                    doc.get("s3_object_key"),
                    doc.get("storage_status", "PROCESSED"),
                    extracted,
                    json.dumps(doc.get("pages") or [], default=str),
                    json.dumps(extra_meta, default=str),
                    doc.get("created_at") or now,
                ),
            )

        placeholders = ", ".join("?" for _ in active_doc_ids)
        self.db.execute(
            f"DELETE FROM session_documents WHERE session_id = ? AND document_id NOT IN ({placeholders})",
            (session_id, *active_doc_ids),
        )


    def _sync_questions(self, session_id: str, questions: List[Dict[str, Any]], now: str) -> None:
        self.db.execute("DELETE FROM session_questions WHERE session_id = ?", (session_id,))
        for idx, q in enumerate(questions):
            q_dict = q if isinstance(q, dict) else (q.dict() if hasattr(q, "dict") else asdict(q))
            q_dict["session_id"] = session_id
            q_uid = f"{session_id}_q_{idx + 1}"
            doc_id = q_dict.get("source_document_id") or q_dict.get("document_id")
            job_id = q_dict.get("job_id")
            content_hash = q_dict.get("content_hash")
            source_pages = q_dict.get("source_pages") or []
            source_snippet = q_dict.get("source_evidence") or q_dict.get("explanation") or ""

            self.db.execute(
                """
                INSERT INTO session_questions (
                    question_uid, session_id, document_id, job_id, content_hash,
                    question_index, question_type, question_text, topic, marks,
                    confidence, source_pages_json, source_snippet, question_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    q_uid,
                    session_id,
                    doc_id,
                    job_id,
                    content_hash,
                    idx + 1,
                    str(q_dict.get("type") or "short_answer"),
                    str(q_dict.get("question") or ""),
                    str(q_dict.get("topic") or "General"),
                    int(q_dict.get("marks") or 2),
                    float(q_dict.get("confidence") or 0.0),
                    json.dumps(source_pages, default=str),
                    str(source_snippet)[:500],
                    json.dumps(q_dict, default=str),
                    now,
                ),
            )

    def delete_session(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> bool:
        """
        Delete a session and all of its relational records (documents, jobs, questions)
        after verifying the capability token.
        """
        row = self.verify_capability(session_id, capability)
        if not row:
            return False

        sid = row["session_id"]
        self.db.execute("DELETE FROM session_questions WHERE session_id = ?", (sid,))
        self.db.execute("DELETE FROM processing_jobs WHERE session_id = ?", (sid,))
        self.db.execute("DELETE FROM session_documents WHERE session_id = ?", (sid,))
        self.db.execute("DELETE FROM study_sessions WHERE session_id = ?", (sid,))

        # Clean up any legacy JSON file if present
        try:
            legacy_file = self._get_session_path(sid)
            if os.path.exists(legacy_file):
                os.remove(legacy_file)
        except Exception:
            pass

        logger.info("Deleted session %s and all relational records", sid)
        return True

    def clear_all_sessions(self) -> int:
        """Clear all sessions (for testing/admin only)."""
        rows = self.db.fetch_all("SELECT session_id FROM study_sessions")
        count = len(rows)
        self.db.execute("DELETE FROM session_questions")
        self.db.execute("DELETE FROM processing_jobs")
        self.db.execute("DELETE FROM session_documents")
        self.db.execute("DELETE FROM study_sessions")
        return count

    def list_sessions(
        self,
        session_id: Optional[str] = None,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Return summary for the caller's authenticated session only.
        Anonymous callers cannot enumerate other users' sessions.
        """
        if not session_id or not capability:
            return []
        try:
            session = self.get_session(session_id, capability=capability)
            if not session:
                return []
            return [{
                "session_id": session.session_id,
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "document_count": len(session.documents),
                "question_count": len(session.questions),
                "has_extracted_text": bool(session.extracted_text),
                "has_predicted_paper": session.predicted_paper is not None,
            }]
        except (ValueError, PermissionError):
            return []

    # ─── Relational Job & Document Tracking Helpers ───────────────────────

    def register_document_record(
        self,
        session_id: str,
        capability: str,
        filename: str,
        file_type: str,
        file_size: int,
        content_hash: str,
        document_id: Optional[str] = None,
        s3_bucket: Optional[str] = None,
        s3_region: str = "ap-south-1",
        s3_object_key: Optional[str] = None,
        storage_status: str = "UPLOADED",
        extracted_text: str = "",
        pages: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Register or update an isolated document record in `session_documents`."""
        row = self.verify_capability(session_id, capability)
        if not row:
            raise KeyError(f"Session '{session_id}' not found")

        doc_id = document_id or f"doc_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc).isoformat()
        meta = metadata or {}

        existing = self.db.fetch_one(
            "SELECT document_id FROM session_documents WHERE document_id = ? AND session_id = ?",
            (doc_id, session_id),
        )
        if existing:
            self.db.execute(
                """
                UPDATE session_documents
                SET filename = ?, file_type = ?, file_size = ?, content_hash = ?,
                    s3_bucket = ?, s3_region = ?, s3_object_key = ?, storage_status = ?,
                    extracted_text = ?, pages_json = ?, metadata_json = ?
                WHERE document_id = ? AND session_id = ?
                """,
                (
                    filename, file_type, file_size, content_hash,
                    s3_bucket, s3_region, s3_object_key, storage_status,
                    extracted_text, json.dumps(pages or [], default=str),
                    json.dumps(meta, default=str), doc_id, session_id,
                ),
            )
        else:
            self.db.execute(
                """
                INSERT INTO session_documents (
                    document_id, session_id, filename, file_type, file_size, content_hash,
                    s3_bucket, s3_region, s3_object_key, storage_status, extracted_text,
                    pages_json, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc_id, session_id, filename, file_type, file_size, content_hash,
                    s3_bucket, s3_region, s3_object_key, storage_status,
                    extracted_text, json.dumps(pages or [], default=str),
                    json.dumps(meta, default=str), now,
                ),
            )

        self.db.execute(
            "UPDATE study_sessions SET updated_at = ? WHERE session_id = ?",
            (now, session_id),
        )
        return {
            "document_id": doc_id,
            "session_id": session_id,
            "filename": filename,
            "file_type": file_type,
            "file_size": file_size,
            "content_hash": content_hash,
            "s3_bucket": s3_bucket,
            "s3_region": s3_region,
            "s3_object_key": s3_object_key,
            "storage_status": storage_status,
            "created_at": now,
        }

    def create_or_get_job(
        self,
        session_id: str,
        document_id: str,
        content_hash: str,
        qstash_message_id: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Idempotently create or retrieve a background processing job for `(session_id, document_id, content_hash)`.
        Returns `(job_dict, is_new)`.
        """
        idempotency_key = hashlib.sha256(
            f"{session_id}:{document_id}:{content_hash}".encode("utf-8")
        ).hexdigest()

        existing = self.db.fetch_one(
            "SELECT * FROM processing_jobs WHERE idempotency_key = ?",
            (idempotency_key,),
        )
        if existing:
            return self._format_job_row(existing), False

        job_id = f"job_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc).isoformat()
        self.db.execute(
            """
            INSERT INTO processing_jobs (
                job_id, session_id, document_id, idempotency_key, qstash_message_id,
                status, attempt_count, error_message, result_json, created_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, 'PENDING', 0, NULL, NULL, ?, ?, NULL)
            """,
            (job_id, session_id, document_id, idempotency_key, qstash_message_id, now, now),
        )
        row = self.db.fetch_one("SELECT * FROM processing_jobs WHERE job_id = ?", (job_id,))
        assert row is not None
        return self._format_job_row(row), True

    def update_job_state(
        self,
        job_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        increment_attempt: bool = False,
        qstash_message_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Transition job state (`PENDING` -> `PROCESSING` -> `COMPLETED` / `FAILED`)."""
        row = self.db.fetch_one("SELECT * FROM processing_jobs WHERE job_id = ?", (job_id,))
        if not row:
            return None

        now = datetime.now(timezone.utc).isoformat()
        attempt_count = int(row.get("attempt_count") or 0) + (1 if increment_attempt else 0)
        completed_at = now if status in ("COMPLETED", "FAILED") else row.get("completed_at")
        result_json = json.dumps(result, default=str) if result is not None else row.get("result_json")
        msg_id = qstash_message_id or row.get("qstash_message_id")

        self.db.execute(
            """
            UPDATE processing_jobs
            SET status = ?, attempt_count = ?, error_message = ?, result_json = ?,
                qstash_message_id = ?, updated_at = ?, completed_at = ?
            WHERE job_id = ?
            """,
            (status, attempt_count, error_message, result_json, msg_id, now, completed_at, job_id),
        )
        updated = self.db.fetch_one("SELECT * FROM processing_jobs WHERE job_id = ?", (job_id,))
        return self._format_job_row(updated) if updated else None

    def get_job(
        self,
        job_id: str,
        session_id: Optional[str] = None,
        capability: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a processing job, enforcing session ownership and capability verification when provided."""
        row = self.db.fetch_one("SELECT * FROM processing_jobs WHERE job_id = ?", (job_id,))
        if not row:
            return None
        if session_id is not None or capability is not None:
            target_sid = session_id or row["session_id"]
            if target_sid != row["session_id"]:
                raise InvalidCapabilityError("Job does not belong to the requested session")
            self.verify_capability(row["session_id"], capability)
        return self._format_job_row(row)

    def _format_job_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "job_id": row["job_id"],
            "session_id": row["session_id"],
            "document_id": row["document_id"],
            "idempotency_key": row["idempotency_key"],
            "qstash_message_id": row.get("qstash_message_id"),
            "status": row["status"],
            "attempt_count": int(row.get("attempt_count") or 0),
            "error_message": row.get("error_message"),
            "result": self._safe_json_loads(row.get("result_json"), None),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "completed_at": row.get("completed_at"),
        }

    @staticmethod
    def _safe_json_loads(raw: Optional[str], default: Any) -> Any:
        if not raw:
            return default
        try:
            return json.loads(raw)
        except Exception:
            return default

    # ─── Convenience Data Accessors (Capability-Enforced) ─────────────────

    def add_document(
        self,
        session_id: str,
        document: Dict[str, Any],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.documents.append(document)
        session.stats["pdfCount"] = len(session.documents)
        self.update_session(session, capability=capability)
        return session

    def set_documents(
        self,
        session_id: str,
        documents: List[Dict[str, Any]],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.documents = documents
        session.stats["pdfCount"] = len(documents)
        self.update_session(session, capability=capability)
        return session

    def set_extracted_text(
        self,
        session_id: str,
        text: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.extracted_text = text
        self.update_session(session, capability=capability)
        return session

    def get_extracted_text(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.extracted_text if session else ""

    def set_questions(
        self,
        session_id: str,
        questions: List[Dict[str, Any]],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.questions = questions
        session.stats["questionCount"] = len(questions)
        self.update_session(session, capability=capability)
        return session

    def get_questions(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.questions if session else []

    def set_ranked_questions(
        self,
        session_id: str,
        ranked: List[Dict[str, Any]],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.ranked_questions = ranked
        self.update_session(session, capability=capability)
        return session

    def get_ranked_questions(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.ranked_questions if session else []

    def set_summary(
        self,
        session_id: str,
        summary: Dict[str, Any],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.summary = summary
        self.update_session(session, capability=capability)
        return session

    def get_summary(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.summary if session else None

    def set_predicted_paper(
        self,
        session_id: str,
        paper: Dict[str, Any],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.predicted_paper = paper
        self.update_session(session, capability=capability)
        return session

    def get_predicted_paper(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.predicted_paper if session else None

    def set_answers(
        self,
        session_id: str,
        answers: List[Dict[str, Any]],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.answers = answers
        session.stats["answerCount"] = len(answers)
        self.update_session(session, capability=capability)
        return session

    def get_answers(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.answers if session else []

    def set_captures(
        self,
        session_id: str,
        captures: List[Dict[str, Any]],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.captures = captures
        self.update_session(session, capability=capability)
        return session

    def get_captures(
        self,
        session_id: str,
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        session = self.get_session(session_id, capability=capability, user_id=user_id)
        return session.captures if session else []

    def set_metadata(
        self,
        session_id: str,
        metadata: Dict[str, Any],
        capability: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> SessionData:
        session = self.get_or_create_session(session_id, capability=capability, user_id=user_id)
        session.metadata.update(metadata)
        self.update_session(session, capability=capability)
        return session


_session_manager: Optional[SessionManager] = None


def get_session_manager(storage_path: str = "./sessions") -> SessionManager:
    """Get or create the global relational SessionManager."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager(storage_path)
    return _session_manager


def get_session_id_from_request(request) -> Optional[str]:
    """Extract session ID from request headers or query params."""
    if not request:
        return None
    session_id = request.headers.get("X-Session-ID")
    if session_id:
        return session_id.strip()
    param_id = request.query_params.get("session_id")
    if param_id:
        return param_id.strip()
    return None


def get_capability_from_request(request) -> Optional[str]:
    """Extract server-issued session capability token from request headers or query params."""
    if not request:
        return None
    cap = request.headers.get("X-Session-Capability")
    if cap and cap.strip():
        return cap.strip()
    auth = request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token:
            return token
    param_cap = request.query_params.get("session_capability")
    if param_cap and param_cap.strip():
        return param_cap.strip()
    return None


def get_user_id_from_request(request) -> Optional[str]:
    """Extract optional client metadata tag (never used as authentication boundary)."""
    if not request:
        return None
    user_id = request.headers.get("X-User-ID")
    if user_id:
        return user_id.strip()
    param_user = request.query_params.get("user_id")
    if param_user:
        return param_user.strip()
    return None


def get_session_from_request(request, create_if_missing: bool = False) -> Optional[SessionData]:
    """
    Get capability-verified session from request.
    - If `session_id` is present on the request, strictly requires a matching `X-Session-Capability`.
    - If `session_id` is absent and `create_if_missing=True`, issues a new isolated session + capability.
    """
    session_id = get_session_id_from_request(request)
    capability = get_capability_from_request(request)
    user_id = get_user_id_from_request(request)
    manager = get_session_manager()

    if session_id:
        session = manager.get_session(session_id, capability=capability, user_id=user_id)
        if not session:
            raise KeyError(f"Session '{session_id}' not found")
        return session
    elif create_if_missing:
        return manager.create_session(user_id=user_id)
    return None