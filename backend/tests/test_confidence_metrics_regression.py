"""
Regression Test Suite for Phase 1.1: Confidence Metrics & Heuristic Integrity
Tests:
1. AI model JSON with valid float confidence preserves calibrated score.
2. AI model JSON with omitted confidence parses as None (no random uniform).
3. AI model JSON with invalid confidence (string, out-of-range, NaN) parses as None.
4. AI free-text parsing sets confidence to None (no random uniform).
5. Multi-agent arena consensus returns 'Not available' when quality scores are absent.
6. Multi-agent arena consensus returns computed average when quality scores are present.
7. QuestionItem Pydantic schema accepts and serializes null confidence cleanly.
8. Exam predictor returns overall_confidence: None when confidence is uncalibrated.
"""

import unittest
import json
from app.services.ai_service import AIService
from app.services.multi_agent_arena import MultiAgentArena
from app.services.exam_predictor import ExamPredictor
from app.models.schemas import QuestionItem, ExamPredictionResponse


class TestConfidenceMetricsRegression(unittest.TestCase):
    def setUp(self):
        self.ai_service = AIService()
        self.arena = MultiAgentArena(self.ai_service)
        self.predictor = ExamPredictor()

    def test_01_parse_ai_questions_with_valid_confidence(self):
        """Valid model confidence floats between 0.0 and 1.0 must be preserved."""
        payload = json.dumps([
            {
                "type": "multiple_choice",
                "question": "What is ACID in databases?",
                "options": ["A) Atomicity", "B) Array", "C) Access", "D) Action"],
                "correct_answer": "A) Atomicity",
                "confidence": 0.925
            }
        ])
        questions = self.ai_service._parse_ai_questions(payload, num=1, types=["multiple_choice"])
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]["confidence"], 0.925)

    def test_02_parse_ai_questions_with_omitted_confidence(self):
        """Omitted or null confidence must parse as None without generating random numbers."""
        payload = json.dumps([
            {
                "type": "short_answer",
                "question": "Explain 2-phase locking.",
                "correct_answer": "2PL is a concurrency control protocol.",
                # No confidence key provided
            },
            {
                "type": "essay",
                "question": "Discuss distributed transactions.",
                "correct_answer": "Distributed transactions require 2PC.",
                "confidence": None
            }
        ])
        questions = self.ai_service._parse_ai_questions(payload, num=2, types=["short_answer", "essay"])
        self.assertEqual(len(questions), 2)
        self.assertIsNone(questions[0]["confidence"], "Omitted confidence must be None")
        self.assertIsNone(questions[1]["confidence"], "Explicit null confidence must be None")

    def test_03_parse_ai_questions_with_invalid_confidence(self):
        """Non-float, out-of-range, or NaN confidence must parse as None."""
        payload = json.dumps([
            {"type": "short_answer", "question": "Q1", "correct_answer": "A1", "confidence": "high"},
            {"type": "short_answer", "question": "Q2", "correct_answer": "A2", "confidence": -0.5},
            {"type": "short_answer", "question": "Q3", "correct_answer": "A3", "confidence": 1.5},
            {"type": "short_answer", "question": "Q4", "correct_answer": "A4", "confidence": "invalid_num"}
        ])
        questions = self.ai_service._parse_ai_questions(payload, num=4, types=["short_answer"])
        self.assertEqual(len(questions), 4)
        for idx, q in enumerate(questions):
            self.assertIsNone(q["confidence"], f"Question {idx+1} invalid confidence must be None")

    def test_04_parse_freetext_questions_returns_none_confidence(self):
        """Free-text responses lack calibrated confidence and must return None (no random fallback)."""
        freetext = (
            "1. Define Operating System Kernel.\n"
            "Ans: The kernel is the core component managing CPU and memory resources.\n\n"
            "2. What is thrashing in virtual memory?\n"
            "Ans: Continuous page swapping due to insufficient RAM."
        )
        questions = self.ai_service._parse_freetext_questions(freetext, num=2, types=["short_answer"])
        self.assertEqual(len(questions), 2)
        for q in questions:
            self.assertIsNone(q["confidence"], "Free-text confidence must be None")

    def test_05_multi_agent_arena_consensus_without_scores(self):
        """When agent quality scores are unavailable, overallConfidence must be 'Not available'."""
        agent_outputs = {
            "prof": {"success": True, "output": {"findings": ["Solid syllabus coverage"]}},
            "evaluator": {"success": True, "output": {"verified": True}}
            # No avg_quality_score or avg_verification_score provided
        }
        res = self.arena._synthesize_consensus(
            agent_outputs,
            questions=[{"id": 1, "question": "Test?"}],
            exam_profile={"subject": "Computer Networks"}
        )
        self.assertEqual(res["overallConfidence"], "Not available")
        self.assertIsNone(res["overallConfidenceScore"])
        self.assertEqual(res["confidenceMetric"], "unavailable")

    def test_06_multi_agent_arena_consensus_with_valid_scores(self):
        """When quality verification scores are present, calculate and format true average."""
        agent_outputs = {
            "evaluator": {
                "success": True,
                "output": {
                    "overall_stats": {"avg_quality_score": 0.88}
                }
            },
            "verifier": {
                "success": True,
                "output": {
                    "overall_verification": {"avg_verification_score": 0.92}
                }
            }
        }
        res = self.arena._synthesize_consensus(
            agent_outputs,
            questions=[{"id": 1}],
            exam_profile={"subject": "Operating Systems"}
        )
        self.assertEqual(res["overallConfidence"], "90.0%")
        self.assertEqual(res["overallConfidenceScore"], 0.9)
        self.assertEqual(res["confidenceMetric"], "agent_quality_score")

    def test_07_question_item_pydantic_schema_null_confidence(self):
        """QuestionItem model must serialize confidence: null without raising validation errors."""
        q = QuestionItem(
            id=1,
            question="What is a deterministic finite automaton?",
            correct_answer="A 5-tuple accepting regular languages.",
            confidence=None,
            evidence_score=0.85
        )
        data = q.model_dump()
        self.assertIsNone(data["confidence"])
        self.assertEqual(data["evidence_score"], 0.85)

        # Ensure json round-trip works
        raw_json = q.model_dump_json()
        deserialized = json.loads(raw_json)
        self.assertIsNone(deserialized["confidence"])
        self.assertEqual(deserialized["evidence_score"], 0.85)

    def test_08_exam_predictor_returns_none_overall_confidence(self):
        """When predicting exam without AI model confidence, overall_confidence must be None."""
        sample_text = (
            "Unit 1: Relational Database Systems.\n"
            "Relational database is defined as a collection of schemas tables and attributes.\n"
            "First normal form requires atomic values with no repeating groups.\n"
            "Second normal form removes partial dependency on the candidate key.\n"
            "Third normal form eliminates transitive dependency across non-prime attributes."
        )
        res = self.predictor.predict_exam(sample_text, subject_name="DBMS", total_marks=60)
        self.assertTrue(res["success"])
        self.assertIsNone(res["overall_confidence"], "Deterministic prediction must have overall_confidence: None")
        self.assertFalse(res["is_ai_generated"])

    def test_09_pipeline_preserves_evidence_score_without_copying_to_confidence(self):
        """Pipeline Stage 2 must set evidence_score but never overwrite confidence with evidence_score."""
        from app.services.exam_prediction_pipeline import ExamPredictionPipeline
        pipeline = ExamPredictionPipeline(ai_service=self.ai_service)
        sample_text = (
            "Unit 1: Distributed Transactions.\n"
            "Two phase commit protocol coordinates consensus across distributed nodes.\n"
            "Prepare phase sends vote request to all participants.\n"
            "Commit phase executes the transaction if all participants voted commit."
        )
        candidates = [
            QuestionItem(
                id=1,
                question="Explain two phase commit protocol.",
                correct_answer="2PC is a distributed consensus algorithm.",
                topic="Distributed Transactions",
                confidence=None,
                marks=5,
            )
        ]
        res = pipeline.run_pipeline(
            candidate_pool=candidates,
            material_text=sample_text,
            past_papers=["What is two phase commit protocol in distributed transactions?"],
            subject_name="Distributed Systems",
        )
        self.assertTrue(res["success"])
        top_25 = res.get("top_25", [])
        self.assertGreater(len(top_25), 0)
        for q in top_25:
            # evidence_score must be computed from source evidence
            self.assertIsNotNone(q.evidence_score, "evidence_score must be populated from evidence signals")
            self.assertGreater(q.evidence_score, 0.0)
            # confidence must remain None (or empirical model value), NOT copied from evidence_score
            self.assertIsNone(q.confidence, "confidence must remain None when not generated by AI model")

    def test_10_pdf_service_question_paper_generation_without_fallback(self):
        """PDFService must create valid question paper bytes without 50% arbitrary fallback."""
        from app.services.pdf_service import PDFService
        pdf_svc = PDFService()
        sections = [
            {
                "name": "Section A",
                "marks_per_question": 2,
                "total_marks": 10,
                "questions": [
                    {
                        "question": "Define ACID properties.",
                        "confidence": None,
                        "evidence_score": 0.85,
                        "marks": 2,
                        "options": None,
                    }
                ]
            }
        ]
        pdf_bytes = pdf_svc.create_question_paper_pdf(sections, {"subject_name": "Database Systems"})
        self.assertTrue(pdf_bytes.startswith(b"%PDF"), "Must produce valid PDF header bytes")

    def test_11_out_of_range_and_invalid_confidence_handling(self):
        """Out-of-range (>1.0, <0.0), NaN, string, and negative confidence must parse as None."""
        payload = json.dumps([
            {"type": "short_answer", "question": "Q1", "correct_answer": "A1", "confidence": 1.5},
            {"type": "short_answer", "question": "Q2", "correct_answer": "A2", "confidence": -0.2},
            {"type": "short_answer", "question": "Q3", "correct_answer": "A3", "confidence": "high"},
            {"type": "short_answer", "question": "Q4", "correct_answer": "A4", "confidence": 0.0},
            {"type": "short_answer", "question": "Q5", "correct_answer": "A5", "confidence": 1.0},
        ])
        questions = self.ai_service._parse_ai_questions(payload, num=5, types=["short_answer"])
        self.assertEqual(len(questions), 5)
        self.assertIsNone(questions[0]["confidence"], "Confidence > 1.0 must be None")
        self.assertIsNone(questions[1]["confidence"], "Confidence < 0.0 must be None")
        self.assertIsNone(questions[2]["confidence"], "String confidence must be None")
        self.assertEqual(questions[3]["confidence"], 0.0, "Legitimate 0.0 confidence must be preserved")
        self.assertEqual(questions[4]["confidence"], 1.0, "Legitimate 1.0 confidence must be preserved")

    def test_12_deterministic_extraction_sets_none_confidence_with_provenance(self):
        """Deterministic syllabus extraction sets confidence: None (unavailable) and is_ai_generated: False."""
        text = (
            "Unit 1: Software Architecture.\n"
            "Microservices architecture is defined as a style structuring application as collection of services.\n"
            "Monolithic architecture is defined as a unified single-tier software application."
        )
        qs = self.ai_service._generate_questions_deep_academic(text, num=2, types=["short_answer"])
        self.assertGreater(len(qs), 0)
        for q in qs:
            self.assertIsNone(q["confidence"], "Deterministic syllabus extraction must have confidence: None (unavailable), not 0.0")
            self.assertFalse(q["is_ai_generated"])
            self.assertEqual(q["generation_method"], "deterministic_syllabus_extraction")

    def test_13_question_item_schema_preserves_zero_confidence(self):
        """QuestionItem schema and serialization must preserve legitimate numeric 0.0 confidence."""
        q = QuestionItem(
            id=101,
            question="What is zero confidence calibration?",
            correct_answer="An explicit minimum score.",
            confidence=0.0,
            evidence_score=0.75
        )
        dumped = q.model_dump()
        self.assertEqual(dumped["confidence"], 0.0, "Dumped dict must preserve numeric 0.0")
        self.assertEqual(dumped["evidence_score"], 0.75)

        raw_json = q.model_dump_json()
        deserialized = json.loads(raw_json)
        self.assertEqual(deserialized["confidence"], 0.0, "JSON serialization must preserve numeric 0.0")

        validated = QuestionItem.model_validate(deserialized)
        self.assertEqual(validated.confidence, 0.0, "Model validation must retain numeric 0.0")

    def test_14_question_possibility_engine_sets_none_confidence(self):
        """Question possibility engine candidates must carry confidence: None (unavailable)."""
        from app.services.question_possibility_engine import QuestionPossibilityEngine
        doc_data = {
            "document_id": "doc_test_1",
            "filename": "physics.pdf",
            "extracted_text": "Force is defined as mass times acceleration. F = m * a. Compare static friction with kinetic friction.",
            "elements": [
                {"element_type": "formula", "title": "Newton's Second Law", "content": "F = m * a", "page_number": 1},
                {"element_type": "definition", "title": "Force", "content": "An interaction that changes motion.", "page_number": 1},
                {"element_type": "comparison", "title": "Friction Comparison", "content": "Static friction opposes initiation while kinetic friction opposes motion.", "page_number": 1}
            ]
        }
        engine = QuestionPossibilityEngine()
        candidates = engine.generate_document_universe(doc_data, target_count=5)
        self.assertGreater(len(candidates), 0)
        for c in candidates:
            self.assertIsNone(c.confidence, f"Candidate {c.id} from possibility engine must have confidence: None")

    def test_15_exam_predictor_deterministic_questions_set_none_confidence(self):
        """Exam predictor deterministic question generation must set confidence: None."""
        topics = [
            {"topic": "Relational Algebra", "content": "Relational algebra is a procedural query language.", "normalized_score": 80}
        ]
        questions = self.predictor._generate_university_questions(topics, "sample text")
        self.assertGreater(len(questions), 0)
        for q in questions:
            self.assertIsNone(q["confidence"], "Deterministic question must have confidence: None")
            self.assertFalse(q["is_ai_generated"])

    def test_16_session_manager_default_stats_confidence_is_none(self):
        """SessionData and empty session stats must initialize with confidence: None."""
        from app.services.session_manager import SessionData
        sess = SessionData(session_id="test_sess_01", created_at="2026-10-13T00:00:00Z", updated_at="2026-10-13T00:00:00Z")
        self.assertIsNone(sess.stats["confidence"], "Default session confidence must be None")

    def test_17_api_contract_normalized_decimal_and_rejection_of_percentage(self):
        """API contract is strictly normalized decimal [0.0, 1.0]; percentage points (>1.0) must be rejected."""
        from pydantic import ValidationError

        # Valid normalized decimal score
        q_valid = QuestionItem(id=1, question="What is ACID?", correct_answer="Atomicity etc", confidence=0.92)
        self.assertEqual(q_valid.confidence, 0.92)
        dumped = q_valid.model_dump()
        self.assertEqual(dumped["confidence"], 0.92)

        # Rejection of percentage values (>1.0)
        with self.assertRaises(ValidationError):
            QuestionItem(id=2, question="What is 2PC?", correct_answer="Two phase commit", confidence=92.0)

        # AI parsing parses 0.92 as 0.92 and rejects >1.0 as None
        parsed = self.ai_service._parse_ai_questions(
            json.dumps([{"type": "short_answer", "question": "Q1", "correct_answer": "A1", "confidence": 0.92}]),
            num=1,
            types=["short_answer"]
        )
        self.assertEqual(parsed[0]["confidence"], 0.92)

        parsed_percent = self.ai_service._parse_ai_questions(
            json.dumps([{"type": "short_answer", "question": "Q2", "correct_answer": "A2", "confidence": 92.0}]),
            num=1,
            types=["short_answer"]
        )
        self.assertIsNone(parsed_percent[0]["confidence"], "Raw percentage 92.0 from model must be rejected as out-of-range (>1.0)")

    def test_18_exam_predictor_attaches_evidence_score_and_normalizes_overall_confidence(self):
        """Exam predictor attaches evidence_score to deterministic questions and returns overall_confidence in [0.0, 1.0]."""
        topics = [
            {"topic": "Relational Algebra", "content": "Relational algebra is a procedural query language.", "normalized_score": 80}
        ]
        questions = self.predictor._generate_university_questions(topics, "sample text")
        self.assertGreater(len(questions), 0)
        for q in questions:
            self.assertIsNone(q["confidence"], "Deterministic question must have confidence: None")
            self.assertIsNotNone(q.get("evidence_score"), "Deterministic question must have evidence_score")
            self.assertEqual(q["evidence_score"], 0.8, "evidence_score must be normalized score / 100")

        # Mock AI generation to verify overall_confidence remains in [0.0, 1.0]
        from unittest.mock import MagicMock
        mock_ai = MagicMock()
        mock_ai.generate_questions_with_failover.return_value = {
            "success": True,
            "questions": [
                {"id": 1, "question": "Q1", "confidence": 0.92, "marks": 2, "topic": "DB"},
                {"id": 2, "question": "Q2", "confidence": 0.88, "marks": 5, "topic": "DB"}
            ],
            "is_ai_generated": True,
            "engine_used": "Test AI Engine"
        }
        predictor_ai = ExamPredictor(ai_service=mock_ai)
        res = predictor_ai.predict_exam(
            "Relational database management systems syllabus material text here for testing.",
            subject_name="DBMS",
            total_marks=60,
            api_keys={"openai": "test-key"}
        )
        self.assertTrue(res["success"])
        self.assertIsNotNone(res["overall_confidence"])
        self.assertGreaterEqual(res["overall_confidence"], 0.0)
        self.assertLessEqual(res["overall_confidence"], 1.0, "overall_confidence must be on 0.0-1.0 scale, not 0-100")
        self.assertEqual(res["overall_confidence"], 0.9, "Average of 0.92 and 0.88 must be 0.900")


if __name__ == "__main__":
    unittest.main()
