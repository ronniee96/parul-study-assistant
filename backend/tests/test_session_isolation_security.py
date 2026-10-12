import httpx
import unittest
import uuid

BASE_URL = "http://127.0.0.1:8000"

class SessionSecurityAndIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_two_independent_sessions_isolation(self):
        # 1. Create Session 1
        res1 = self.client.post("/api/v1/sessions")
        s1_id = res1.json()["session_id"]

        # 2. Create Session 2
        res2 = self.client.post("/api/v1/sessions")
        s2_id = res2.json()["session_id"]

        self.assertNotEqual(s1_id, s2_id)

        # 3. Fetch Session 2 data - must be clean and empty, no data from Session 1
        get2 = self.client.get(f"/api/v1/sessions/{s2_id}")
        self.assertEqual(get2.status_code, 200)
        s2_data = get2.json()["session"]
        self.assertEqual(len(s2_data["documents"]), 0)
        self.assertEqual(len(s2_data["questions"]), 0)
        self.assertFalse(s2_data["has_extracted_text"])

        # 4. Attempt to access non-existent / arbitrary session ID
        random_id = str(uuid.uuid4())
        res_fake = self.client.get(f"/api/v1/sessions/{random_id}")
        self.assertEqual(res_fake.status_code, 404)

        # 5. Delete Session 1
        del1 = self.client.delete(f"/api/v1/sessions/{s1_id}")
        self.assertEqual(del1.status_code, 200)

        # Session 1 is gone
        self.assertEqual(self.client.get(f"/api/v1/sessions/{s1_id}").status_code, 404)

        # Session 2 is intact
        self.assertEqual(self.client.get(f"/api/v1/sessions/{s2_id}").status_code, 200)

        # Clean up Session 2
        self.client.delete(f"/api/v1/sessions/{s2_id}")
        print("\n✓ Independent session isolation and deletion safety verified.")

    def test_oversized_upload_rejection(self):
        # File exceeding 10MB
        oversized_data = b"0" * (10 * 1024 * 1024 + 1024)
        res = self.client.post("/api/v1/upload", files={"file": ("too_big.pdf", oversized_data, "application/pdf")})
        self.assertEqual(res.status_code, 400)
        self.assertIn("large", res.json()["detail"].lower())
        print("✓ Oversized file (>10MB) rejected with HTTP 400.")

    def test_unsupported_file_format_rejection(self):
        # Disallowed file type
        res = self.client.post("/api/v1/upload", files={"file": ("malware.sh", b"#!/bin/bash\necho evil", "text/x-shellscript")})
        self.assertEqual(res.status_code, 400)
        self.assertIn("not supported", res.json()["detail"].lower())
        print("✓ Unsupported format (.sh) rejected with HTTP 400.")

    def test_secret_leakage_in_audit_trail(self):
        # Audit trail must not expose API keys in cleartext
        res = self.client.get("/api/v1/research/audit-trail")
        self.assertEqual(res.status_code, 200)
        raw_text = res.text
        self.assertNotIn("sk-", raw_text)
        self.assertNotIn("AIza", raw_text)
        print("✓ Audit trail verified free of leaked provider API key patterns.")

if __name__ == "__main__":
    unittest.main()
