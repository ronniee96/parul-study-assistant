import concurrent.futures
import hashlib
import json
import os
import tempfile
import time
import unittest
import httpx

from app.db.database import DatabaseEngine, normalize_neon_connection_url
from app.db.migrator import MigrationRunner
from app.db.models import (
    MODEL_REGISTRY,
    verify_models_match_migration_sql,
    verify_models_match_live_db,
)
from app.services.session_manager import (
    SessionManager,
    MissingCapabilityError,
    InvalidCapabilityError,
)
from app.services.s3_storage import (
    S3StorageService,
    DEFAULT_S3_REGION,
)
from app.services.qstash_service import (
    QStashService,
    QStashSignatureError,
    create_qstash_jwt_signature,
)
from app.services.parul_repository import ParulRepositoryHarvester
from app.services.document_processor import DocumentProcessor

BASE_URL = "http://127.0.0.1:8000"


def _create_test_http_client():
    """Return a live httpx.Client if port 8000 is listening, otherwise an in-process FastAPI TestClient."""
    try:
        probe = httpx.get(f"{BASE_URL}/api/v1/health", timeout=1.0)
        if probe.status_code == 200:
            return httpx.Client(base_url=BASE_URL, timeout=20.0)
    except Exception:
        pass
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


class ArchitectureDurabilityAndCapabilitiesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = _create_test_http_client()

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_01_reversible_sql_migrations_and_neon_pooling_config(self):
        """Test model-to-migration parity, repeatable/reversible SQL migrations, fail-closed production check, and Neon pooling."""
        # 0. Verify canonical Python models match 001_initial_schema.up.sql 1:1
        parity_sql = verify_models_match_migration_sql()
        self.assertTrue(parity_sql["verified"])
        self.assertEqual(
            set(parity_sql["tables_checked"]),
            {"schema_migrations", "study_sessions", "session_documents", "processing_jobs", "session_questions"},
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "test_migrations.sqlite3")
            engine = DatabaseEngine(database_url=f"sqlite:///{db_path}")
            runner = MigrationRunner(engine)

            # 1. Migrate UP
            up_res = runner.migrate_up()
            self.assertIn("001", up_res)
            applied_versions = [r["version"] for r in runner.get_applied_versions()]
            self.assertIn("001", applied_versions)

            # 1b. Repeatability: calling migrate_up() a second time must be a safe no-op returning []
            repeat_up = runner.migrate_up()
            self.assertEqual(repeat_up, [])

            # 1c. Verify live DB schema matches Python models 1:1
            parity_live = verify_models_match_live_db(engine)
            self.assertTrue(parity_live["verified"])

            # Verify relational tables exist
            rows = engine.fetch_all(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            table_names = {r["name"] for r in rows}
            self.assertIn("study_sessions", table_names)
            self.assertIn("session_documents", table_names)
            self.assertIn("processing_jobs", table_names)
            self.assertIn("session_questions", table_names)

            # 2. Migrate DOWN (Reversible)
            down_res = runner.migrate_down(steps=1)
            self.assertIn("001", down_res)
            self.assertEqual(runner.get_applied_versions(), [])

            rows_after_down = engine.fetch_all(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            remaining_tables = {r["name"] for r in rows_after_down}
            self.assertNotIn("study_sessions", remaining_tables)
            self.assertNotIn("session_documents", remaining_tables)

            # 3. Migrate UP again cleanly and verify repeatable no-op
            up_again = runner.migrate_up()
            self.assertIn("001", up_again)
            self.assertEqual(runner.migrate_up(), [])

            # 4. Verify Neon PostgreSQL connection URL normalization
            neon_url = "postgres://user:pass@ep-cool-darkness-pooler.ap-southeast-1.aws.neon.tech/neondb"
            normalized_url = normalize_neon_connection_url(neon_url)
            self.assertTrue(normalized_url.startswith("postgresql://"))
            self.assertIn("-pooler.ap-southeast-1.aws.neon.tech", normalized_url)
            self.assertIn("sslmode=require", normalized_url)

            # 5. Verify fail-closed production persistence (no silent fallback to SQLite/filesystem in production)
            old_app_env = os.environ.get("APP_ENV")
            old_db_url = os.environ.get("DATABASE_URL")
            old_neon_url = os.environ.get("NEON_DATABASE_URL")
            try:
                os.environ["APP_ENV"] = "production"
                os.environ.pop("DATABASE_URL", None)
                os.environ.pop("NEON_DATABASE_URL", None)
                with self.assertRaises(RuntimeError) as ctx_db:
                    DatabaseEngine()
                self.assertIn("Production database configuration missing", str(ctx_db.exception))

                with self.assertRaises(RuntimeError) as ctx_sm:
                    SessionManager(storage_path=os.path.join(tmpdir, "prod_sessions"))
                self.assertIn("Production database configuration missing", str(ctx_sm.exception))
            finally:
                if old_app_env is None:
                    os.environ.pop("APP_ENV", None)
                else:
                    os.environ["APP_ENV"] = old_app_env
                if old_db_url is not None:
                    os.environ["DATABASE_URL"] = old_db_url
                if old_neon_url is not None:
                    os.environ["NEON_DATABASE_URL"] = old_neon_url

    def test_02_durable_persistence_across_serverless_restarts_and_hashed_capabilities(self):
        """Verify session state, documents, and questions survive SessionManager restarts and raw capability is never stored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "durable_restart.sqlite3")
            db_url = f"sqlite:///{db_path}"

            eng1 = DatabaseEngine(database_url=db_url)
            MigrationRunner(eng1).migrate_up()

            # Instance 1: Create session and persist study artifacts
            sm1 = SessionManager(
                storage_path=os.path.join(tmpdir, "sessions"),
                db_engine=eng1,
            )
            s1 = sm1.create_session()
            sid = s1.session_id
            raw_cap = s1.session_capability
            self.assertTrue(len(raw_cap) >= 32)

            # Verify DB stores ONLY SHA-256 hash, never raw capability
            row = sm1.db.fetch_one(
                "SELECT capability_hash FROM study_sessions WHERE session_id = ?",
                (sid,),
            )
            self.assertIsNotNone(row)
            expected_hash = hashlib.sha256(raw_cap.encode("utf-8")).hexdigest()
            self.assertEqual(row["capability_hash"], expected_hash)
            self.assertNotEqual(row["capability_hash"], raw_cap)

            # Store documents and questions
            s1.extracted_text = "Personal Development: Self-awareness and goal setting."
            s1.documents = [
                {
                    "document_id": "doc_pd_101",
                    "filename": "personal_dev.pdf",
                    "file_type": "PDF",
                    "file_size": 2048,
                    "content_hash": hashlib.sha256(b"pd_content").hexdigest(),
                    "s3_bucket": "parul-study-assistant-private",
                    "s3_region": "ap-south-1",
                    "s3_object_key": f"sessions/{sid}/documents/doc_pd_101/personal_dev.pdf",
                    "extracted_text": s1.extracted_text,
                    "word_count": 7,
                    "character_count": 53,
                    "pages": [{"page": 1, "text": s1.extracted_text}],
                }
            ]
            s1.questions = [
                {
                    "id": 1,
                    "type": "short_answer",
                    "question": "Define self-awareness in personal development.",
                    "topic": "Self-Awareness",
                    "marks": 5,
                    "source_document_id": "doc_pd_101",
                    "source_page": 1,
                    "content_hash": hashlib.sha256(b"pd_content").hexdigest(),
                }
            ]
            sm1.update_session(s1)

            # Destroy sm1 and create a brand-new SessionManager instance (simulating serverless cold start)
            del sm1
            eng2 = DatabaseEngine(database_url=db_url)
            sm2 = SessionManager(
                storage_path=os.path.join(tmpdir, "sessions_empty"),
                db_engine=eng2,
            )

            # Missing capability must raise MissingCapabilityError (401)
            with self.assertRaises(MissingCapabilityError):
                sm2.get_session(sid, capability=None)

            # Wrong capability must raise InvalidCapabilityError (403)
            with self.assertRaises(InvalidCapabilityError):
                sm2.get_session(sid, capability="forged_capability_token_1234567890")

            # Valid capability restores full session from relational DB
            restored = sm2.get_session(sid, capability=raw_cap)
            self.assertIsNotNone(restored)
            self.assertEqual(restored.extracted_text, "Personal Development: Self-awareness and goal setting.")
            self.assertEqual(len(restored.documents), 1)
            self.assertEqual(restored.documents[0]["document_id"], "doc_pd_101")
            self.assertEqual(len(restored.questions), 1)
            self.assertEqual(restored.questions[0]["source_document_id"], "doc_pd_101")

    def test_03_s3_mumbai_ap_south_1_presigning_and_ownership_isolation(self):
        """Test private S3 ap-south-1 presigned PUT/GET URLs and cross-session object key rejection."""
        with tempfile.TemporaryDirectory() as tmpdir:
            s3 = S3StorageService(
                bucket_name="parul-study-mumbai-private",
                region="ap-south-1",
                access_key_id="AKIAIOSFODNN7EXAMPLE",
                secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                staging_dir=tmpdir,
            )
            self.assertEqual(s3.region, DEFAULT_S3_REGION)
            self.assertEqual(s3.region, "ap-south-1")

            sess_a = "sess_mumbai_alice_01"
            sess_b = "sess_mumbai_bob_02"
            doc_id = "doc_998877"

            # 1. Presigned PUT in ap-south-1
            object_key = s3.build_object_key(sess_a, doc_id, "lecture_notes.pdf")
            up_info = s3.generate_presigned_url(
                method="PUT",
                session_id=sess_a,
                object_key=object_key,
                content_type="application/pdf",
                acl="private",
            )
            self.assertEqual(up_info["region"], "ap-south-1")
            self.assertEqual(up_info["acl"], "private")
            self.assertIn("s3.ap-south-1.amazonaws.com", up_info["url"])
            self.assertIn("X-Amz-Algorithm=AWS4-HMAC-SHA256", up_info["url"])
            self.assertIn("ap-south-1%2Fs3%2Faws4_request", up_info["url"])

            # Public ACL must be rejected with PermissionError
            with self.assertRaises(PermissionError):
                s3.generate_presigned_url(
                    method="PUT",
                    session_id=sess_a,
                    object_key=object_key,
                    acl="public-read",
                )

            # 2. Presigned GET for owning session succeeds
            dl_info = s3.generate_presigned_url(
                method="GET",
                session_id=sess_a,
                object_key=object_key,
            )
            self.assertIn("s3.ap-south-1.amazonaws.com", dl_info["url"])

            # 3. Cross-session access (Session B requesting Session A's object key) must fail
            with self.assertRaises(PermissionError):
                s3.generate_presigned_url(
                    method="GET",
                    session_id=sess_b,
                    object_key=object_key,
                )

            # 4. Attempting to access parul_pyq or non-session prefix must fail
            with self.assertRaises(PermissionError):
                s3.validate_object_ownership(sess_a, "parul_pyq/index.json")

            # 5. Test live API endpoints /storage/presign-upload and /storage/presign-download
            res_new = self.client.post("/api/v1/session/new")
            live_sid = res_new.json()["session_id"]
            live_cap = res_new.json()["session_capability"]
            headers = {"X-Session-ID": live_sid, "X-Session-Capability": live_cap}

            res_presign_up = self.client.post(
                "/api/v1/storage/presign-upload",
                json={"filename": "unit1.pdf", "content_type": "application/pdf", "document_id": "doc_u1"},
                headers=headers,
            )
            self.assertEqual(res_presign_up.status_code, 200)
            up_json = res_presign_up.json()
            self.assertIn(up_json["region"], ["ap-south-1", "neon"])
            self.assertTrue(up_json["object_key"].startswith(f"sessions/{live_sid}/documents/"))

            # Cross-session object key via HTTP endpoint must return 403 Forbidden
            res_cross_dl = self.client.post(
                "/api/v1/storage/presign-download",
                json={"object_key": "sessions/sess_other_user_999/documents/doc_u1/unit1.pdf"},
                headers=headers,
            )
            self.assertEqual(res_cross_dl.status_code, 403)

            self.client.delete(f"/api/v1/session/{live_sid}", headers=headers)

    def test_04_qstash_webhook_signature_verification_and_idempotent_jobs(self):
        """Test Upstash-Signature JWT verification and idempotent background job execution."""
        signing_key = "sig_test_qstash_current_key_secret_998877"
        next_key = "sig_test_qstash_next_key_secret_112233"
        qstash = QStashService(
            qstash_token="",
            current_signing_key=signing_key,
            next_signing_key=next_key,
        )

        body_bytes = json.dumps({"job_id": "job_test_1", "session_id": "sess_test_1"}).encode("utf-8")

        # 1. Valid signature with current key succeeds
        valid_sig = create_qstash_jwt_signature(body_bytes, signing_key)
        claims = qstash.verify_signature(valid_sig, body_bytes)
        self.assertEqual(claims["iss"], "Upstash")

        # 2. Valid signature with rotated next_signing_key succeeds
        valid_next_sig = create_qstash_jwt_signature(body_bytes, next_key)
        claims_next = qstash.verify_signature(valid_next_sig, body_bytes)
        self.assertEqual(claims_next["iss"], "Upstash")

        # 3. Missing signature raises QStashSignatureError
        with self.assertRaises(QStashSignatureError):
            qstash.verify_signature(None, body_bytes)

        # 4. Wrong signing key raises QStashSignatureError
        bad_sig = create_qstash_jwt_signature(body_bytes, "wrong_secret_key")
        with self.assertRaises(QStashSignatureError):
            qstash.verify_signature(bad_sig, body_bytes)

        # 5. Tampered body raises QStashSignatureError
        with self.assertRaises(QStashSignatureError):
            qstash.verify_signature(valid_sig, b'{"job_id":"tampered"}')

        # 6. Expired token raises QStashSignatureError
        expired_sig = create_qstash_jwt_signature(
            body_bytes, signing_key, expires_in=-10, issued_at=int(time.time()) - 300
        )
        with self.assertRaises(QStashSignatureError):
            qstash.verify_signature(expired_sig, body_bytes)

        # 7. Test end-to-end job dispatch and idempotent webhook replay via HTTP API
        res_s = self.client.post("/api/v1/session/new")
        sid = res_s.json()["session_id"]
        cap = res_s.json()["session_capability"]
        headers = {"X-Session-ID": sid, "X-Session-Capability": cap}

        # Upload a document first
        doc_bytes = (
            b"Unit 2: Organisational Behaviour and Leadership Styles. "
            b"Transformational leadership inspires followers to achieve extraordinary outcomes. "
            b"Transactional leadership focuses on supervision, organization, and performance."
        )
        up_res = self.client.post(
            "/api/v1/upload",
            files={"file": ("leadership.txt", doc_bytes, "text/plain")},
            headers=headers,
        )
        self.assertEqual(up_res.status_code, 200)
        doc_id = up_res.json()["document_id"]
        content_hash = up_res.json()["content_hash"]

        # 7. Test end-to-end job dispatch and idempotent webhook replay via HTTP API
        from unittest.mock import patch
        from app.api.v1 import qstash_service

        with patch.object(qstash_service, "live_qstash_configured", False):
            # Dispatch durable job via local idempotent worker
            disp_res = self.client.post(
                "/api/v1/jobs/dispatch",
                json={
                    "document_id": doc_id,
                    "content_hash": content_hash,
                    "generate_summary": True,
                    "generate_questions": True,
                    "num_questions": 5,
                },
                headers=headers,
            )
            self.assertEqual(disp_res.status_code, 200)
            disp_data = disp_res.json()
            job_id = disp_data["job_id"]
            self.assertEqual(disp_data["status"], "COMPLETED")

            # Query job status
            job_status_res = self.client.get(f"/api/v1/jobs/{job_id}", headers=headers)
            self.assertEqual(job_status_res.status_code, 200)
            self.assertEqual(job_status_res.json()["job"]["status"], "COMPLETED")

            # Count questions after initial execution
            sess_state_1 = self.client.get(f"/api/v1/session/{sid}", headers=headers).json()["session"]
            q_count_1 = len(sess_state_1["questions"])
            self.assertGreater(q_count_1, 0)

            # Re-dispatching with same (session_id, document_id, content_hash) must be idempotent (no duplicate questions)
            disp_replay = self.client.post(
                "/api/v1/jobs/dispatch",
                json={
                    "document_id": doc_id,
                    "content_hash": content_hash,
                    "generate_summary": True,
                    "generate_questions": True,
                    "num_questions": 5,
                },
                headers=headers,
            )
            self.assertEqual(disp_replay.status_code, 200)
            self.assertEqual(disp_replay.json()["job_id"], job_id)
            self.assertTrue(disp_replay.json().get("idempotent_replay"))

        sess_state_2 = self.client.get(f"/api/v1/session/{sid}", headers=headers).json()["session"]
        self.assertEqual(len(sess_state_2["questions"]), q_count_1)

        # Clean up
        self.client.delete(f"/api/v1/session/{sid}", headers=headers)

    def test_05_legacy_doc_ppt_rejection_and_empty_pyq_isolation(self):
        """Verify legacy binary .doc/.ppt are rejected and empty subject query never leaks Cost Accounting PYQs."""
        dp = DocumentProcessor()
        res_doc = dp.process_file(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1legacy_word", "notes.doc")
        self.assertFalse(res_doc["success"])
        self.assertIn(".docx", res_doc["error"])

        res_ppt = dp.process_file(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1legacy_ppt", "slides.ppt")
        self.assertFalse(res_ppt["success"])
        self.assertIn(".pptx", res_ppt["error"])

        # Verify ParulRepositoryHarvester does not return Cost Accounting papers for empty or unrelated subjects
        harvester = ParulRepositoryHarvester()
        empty_hist = harvester.get_historical_topics_and_questions("", subject_code="")
        self.assertEqual(empty_hist["matched_papers_count"], 0)
        self.assertEqual(empty_hist["recurring_questions"], [])

        pd_hist = harvester.get_historical_topics_and_questions("Personal Development", subject_code="")
        for q in pd_hist.get("recurring_questions", []):
            self.assertNotIn("standard costing", q.get("question", "").lower())
            self.assertNotIn("variance", q.get("question", "").lower())

    def test_06_concurrent_personal_development_vs_managerial_accounting_isolation(self):
        """Run concurrent Personal Development and Managerial Accounting pipelines and verify zero cross-subject contamination."""
        def run_subject_workflow(subject_name: str, filename: str, content: str, forbidden_terms: list):
            client = _create_test_http_client()
            try:
                s_res = client.post("/api/v1/session/new")
                assert s_res.status_code == 200
                sid = s_res.json()["session_id"]
                cap = s_res.json()["session_capability"]
                hdrs = {"X-Session-ID": sid, "X-Session-Capability": cap}

                proc_res = client.post(
                    "/api/v1/process?generate_summary=true&generate_questions=true&num_questions=6",
                    files={"file": (filename, content.encode("utf-8"), "text/plain")},
                    headers=hdrs,
                )
                assert proc_res.status_code == 200
                proc_data = proc_res.json()

                pred_res = client.post(
                    "/api/v1/predict-exam",
                    json={"material_text": content, "subject_name": subject_name, "total_marks": 60},
                    headers=hdrs,
                )
                assert pred_res.status_code == 200

                state = client.get(f"/api/v1/session/{sid}", headers=hdrs).json()["session"]
                serialized = json.dumps(state).lower()
                for term in forbidden_terms:
                    assert term not in serialized, f"Contamination detected: '{term}' found in {subject_name} session!"

                # Verify provenance fields on generated questions
                for q in state["questions"]:
                    assert q.get("session_id") == sid
                    assert q.get("source_document_id") == proc_data["document_id"]
                    assert q.get("content_hash") == proc_data["content_hash"]

                client.delete(f"/api/v1/session/{sid}", headers=hdrs)
                return True
            finally:
                client.close()

        ma_content = (
            "Managerial Accounting Syllabus: Standard Costing and Variance Analysis. "
            "Material price variance and labor efficiency variance formulas. "
            "Flexible budgeting and marginal costing break-even point calculation."
        )
        pd_content = (
            "Personal Development Syllabus: Emotional Intelligence, Self-Awareness, and Empathy. "
            "Effective communication skills, active listening, conflict resolution, and SWOT analysis "
            "for career growth and interpersonal effectiveness."
        )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            fut_ma = executor.submit(
                run_subject_workflow,
                "Managerial Accounting",
                "accounting.txt",
                ma_content,
                ["emotional intelligence", "self-awareness", "active listening"],
            )
            fut_pd = executor.submit(
                run_subject_workflow,
                "Personal Development",
                "personal_dev.txt",
                pd_content,
                ["standard costing", "variance analysis", "marginal costing", "break-even"],
            )
            self.assertTrue(fut_ma.result())
            self.assertTrue(fut_pd.result())

    def test_07_exhaustive_route_and_alias_capability_security_matrix(self):
        """
        Verify anonymous session security across EVERY session-scoped route and legacy alias:
        Forged X-User-ID, guessed session UUID, missing capability (401), invalid capability (403),
        or another user's capability (403) must never expose or modify session data.
        """
        import uuid

        # 1. Create Alice's session and populate baseline text
        res_alice = self.client.post("/api/v1/session/new", headers={"X-User-ID": "usr_alice_legit"})
        self.assertEqual(res_alice.status_code, 200)
        alice_sid = res_alice.json()["session_id"]
        alice_cap = res_alice.json()["session_capability"]
        alice_headers = {"X-Session-ID": alice_sid, "X-Session-Capability": alice_cap}

        up_res = self.client.post(
            "/api/v1/upload",
            files={"file": ("alice_private.txt", b"Alice confidential study notes on Quantum Cryptography.", "text/plain")},
            headers=alice_headers,
        )
        self.assertEqual(up_res.status_code, 200)
        alice_doc_id = up_res.json()["document_id"]

        # 2. Create Bob's session (attacker with a valid capability for his own session)
        res_bob = self.client.post("/api/v1/session/new", headers={"X-User-ID": "usr_bob_attacker"})
        self.assertEqual(res_bob.status_code, 200)
        bob_sid = res_bob.json()["session_id"]
        bob_cap = res_bob.json()["session_capability"]
        guessed_uuid = str(uuid.uuid4())

        # Exhaustive route matrix covering all session-scoped routes + legacy aliases
        route_matrix = [
            ("GET", f"/api/v1/session/{alice_sid}", None, None),
            ("GET", f"/api/v1/sessions/{alice_sid}", None, None),
            ("DELETE", f"/api/v1/session/{alice_sid}", None, None),
            ("DELETE", f"/api/v1/sessions/{alice_sid}", None, None),
            ("POST", f"/api/v1/session/{alice_sid}/rotate-capability", None, None),
            ("POST", f"/api/v1/sessions/{alice_sid}/rotate-capability", None, None),
            ("POST", "/api/v1/upload", None, {"file": ("hack.txt", b"hack", "text/plain")}),
            ("POST", "/api/v1/process", None, {"file": ("hack.txt", b"hack", "text/plain")}),
            ("POST", "/api/v1/process-multiple", None, {"files": ("hack.txt", b"hack", "text/plain")}),
            ("POST", "/api/v1/summarize", {"text": "Attempt to overwrite summary with longer text."}, None),
            ("POST", "/api/v1/generate-questions", {"text": "Attempt to overwrite questions with longer text block for testing."}, None),
            ("POST", "/api/v1/generate-mega-questions", {"text": "Attempt to overwrite mega questions with longer text.", "num_questions": 5}, None),
            ("POST", "/api/v1/predict-exam", {"material_text": "Attempt to overwrite exam prediction with fake material."}, None),
            ("POST", "/api/v1/predict-exam-pipeline", {"material_text": "Attempt to overwrite pipeline."}, None),
            ("POST", "/api/v1/rank-questions", {"questions": [], "material_text": "Attempt"}, None),
            ("POST", "/api/v1/generate-answers", {"questions": [], "source_text": "Attempt"}, None),
            ("POST", "/api/v1/process-captured-slides", {"frames": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="]}, None),
            ("POST", "/api/v1/multi-agent/deliberate", {"extracted_text": "Attempt"}, None),
            ("POST", "/api/v1/arena/deliberate", {"extracted_text": "Attempt"}, None),
            ("POST", "/api/v1/adaptive-learning/consent", None, None),
            ("POST", "/api/v1/adaptive-learning/withdraw-consent", None, None),
            ("POST", "/api/v1/adaptive-learning/record-performance?question_id=q1&question_type=mcq&is_correct=true&time_taken_seconds=5", None, None),
            ("GET", "/api/v1/adaptive-learning/recommendations", None, None),
            ("GET", "/api/v1/adaptive-learning/insights", None, None),
            ("GET", "/api/v1/adaptive-learning/suggest-difficulty", None, None),
            ("GET", "/api/v1/research/audit-trail", None, None),
            ("POST", "/api/v1/research/search", {"query": "quantum", "source": "arxiv"}, None),
            ("POST", "/api/v1/storage/presign-upload", {"filename": "test.pdf"}, None),
            ("POST", "/api/v1/storage/presign-download", {"object_key": f"sessions/{alice_sid}/documents/{alice_doc_id}/alice_private.txt"}, None),
            ("POST", "/api/v1/jobs/dispatch", {"document_id": alice_doc_id}, None),
            ("GET", "/api/v1/jobs/job_nonexistent", None, None),
        ]

        for method, path, json_body, files_body in route_matrix:
            # Case A: Forged X-User-ID + Alice's session_id + MISSING capability -> 401
            hdrs_missing = {"X-Session-ID": alice_sid, "X-User-ID": "usr_alice_legit"}
            res_missing = self.client.request(method, path, json=json_body, files=files_body, headers=hdrs_missing)
            self.assertEqual(
                res_missing.status_code, 401,
                f"Expected 401 for missing capability on {method} {path}, got {res_missing.status_code}",
            )

            # Case B: Forged X-User-ID + Alice's session_id + INVALID capability -> 403
            hdrs_invalid = {
                "X-Session-ID": alice_sid,
                "X-User-ID": "usr_alice_legit",
                "X-Session-Capability": "forged_invalid_capability_token_00000000",
            }
            res_invalid = self.client.request(method, path, json=json_body, files=files_body, headers=hdrs_invalid)
            self.assertEqual(
                res_invalid.status_code, 403,
                f"Expected 403 for invalid capability on {method} {path}, got {res_invalid.status_code}",
            )

            # Case C: Forged X-User-ID + Alice's session_id + BOB'S valid capability -> 403
            hdrs_bob = {
                "X-Session-ID": alice_sid,
                "X-User-ID": "usr_alice_legit",
                "X-Session-Capability": bob_cap,
            }
            res_bob_attempt = self.client.request(method, path, json=json_body, files=files_body, headers=hdrs_bob)
            self.assertEqual(
                res_bob_attempt.status_code, 403,
                f"Expected 403 for Bob's capability on {method} {path}, got {res_bob_attempt.status_code}",
            )

            # Case D: Guessed random session UUID -> 404
            guessed_path = path.replace(alice_sid, guessed_uuid)
            hdrs_guessed = {"X-Session-ID": guessed_uuid, "X-Session-Capability": bob_cap}
            res_guessed = self.client.request(method, guessed_path, json=json_body, files=files_body, headers=hdrs_guessed)
            self.assertEqual(
                res_guessed.status_code, 404,
                f"Expected 404 for guessed session UUID on {method} {guessed_path}, got {res_guessed.status_code}",
            )

        # Verify Alice's session was not modified or deleted by any of the 31 * 4 = 124 unauthorized requests
        alice_check = self.client.get(f"/api/v1/session/{alice_sid}", headers=alice_headers)
        self.assertEqual(alice_check.status_code, 200)
        alice_state = alice_check.json()["session"]
        self.assertEqual(len(alice_state["documents"]), 1)
        self.assertEqual(alice_state["documents"][0]["filename"], "alice_private.txt")
        self.assertIsNone(alice_state["summary"])

        # Clean up Alice and Bob sessions
        self.client.delete(f"/api/v1/session/{alice_sid}", headers=alice_headers)
        self.client.delete(f"/api/v1/session/{bob_sid}", headers={"X-Session-ID": bob_sid, "X-Session-Capability": bob_cap})


if __name__ == "__main__":
    unittest.main()
