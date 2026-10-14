import httpx
import unittest
import os
import json
import uuid

BASE_URL = "http://127.0.0.1:8000"

class DeepSessionIsolationAndSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            probe = httpx.get(f"{BASE_URL}/api/v1/health", timeout=1.0)
            if probe.status_code == 200:
                cls.client = httpx.Client(base_url=BASE_URL, timeout=15.0)
                return
        except Exception:
            pass
        from fastapi.testclient import TestClient
        from main import app
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_01_session_lifecycle_endpoints(self):
        """Scenario 1: Test POST /session/new, GET /session/{id}, DELETE /session/{id} and aliases with server-issued capabilities"""
        # Test POST /session/new
        res1 = self.client.post("/api/v1/session/new")
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertTrue(data1["success"])
        s1_id = data1["session_id"]
        s1_cap = data1["session_capability"]
        self.assertTrue(len(s1_id) >= 8)
        self.assertTrue(len(s1_cap) >= 32)

        # Test POST /sessions alias
        res2 = self.client.post("/api/v1/sessions")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertTrue(data2["success"])
        s2_id = data2["session_id"]
        s2_cap = data2["session_capability"]
        self.assertNotEqual(s1_id, s2_id)
        self.assertNotEqual(s1_cap, s2_cap)

        # Test GET /session/{id} with capability
        get1 = self.client.get(
            f"/api/v1/session/{s1_id}",
            headers={"X-Session-Capability": s1_cap},
        )
        self.assertEqual(get1.status_code, 200)
        gdata1 = get1.json()
        self.assertTrue(gdata1["success"])
        self.assertEqual(gdata1["session_id"], s1_id)
        self.assertIn("session", gdata1)
        self.assertEqual(gdata1["session"]["session_id"], s1_id)

        # Test GET /sessions/{id} alias
        get2 = self.client.get(
            f"/api/v1/sessions/{s2_id}",
            headers={"X-Session-Capability": s2_cap},
        )
        self.assertEqual(get2.status_code, 200)
        self.assertEqual(get2.json()["session_id"], s2_id)

        # Test DELETE /session/{id}
        del1 = self.client.delete(
            f"/api/v1/session/{s1_id}",
            headers={"X-Session-Capability": s1_cap},
        )
        self.assertEqual(del1.status_code, 200)
        self.assertTrue(del1.json()["success"])

        # Verify deletion returns 404
        self.assertEqual(
            self.client.get(
                f"/api/v1/session/{s1_id}",
                headers={"X-Session-Capability": s1_cap},
            ).status_code,
            404,
        )

        # Test DELETE /sessions/{id} alias
        del2 = self.client.delete(
            f"/api/v1/sessions/{s2_id}",
            headers={"X-Session-Capability": s2_cap},
        )
        self.assertEqual(del2.status_code, 200)
        self.assertEqual(
            self.client.get(
                f"/api/v1/sessions/{s2_id}",
                headers={"X-Session-Capability": s2_cap},
            ).status_code,
            404,
        )

    def test_02_session_id_format_validation(self):
        """Scenario 2: Strict session ID format validation (8-64 alphanumeric/dash/underscore)"""
        invalid_ids = [
            "short",
            "has space 12345",
            "bad@character#$",
            "a" * 65,  # Exceeds 64 chars
            "semi;colon1234"
        ]
        for bad_id in invalid_ids:
            res = self.client.get(f"/api/v1/session/{bad_id}")
            self.assertEqual(res.status_code, 400, f"Expected 400 for bad ID '{bad_id}', got {res.status_code}")
            self.assertIn("invalid", res.json()["detail"].lower())

    def test_03_path_traversal_containment(self):
        """Scenario 3: Reject path traversal payloads via headers and params with HTTP 400"""
        traversal_attempts = [
            "../../../etc/passwd",
            "..%2F..%2Fetc%2Fpasswd",
            "....//....//etc/passwd",
            "sess_../../secret",
            "/etc/shadow"
        ]
        for payload in traversal_attempts:
            # Test via X-Session-ID header on session-resolved endpoint
            res = self.client.post("/api/v1/summarize", json={}, headers={"X-Session-ID": payload})
            self.assertEqual(res.status_code, 400, f"Header traversal '{payload}' must return 400")

            # Test via session_id query param
            res_query = self.client.post(f"/api/v1/summarize?session_id={payload}", json={})
            self.assertEqual(res_query.status_code, 400, f"Query traversal '{payload}' must return 400")

    def test_04_tenant_ownership_enforcement(self):
        """Scenario 4: Enforce server-issued capability ownership with 401 (missing) and 403 (invalid/forged X-User-ID)"""
        # User Alice creates a session; server issues cryptographic capability
        res_create = self.client.post("/api/v1/session/new", headers={"X-User-ID": "usr_tenant_alice_12345"})
        self.assertEqual(res_create.status_code, 200)
        alice_session_id = res_create.json()["session_id"]
        alice_cap = res_create.json()["session_capability"]
        headers_alice = {
            "X-Session-ID": alice_session_id,
            "X-Session-Capability": alice_cap,
        }

        # Alice can access her session with her server-issued capability
        res_alice = self.client.get(f"/api/v1/session/{alice_session_id}", headers=headers_alice)
        self.assertEqual(res_alice.status_code, 200)

        # 1. Missing X-Session-Capability (even if attacker spoofs Alice's X-User-ID!) -> 401 Unauthorized
        res_no_cap = self.client.get(
            f"/api/v1/session/{alice_session_id}",
            headers={"X-User-ID": "usr_tenant_alice_12345"},
        )
        self.assertEqual(res_no_cap.status_code, 401)
        self.assertIn("capability", res_no_cap.json()["detail"].lower())

        # 2. Unauthenticated caller attempts mutation without capability -> 401 Unauthorized
        res_no_auth_mut = self.client.post(
            "/api/v1/summarize",
            json={"text": "Unauthenticated attempt to mutate Alice session"},
            headers={"X-Session-ID": alice_session_id, "X-User-ID": "usr_tenant_alice_12345"}
        )
        self.assertEqual(res_no_auth_mut.status_code, 401)

        # 3. Unauthenticated caller attempts deletion without capability -> 401 Unauthorized
        res_no_auth_del = self.client.delete(f"/api/v1/session/{alice_session_id}")
        self.assertEqual(res_no_auth_del.status_code, 401)

        # 4. User Bob creates his own session and tries to use Bob's capability on Alice's session -> 403 Forbidden
        res_bob_create = self.client.post("/api/v1/session/new")
        bob_cap = res_bob_create.json()["session_capability"]
        bob_session_id = res_bob_create.json()["session_id"]

        res_bob = self.client.get(
            f"/api/v1/session/{alice_session_id}",
            headers={"X-Session-Capability": bob_cap},
        )
        self.assertEqual(res_bob.status_code, 403)
        self.assertIn("capability", res_bob.json()["detail"].lower())

        # 5. User Bob attempts mutation on Alice's session with Bob's capability -> 403 Forbidden
        res_bob_mut = self.client.post(
            "/api/v1/summarize",
            json={"text": "Bob attempt to mutate Alice session"},
            headers={"X-Session-ID": alice_session_id, "X-Session-Capability": bob_cap}
        )
        self.assertEqual(res_bob_mut.status_code, 403)

        # 6. User Bob attempts to delete Alice's session with Bob's capability -> 403 Forbidden
        res_bob_del = self.client.delete(
            f"/api/v1/session/{alice_session_id}",
            headers={"X-Session-Capability": bob_cap},
        )
        self.assertEqual(res_bob_del.status_code, 403)

        # 7. Capability Rotation: Alice rotates her capability; old capability must fail (403)
        res_rot = self.client.post(
            f"/api/v1/session/{alice_session_id}/rotate-capability",
            headers={"X-Session-Capability": alice_cap},
        )
        self.assertEqual(res_rot.status_code, 200)
        new_alice_cap = res_rot.json()["session_capability"]
        self.assertNotEqual(alice_cap, new_alice_cap)

        self.assertEqual(
            self.client.get(
                f"/api/v1/session/{alice_session_id}",
                headers={"X-Session-Capability": alice_cap},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/session/{alice_session_id}",
                headers={"X-Session-Capability": new_alice_cap},
            ).status_code,
            200,
        )

        # Cleanup: Alice and Bob delete their sessions
        res_alice_del = self.client.delete(
            f"/api/v1/session/{alice_session_id}",
            headers={"X-Session-Capability": new_alice_cap},
        )
        self.assertEqual(res_alice_del.status_code, 200)
        self.client.delete(
            f"/api/v1/session/{bob_session_id}",
            headers={"X-Session-Capability": bob_cap},
        )

    def test_05_cross_subject_isolation_document_and_summary(self):
        """Scenario 5: Complete end-to-end cross-subject pipeline isolation (Accounting in A, Personal Dev in B, reset B)"""
        # Create Session A (Accounting)
        res_a = self.client.post("/api/v1/session/new")
        sess_a = res_a.json()["session_id"]
        cap_a = res_a.json()["session_capability"]
        headers_a = {"X-Session-ID": sess_a, "X-Session-Capability": cap_a}

        # Create Session B (Personal Development)
        res_b = self.client.post("/api/v1/session/new")
        sess_b = res_b.json()["session_id"]
        cap_b = res_b.json()["session_capability"]
        headers_b = {"X-Session-ID": sess_b, "X-Session-Capability": cap_b}

        # 1. Process Managerial Accounting in Session A
        ma_text = (
            "Unit 4: Standard Costing and Variance Analysis. "
            "Standard costing is a control technique that compares standard costs and revenues with actual results. "
            "Material cost variance equals standard cost of materials less actual cost of materials. "
            "Variance analysis investigates favorable and unfavorable variances."
        )
        res_proc_a = self.client.post(
            "/api/v1/process?generate_summary=true&generate_questions=true&num_questions=5",
            files={"file": ("managerial_accounting_unit4.txt", ma_text.encode('utf-8'), "text/plain")},
            headers=headers_a
        )
        self.assertEqual(res_proc_a.status_code, 200)

        # Generate Accounting Exam Prediction & Answers in Session A
        self.client.post(
            "/api/v1/predict-exam",
            json={"material_text": ma_text, "subject_name": "Managerial Accounting", "total_marks": 60},
            headers=headers_a
        )
        self.client.post(
            "/api/v1/generate-answers",
            json={"questions": [{"id": 1, "question": "Define standard costing and material variance.", "marks": 5}], "source_text": ma_text},
            headers=headers_a
        )

        # 2. Process Personal Development in Session B
        pd_text = (
            "Unit 1: Emotional Intelligence and Self-Awareness. "
            "Self-awareness refers to conscious knowledge of one's own character, feelings, motives, and desires. "
            "Daniel Goleman identified five components of emotional intelligence: self-awareness, self-regulation, "
            "internal motivation, empathy, and social skills."
        )
        res_proc_b = self.client.post(
            "/api/v1/process?generate_summary=true&generate_questions=true&num_questions=5",
            files={"file": ("personal_development_unit1.txt", pd_text.encode('utf-8'), "text/plain")},
            headers=headers_b
        )
        self.assertEqual(res_proc_b.status_code, 200)

        # Generate Personal Development Exam Prediction & Answers in Session B
        self.client.post(
            "/api/v1/predict-exam",
            json={"material_text": pd_text, "subject_name": "Personal Development", "total_marks": 60},
            headers=headers_b
        )
        self.client.post(
            "/api/v1/generate-answers",
            json={"questions": [{"id": 1, "question": "Define emotional intelligence and self-awareness.", "marks": 5}], "source_text": pd_text},
            headers=headers_b
        )

        # 3. Comprehensive Isolation Assertions: Session B must contain ZERO Accounting data
        state_b = self.client.get(f"/api/v1/session/{sess_b}", headers=headers_b).json()["session"]
        accounting_terms = ["standard costing", "variance", "material cost", "managerial accounting"]

        # Assert extracted text in B has no Accounting
        for term in accounting_terms:
            self.assertNotIn(term, state_b["extracted_text"].lower())
        self.assertIn("emotional intelligence", state_b["extracted_text"].lower())

        # Assert questions in B have no Accounting and carry provenance
        for q in state_b["questions"]:
            self.assertEqual(q.get("session_id"), sess_b)
            q_str = json.dumps(q).lower()
            for term in accounting_terms:
                self.assertNotIn(term, q_str)

        # Assert summary in B has no Accounting
        summary_str = json.dumps(state_b.get("summary") or {}).lower()
        for term in accounting_terms:
            self.assertNotIn(term, summary_str)

        # Assert answers in B have no Accounting
        for ans in state_b["answers"]:
            ans_str = json.dumps(ans).lower()
            for term in accounting_terms:
                self.assertNotIn(term, ans_str)

        # Assert predictions in B have no Accounting
        pred_b = state_b.get("predicted_paper") or {}
        self.assertEqual(pred_b.get("subject_name"), "Personal Development")
        pred_str = json.dumps(pred_b).lower()
        for term in accounting_terms:
            self.assertNotIn(term, pred_str)

        # 4. Workspace Reset: Reset Session B by generating a fresh session C
        res_c = self.client.post("/api/v1/session/new")
        self.assertEqual(res_c.status_code, 200)
        sess_c = res_c.json()["session_id"]
        cap_c = res_c.json()["session_capability"]
        headers_c = {"X-Session-ID": sess_c, "X-Session-Capability": cap_c}
        self.assertNotEqual(sess_c, sess_b)

        # Verify Session C is completely empty
        state_c = self.client.get(f"/api/v1/session/{sess_c}", headers=headers_c).json()["session"]
        self.assertEqual(state_c["extracted_text"], "")
        self.assertEqual(state_c["documents"], [])
        self.assertEqual(state_c["questions"], [])
        self.assertEqual(state_c["answers"], [])
        self.assertIsNone(state_c["summary"])
        self.assertIsNone(state_c["predicted_paper"])

        # 5. Verify Session A remains fully restored and undamaged
        state_a = self.client.get(f"/api/v1/session/{sess_a}", headers=headers_a).json()["session"]
        self.assertIn("standard costing", state_a["extracted_text"].lower())
        self.assertEqual(len(state_a["documents"]), 1)
        self.assertEqual(state_a["documents"][0]["filename"], "managerial_accounting_unit4.txt")
        self.assertIsNotNone(state_a["predicted_paper"])
        self.assertEqual(state_a["predicted_paper"]["subject_name"], "Managerial Accounting")

        # Clean up all sessions
        self.client.delete(f"/api/v1/session/{sess_a}", headers=headers_a)
        self.client.delete(f"/api/v1/session/{sess_b}", headers=headers_b)
        self.client.delete(f"/api/v1/session/{sess_c}", headers=headers_c)

    def test_06_mega_questions_session_scoping_and_persistence(self):
        """Scenario 6: Test /generate-mega-questions scopes to active session and saves questions"""
        res_s = self.client.post("/api/v1/session/new")
        sess_id = res_s.json()["session_id"]
        cap = res_s.json()["session_capability"]
        headers = {"X-Session-ID": sess_id, "X-Session-Capability": cap}

        text_content = (
            "Network Topologies: Mesh topology connects every device to every other device directly. "
            "Star topology connects all network nodes to a central hub or switch. "
            "Bus topology uses a single backbone cable to connect all nodes on the network. "
            "Ring topology connects devices in a circular loop with token passing mechanism."
        )

        res_gen = self.client.post(
            "/api/v1/generate-mega-questions",
            json={"text": text_content, "num_questions": 15},
            headers=headers
        )
        self.assertEqual(res_gen.status_code, 200)
        data_gen = res_gen.json()
        self.assertEqual(data_gen["session_id"], sess_id)
        self.assertTrue(len(data_gen["questions"]) >= 4)

        # Verify questions are saved in session
        state = self.client.get(f"/api/v1/session/{sess_id}", headers=headers).json()["session"]
        self.assertEqual(len(state["questions"]), len(data_gen["questions"]))

        # Clean up
        self.client.delete(f"/api/v1/session/{sess_id}", headers=headers)

    def test_07_exam_prediction_and_mock_paper_scoping(self):
        """Scenario 7: Test /predict-exam saves predicted paper and respects session boundaries"""
        res_s = self.client.post("/api/v1/session/new")
        sess_id = res_s.json()["session_id"]
        cap = res_s.json()["session_capability"]
        headers = {"X-Session-ID": sess_id, "X-Session-Capability": cap}

        syllabus_text = (
            "Operating Systems Course Outline: "
            "Process Synchronization: Critical Section Problem, Peterson's Algorithm, Semaphores, Monitors. "
            "Deadlocks: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. "
            "Deadlock Avoidance: Banker's Algorithm with Safe State determination. "
            "Memory Management: Paging, Segmentation, Virtual Memory, FIFO and LRU Page Replacement."
        )

        res_pred = self.client.post(
            "/api/v1/predict-exam",
            json={"material_text": syllabus_text, "subject_name": "Operating Systems", "total_marks": 60},
            headers=headers
        )
        self.assertEqual(res_pred.status_code, 200)
        data_pred = res_pred.json()
        self.assertTrue(data_pred["success"])
        self.assertEqual(data_pred["session_id"], sess_id)
        self.assertEqual(data_pred["subject_name"], "Operating Systems")
        self.assertTrue(len(data_pred["sections"]) > 0)

        # Check session retrieval contains predicted_paper
        state = self.client.get(f"/api/v1/session/{sess_id}", headers=headers).json()["session"]
        self.assertIsNotNone(state["predicted_paper"])
        self.assertEqual(state["predicted_paper"]["subject_name"], "Operating Systems")

        # Isolated clean session calling predict-exam with no text must fail with 400
        res_clean = self.client.post("/api/v1/session/new")
        clean_sess_id = res_clean.json()["session_id"]
        clean_cap = res_clean.json()["session_capability"]
        clean_headers = {"X-Session-ID": clean_sess_id, "X-Session-Capability": clean_cap}
        res_fail = self.client.post(
            "/api/v1/predict-exam",
            json={"material_text": "", "subject_name": "Unknown"},
            headers=clean_headers
        )
        self.assertEqual(res_fail.status_code, 400)

        # Clean up
        self.client.delete(f"/api/v1/session/{sess_id}", headers=headers)
        self.client.delete(f"/api/v1/session/{clean_sess_id}", headers=clean_headers)

    def test_08_multi_agent_deliberation_contract(self):
        """Scenario 8: Test /multi-agent/deliberate and /arena/deliberate endpoint contracts"""
        res_s = self.client.post("/api/v1/session/new")
        sess_id = res_s.json()["session_id"]
        cap = res_s.json()["session_capability"]
        headers = {"X-Session-ID": sess_id, "X-Session-Capability": cap}

        payload = {
            "extracted_text": "Cloud Computing: IaaS, PaaS, SaaS service models with scalability.",
            "questions": [
                {"id": 1, "question": "Compare IaaS, PaaS, and SaaS with examples.", "marks": 5, "type": "short_answer"}
            ]
        }

        # Test POST /multi-agent/deliberate
        res1 = self.client.post("/api/v1/multi-agent/deliberate", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 200)
        d1 = res1.json()
        self.assertTrue(d1["success"])
        self.assertEqual(d1["session_id"], sess_id)
        self.assertIn("deliberation_logs", d1)
        self.assertIn("consensus_report", d1)

        # Test POST /arena/deliberate alias
        res2 = self.client.post("/api/v1/arena/deliberate", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200)
        d2 = res2.json()
        self.assertTrue(d2["success"])
        self.assertEqual(d2["session_id"], sess_id)

        # Clean up
        self.client.delete(f"/api/v1/session/{sess_id}", headers=headers)

    def test_09_answer_generation_and_captures_scoping(self):
        """Scenario 9: Test /generate-answers and /process-captured-slides scope to session"""
        res_s = self.client.post("/api/v1/session/new")
        sess_id = res_s.json()["session_id"]
        cap = res_s.json()["session_capability"]
        headers = {"X-Session-ID": sess_id, "X-Session-Capability": cap}

        # Answers
        ans_res = self.client.post(
            "/api/v1/generate-answers",
            json={
                "questions": [{"id": 1, "question": "What is polymorphism in OOP?", "marks": 2}],
                "source_text": "Polymorphism enables objects of different classes to respond to the same message."
            },
            headers=headers
        )
        self.assertEqual(ans_res.status_code, 200)
        self.assertEqual(ans_res.json()["session_id"], sess_id)

        # Verify saved answers
        state = self.client.get(f"/api/v1/session/{sess_id}", headers=headers).json()["session"]
        self.assertTrue(len(state["answers"]) > 0)

        # Slide captures
        slide_res = self.client.post(
            "/api/v1/process-captured-slides",
            json={"frames": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="]},
            headers=headers
        )
        self.assertEqual(slide_res.status_code, 200)
        self.assertEqual(slide_res.json()["session_id"], sess_id)

        # Verify saved captures
        state2 = self.client.get(f"/api/v1/session/{sess_id}", headers=headers).json()["session"]
        self.assertEqual(len(state2["captures"]), 1)

        # Clean up
        self.client.delete(f"/api/v1/session/{sess_id}", headers=headers)

    def test_10_session_purge_leaves_zero_leakage(self):
        """Scenario 10: Complete session purge deletes DB rows, memory, and disk files"""
        res_s = self.client.post("/api/v1/session/new")
        sess_id = res_s.json()["session_id"]
        cap = res_s.json()["session_capability"]
        headers = {"X-Session-ID": sess_id, "X-Session-Capability": cap}

        # Populate
        self.client.post(
            "/api/v1/process",
            files={"file": ("secret_doc.txt", b"Confidential exam notes for session purge verification.", "text/plain")},
            headers=headers
        )

        # Confirm existence
        self.assertEqual(self.client.get(f"/api/v1/session/{sess_id}", headers=headers).status_code, 200)

        # Purge
        del_res = self.client.delete(f"/api/v1/session/{sess_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify 404
        self.assertEqual(self.client.get(f"/api/v1/session/{sess_id}", headers=headers).status_code, 404)

        # Verify on disk file does not exist
        session_file = os.path.join("./sessions", f"{sess_id}.json")
        self.assertFalse(os.path.exists(session_file), f"Session file '{session_file}' must not exist after deletion")

if __name__ == "__main__":
    unittest.main()
