"""
Regression Test Suite for Serverless ASGI Routing & Free-Tier Constraints.
Validates:
1. `api.index` ASGI entrypoint imports cleanly and exposes FastAPI `app` and `handler`.
2. `/api/v1/health` responds with HTTP 200 and operational health telemetry.
3. `/api/v1/session/new` issues isolated capability token and session ID.
4. Payload size ceiling: `/api/v1/upload` strictly rejects files > 4.0 MB with HTTP 400.
5. Payload size acceptance: `/api/v1/upload` accepts valid documents <= 4.0 MB.
6. Session capability verification through the ASGI routing boundary.
"""

import os
import io
import unittest
from fastapi.testclient import TestClient

# Ensure disposable local SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:////tmp/disposable_test.sqlite3"
os.environ["NEON_DATABASE_URL"] = ""
os.environ["UPLOAD_MAX_SIZE_MB"] = "4"

# Import serverless ASGI entrypoint
import api.index as serverless_entry


class TestServerlessRoutingAndLimits(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(serverless_entry.app)

    def test_01_asgi_entrypoint_structure(self):
        """Verify api.index exports standard ASGI app and handler."""
        self.assertIsNotNone(serverless_entry.app, "api.index must expose 'app'")
        self.assertIsNotNone(serverless_entry.handler, "api.index must expose 'handler' for Vercel/Lambda")
        self.assertEqual(serverless_entry.app, serverless_entry.handler)
        self.assertTrue(serverless_entry.app.title.startswith("Parul University"))

    def test_02_health_endpoint(self):
        """Verify /api/v1/health responds with 200 OK through the router."""
        resp = self.client.get("/api/v1/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "healthy")

    def test_03_session_creation(self):
        """Verify /api/v1/session/new issues a session ID and capability token."""
        resp = self.client.post("/api/v1/session/new")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIsNotNone(data.get("session_id"))
        self.assertIsNotNone(data.get("session_capability"))
        self.assertTrue(len(data["session_capability"]) >= 32)

    def test_04_oversized_file_rejected(self):
        """Verify files exceeding 4MB are rejected with HTTP 400."""
        # Create a session
        sess_resp = self.client.post("/api/v1/session/new")
        session_id = sess_resp.json()["session_id"]
        capability = sess_resp.json()["session_capability"]

        # 4.5 MB payload (> 4 MB limit)
        oversized_data = b"X" * (int(4.5 * 1024 * 1024))
        files = {
            "file": ("large_syllabus.pdf", io.BytesIO(oversized_data), "application/pdf")
        }
        headers = {
            "X-Session-ID": session_id,
            "X-Session-Capability": capability,
        }
        resp = self.client.post("/api/v1/upload", files=files, headers=headers)
        self.assertEqual(resp.status_code, 400, "Files > 4MB must be rejected with HTTP 400")
        self.assertIn("Maximum 4MB allowed", resp.json()["detail"])

    def test_05_valid_sized_document_accepted(self):
        """Verify valid digital text documents <= 4MB are accepted and processed."""
        sess_resp = self.client.post("/api/v1/session/new")
        session_id = sess_resp.json()["session_id"]
        capability = sess_resp.json()["session_capability"]

        valid_content = b"Unit 1: Data Structures\nStack, Queue, and Linked List concepts for exam."
        files = {
            "file": ("syllabus_chapter1.txt", io.BytesIO(valid_content), "text/plain")
        }
        headers = {
            "X-Session-ID": session_id,
            "X-Session-Capability": capability,
        }
        resp = self.client.post("/api/v1/upload", files=files, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("filename"), "syllabus_chapter1.txt")
        self.assertIsNotNone(data.get("document_id"))

    def test_06_unauthenticated_session_access_blocked(self):
        """Verify session data cannot be fetched without the capability token."""
        sess_resp = self.client.post("/api/v1/session/new")
        session_id = sess_resp.json()["session_id"]

        # Request without capability header
        resp = self.client.get(f"/api/v1/session/{session_id}")
        self.assertEqual(resp.status_code, 401, "Missing capability must yield HTTP 401")

        # Request with forged/wrong capability header
        headers = {"X-Session-Capability": "wrong-secret-token-1234567890"}
        resp2 = self.client.get(f"/api/v1/session/{session_id}", headers=headers)
        self.assertEqual(resp2.status_code, 403, "Forged capability must yield HTTP 403")

    def test_07_root_manifest_and_version_pinning(self):
        """Verify root-level requirements.txt and .python-version exist for Vercel discovery."""
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        req_path = os.path.join(root_dir, "requirements.txt")
        py_ver_path = os.path.join(root_dir, ".python-version")

        self.assertTrue(os.path.isfile(req_path), "Root requirements.txt must exist for Vercel Python runtime discovery")
        with open(req_path, "r", encoding="utf-8") as f:
            req_content = f.read()
            self.assertIn("fastapi", req_content)
            self.assertIn("uvicorn", req_content)

        self.assertTrue(os.path.isfile(py_ver_path), "Root .python-version must exist for Vercel version pinning")
        with open(py_ver_path, "r", encoding="utf-8") as f:
            py_ver = f.read().strip()
            self.assertIn(py_ver, ("3.11", "3.12", "3.13"), "Must pin a supported Python version")

    def test_08_processing_timeout_sets_truthful_incomplete_state(self):
        """Verify processing timeout produces truthful incomplete state without fake confidence."""
        from app.services.ai_service import AIService
        ai_srv = AIService()

        # Simulate a 0.0001s deadline on large text to force a timeout
        text = "Chapter 1: Capital Budgeting.\n" * 100
        result = ai_srv.generate_mega_questions(text, num_questions=50, timeout_seconds=0.0001)

        self.assertTrue(result.get("timed_out"), "Should flag timed_out=True when deadline exceeded")
        self.assertTrue(result.get("incomplete"), "Should flag incomplete=True when deadline exceeded")


if __name__ == "__main__":
    unittest.main()
