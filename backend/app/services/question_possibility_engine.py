"""
Document-Specific Question Possibility Engine
Generates distinct candidate questions from extracted academic elements; short documents can produce fewer than the requested target.
Matches question formats dynamically to extracted content types:
- Formulas -> Numerical / Calculation / Derivations
- Definitions -> 1-2M Very Short / Terminology questions
- Comparisons -> Distinguish between / Comparative matrices
- Processes -> Workflow / Sequence / Flowchart / Mechanism questions
- Advantages/Disadvantages -> Evaluative & Analytical questions
- Core Concepts -> Descriptive / 5M / 12-15M Case / Essay questions
Assigns Bloom's Taxonomy, marks suggestion, and full source provenance to every question.
Orchestrates multi-document pools (Doc 1 -> 300, Doc 2 -> 300, Total -> ~600),
applies semantic deduplication, and builds cross-document concept maps.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
from app.models.schemas import QuestionItem, NormalizedAcademicDocument

logger = logging.getLogger(__name__)

class QuestionPossibilityEngine:
    """Generates ~300 questions per document with multi-type cognitive taxonomy"""

    BLOOM_TAXONOMY = {
        "very_short_answer": ("remembering", 2),
        "multiple_choice": ("understanding", 2),
        "short_answer": ("understanding", 5),
        "differentiate": ("analyzing", 5),
        "process_mechanism": ("applying", 6),
        "numerical": ("applying", 7),
        "descriptive": ("evaluating", 8),
        "case_study": ("evaluating", 12),
        "essay": ("creating", 15),
        "diagram_based": ("analyzing", 5),
    }

    def generate_document_universe(self, doc_data: Dict[str, Any], target_count: int = 300) -> List[QuestionItem]:
        """
        Generates up to `target_count` distinct questions from extracted elements.
        """
        doc_id = doc_data.get("document_id") or doc_data.get("id") or "doc_1"
        filename = doc_data.get("filename", "Academic Document")
        elements = doc_data.get("elements", [])
        definitions = doc_data.get("definitions", [])
        formulas = doc_data.get("formulas", [])
        full_text = doc_data.get("full_text") or doc_data.get("text", "")

        # Fallback element creation if raw text was sparse
        if not elements:
            paragraphs = [p.strip() for p in re.split(r'\n{2,}', full_text) if len(p.strip()) > 30]
            for i, p in enumerate(paragraphs[:40]):
                first_sent = p.split('.')[0][:50]
                elements.append({
                    "element_type": "concept",
                    "title": first_sent,
                    "content": p,
                    "page_number": (i // 5) + 1,
                    "provenance": {
                        "document_id": doc_id,
                        "filename": filename,
                        "page_number": (i // 5) + 1,
                        "section_heading": first_sent,
                        "content_type": "concept",
                        "snippet": p[:100]
                    }
                })

        candidates: List[QuestionItem] = []
        q_id = 1

        # ── 1. Formula Questions ────────────────────────────────────────
        for f in formulas:
            f_title = f.get("title", "Core Calculation")
            f_content = f.get("content", "")
            p_num = f.get("page_number", 1)

            # Do not invent numeric inputs that the source does not provide.
            candidates.append(QuestionItem(
                id=q_id,
                type="short_answer",
                question=f"State the formula for '{f_title}' and identify the variables documented in the source.",
                options=None,
                correct_answer=f"Source formula: {f_content}. The source does not provide numeric inputs for a calculated result.",
                key_points=[f"Formula from source: {f_content}"],
                explanation="Question generated from the extracted formula; the source does not supply numeric inputs for a calculation.",
                topic=f_title[:45],
                confidence=0.0,
                difficulty="medium",
                bloom_level="understanding",
                marks=5,
                marks_suggestion=5,
                category="Formula & Method",
                source_document_id=doc_id,
                source_filename=filename,
                source_pages=[p_num],
                source_evidence=f"Formula verified on Page/Slide {p_num}: {f_content}",
                generation_method="formula_driven"
            ))
            q_id += 1

            # Explain the formula without inventing a derivation absent from the source.
            candidates.append(QuestionItem(
                id=q_id,
                type="essay",
                question=f"Explain the formula for '{f_title}' and state assumptions explicitly present in the source.",
                options=None,
                correct_answer=f"Source formula: {f_content}. The material does not establish a derivation or additional assumptions.",
                key_points=[f"Formula stated in source: {f_content}"],
                explanation="Generated from the extracted formula; no exam-paper marks pattern was supplied.",
                topic=f_title[:45],
                confidence=0.0,
                difficulty="hard",
                bloom_level="analyzing",
                marks=8,
                marks_suggestion=8,
                category="Derivation & Theory",
                source_document_id=doc_id,
                source_filename=filename,
                source_pages=[p_num],
                source_evidence=f"Governing formula from Page/Slide {p_num}: {f_content}",
                generation_method="formula_driven"
            ))
            q_id += 1

        # ── 2. Definition & Terminology (Target: ~50) ───────────────────
        for d in definitions:
            term = d.get("title", "Concept")
            meaning = d.get("content", "")
            p_num = d.get("page_number", 1)

            # Very Short Definition (1-2M)
            candidates.append(QuestionItem(
                id=q_id,
                type="very_short_answer",
                question=f"Define the term '{term}'. [2 Marks]",
                options=None,
                correct_answer=meaning,
                key_points=[meaning],
                explanation="Question generated from the extracted definition; marks are suggested.",
                topic=term[:45],
                confidence=0.0,
                difficulty="easy",
                bloom_level="remembering",
                marks=2,
                marks_suggestion=2,
                category="Definitions & Core Terms",
                source_document_id=doc_id,
                source_filename=filename,
                source_pages=[p_num],
                source_evidence=f"Extracted definition from Page/Slide {p_num}: {meaning[:80]}...",
                generation_method="definition_driven"
            ))
            q_id += 1

            other_definitions = list(dict.fromkeys(
                item.get("content", "").strip()[:100]
                for item in definitions
                if item is not d and item.get("content", "").strip() and item.get("content", "").strip() != meaning.strip()
            ))[:3]
            if len(other_definitions) == 3:
                candidates.append(QuestionItem(
                    id=q_id,
                    type="multiple_choice",
                    question=f"Which statement matches the extracted definition of '{term}'?",
                    options=[f"A) {meaning[:100]}", *(f"{letter}) {text}" for letter, text in zip("BCD", other_definitions))],
                    correct_answer=f"Correct Option: A\nExtracted definition: {meaning}",
                    key_points=[meaning],
                    explanation=f"The answer is the extracted definition on Page/Slide {p_num}.",
                    topic=term[:45],
                    confidence=0.0,
                    difficulty="medium",
                    bloom_level="understanding",
                    marks=2,
                    marks_suggestion=2,
                    category="Objective MCQs",
                    source_document_id=doc_id,
                    source_filename=filename,
                    source_pages=[p_num],
                    source_evidence=f"Page/Slide {p_num}: {meaning[:100]}",
                    generation_method="definition_mcq"
                ))
                q_id += 1

        # ── 3. Comparisons & Distinctions (Target: ~30) ──────────────────
        comp_elements = [e for e in elements if e.get("element_type") == "comparison"]
        for c in comp_elements:
            c_title = c.get("title", "Comparative Study")
            c_content = c.get("content", "")
            p_num = c.get("page_number", 1)

            candidates.append(QuestionItem(
                id=q_id,
                type="differentiate",
                question=f"Summarize the distinctions in '{c_title}' stated in the supplied material. [5 Marks]",
                options=None,
                correct_answer=c_content[:500],
                key_points=[part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", c_content) if part.strip()][:4],
                explanation="Question generated from the extracted comparison; additional criteria are not inferred.",
                topic=c_title[:45],
                confidence=0.0,
                difficulty="medium",
                bloom_level="analyzing",
                marks=5,
                marks_suggestion=5,
                category="Comparative Questions",
                source_document_id=doc_id,
                source_filename=filename,
                source_pages=[p_num],
                source_evidence=f"Comparison text from Page/Slide {p_num}: {c_content[:80]}",
                generation_method="comparison_driven"
            ))
            q_id += 1

        # ── 4. Process, Mechanism & Workflow (Target: ~40) ───────────────
        proc_elements = [e for e in elements if e.get("element_type") == "process"]
        for pr in proc_elements:
            pr_title = pr.get("title", "Process Overview")
            pr_content = pr.get("content", "")
            p_num = pr.get("page_number", 1)

            candidates.append(QuestionItem(
                id=q_id,
                type="process_mechanism",
                question=f"Describe the process steps for '{pr_title}' using the sequence stated in the source. [6-7 Marks]",
                options=None,
                correct_answer=pr_content[:500],
                key_points=[part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", pr_content) if part.strip()][:4],
                explanation="Question generated from the process text extracted from the source.",
                topic=pr_title[:45],
                confidence=0.0,
                difficulty="medium",
                bloom_level="applying",
                marks=6,
                marks_suggestion=6,
                category="Process & Mechanism",
                source_document_id=doc_id,
                source_filename=filename,
                source_pages=[p_num],
                source_evidence=f"Process steps from Page/Slide {p_num}: {pr_content[:80]}",
                generation_method="process_driven"
            ))
            q_id += 1

        # ── 5. Advantages, Disadvantages & Critical Analysis (~30) ──────
        adv_elements = [e for e in elements if e.get("element_type") == "advantage_disadvantage"]
        for ad in adv_elements:
            ad_title = ad.get("title", "Evaluation")
            ad_content = ad.get("content", "")
            p_num = ad.get("page_number", 1)

            candidates.append(QuestionItem(
                id=q_id,
                type="descriptive",
                question=f"Explain the advantages and limitations of '{ad_title}' described in the supplied material. [5 Marks]",
                options=None,
                correct_answer=ad_content[:500],
                key_points=[part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", ad_content) if part.strip()][:4],
                explanation="Evaluative exam question testing Bloom's level: Evaluating.",
                topic=ad_title[:45],
                confidence=0.0,
                difficulty="medium",
                bloom_level="evaluating",
                marks=5,
                marks_suggestion=5,
                category="Critical Evaluation",
                source_document_id=doc_id,
                source_filename=filename,
                source_pages=[p_num],
                source_evidence=f"Trade-offs on Page/Slide {p_num}: {ad_content[:80]}",
                generation_method="tradeoff_driven"
            ))
            q_id += 1

        # ── 6. Comprehensive Concept-Driven Multi-Tier Questions ────────
        # Generate concept prompts only from passages with actual answer content.
        concept_elements = [e for e in elements if e.get("element_type") == "concept"] or elements

        templates = [
            ("short_answer", "Explain '{term}' using the points stated in the supplied source. [5 Marks]", "understanding", 5, "Descriptive Short Answer"),
            ("essay", "Write a structured explanation of '{term}' using only the supplied source material. [15 Marks]", "creating", 15, "Comprehensive Long Essay"),
            ("very_short_answer", "What does the supplied material state about '{term}'? [2 Marks]", "remembering", 2, "Short Conceptual"),
        ]

        # Use each source concept once with each question form; do not pad a
        # small document by repeating the same generic candidates.
        for element_index, el in enumerate(concept_elements):
            if len(candidates) >= target_count:
                break
            term = el.get("title", f"Topic {element_index + 1}")
            clean_term = re.sub(r'^[•\-\*\d\.\)]+\s*', '', term).strip()
            clean_term = re.sub(r'^(?:what is|explain|overview of)\s+', '', clean_term, flags=re.IGNORECASE)[:50]
            p_num = el.get("page_number", 1)
            content = el.get("content", "")
            if not clean_term or not content.strip():
                continue

            for tmpl_type, tmpl_q, tmpl_bloom, tmpl_marks, tmpl_cat in templates:
                if len(candidates) >= target_count:
                    break
                q_text = tmpl_q.format(term=clean_term)
                options = None
                source_points = [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", content) if part.strip()][:4]
                candidates.append(QuestionItem(
                    id=q_id,
                    type=tmpl_type,
                    question=q_text,
                    options=options,
                    correct_answer=content[:500].strip(),
                    key_points=source_points,
                    explanation=f"Source-grounded prompt from Page/Slide {p_num}; review the cited passage for the answer.",
                    topic=clean_term,
                    confidence=0.0,
                    difficulty="medium" if tmpl_marks <= 5 else "hard",
                    bloom_level=tmpl_bloom,
                    marks=tmpl_marks,
                    marks_suggestion=tmpl_marks,
                    category=tmpl_cat,
                    source_document_id=doc_id,
                    source_filename=filename,
                    source_pages=[p_num],
                    source_evidence=f"Source passage from Page/Slide {p_num}: {content[:160]}",
                    generation_method="academic_taxonomy"
                ))
                q_id += 1

        # Final pass: Deduplicate and ensure exact unique count up to target_count
        unique_candidates = self._deduplicate_items(candidates)
        # Re-number IDs
        for i, q in enumerate(unique_candidates):
            q.id = i + 1

        return unique_candidates[:target_count]

    def process_multiple_documents(self, documents: List[Dict[str, Any]], target_per_doc: int = 300) -> Dict[str, Any]:
        """
        Processes each document independently to produce ~300 questions each,
        then combines, identifies cross-document concepts, and clusters duplicates.
        e.g., 2 PDFs -> ~600 candidate questions before deduplication.
        """
        per_doc_pools: Dict[str, List[QuestionItem]] = {}
        combined_raw: List[QuestionItem] = []
        doc_topics_map: Dict[str, set] = {}

        for doc_index, doc in enumerate(documents):
            d_id = doc.get("document_id") or doc.get("id") or f"doc_{doc_index + 1}"
            fname = doc.get("filename", "Uploaded File")
            pool = self.generate_document_universe(doc, target_count=target_per_doc)
            per_doc_pools[d_id] = pool
            combined_raw.extend(pool)
            doc_topics_map[d_id] = set(q.topic.lower() for q in pool)

        # Cross-document concept mapping
        cross_doc_concepts = []
        all_topics = set()
        for t_set in doc_topics_map.values():
            all_topics.update(t_set)

        for topic in all_topics:
            supporting_docs = [d_id for d_id, t_set in doc_topics_map.items() if topic in t_set]
            if len(supporting_docs) > 1:
                cross_doc_concepts.append({
                    "concept": topic.title(),
                    "supporting_documents_count": len(supporting_docs),
                    "document_ids": supporting_docs,
                    "evidence_boost": 0.15  # Cross-document reinforcement boost
                })

        # Apply semantic deduplication
        deduped = self._deduplicate_items(combined_raw)
        for i, q in enumerate(deduped):
            q.id = i + 1

        per_doc_counts = {d_id: len(pool) for d_id, pool in per_doc_pools.items()}

        return {
            "success": True,
            "total_raw_candidates": len(combined_raw),
            "total_after_dedup": len(deduped),
            "per_document_counts": per_doc_counts,
            "cross_document_concepts": cross_doc_concepts[:30],
            "combined_questions": deduped
        }

    def _deduplicate_items(self, items: List[QuestionItem]) -> List[QuestionItem]:
        seen = set()
        unique = []
        for q in items:
            # Normalized fingerprint using first 70 characters of lowercase alphanumeric string
            cleaned = re.sub(r'[^a-z0-9]', '', q.question.lower())[:70]
            if cleaned not in seen:
                seen.add(cleaned)
                unique.append(q)
        return unique
