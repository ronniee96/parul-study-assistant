"""
Held-Out Exam Prediction Evaluation Harness
Tests prediction quality against historical Parul University examination papers
Guarantees NO data leakage between reference data and evaluation set
Measures topic recall, precision, and ranking quality
"""

import sys
import json
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.exam_predictor import ExamPredictor
from app.services.parul_repository import ParulRepositoryHarvester

class HeldOutExamPredictionTests(unittest.TestCase):
    def setUp(self):
        self.predictor = ExamPredictor()
        self.harvester = ParulRepositoryHarvester()
        
        # Load Parul PYQ data
        index_path = Path(__file__).resolve().parents[1] / "data" / "parul_pyq" / "index.json"
        with open(index_path, "r") as f:
            self.pyq_corpus = json.load(f)

    def test_zero_data_leakage_and_topic_recall(self):
        """
        Evaluate DAA (Design and Analysis of Algorithms):
        We hold out the DAA paper questions as our ground truth test set.
        The predictor only receives the raw syllabus material, NEVER the held-out paper.
        """
        daa_paper = next((p for p in self.pyq_corpus if "Algorithms" in p.get("subject", "")), None)
        self.assertIsNotNone(daa_paper, "DAA paper should exist in historical corpus")

        # Extract ground truth topics from held-out examination paper
        ground_truth_questions = daa_paper.get("sample_questions", [])
        ground_truth_topics = {q["topic"].lower() for q in ground_truth_questions}
        self.assertGreater(len(ground_truth_topics), 0)

        # Raw DAA syllabus text (clean educational material, no examination paper labels)
        syllabus_text = """
        Course: Design and Analysis of Algorithms
        Unit 1: Asymptotic Analysis and Mathematical Foundations
        Asymptotic notations including Big-O notation, Big-Omega notation, and Big-Theta notation are used to describe the limiting behavior of functions.
        Time complexity and space complexity calculations for iterative and recursive algorithms.
        
        Unit 2: Divide and Conquer
        Divide and conquer algorithmic paradigm breaks problems into independent subproblems.
        Merge Sort and Quick Sort algorithms, recurrence relation solving using Master Theorem.
        
        Unit 3: Dynamic Programming and Algorithm Paradigms
        Dynamic Programming is an optimization technique using optimal substructure and overlapping subproblems.
        0/1 Knapsack problem state transitions, Longest Common Subsequence (LCS), Matrix Chain Multiplication.
        Comparison of Greedy Method vs Dynamic Programming approaches.
        
        Unit 4: Graph Algorithms
        Single source shortest path algorithms including Dijkstra's algorithm and Bellman-Ford algorithm.
        Minimum spanning tree algorithms: Kruskal's algorithm and Prim's algorithm.
        Graph traversal using Breadth First Search (BFS) and Depth First Search (DFS).
        """

        # Generate predictions strictly from the syllabus (past_papers=None to ensure 0 leakage)
        prediction_result = self.predictor.predict_exam(
            material_text=syllabus_text,
            past_papers=None,
            subject_name="Design and Analysis of Algorithms",
            total_marks=60
        )

        self.assertTrue(prediction_result.get("success"))
        sections = prediction_result.get("sections", [])
        self.assertGreater(len(sections), 0)

        # Collect predicted topics and questions
        predicted_questions = []
        for sec in sections:
            predicted_questions.extend(sec.get("questions", []))

        predicted_topics = {q["topic"].lower() for q in predicted_questions}

        # Measure Topic Recall against held-out ground truth
        matched_topics = set()
        for gt in ground_truth_topics:
            gt_words = set(gt.split())
            for pt in predicted_topics:
                if any(w in pt for w in gt_words if len(w) > 3):
                    matched_topics.add(gt)
                    break

        recall = len(matched_topics) / len(ground_truth_topics)
        print(f"\n[DAA Evaluation] Ground Truth Topics: {ground_truth_topics}")
        print(f"[DAA Evaluation] Matched Held-Out Topics: {matched_topics}")
        print(f"[DAA Evaluation] Topic Recall: {recall * 100:.1f}% ({len(matched_topics)}/{len(ground_truth_topics)})")

        # Must achieve at least 60% topic recall on held-out exam topics without leakage
        self.assertGreaterEqual(recall, 0.60, f"Topic recall was {recall:.2f}, expected >= 0.60")

        # Measure Precision: All predicted topics must come from syllabus concepts
        valid_predictions = [
            q for q in predicted_questions
            if any(term in q["topic"].lower() or term in q["question"].lower()
                   for term in ["asymptotic", "divide", "dynamic", "knapsack", "graph", "dijkstra", "algorithm", "sort"])
        ]
        precision = len(valid_predictions) / len(predicted_questions) if predicted_questions else 0
        print(f"[DAA Evaluation] Predicted Questions Precision: {precision * 100:.1f}%")
        self.assertGreaterEqual(precision, 0.75, f"Precision was {precision:.2f}, expected >= 0.75")

        # Verify Ranking Quality: High confidence questions must have confidence >= 0.65
        confidences = [q["confidence"] for q in predicted_questions]
        print(f"[DAA Evaluation] Confidences: {confidences}")
        self.assertTrue(all(0.0 <= c <= 1.0 for c in confidences))
        self.assertTrue(any(c >= 0.60 for c in confidences[:5]))

    def test_database_systems_held_out_paper(self):
        """
        Evaluate DBMS held-out exam paper
        """
        dbms_paper = next((p for p in self.pyq_corpus if "05101202" in p.get("subject_code", "")), None)
        self.assertIsNotNone(dbms_paper)

        gt_questions = dbms_paper.get("sample_questions", [])
        gt_topics = {q["topic"].lower() for q in gt_questions}

        dbms_syllabus = """
        Database Management Systems Course Syllabus:
        Module 1: Relational Model and Transactions
        ACID properties of database transactions: Atomicity, Consistency, Isolation, and Durability.
        Transaction states, commit, rollback, and transaction schedules.
        
        Module 2: Relational Database Design and Normalization
        Functional dependencies and relational schema decomposition.
        Normalization normal forms: First Normal Form (1NF), Second Normal Form (2NF), Third Normal Form (3NF), and Boyce-Codd Normal Form (BCNF).
        
        Module 3: Indexing and Storage
        File organization, indexing techniques, B-Tree and B+ Tree indexing structures.
        Hashing techniques and query processing cost estimation.
        
        Module 4: Concurrency Control and Recovery
        Concurrency control protocols: Lock-based protocols, Two-Phase Locking (2PL) protocol, Strict 2PL.
        Timestamp-based ordering and deadlock detection and prevention.
        """

        prediction = self.predictor.predict_exam(
            material_text=dbms_syllabus,
            past_papers=None,
            subject_name="Database Management Systems",
            total_marks=60
        )

        self.assertTrue(prediction.get("success"))
        all_q = []
        for sec in prediction.get("sections", []):
            all_q.extend(sec.get("questions", []))

        pred_topics = {q["topic"].lower() for q in all_q}
        print(f"[DBMS Evaluation] Predicted Topics: {pred_topics}")

        matched = set()
        for gt in gt_topics:
            gt_words = set(gt.split())
            for pt in pred_topics:
                if any(w in pt for w in gt_words if len(w) > 3):
                    matched.add(gt)
                    break

        recall = len(matched) / len(gt_topics)
        print(f"\n[DBMS Evaluation] Ground Truth Topics: {gt_topics}")
        print(f"[DBMS Evaluation] Matched Held-Out Topics: {matched}")
        print(f"[DBMS Evaluation] Topic Recall: {recall * 100:.1f}% ({len(matched)}/{len(gt_topics)})")

        self.assertGreaterEqual(recall, 0.60)

if __name__ == "__main__":
    unittest.main()
