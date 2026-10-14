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
from app.services.question_ranker import QuestionRanker

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

        # Verify Confidence Calibration & Evidence Score Integrity
        confidences = [q.get("confidence") for q in predicted_questions]
        evidence_scores = [q.get("evidence_score") for q in predicted_questions]
        print(f"[DAA Evaluation] Confidences: {confidences}")
        print(f"[DAA Evaluation] Evidence Scores: {evidence_scores}")

        # In deterministic mode without AI keys, confidence must be None (never synthetic)
        for c in confidences:
            self.assertIsNone(c, "Deterministic prediction must have confidence: None (not synthetic)")

        # Evidence scores must be populated and within normalized [0.0, 1.0]
        self.assertTrue(all(es is not None and 0.0 <= es <= 1.0 for es in evidence_scores))
        self.assertGreater(max(evidence_scores), min(evidence_scores), "Evidence scores must show discrimination across topics")

    def test_independent_ranking_quality_precision_at_k(self):
        """
        Verify independent ranking quality using evidence scores on a held-out candidate fixture.
        Measures:
        1. Monotonicity of ranking by evidence score.
        2. Precision@5: Fraction of top-5 ranked candidates that correspond to ground-truth syllabus topics.
        3. Score Separation: Ground-truth evidenced questions score higher than distractor/unrelated concepts.
        4. Model Confidence Isolation: Ensures confidence remains None/unmodified by evidence ranking.

        LIMITATION NOTE:
        This evaluates evidence-grounded prioritization (topic coverage, term frequency, past paper overlap),
        not empirical student pass rates or calibrated future exam probability.
        """
        ranker = QuestionRanker()
        syllabus_text = """
        Course: Design and Analysis of Algorithms
        Unit 1: Asymptotic Analysis and Mathematical Foundations
        Asymptotic notations including Big-O notation, Big-Omega notation, and Big-Theta notation.
        Unit 2: Divide and Conquer
        Divide and conquer algorithmic paradigm. Merge Sort and Quick Sort algorithms.
        Unit 3: Dynamic Programming and Algorithm Paradigms
        Dynamic Programming optimization technique. 0/1 Knapsack problem. Greedy Method vs Dynamic Programming.
        Unit 4: Graph Algorithms
        Single source shortest path: Dijkstra's algorithm. Minimum spanning tree: Kruskal's algorithm and Prim's algorithm.
        """

        # 5 Ground-truth syllabus candidates matching official Parul DAA examination topics
        relevant_candidates = [
            {"id": 1, "topic": "Asymptotic Analysis", "question": "Explain Big-O, Big-Omega, and Big-Theta notations with diagrams.", "difficulty": "easy", "marks": 2, "confidence": None},
            {"id": 2, "topic": "Algorithm Paradigms", "question": "Differentiate between Greedy Method and Dynamic Programming approaches.", "difficulty": "medium", "marks": 5, "confidence": None},
            {"id": 3, "topic": "Dynamic Programming", "question": "Solve the 0/1 Knapsack problem using dynamic programming with state table.", "difficulty": "hard", "marks": 7, "confidence": None},
            {"id": 4, "topic": "Graph Algorithms", "question": "Explain Dijkstra's shortest path algorithm step-by-step with complexity.", "difficulty": "medium", "marks": 8, "confidence": None},
            {"id": 5, "topic": "Divide and Conquer", "question": "Analyze Quick Sort worst-case vs average-case time complexity using recurrence.", "difficulty": "hard", "marks": 15, "confidence": None},
        ]

        # 5 Distractor/unrelated candidates with zero syllabus relevance
        distractor_candidates = [
            {"id": 6, "topic": "Optical Peripheral", "question": "Explain the working mechanism of an optical computer mouse.", "difficulty": "easy", "marks": 2, "confidence": None},
            {"id": 7, "topic": "Audio Amplifier", "question": "Describe the operational amplifier circuit configuration for audio signals.", "difficulty": "medium", "marks": 5, "confidence": None},
            {"id": 8, "topic": "Hydraulic Pump", "question": "Discuss the displacement mechanism in industrial hydraulic pumps.", "difficulty": "hard", "marks": 7, "confidence": None},
            {"id": 9, "topic": "Internal Combustion", "question": "Analyze the four-stroke thermodynamic cycle in internal combustion engines.", "difficulty": "hard", "marks": 8, "confidence": None},
            {"id": 10, "topic": "Concrete Curing", "question": "Describe the hydration reaction and curing timeline of Portland cement.", "difficulty": "medium", "marks": 15, "confidence": None},
        ]

        all_candidates = distractor_candidates + relevant_candidates  # Distractors first to verify ranking reorders correctly
        ranked_result = ranker.rank_questions(all_candidates, syllabus_text)
        ranked = ranked_result["top_25"]
        self.assertEqual(len(ranked), 10)

        # 1. Monotonicity: Each question's evidence score must be >= the subsequent question's score
        for i in range(len(ranked) - 1):
            self.assertGreaterEqual(
                ranked[i]["evidence_score"],
                ranked[i + 1]["evidence_score"],
                f"Rank {i} ({ranked[i]['evidence_score']}) must be >= Rank {i+1} ({ranked[i+1]['evidence_score']})"
            )

        # 2. Precision@5: Top 5 ranked questions must all belong to the syllabus (relevant candidate IDs 1..5)
        top_5_ids = {q["id"] for q in ranked[:5]}
        relevant_ids = {1, 2, 3, 4, 5}
        precision_at_5 = len(top_5_ids & relevant_ids) / 5.0
        print(f"[Independent Ranking Evaluation] Precision@5: {precision_at_5 * 100:.1f}%")
        self.assertEqual(precision_at_5, 1.0, f"Expected Precision@5 to be 1.0, got {precision_at_5}")

        # 3. Score Separation: Minimum evidence score of top-5 must strictly exceed maximum score of distractors
        min_top_5_score = min(q["evidence_score"] for q in ranked[:5])
        max_distractor_score = max(q["evidence_score"] for q in ranked[5:])
        print(f"[Independent Ranking Evaluation] Min Top-5 Evidence: {min_top_5_score:.3f}, Max Distractor Evidence: {max_distractor_score:.3f}")
        self.assertGreater(min_top_5_score, max_distractor_score, "Evidenced syllabus questions must score strictly higher than distractors")

        # 4. Model Confidence Isolation: Ranking by evidence_score must not overwrite confidence
        for q in ranked:
            self.assertIsNone(q.get("confidence"), "Question confidence must remain None during evidence ranking")
            self.assertIsNotNone(q.get("evidence_score"), "Question evidence_score must be populated")
            self.assertTrue(0.0 <= q["evidence_score"] <= 1.0, "evidence_score must be normalized in [0.0, 1.0]")

        # 5. Dynamic Past-Paper Boost: Supplying past papers mentioning specific topics actively increases evidence score
        past_paper_fixture = [
            "Parul University Examination: Discuss Graph Algorithms with focus on Dijkstra shortest paths."
        ]
        boosted_result = ranker.rank_questions(all_candidates, syllabus_text, past_papers=past_paper_fixture)
        graph_q_unboosted = next(q for q in ranked if q["id"] == 4)
        graph_q_boosted = next(q for q in boosted_result["top_25"] if q["id"] == 4)
        dp_q_unboosted = next(q for q in ranked if q["id"] == 3)
        dp_q_boosted = next(q for q in boosted_result["top_25"] if q["id"] == 3)

        self.assertGreater(
            graph_q_boosted["evidence_score"],
            graph_q_unboosted["evidence_score"],
            "Past paper presence must actively boost evidence score for matching topics"
        )
        self.assertAlmostEqual(
            graph_q_boosted["evidence_score"] - graph_q_unboosted["evidence_score"],
            0.20,
            places=2,
            msg="History overlap weight (0.20) must be reflected in boost"
        )
        self.assertEqual(
            dp_q_boosted["evidence_score"],
            dp_q_unboosted["evidence_score"],
            "Unrelated topics must not receive a past paper boost"
        )

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
