import json
import httpx
import unittest

BASE_URL = "http://127.0.0.1:8000"

class LiveBackendAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_01_health_check(self):
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertTrue(data.get("ai_services", {}).get("session_isolation"))
        self.assertTrue(data.get("ai_services", {}).get("multi_agent_arena"))
        print("\n✓ Live Health Check endpoint responded with healthy status.")

    def test_02_cors_headers(self):
        # Test CORS preflight
        res = self.client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        self.assertIn(res.status_code, [200, 204])
        self.assertEqual(res.headers.get("access-control-allow-origin"), "http://localhost:5173")
        print("✓ CORS correctly configured for frontend origin http://localhost:5173.")

    def test_03_upload_valid_file(self):
        files = {"file": ("test_syllabus.txt", b"Course: Distributed Systems\nUnit 1: Consensus\nPaxos and Raft consensus algorithms.", "text/plain")}
        res = self.client.post("/api/v1/upload", files=files)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("uploaded successfully", data.get("message", ""))
        print("✓ Upload endpoint accepted valid syllabus file.")

    def test_04_upload_invalid_file_type_rejected(self):
        files = {"file": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream")}
        res = self.client.post("/api/v1/upload", files=files)
        self.assertEqual(res.status_code, 400)
        self.assertIn("not supported", res.json().get("detail", ""))
        print("✓ Upload rejected invalid file type (.exe) with 400 Bad Request.")

    def test_05_upload_oversized_file_rejected(self):
        oversized = b"A" * (11 * 1024 * 1024)  # 11MB (> 10MB limit)
        files = {"file": ("huge_file.txt", oversized, "text/plain")}
        res = self.client.post("/api/v1/upload", files=files)
        self.assertEqual(res.status_code, 400)
        self.assertIn("large", res.json().get("detail", "").lower())
        print("✓ Upload rejected oversized file (>10MB) with 400 Bad Request.")

    def test_06_process_document(self):
        sample_doc = b"""Operating Systems Examination Material:
Process Scheduling: Round Robin (RR) algorithm is preemptive and uses a time quantum. First-Come-First-Served (FCFS) is non-preemptive.
Deadlock: A situation where two or more processes are unable to proceed because each is waiting for the other to release resources.
Conditions for deadlock: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.
Virtual Memory: Paging and Segmentation memory management schemes.
"""
        files = {"file": ("os_notes.txt", sample_doc, "text/plain")}
        res = self.client.post(
            "/api/v1/process?generate_summary=true&generate_questions=true&num_questions=5",
            files=files
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Document processed successfully", data.get("message", ""))
        self.assertIn("Operating Systems", data.get("extracted_text", ""))
        print("✓ Process document extracted text and produced structured response.")

    def test_07_exam_prediction_endpoint(self):
        syllabus = """
        Unit 1: Computer Networks
        OSI 7-Layer model: Physical, Data Link, Network, Transport, Session, Presentation, Application layers.
        TCP vs UDP: Transmission Control Protocol provides reliable stream delivery, while User Datagram Protocol provides connectionless datagram delivery.
        
        Unit 2: Routing Algorithms
        Link State Routing and Distance Vector Routing protocols.
        Dijkstra's shortest path algorithm used in OSPF.
        """
        data = {
            "material_text": syllabus,
            "subject_name": "Computer Networks",
            "total_marks": "60"
        }
        res = self.client.post("/api/v1/predict-exam", data=data)
        self.assertEqual(res.status_code, 200)
        pred = res.json()
        self.assertTrue(pred.get("success"))
        self.assertEqual(pred.get("subject_name"), "Computer Networks")
        self.assertGreater(len(pred.get("sections", [])), 0)
        print("✓ Exam prediction endpoint generated university-structured sections.")

    def test_08_pdf_generation_endpoint(self):
        paper_data = {
            "sections": [
                {
                    "name": "Section A",
                    "marks_per_question": 2,
                    "total_marks": 4,
                    "questions": [
                        {"question": "Define OSI Model.", "confidence": 0.95, "marks": 2},
                        {"question": "Differentiate TCP and UDP.", "confidence": 0.90, "marks": 2}
                    ]
                }
            ],
            "metadata": {
                "subject_name": "Computer Networks",
                "total_marks": 60
            }
        }
        res = self.client.post("/api/v1/create-question-paper-pdf", data={"body": json.dumps(paper_data)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"), "Generated bytes should be valid PDF")
        print("✓ Server-side PDF generation produced valid PDF document bytes.")

    def test_09_multi_agent_arena_endpoint_without_keys(self):
        # Tests that without keys, it reports failure honestly and does NOT invent simulated answers
        payload = {
            "extracted_text": "Sample text",
            "questions": [{"id": 1, "question": "What is AI?"}],
            "exam_profile": {}
        }
        res = self.client.post("/api/v1/arena/deliberate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        logs = data.get("deliberation_logs", [])
        self.assertEqual(len(logs), 6)
        # All 6 agents must report failure because no provider keys are configured
        for log in logs:
            self.assertFalse(log.get("success"), f"Agent {log.get('agent', {}).get('name')} should report false without keys")
            self.assertEqual(log.get("provider"), "none")
        print("✓ Multi-Agent Arena endpoint accurately reported failure when keys are missing (no fake consensus).")

    def test_10_isolated_session_lifecycle_and_cross_session_privacy(self):
        # 1. Create Session A
        res_a = self.client.post("/api/v1/sessions")
        self.assertEqual(res_a.status_code, 200)
        session_a_id = res_a.json()["session_id"]

        # 2. Create Session B
        res_b = self.client.post("/api/v1/sessions")
        self.assertEqual(res_b.status_code, 200)
        session_b_id = res_b.json()["session_id"]

        self.assertNotEqual(session_a_id, session_b_id)

        # 3. Retrieve Session A
        get_a = self.client.get(f"/api/v1/sessions/{session_a_id}")
        self.assertEqual(get_a.status_code, 200)
        self.assertEqual(get_a.json()["session"]["session_id"], session_a_id)

        # 4. Delete Session A
        del_a = self.client.delete(f"/api/v1/sessions/{session_a_id}")
        self.assertEqual(del_a.status_code, 200)
        self.assertTrue(del_a.json()["success"])

        # 5. Verify Session A is deleted
        get_deleted_a = self.client.get(f"/api/v1/sessions/{session_a_id}")
        self.assertEqual(get_deleted_a.status_code, 404)

        # 6. Verify Session B remains unaffected
        get_b = self.client.get(f"/api/v1/sessions/{session_b_id}")
        self.assertEqual(get_b.status_code, 200)
        self.assertEqual(get_b.json()["session"]["session_id"], session_b_id)

        # Clean up Session B
        self.client.delete(f"/api/v1/sessions/{session_b_id}")
        print("✓ Session lifecycle and cross-session isolation verified (Session A deletion did not affect Session B).")

if __name__ == "__main__":
    unittest.main()
