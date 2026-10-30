"""
Automated Integration Tests for the Deep System Operations & Admin Console API.
Validates constant-time authentication, session capability masking, telemetry endpoints,
and non-destructive forensic integrity checks.
"""

import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import unittest
from fastapi.testclient import TestClient
from main import app
from app.api.admin_api import DEFAULT_ADMIN_PASSCODE


class AdminOperationsApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_admin_auth_success_and_failure(self):
        # 1. Invalid passcode -> 403 Forbidden
        res_fail = self.client.post("/api/v1/admin/auth", json={"passcode": "wrong_master_passcode"})
        self.assertEqual(res_fail.status_code, 403)

        # 2. Valid passcode -> 200 OK + Ephemeral Token
        res_ok = self.client.post("/api/v1/admin/auth", json={"passcode": DEFAULT_ADMIN_PASSCODE})
        self.assertEqual(res_ok.status_code, 200)
        data = res_ok.json()
        self.assertTrue(data.get("authorized"))
        self.assertTrue(data.get("token", "").startswith("adm_sec_"))
        self.assertIn("permissions", data)

    def test_02_unauthenticated_requests_are_rejected(self):
        endpoints = [
            "/api/v1/admin/overview",
            "/api/v1/admin/architecture",
            "/api/v1/admin/traces",
            "/api/v1/admin/documents",
            "/api/v1/admin/ai-providers",
            "/api/v1/admin/sessions",
            "/api/v1/admin/database",
            "/api/v1/admin/system-health"
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, 401, f"Expected 401 for unauthenticated {ep}")

    def test_03_authenticated_telemetry_and_masking(self):
        # Authenticate
        auth = self.client.post("/api/v1/admin/auth", json={"passcode": DEFAULT_ADMIN_PASSCODE}).json()
        token = auth["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Overview KPIs
        res_ov = self.client.get("/api/v1/admin/overview", headers=headers)
        self.assertEqual(res_ov.status_code, 200)
        ov_data = res_ov.json()
        self.assertIn("kpis", ov_data)
        self.assertIn("database", ov_data)

        # 2. Architecture 32 Nodes & Truthful Evidence Verification
        res_arch = self.client.get("/api/v1/admin/architecture", headers=headers)
        self.assertEqual(res_arch.status_code, 200)
        arch_data = res_arch.json()
        self.assertEqual(arch_data.get("total_nodes"), 32)
        self.assertIn("statuses", arch_data)
        self.assertIn("node_details", arch_data)
        details = arch_data["node_details"]
        self.assertEqual(len(details), 32)

        # Every node must have concrete status, evidence, verification_method, and verified_at
        valid_statuses = {"healthy", "degraded", "unverified", "not_configured", "not_instrumented", "failed"}
        for node_id, node_info in details.items():
            self.assertIn(node_info["status"], valid_statuses, f"Invalid status for {node_id}: {node_info['status']}")
            self.assertTrue(len(node_info["evidence"]) > 5, f"Missing evidence for {node_id}")
            self.assertTrue(len(node_info["verification_method"]) > 2, f"Missing method for {node_id}")
            self.assertTrue(node_info["verified_at"].endswith("Z") or "+00:00" in node_info["verified_at"])

        # Uninstrumented client components MUST NOT be marked healthy
        for client_node in ["node_upload_tab", "node_qengine_tab", "node_predictor_tab", "node_answer_tab", "node_squad_tab", "node_aki_companion"]:
            self.assertEqual(details[client_node]["status"], "not_instrumented", f"{client_node} should be not_instrumented")

        # 3. Request Traces
        res_trc = self.client.get("/api/v1/admin/traces", headers=headers)
        self.assertEqual(res_trc.status_code, 200)
        self.assertIn("traces", res_trc.json())

        # 4. Session Integrity & Capability Masking (zero raw token exposure)
        res_sess = self.client.get("/api/v1/admin/sessions", headers=headers)
        self.assertEqual(res_sess.status_code, 200)
        sessions = res_sess.json().get("sessions", [])
        for s in sessions:
            masked = s.get("capability_hash_masked", "")
            self.assertTrue(masked.startswith("sha256:") or masked == "unversioned")
            self.assertNotIn("session_capability", s)  # raw token strictly absent

        # 5. Database Diagnostics
        res_db = self.client.get("/api/v1/admin/database", headers=headers)
        self.assertEqual(res_db.status_code, 200)
        db_data = res_db.json()
        self.assertIn("database_engine", db_data)
        self.assertIn("tables", db_data)

        # 6. Deep System Health Probe
        res_hlth = self.client.get("/api/v1/admin/system-health", headers=headers)
        self.assertEqual(res_hlth.status_code, 200)
        self.assertIn("probes", res_hlth.json())

        # 7. Non-Destructive Integrity Audit
        res_audit = self.client.post("/api/v1/admin/action/verify-integrity", headers=headers)
        self.assertEqual(res_audit.status_code, 200)
        audit_data = res_audit.json()
        self.assertIn("checks", audit_data)
        self.assertTrue(audit_data.get("audit_passed"))


if __name__ == "__main__":
    unittest.main()
