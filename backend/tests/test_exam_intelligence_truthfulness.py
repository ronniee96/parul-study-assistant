import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.schemas import QuestionItem
from app.services.document_intelligence import DocumentIntelligence
from app.services.exam_prediction_pipeline import ExamPredictionPipeline
from app.services.paper_structure_analyzer import PaperStructureAnalyzer
from app.services.question_possibility_engine import QuestionPossibilityEngine


class ExamIntelligenceTruthfulnessTests(unittest.TestCase):
    def test_text_and_unsupported_document_scenarios(self):
        extracted = DocumentIntelligence.extract_rich_document(
            b"Alpha process means a sequence of explicit steps.\n\nThe method validates each input.",
            "notes.txt",
        )
        self.assertTrue(extracted["success"])
        self.assertIn("Alpha process", extracted["full_text"])

        unsupported = DocumentIntelligence.extract_rich_document(b"binary", "notes.xyz")
        self.assertFalse(unsupported["success"])
        self.assertEqual(unsupported["full_text"], "")
        self.assertIn("Unsupported", unsupported["error"])

    def test_malformed_pdf_is_not_reported_as_extracted_text(self):
        with patch.object(DocumentIntelligence, "_ocr_pdf_pages", return_value=[]):
            result = DocumentIntelligence.extract_rich_document(b"not a pdf", "scan.pdf")
        self.assertFalse(result["success"])
        self.assertEqual(result["full_text"], "")
        self.assertNotIn("Scanned document text extraction completed", result["full_text"])

    def test_paper_profile_counts_only_detected_questions(self):
        text = """Parul University
Subject Code: CS301
Maximum Marks: 80
Time: 3 hours
SECTION A
Q1. Define alpha. [2 Marks]
Q2. Explain alpha. [5 Marks]
SECTION B
Q3. Compare alpha and beta. [5 Marks]
Q4. Discuss beta. [5 Marks]
"""
        profile = PaperStructureAnalyzer.analyze_paper_structure(text)
        self.assertEqual(profile.total_marks, 80)
        self.assertEqual(profile.duration_hours, 3)
        self.assertEqual([section.num_questions for section in profile.sections], [2, 2])
        self.assertTrue(all(section.total_marks is None for section in profile.sections))

    def test_small_source_does_not_get_padded_with_duplicate_questions(self):
        source = {
            "document_id": "doc-a",
            "filename": "alpha.txt",
            "full_text": "Alpha process means a repeatable sequence of explicit steps.",
            "elements": [{
                "element_type": "concept",
                "title": "Alpha process",
                "content": "Alpha process means a repeatable sequence of explicit steps. It validates each input and records each result.",
                "page_number": 1,
            }],
        }
        engine = QuestionPossibilityEngine()
        questions = engine.generate_document_universe(source, target_count=300)
        self.assertGreater(len(questions), 0)
        self.assertLess(len(questions), 300)
        self.assertEqual(len({question.question for question in questions}), len(questions))
        self.assertTrue(all(question.source_document_id == "doc-a" for question in questions))
        self.assertFalse(any(question.type in {"case_study", "differentiate", "diagram_based"} for question in questions))

    def test_formula_without_values_does_not_make_up_a_numerical_problem(self):
        questions = QuestionPossibilityEngine().generate_document_universe({
            "id": "formula-doc",
            "filename": "formula.txt",
            "full_text": "Growth rate is calculated by G = P * r.",
            "formulas": [{"title": "Growth rate", "content": "G = P * r", "page_number": 1}],
            "elements": [],
        })
        self.assertTrue(any(question.category == "Formula & Method" for question in questions))
        self.assertFalse(any(question.type == "numerical" for question in questions))
        self.assertFalse(any(question.type == "case_study" for question in questions))

    def test_heading_without_explanatory_text_is_not_treated_as_answer_content(self):
        questions = QuestionPossibilityEngine().generate_document_universe({
            "id": "heading-only",
            "filename": "outline.txt",
            "full_text": "Alpha",
            "headings": ["Alpha"],
        })
        self.assertEqual(questions, [])

    def test_multiple_document_source_ids_are_preserved(self):
        engine = QuestionPossibilityEngine()
        result = engine.process_multiple_documents([
            {
                "id": "doc-a",
                "filename": "alpha.pdf",
                "full_text": "Alpha is a repeatable process that validates each input.",
                "elements": [{"element_type": "concept", "title": "Alpha", "content": "Alpha is a repeatable process that validates each input.", "page_number": 1}],
            },
            {
                "id": "doc-b",
                "filename": "beta.pdf",
                "full_text": "Beta is a method that stores each confirmed result.",
                "elements": [{"element_type": "concept", "title": "Beta", "content": "Beta is a method that stores each confirmed result.", "page_number": 1}],
            },
        ])
        self.assertEqual(set(result["per_document_counts"]), {"doc-a", "doc-b"})
        self.assertEqual({question.source_document_id for question in result["combined_questions"]}, {"doc-a", "doc-b"})

    def test_no_uploaded_exam_profile_means_no_invented_blueprint(self):
        class EmptyRepository:
            def get_historical_topics_and_questions(self, **_kwargs):
                return {"topic_frequency": {}}

        pipeline = ExamPredictionPipeline()
        pipeline.parul_harvester = EmptyRepository()
        result = pipeline.run_pipeline(
            candidate_pool=[QuestionItem(id=1, question="Explain Alpha process.", topic="Alpha process", source_pages=[1])],
            material_text="Alpha process means a repeatable sequence of explicit steps.",
            subject_name="Alpha",
        )
        self.assertEqual(result["evidence_pipeline_version"], 1)
        self.assertFalse(result["learned_exam_profile"]["learned_from_past_papers"])
        self.assertIsNone(result["learned_exam_profile"]["total_marks"])
        self.assertIsNone(result["learned_exam_profile"]["duration_hours"])
        self.assertEqual(result["learned_exam_profile"]["sections"], [])
        mock_paper = result["predicted_mock_paper"]
        self.assertIsNone(mock_paper["total_marks"])
        self.assertEqual(mock_paper["sections"][0]["choice_rule"], "No exam pattern inferred")
        self.assertEqual(result["adversarial_review_status"], "not_configured")


if __name__ == "__main__":
    unittest.main()
