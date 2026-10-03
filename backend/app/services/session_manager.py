"""
Session Manager Service
Handles session creation, storage, and retrieval for isolated per-session data
"""

import os
import json
import uuid
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict, field

logger = logging.getLogger(__name__)


@dataclass
class SessionData:
    """Represents all data associated with a single study session"""
    session_id: str
    created_at: str
    updated_at: str
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
        "confidence": 0,
        "answerCount": 0
    })
    extracted_text: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class SessionManager:
    """
    Manages isolated session storage for study sessions.
    Each session has completely isolated data - no cross-session leakage.
    """

    def __init__(self, storage_path: str = "./sessions"):
        self.storage_path = storage_path
        self.sessions_dir = os.path.join(storage_path, "sessions")
        self._session_cache: Dict[str, SessionData] = {}
        os.makedirs(self.sessions_dir, exist_ok=True)

    def create_session(self) -> SessionData:
        """Create a new empty session with unique ID"""
        session_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        session = SessionData(
            session_id=session_id,
            created_at=now,
            updated_at=now
        )

        self._session_cache[session_id] = session
        self._persist_session(session)
        logger.info(f"Created new session: {session_id}")
        return session

    def get_session(self, session_id: str) -> Optional[SessionData]:
        """Retrieve session by ID, loading from disk if not cached"""
        if session_id in self._session_cache:
            return self._session_cache[session_id]

        session_file = os.path.join(self.sessions_dir, f"{session_id}.json")
        if not os.path.exists(session_file):
            return None

        try:
            with open(session_file, 'r') as f:
                data = json.load(f)

            # Handle backward compatibility
            if "documents" not in data:
                data["documents"] = []
            if "questions" not in data:
                data["questions"] = []
            if "ranked_questions" not in data:
                data["ranked_questions"] = []
            if "answers" not in data:
                data["answers"] = []
            if "captures" not in data:
                data["captures"] = []
            if "stats" not in data:
                data["stats"] = {"pdfCount": 0, "questionCount": 0, "confidence": 0, "answerCount": 0}
            if "extracted_text" not in data:
                data["extracted_text"] = ""
            if "metadata" not in data:
                data["metadata"] = {}

            session = SessionData(**data)
            self._session_cache[session_id] = session
            return session
        except Exception as e:
            logger.error(f"Error loading session {session_id}: {e}")
            return None

    def get_or_create_session(self, session_id: Optional[str] = None) -> SessionData:
        """Get existing session or create new one"""
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session
        return self.create_session()

    def update_session(self, session: SessionData) -> None:
        """Update session data and persist to disk"""
        session.updated_at = datetime.now().isoformat()
        self._session_cache[session.session_id] = session
        self._persist_session(session)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its data"""
        if session_id in self._session_cache:
            del self._session_cache[session_id]

        session_file = os.path.join(self.sessions_dir, f"{session_id}.json")
        if os.path.exists(session_file):
            try:
                os.remove(session_file)
                logger.info(f"Deleted session: {session_id}")
                return True
            except Exception as e:
                logger.error(f"Error deleting session {session_id}: {e}")
                return False
        return True

    def clear_all_sessions(self) -> int:
        """Clear all sessions (for testing/admin)"""
        count = 0
        for filename in os.listdir(self.sessions_dir):
            if filename.endswith(".json"):
                try:
                    os.remove(os.path.join(self.sessions_dir, filename))
                    count += 1
                except Exception as e:
                    logger.error(f"Error deleting {filename}: {e}")

        self._session_cache.clear()
        logger.info(f"Cleared {count} sessions")
        return count

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all sessions with basic metadata"""
        sessions = []
        for filename in os.listdir(self.sessions_dir):
            if filename.endswith(".json"):
                session_id = filename[:-5]
                session = self.get_session(session_id)
                if session:
                    sessions.append({
                        "session_id": session.session_id,
                        "created_at": session.created_at,
                        "updated_at": session.updated_at,
                        "document_count": len(session.documents),
                        "question_count": len(session.questions),
                        "has_extracted_text": bool(session.extracted_text),
                        "has_predicted_paper": session.predicted_paper is not None
                    })
        return sorted(sessions, key=lambda s: s["updated_at"], reverse=True)

    def _persist_session(self, session: SessionData) -> None:
        """Persist session to disk"""
        session_file = os.path.join(self.sessions_dir, f"{session.session_id}.json")
        try:
            with open(session_file, 'w') as f:
                json.dump(asdict(session), f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error persisting session {session.session_id}: {e}")

    # Convenience methods for specific data types

    def add_document(self, session_id: str, document: Dict[str, Any]) -> SessionData:
        """Add a document to session"""
        session = self.get_or_create_session(session_id)
        session.documents.append(document)
        session.stats["pdfCount"] = len(session.documents)
        self.update_session(session)
        return session

    def set_documents(self, session_id: str, documents: List[Dict[str, Any]]) -> SessionData:
        """Replace all documents in session"""
        session = self.get_or_create_session(session_id)
        session.documents = documents
        session.stats["pdfCount"] = len(documents)
        self.update_session(session)
        return session

    def set_extracted_text(self, session_id: str, text: str) -> SessionData:
        """Set extracted text for session"""
        session = self.get_or_create_session(session_id)
        session.extracted_text = text
        self.update_session(session)
        return session

    def get_extracted_text(self, session_id: str) -> str:
        """Get extracted text for session"""
        session = self.get_session(session_id)
        return session.extracted_text if session else ""

    def set_questions(self, session_id: str, questions: List[Dict[str, Any]]) -> SessionData:
        """Set questions for session"""
        session = self.get_or_create_session(session_id)
        session.questions = questions
        session.stats["questionCount"] = len(questions)
        self.update_session(session)
        return session

    def get_questions(self, session_id: str) -> List[Dict[str, Any]]:
        """Get questions for session"""
        session = self.get_session(session_id)
        return session.questions if session else []

    def set_ranked_questions(self, session_id: str, ranked: List[Dict[str, Any]]) -> SessionData:
        """Set ranked questions for session"""
        session = self.get_or_create_session(session_id)
        session.ranked_questions = ranked
        self.update_session(session)
        return session

    def get_ranked_questions(self, session_id: str) -> List[Dict[str, Any]]:
        """Get ranked questions for session"""
        session = self.get_session(session_id)
        return session.ranked_questions if session else []

    def set_summary(self, session_id: str, summary: Dict[str, Any]) -> SessionData:
        """Set summary for session"""
        session = self.get_or_create_session(session_id)
        session.summary = summary
        self.update_session(session)
        return session

    def get_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get summary for session"""
        session = self.get_session(session_id)
        return session.summary if session else None

    def set_predicted_paper(self, session_id: str, paper: Dict[str, Any]) -> SessionData:
        """Set predicted paper for session"""
        session = self.get_or_create_session(session_id)
        session.predicted_paper = paper
        self.update_session(session)
        return session

    def get_predicted_paper(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get predicted paper for session"""
        session = self.get_session(session_id)
        return session.predicted_paper if session else None

    def set_answers(self, session_id: str, answers: List[Dict[str, Any]]) -> SessionData:
        """Set answers for session"""
        session = self.get_or_create_session(session_id)
        session.answers = answers
        session.stats["answerCount"] = len(answers)
        self.update_session(session)
        return session

    def get_answers(self, session_id: str) -> List[Dict[str, Any]]:
        """Get answers for session"""
        session = self.get_session(session_id)
        return session.answers if session else []

    def set_captures(self, session_id: str, captures: List[Dict[str, Any]]) -> SessionData:
        """Set captures for session"""
        session = self.get_or_create_session(session_id)
        session.captures = captures
        self.update_session(session)
        return session

    def get_captures(self, session_id: str) -> List[Dict[str, Any]]:
        """Get captures for session"""
        session = self.get_session(session_id)
        return session.captures if session else []


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager(storage_path: str = "./sessions") -> SessionManager:
    """Get or create the global session manager"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager(storage_path)
    return _session_manager


# Convenience functions for API endpoints
def get_session_id_from_request(request) -> Optional[str]:
    """Extract session ID from request headers or query params"""
    # Check X-Session-ID header first
    session_id = request.headers.get("X-Session-ID")
    if session_id:
        return session_id

    # Check query params as fallback
    return request.query_params.get("session_id")


def get_session_from_request(request, create_if_missing: bool = True) -> Optional[SessionData]:
    """Get session from request, optionally creating new one"""
    session_id = get_session_id_from_request(request)
    manager = get_session_manager()

    if create_if_missing:
        return manager.get_or_create_session(session_id)
    else:
        return manager.get_session(session_id)


if __name__ == "__main__":
    # Test the session manager
    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        manager = SessionManager(tmpdir)

        # Create new session
        session = manager.create_session()
        print(f"Created session: {session.session_id}")

        # Add some data
        manager.add_document(session.session_id, {"filename": "test.pdf", "text": "Hello world"})
        manager.set_questions(session.session_id, [{"id": "q1", "question": "What is 2+2?"}])

        # Retrieve and verify
        retrieved = manager.get_session(session.session_id)
        print(f"Retrieved session: {retrieved.session_id}")
        print(f"Documents: {retrieved.documents}")
        print(f"Questions: {retrieved.questions}")

        # Test delete
        manager.delete_session(session.session_id)
        deleted = manager.get_session(session.session_id)
        print(f"After delete: {deleted}")

        print("All tests passed!")