"""
Regression Test Suite for Phase 1: Zero-Cost Isolated Architecture
Tests:
1. Cross-session contamination (Accounting vs Personal Development)
2. Concurrent multi-session execution
3. Document provenance (document_id, content_hash, session_id matching)
4. Cascade deletion and zero orphaned rows in Neon PostgreSQL
5. Fresh session emptiness
6. AI quota exhaustion and anti-fabrication assertions (no fake distractors, is_ai_generated: False)
7. Missing browser-local file handling (restoration without local binary file)
"""

import os
import unittest
import hashlib
import uuid
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient

from main import app
from app.services.session_manager import SessionManager, hash_capability
from app.services.ai_service import AIService
from app.services.exam_predictor import ExamPredictor


class TestZeroCostIsolationRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.session_manager = SessionManager()
        cls.db = cls.session_manager.db
        cls.created_session_ids = []

    @classmethod
    def tearDownClass(cls):
        # Clean up any test sessions created during regression testing
        for sid in cls.created_session_ids:
            try:
                cls.db.execute("DELETE FROM study_sessions WHERE session_id = ?", (sid,))
            except Exception:
                pass

    def _create_isolated_session(self):
        resp = self.client.post("/api/v1/session/new")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        session_id = data["session_id"]
        capability = data["session_capability"]
        self.created_session_ids.append(session_id)
        return session_id, capability

    def test_01_cross_session_contamination(self):
        """Verify Session A and Session B cannot read, overwrite, or contaminate each other's data."""
        sid_a, cap_a = self._create_isolated_session()
        sid_b, cap_b = self._create_isolated_session()

        # Session A: Accounting material
        text_a = (
            "Unit 1: Financial Accounting and Depreciation.\n"
            "Straight line depreciation is defined as the allocation of asset cost evenly over useful life.\n"
            "Double declining balance method accelerates asset write-offs in initial fiscal quarters.\n"
            "Asset salvage value represents the estimated terminal recovery price upon retirement.\n"
            "Accumulated depreciation appears as a contra-asset account on the balance sheet."
        )
        resp_a = self.client.post(
            "/api/v1/process",
            headers={"X-Session-Capability": cap_a, "X-Session-ID": sid_a},
            files={"file": ("accounting_notes.txt", text_a.encode("utf-8"), "text/plain")},
            data={"generate_summary": "false", "generate_questions": "true", "num_questions": "5"}
        )
        self.assertEqual(resp_a.status_code, 200)

        # Session B: Personal Development material
        text_b = (
            "Unit 1: Leadership and Personal Productivity.\n"
            "Time management refers to organizing and planning how to divide time between specific activities.\n"
            "Active listening is the practice of preparing to listen and observing verbal and non-verbal messages.\n"
            "Emotional intelligence means understanding and managing emotions to communicate effectively.\n"
            "Goal setting involves formulating specific measurable attainable relevant and time-bound targets."
        )
        resp_b = self.client.post(
            "/api/v1/process",
            headers={"X-Session-Capability": cap_b, "X-Session-ID": sid_b},
            files={"file": ("personal_dev_notes.txt", text_b.encode("utf-8"), "text/plain")},
            data={"generate_summary": "false", "generate_questions": "true", "num_questions": "5"}
        )
        self.assertEqual(resp_b.status_code, 200)

        # 1. Verify Session A cannot access Session B with Session A's capability
        bad_access = self.client.get(
            f"/api/v1/session/{sid_b}",
            headers={"X-Session-Capability": cap_a}
        )
        self.assertEqual(bad_access.status_code, 403)

        # 2. Verify Session B cannot access Session A with Session B's capability
        bad_access_b = self.client.get(
            f"/api/v1/session/{sid_a}",
            headers={"X-Session-Capability": cap_b}
        )
        self.assertEqual(bad_access_b.status_code, 403)

        # 3. Read Session A and verify zero Personal Development words
        get_a = self.client.get(
            f"/api/v1/session/{sid_a}",
            headers={"X-Session-Capability": cap_a}
        )
        self.assertEqual(get_a.status_code, 200)
        data_a = get_a.json()
        doc_names_a = [d["filename"] for d in data_a.get("documents", [])]
        self.assertIn("accounting_notes.txt", doc_names_a)
        self.assertNotIn("personal_dev_notes.txt", doc_names_a)
        self.assertNotIn("Leadership", data_a.get("extracted_text", ""))

        # 4. Read Session B and verify zero Accounting words
        get_b = self.client.get(
            f"/api/v1/session/{sid_b}",
            headers={"X-Session-Capability": cap_b}
        )
        self.assertEqual(get_b.status_code, 200)
        data_b = get_b.json()
        doc_names_b = [d["filename"] for d in data_b.get("documents", [])]
        self.assertIn("personal_dev_notes.txt", doc_names_b)
        self.assertNotIn("accounting_notes.txt", doc_names_b)
        self.assertNotIn("Depreciation", data_b.get("extracted_text", ""))

    def test_02_concurrent_sessions(self):
        """Concurrently create and process multiple sessions to ensure no race conditions."""
        subjects = [
            ("Distributed Systems", "Consensus algorithms ensure fault tolerant state replication across distributed network nodes."),
            ("Operating Systems", "Virtual memory manages address translation between physical RAM pages and disk paging partitions."),
            ("Database Engineering", "ACID guarantees atomicity consistency isolation and durability across concurrent database transactions.")
        ]

        def _worker(subject_info):
            name, content = subject_info
            sid, cap = self._create_isolated_session()
            resp = self.client.post(
                "/api/v1/process",
                headers={"X-Session-Capability": cap, "X-Session-ID": sid},
                files={"file": (f"{name.lower().replace(' ', '_')}.txt", content.encode("utf-8"), "text/plain")},
                data={"generate_summary": "false", "generate_questions": "false"}
            )
            self.assertEqual(resp.status_code, 200)

            # Re-read
            get_resp = self.client.get(
                f"/api/v1/session/{sid}",
                headers={"X-Session-Capability": cap}
            )
            self.assertEqual(get_resp.status_code, 200)
            data = get_resp.json()
            return sid, data

        with ThreadPoolExecutor(max_workers=3) as executor:
            results = list(executor.map(_worker, subjects))

        self.assertEqual(len(results), 3)
        session_ids = [r[0] for r in results]
        self.assertEqual(len(set(session_ids)), 3, "All session IDs must be unique")

    def test_03_document_provenance(self):
        """Verify strict document provenance (document_id, content_hash, session_id) in Neon."""
        sid, cap = self._create_isolated_session()
        raw_text = (
            "Unit 2: Computer Network Topologies.\n"
            "Star topology is defined as a network architecture where all endpoints connect to a central hub.\n"
            "Mesh topology provides redundant point-to-point physical links between all participating nodes.\n"
            "Bus topology utilizes a single shared coaxial backbone line terminated at both ends.\n"
            "Ring topology circulates token frames unidirectionally through each connected interface."
        )
        content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        resp = self.client.post(
            "/api/v1/process",
            headers={"X-Session-Capability": cap, "X-Session-ID": sid},
            files={"file": ("network_topologies.txt", raw_text.encode("utf-8"), "text/plain")},
            data={"generate_summary": "true", "generate_questions": "true", "num_questions": "4"}
        )
        self.assertEqual(resp.status_code, 200)
        res_data = resp.json()

        doc_id = res_data["document_id"]
        self.assertEqual(res_data["content_hash"], content_hash)

        # Verify database record
        doc_row = self.db.fetch_one(
            "SELECT * FROM session_documents WHERE document_id = ? AND session_id = ?",
            (doc_id, sid)
        )
        self.assertIsNotNone(doc_row)
        self.assertEqual(doc_row["content_hash"], content_hash)
        self.assertEqual(doc_row["filename"], "network_topologies.txt")
        self.assertIn("Star topology", doc_row["extracted_text"])

        # Verify question provenance
        q_rows = self.db.fetch_all(
            "SELECT * FROM session_questions WHERE session_id = ? AND document_id = ?",
            (sid, doc_id)
        )
        self.assertGreater(len(q_rows), 0)
        for qr in q_rows:
            self.assertEqual(qr["content_hash"], content_hash)
            self.assertEqual(qr["session_id"], sid)

    def test_04_cascade_deletion_zero_orphans(self):
        """Verify complete cascade deletion leaves zero orphaned rows in Neon relational tables."""
        sid, cap = self._create_isolated_session()
        raw_text = (
            "Unit 3: Microservices Architecture.\n"
            "API Gateway is defined as a unified reverse proxy directing client requests to microservices.\n"
            "Service discovery allows microservice instances to register dynamically with health checking.\n"
            "Circuit breaker pattern prevents cascading failures across distributed microservice boundaries."
        )
        resp = self.client.post(
            "/api/v1/process",
            headers={"X-Session-Capability": cap, "X-Session-ID": sid},
            files={"file": ("microservices.txt", raw_text.encode("utf-8"), "text/plain")},
            data={"generate_summary": "true", "generate_questions": "true", "num_questions": "3"}
        )
        self.assertEqual(resp.status_code, 200)

        # Confirm rows exist in database
        doc_count = int(self.db.fetch_one("SELECT count(*) as c FROM session_documents WHERE session_id = ?", (sid,))["c"])
        self.assertGreater(doc_count, 0)

        q_count = int(self.db.fetch_one("SELECT count(*) as c FROM session_questions WHERE session_id = ?", (sid,))["c"])
        self.assertGreater(q_count, 0)

        # Perform deletion
        del_resp = self.client.delete(
            f"/api/v1/session/{sid}",
            headers={"X-Session-Capability": cap}
        )
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json()["success"])

        # Verify zero orphans in Neon
        sess_rows = self.db.fetch_all("SELECT session_id FROM study_sessions WHERE session_id = ?", (sid,))
        self.assertEqual(len(sess_rows), 0)

        doc_rows = self.db.fetch_all("SELECT document_id FROM session_documents WHERE session_id = ?", (sid,))
        self.assertEqual(len(doc_rows), 0)

        q_rows = self.db.fetch_all("SELECT question_uid FROM session_questions WHERE session_id = ?", (sid,))
        self.assertEqual(len(q_rows), 0)

        job_rows = self.db.fetch_all("SELECT job_id FROM processing_jobs WHERE session_id = ?", (sid,))
        self.assertEqual(len(job_rows), 0)

    def test_05_fresh_session_emptiness(self):
        """Verify newly created session has empty state and initial capability version."""
        sid, cap = self._create_isolated_session()
        get_resp = self.client.get(
            f"/api/v1/session/{sid}",
            headers={"X-Session-Capability": cap}
        )
        self.assertEqual(get_resp.status_code, 200)
        body = get_resp.json()
        self.assertEqual(body["documents"], [])
        self.assertEqual(body["questions"], [])
        self.assertEqual(body["extracted_text"], "")
        self.assertIsNone(body["summary"])
        self.assertIsNone(body["predicted_paper"])
        self.assertEqual(body["stats"]["pdfCount"], 0)
        self.assertEqual(body["stats"]["questionCount"], 0)
        self.assertIsNone(body["stats"]["confidence"], "Fresh session confidence must be None (unavailable)")

    def test_06_ai_quota_exhaustion_and_anti_fabrication(self):
        """Verify deterministic failover marks is_ai_generated: False, confidence: None, and contains zero fabricated distractors."""
        ai_service = AIService()
        text = (
            "Unit 4: Compiler Design and Lexical Analysis.\n"
            "Lexical analyzer is defined as the compiler phase that converts characters into a token sequence.\n"
            "Syntax analyzer parses tokens into a hierarchical parse tree verifying grammar rules.\n"
            "Intermediate code generator produces machine-independent target code such as three-address code.\n"
            "Symbol table is a data structure used by a compiler to store identifier attributes and scopes."
        )

        # Force failover by passing invalid/unauthenticated cloud keys
        result = ai_service.generate_questions_with_failover(
            text=text,
            num_questions=6,
            question_types=["multiple_choice", "short_answer"],
            api_keys={"gemini": "invalid_key", "openai": "sk-invalid", "anthropic": "sk-ant-invalid"},
            preferred_order=["gemini", "openai", "anthropic"]
        )

        self.assertTrue(result["success"])
        self.assertFalse(result.get("is_ai_generated", True), "Must declare is_ai_generated: False on quota failover")
        self.assertEqual(result.get("generation_method"), "deterministic_syllabus_extraction")
        self.assertEqual(result.get("engine_used"), "Deterministic Syllabus Extractor (Grounded)")

        questions = result["questions"]
        self.assertGreater(len(questions), 0)

        fabricated_phrases = [
            "Deals exclusively with unmanaged legacy logs and ignores standardized controls.",
            "Operates as a purely hypothetical construct with zero empirical validity in industry.",
            "Discards all baseline parameter boundaries and computes arbitrary allocations."
        ]

        for q in questions:
            self.assertFalse(q.get("is_ai_generated", True))
            self.assertEqual(q.get("generation_method"), "deterministic_syllabus_extraction")
            self.assertIsNone(q.get("confidence"), "Deterministic confidence must be None (unavailable)")

            # Anti-fabrication check: absolutely zero boilerplate distractors allowed
            q_str = str(q)
            for phrase in fabricated_phrases:
                self.assertNotIn(phrase, q_str, f"Found prohibited fabricated distractor in question {q.get('id')}")

            if q.get("options"):
                for opt in q["options"]:
                    for phrase in fabricated_phrases:
                        self.assertNotIn(phrase, opt)

    def test_07_missing_browser_local_file_handling(self):
        """Verify restored session displays extracted text, questions, and metadata even when local binary file is absent."""
        sid, cap = self._create_isolated_session()
        raw_text = (
            "Unit 5: Object Oriented Design Patterns.\n"
            "Singleton pattern ensures a class has only one instance and provides global access to it.\n"
            "Factory method pattern defines an interface for creating objects allowing subclasses to alter type.\n"
            "Observer pattern defines a one-to-many dependency where object changes notify dependents."
        )

        # Upload and process
        resp = self.client.post(
            "/api/v1/process",
            headers={"X-Session-Capability": cap, "X-Session-ID": sid},
            files={"file": ("design_patterns.txt", raw_text.encode("utf-8"), "text/plain")},
            data={"generate_summary": "true", "generate_questions": "true", "num_questions": "3"}
        )
        self.assertEqual(resp.status_code, 200)

        # Re-fetch session from a clean request with only capability header (no local binary file present)
        clean_resp = self.client.get(
            f"/api/v1/session/{sid}",
            headers={"X-Session-Capability": cap}
        )
        self.assertEqual(clean_resp.status_code, 200)
        sess_data = clean_resp.json()

        # Assert full server-persisted state is available without needing local binary file
        self.assertEqual(len(sess_data["documents"]), 1)
        doc = sess_data["documents"][0]
        self.assertEqual(doc["filename"], "design_patterns.txt")
        self.assertEqual(doc["storage_status"], "PROCESSED")
        self.assertIn("Singleton pattern", sess_data["extracted_text"])
        self.assertGreater(len(sess_data["questions"]), 0)


if __name__ == "__main__":
    unittest.main()
