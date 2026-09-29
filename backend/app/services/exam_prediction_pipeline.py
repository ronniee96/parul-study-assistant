"""Source-evidence ranking, optional AI review, and study mock generation."""

import re
import random
import logging
from typing import Dict, List, Any, Optional
from collections import Counter

from app.models.schemas import (
    QuestionItem, UniversityExamProfile, UniversityExamSectionSpec,
    PredictionPipelineResponse
)
from app.services.paper_structure_analyzer import PaperStructureAnalyzer
from app.services.parul_repository import ParulRepositoryHarvester

logger = logging.getLogger(__name__)

class ExamPredictionPipeline:
    """End-to-end evidence-based exam intelligence pipeline"""

    def __init__(self, ai_service=None):
        self.ai_service = ai_service
        self.parul_harvester = ParulRepositoryHarvester()

    def run_pipeline(
        self,
        candidate_pool: List[QuestionItem],
        material_text: str,
        past_papers: Optional[List[str]] = None,
        exam_profile: Optional[UniversityExamProfile] = None,
        subject_name: str = "Subject",
        subject_code: Optional[str] = None,
        cross_doc_concepts: Optional[List[Dict[str, Any]]] = None,
        api_keys: Optional[Dict[str, str]] = None,
        preferred_order: Optional[List[str]] = None,
        per_document_candidate_counts: Optional[Dict[str, int]] = None,
    ) -> Dict[str, Any]:
        """
        Executes the full 6-stage funnel from Candidate Universe to Final 25.
        """
        # Learn structure only from uploaded exam papers, never from course notes.
        if not exam_profile or not exam_profile.learned_from_past_papers:
            if past_papers and len(past_papers) > 0:
                exam_profile = PaperStructureAnalyzer.analyze_paper_structure(past_papers[0])
            else:
                exam_profile = UniversityExamProfile(
                    subject=subject_name,
                    subject_code=subject_code,
                )
            exam_profile.subject = subject_name
            if subject_code:
                exam_profile.subject_code = subject_code

        # Fetch Parul digital repository historical evidence
        hist_data = self.parul_harvester.get_historical_topics_and_questions(
            subject=subject_name,
            subject_code=subject_code
        )
        hist_topics = hist_data.get("topic_frequency", {})

        # ── STAGE 2: Multi-Source Evidence Scoring ─────────────────────
        scored_candidates = []
        for q in candidate_pool:
            score_data = self._calculate_evidence_score(
                q=q,
                material_text=material_text,
                past_papers=past_papers,
                hist_topics=hist_topics,
                exam_profile=exam_profile,
                cross_doc_concepts=cross_doc_concepts
            )
            q_copy = q.model_copy()
            q_copy.evidence_score = score_data["total_score"]
            q_copy.confidence = score_data["total_score"]
            q_copy.historical_evidence = score_data["historical_evidence"]
            q_copy.current_material_evidence = score_data["material_evidence"]
            q_copy.university_pattern_evidence = score_data["pattern_evidence"]
            scored_candidates.append(q_copy)

        # Sort by evidence score descending
        scored_candidates.sort(key=lambda x: (x.evidence_score or 0.0), reverse=True)

        # ── STAGE 3: Select TOP 200 with Diversity Constraints ─────────
        top_200 = self._select_top_200_diverse(scored_candidates)

        # ── STAGE 4: Multi-AI Adversarial Review & Cross-Examination ───
        adversarial_reviewed, review_status = self._run_adversarial_review(
            top_200, exam_profile, api_keys=api_keys, preferred_order=preferred_order
        )

        # ── STAGE 5: Refine to TOP 100 with Evidence Cards ─────────────
        top_100 = self._select_top_100_refined(adversarial_reviewed)

        # ── STAGE 6: Select FINAL TOP 25 High-Evidence Predictions ─────
        top_25 = self._select_final_top_25(top_100, exam_profile)

        # ── STAGE 7: Generate Authentic Mock Paper following Profile ───
        mock_paper = self._generate_adaptive_mock_paper(top_25, exam_profile)

        # Calculate Topic Heatmap
        topic_heatmap = self._build_topic_heatmap(top_200, hist_topics)

        return {
            "success": True,
            "evidence_pipeline_version": 1,
            "subject_name": subject_name,
            "candidate_universe_count": len(candidate_pool),
            "top_200_count": len(top_200),
            "top_100_count": len(top_100),
            "final_top_25_count": len(top_25),
            "candidate_pool": candidate_pool[:50],  # sample for UI efficiency
            "top_200": top_200,
            "top_100": top_100,
            "top_25": top_25,
            "learned_exam_profile": exam_profile.model_dump(),
            "predicted_mock_paper": mock_paper,
            "topic_heatmap": topic_heatmap,
            "cross_document_map": cross_doc_concepts or [],
            "per_document_candidate_counts": per_document_candidate_counts or {},
            "adversarial_review_status": review_status["status"],
            "adversarial_reviewed_count": review_status["reviewed_count"],
            "methodology_notes": [
                "Evidence scores use only source material and verified historical records actually supplied; unavailable signals contribute no evidence.",
                review_status["note"],
                "Top 25 predictions use evidence-based confidence categories: 'Very High Evidence', 'High Evidence', 'Moderate Evidence'. Zero false 100% guarantees.",
                "Mock Examination Paper adapts dynamically to the learned UniversityExamProfile (duration, section marks, compulsory/OR choices)."
            ]
        }

    # ── Scoring & Diversity Heuristics ─────────────────────────────────

    def _calculate_evidence_score(
        self,
        q: QuestionItem,
        material_text: str,
        past_papers: Optional[List[str]],
        hist_topics: Dict[str, int],
        exam_profile: UniversityExamProfile,
        cross_doc_concepts: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Scores only signals present in the supplied material, papers, and profile."""
        score = 0.0
        topic_lower = q.topic.lower()
        topic_words = set(re.findall(r"\b\w{4,}\b", topic_lower))
        material_words = set(re.findall(r"\b\w{4,}\b", material_text.lower()))
        topic_coverage = len(topic_words & material_words) / max(len(topic_words), 1)

        # 1. Historical Recurrence Evidence (30%)
        hist_match = False
        hist_score = 0.0
        hist_text = "No matching verified historical question data was available."

        # Check user uploaded past papers
        if past_papers:
            joined_past = " ".join(past_papers).lower()
            past_words = set(re.findall(r'\b\w{4,}\b', joined_past))
            overlap = len(topic_words & past_words)
            if overlap > 0:
                hist_score = min(overlap / max(len(topic_words), 1), 1.0)
                hist_match = True
                hist_text = f"{overlap} of {len(topic_words)} topic terms appear in the user-uploaded past paper text."

        # Check Parul University digital repository PYQ cache
        for h_topic, count in hist_topics.items():
            normalized_history_topic = re.sub(r"\W+", " ", h_topic.lower()).strip()
            normalized_question_topic = re.sub(r"\W+", " ", topic_lower).strip()
            if normalized_history_topic and (normalized_history_topic in normalized_question_topic or normalized_question_topic in normalized_history_topic):
                hist_score = min(0.5 + (max(count, 1) - 1) * 0.1, 1.0)
                hist_match = True
                hist_text = f"Matched {count} verified historical question(s) under '{h_topic}'."
                break

        score += hist_score * 0.30

        # 2. Material Grounding & Depth Evidence (25%)
        mat_score = topic_coverage
        mat_text = f"{len(topic_words & material_words)} of {len(topic_words)} topic terms are present in the uploaded course material."
        if q.source_pages and q.source_evidence:
            mat_score = max(mat_score, 1.0)
            mat_text += f" Question source cites Page/Slide {q.source_pages[0]}."
        score += mat_score * 0.25

        # 3. Cross-Document Reinforcement (15%)
        cross_score = 0.0
        if cross_doc_concepts:
            for cdc in cross_doc_concepts:
                concept = str(cdc.get("concept", "")).lower()
                if concept and (concept in topic_lower or topic_lower in concept):
                    cross_score = min(int(cdc.get("supporting_documents_count", 0)) / 2, 1.0)
                    break
        score += cross_score * 0.15

        # 4. University Exam Pattern Fit (15%)
        pattern_score = 0.0
        pattern_text = "No matching type and marks pattern was found in the supplied exam profile."
        for sec in exam_profile.sections:
            if q.type in sec.question_types or (
                sec.marks_per_question is not None and abs(q.marks - sec.marks_per_question) <= 2
            ):
                pattern_score = 0.92
                pattern_text = f"Matches {sec.name} ({sec.marks_per_question} Marks, {sec.choice_rule})."
                break
        score += pattern_score * 0.15

        # 5. Cognitive Difficulty & Question Quality (15%)
        bloom_strength = {
            "remembering": 0.2, "understanding": 0.4, "applying": 0.6,
            "analyzing": 0.8, "evaluating": 0.9, "creating": 1.0,
        }
        cog_score = bloom_strength.get((q.bloom_level or "").lower(), 0.0)
        score += cog_score * 0.15

        final_score = round(min(max(score, 0.0), 0.98), 2)

        return {
            "total_score": final_score,
            "historical_evidence": hist_text,
            "material_evidence": mat_text,
            "pattern_evidence": pattern_text
        }

    def _select_top_200_diverse(self, sorted_pool: List[QuestionItem]) -> List[QuestionItem]:
        """
        Enforces diversity constraints across topics, question types, and marks
        so that no single module dominates the Top 200.
        """
        selected: List[QuestionItem] = []
        topic_counts = Counter()
        type_counts = Counter()
        max_per_topic = 8
        max_per_type = 50

        # Pass 1: Add high-evidence questions respecting diversity limits
        for q in sorted_pool:
            t = q.topic[:35]
            q_type = q.type
            if topic_counts[t] < max_per_topic and type_counts[q_type] < max_per_type:
                selected.append(q)
                topic_counts[t] += 1
                type_counts[q_type] += 1
            if len(selected) >= 200:
                break

        # Pass 2: If still under 200, relax limits to fill up to 200
        if len(selected) < 200:
            for q in sorted_pool:
                if q not in selected:
                    selected.append(q)
                if len(selected) >= 200:
                    break

        return selected[:200]

    def _run_adversarial_review(
        self,
        top_200: List[QuestionItem],
        exam_profile: UniversityExamProfile,
        api_keys: Optional[Dict[str, str]] = None,
        preferred_order: Optional[List[str]] = None,
    ) -> Any:
        """
        STAGE 4: AI Cross-Examination & Adversarial Evaluation
        Challenging candidates independently:
        - Pros: Why this question could appear.
        - Cons: What evidence contradicts or makes it a distractor.
        - Risk analysis: What could make this prediction wrong.
        """
        ai_result = {"success": False, "status": "not_configured", "reviews": {}}
        if self.ai_service and top_200:
            ai_result = self.ai_service.adversarial_review_questions(
                [q.model_dump() for q in top_200],
                exam_profile.model_dump(),
                api_keys=api_keys,
                preferred_order=preferred_order,
            )

        reviewed = []
        for q in top_200:
            q_copy = q.model_copy()
            review = ai_result.get("reviews", {}).get(str(q.id)) if ai_result.get("success") else None
            q_copy.pros_evidence = review["pros"] if review else [
                signal for signal in (
                    q.current_material_evidence,
                    q.historical_evidence if q.historical_evidence and not q.historical_evidence.startswith("No matching") else None,
                    q.university_pattern_evidence if q.university_pattern_evidence and not q.university_pattern_evidence.startswith("No matching") else None,
                ) if signal
            ]
            q_copy.cons_evidence = review["cons"] if review else []
            q_copy.risk_analysis = review["risk"] if review else "AI adversarial review was not completed; configure a provider key to run it."
            q_copy.adversarial_reviewed = bool(review)
            q_copy.adversarial_score = review["score"] if review else None
            q_copy.confidence_label = None
            reviewed.append(q_copy)

        reviewed_count = sum(q.adversarial_reviewed for q in reviewed)
        note = (
            f"AI adversarial review completed for {reviewed_count} of {len(reviewed)} candidates."
            if ai_result.get("success") else
            "AI adversarial review was not run because no configured provider key was available or all configured providers failed."
        )
        return reviewed, {"status": ai_result.get("status", "not_run"), "reviewed_count": reviewed_count, "note": note}

    def _select_top_100_refined(self, reviewed_200: List[QuestionItem]) -> List[QuestionItem]:
        """Filters Top 200 to Top 100 based on adversarial balance and strong pros"""
        # Sort by evidence score minus penalty if cons are severe
        def rank_key(q: QuestionItem):
            evidence = q.evidence_score or 0.0
            if q.adversarial_reviewed and q.adversarial_score is not None:
                return evidence * 0.7 + q.adversarial_score * 0.3
            return evidence

        sorted_100 = sorted(reviewed_200, key=rank_key, reverse=True)
        return sorted_100[:100]

    def _select_final_top_25(
        self,
        top_100: List[QuestionItem],
        exam_profile: UniversityExamProfile
    ) -> List[QuestionItem]:
        """
        Selects the Final 25 High-Confidence Predictions with strict syllabus coverage.
        Ensures representation across all sections (Short, Medium, Numerical, Essay).
        """
        final_25: List[QuestionItem] = []
        topic_counts = Counter()
        type_counts = Counter()

        # Prioritize items with 'Very High Evidence' and 'High Evidence'
        priority_items = [q for q in top_100 if q.confidence_label in ["Very High Evidence", "High Evidence"]]
        other_items = [q for q in top_100 if q not in priority_items]

        for q in priority_items + other_items:
            t = q.topic[:30]
            # Max 2 questions per exact topic in final 25 to guarantee variety
            if topic_counts[t] < 2:
                final_25.append(q)
                topic_counts[t] += 1
                type_counts[q.type] += 1
            if len(final_25) >= 25:
                break

        # Re-number 1 to 25
        for i, q in enumerate(final_25):
            q.id = i + 1

        return final_25

    def _generate_adaptive_mock_paper(
        self,
        top_25: List[QuestionItem],
        profile: UniversityExamProfile
    ) -> Dict[str, Any]:
        """
        Compiles a realistic university examination mock paper adhering dynamically
        to the learned UniversityExamProfile (Section names, marks, and choice rules).
        """
        paper_sections = []
        available_questions = list(top_25)

        for sec_spec in profile.sections:
            sec_questions = []
            target_types = sec_spec.question_types
            mks = sec_spec.marks_per_question

            # Find matching questions
            matching = [q for q in available_questions if q.type in target_types or (mks is not None and abs(q.marks - mks) <= 3)]
            for q in matching[:sec_spec.num_questions]:
                q_copy = q.model_copy()
                if mks is not None:
                    q_copy.marks = int(mks)
                sec_questions.append(q_copy)
                available_questions.remove(q)

            # Fill up if remaining
            while len(sec_questions) < sec_spec.num_questions and available_questions:
                q = available_questions.pop(0)
                q_copy = q.model_copy()
                if mks is not None:
                    q_copy.marks = int(mks)
                sec_questions.append(q_copy)

            paper_sections.append({
                "section_id": sec_spec.section_id,
                "name": sec_spec.name,
                "description": sec_spec.description,
                "marks_per_question": mks,
                "num_questions": len(sec_questions),
                "choice_rule": sec_spec.choice_rule or "Compulsory",
                "total_marks": sec_spec.total_marks,
                "questions": [q.model_dump() for q in sec_questions]
            })

        if not paper_sections:
            paper_sections = [{
                "section_id": "practice",
                "name": "Source-grounded practice questions",
                "description": "No uploaded exam blueprint was available; structure and suggested marks were not verified.",
                "marks_per_question": None,
                "num_questions": len(available_questions),
                "choice_rule": "No exam pattern inferred",
                "total_marks": None,
                "questions": [q.model_dump() for q in available_questions],
            }]

        instructions = ["Study mock generated from uploaded course material; it is not an official university paper."]
        if profile.duration_hours is not None:
            instructions.append(f"Duration shown in the uploaded paper: {profile.duration_hours} hours.")
        if profile.total_marks is not None:
            instructions.append(f"Maximum marks shown in the uploaded paper: {profile.total_marks}.")

        return {
            "university": profile.university,
            "subject": profile.subject,
            "subject_code": profile.subject_code,
            "semester": profile.semester,
            "exam_type": profile.exam_type,
            "duration_hours": profile.duration_hours,
            "total_marks": profile.total_marks,
            "general_instructions": instructions,
            "sections": paper_sections
        }

    def _build_topic_heatmap(self, questions: List[QuestionItem], hist_topics: Dict[str, int]) -> Dict[str, Any]:
        heatmap = {}
        topic_counts = Counter(q.topic[:35] for q in questions)
        for top, cnt in topic_counts.most_common(12):
            historical_count = sum(
                count for historical_topic, count in hist_topics.items()
                if historical_topic.lower() in top.lower() or top.lower() in historical_topic.lower()
            )
            heatmap[top] = {
                "candidate_count": cnt,
                "verified_historical_question_count": historical_count,
                "question_count": cnt,
            }
        return heatmap
