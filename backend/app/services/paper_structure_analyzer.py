"""
Paper Structure Analyzer & University Exam Pattern Learner
Analyzes past question papers to extract authentic university examination profiles:
duration, total marks, section breakdowns, compulsory vs optional OR-choices,
Bloom's Taxonomy distribution, theory vs numerical balance, and command verbs.
"""

import re
import logging
from typing import Dict, List, Any, Optional
from app.models.schemas import UniversityExamProfile, UniversityExamSectionSpec

logger = logging.getLogger(__name__)

class PaperStructureAnalyzer:
    """Analyzes question paper text and extracts the university examination profile"""

    COMMAND_VERBS = [
        "Define", "State", "List", "Enumerate", "Explain", "Describe", "Discuss",
        "Distinguish", "Differentiate", "Compare", "Calculate", "Determine",
        "Compute", "Derive", "Solve", "Critically analyze", "Evaluate", "Illustrate"
    ]

    @classmethod
    def analyze_paper_structure(cls, text: str, filename: str = "Past Paper") -> UniversityExamProfile:
        """
        Extracts structural examination blueprint from past paper text.
        """
        profile = UniversityExamProfile(
            learned_from_past_papers=True,
            past_paper_count=1
        )

        # 1. Header Metadata Extraction
        text_head = text[:2500]

        # University
        if re.search(r'parul\s*university', text_head, re.IGNORECASE):
            profile.university = "Parul University"
        elif univ_match := re.search(r'([A-Z\s]{4,40}\s+UNIVERSITY)', text_head, re.IGNORECASE):
            profile.university = univ_match.group(1).title()

        # Subject & Code
        if code_match := re.search(r'(?:Subject\s*Code|Course\s*Code|Paper\s*Code)\s*[:\-]?\s*([A-Za-z0-9\-_]{4,15})', text_head, re.IGNORECASE):
            profile.subject_code = code_match.group(1).strip()

        if sub_match := re.search(r'(?:Subject|Course|Paper)\s*(?:Name)?\s*[:\-]\s*([^\n\r,]{3,60})', text_head, re.IGNORECASE):
            profile.subject = sub_match.group(1).strip()
        else:
            # Try to grab prominent header line
            lines = [l.strip() for l in text_head.split('\n') if l.strip()]
            for l in lines[:6]:
                if not re.search(r'university|examination|semester|marks|time|date|roll|enrol', l, re.IGNORECASE) and 4 < len(l) < 50:
                    profile.subject = l
                    break

        # Semester
        if sem_match := re.search(r'(?:Semester|Sem)\s*[:\-]?\s*([0-9IVX]+)', text_head, re.IGNORECASE):
            profile.semester = f"Semester {sem_match.group(1)}"

        # Total Marks
        if marks_match := re.search(r'(?:Total\s*Marks|Max\s*Marks|Maximum\s*Marks)\s*[:\-]?\s*(\d{2,3})', text_head, re.IGNORECASE):
            profile.total_marks = int(marks_match.group(1))
        else:
            profile.total_marks = None

        # Duration
        if time_match := re.search(r'(?:Time|Duration)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:Hours?|Hrs?|mins?)', text_head, re.IGNORECASE):
            val = float(time_match.group(1))
            profile.duration_hours = val if val <= 4.0 else round(val / 60.0, 1)
        else:
            profile.duration_hours = None

        # Exam Type
        if re.search(r'internal|mid\s*sem|mid-term|unit\s*test', text_head, re.IGNORECASE):
            profile.exam_type = "Internal Examination"
        elif re.search(r'external|remedial|atkt', text_head, re.IGNORECASE):
            profile.exam_type = "External Examination (Remedial)"
        else:
            profile.exam_type = "Unspecified"

        # 2. Section and Question Pattern Breakdown
        sections = cls._extract_sections(text)
        profile.sections = sections

        # 3. Bloom's Taxonomy & Theory vs Numerical Estimation
        bloom_dist = cls._estimate_bloom_distribution(text)
        profile.bloom_distribution = bloom_dist

        ratio = cls._estimate_theory_numerical_ratio(text)
        profile.theory_vs_numerical = ratio

        # 4. Command Verbs
        verbs_found = [v for v in cls.COMMAND_VERBS if re.search(rf'\b{v}\b', text, re.IGNORECASE)]
        profile.recurring_command_verbs = verbs_found

        return profile

    @classmethod
    def _extract_sections(cls, text: str) -> List[UniversityExamSectionSpec]:
        """Detects Section I, Section II, or Q1-Q6 pattern with marks and choices"""
        sections = []

        # Check for explicit Section markers (Section A / Section B / Part I / Part II)
        section_matches = list(re.finditer(r'(?:SECTION|PART)\s*[-–—:]?\s*([A-Z0-9]+)', text, re.IGNORECASE))

        if len(section_matches) >= 2:
            for i, match in enumerate(section_matches):
                sec_name = f"Section {match.group(1).upper()}"
                start_pos = match.end()
                end_pos = section_matches[i+1].start() if i+1 < len(section_matches) else len(text)
                sec_text = text[start_pos:end_pos]

                # Analyze questions inside this section
                q_count = len(re.findall(r'(?:^|\n)\s*(?:Q\.?\s*\d+|\d+\.)', sec_text))
                if not q_count:
                    continue

                # Marks per question in this section
                m_match = re.search(r'\[\s*(\d+(?:\.\d+)?)\s*Marks?\s*\]|\(\s*(\d+(?:\.\d+)?)\s*M\s*\)', sec_text, re.IGNORECASE)
                m_val = float(m_match.group(1) or m_match.group(2)) if m_match else None

                # Choice rule
                choice = "Not inferred"
                if re.search(r'attempt\s*any\s*(\d+)', sec_text, re.IGNORECASE):
                    choice_m = re.search(r'attempt\s*any\s*(\d+)', sec_text, re.IGNORECASE)
                    choice = f"Attempt any {choice_m.group(1)}"
                elif re.search(r'\bOR\b', sec_text):
                    choice = "Internal choice (Q OR Q)"
                elif re.search(r'compulsory|answer all|all questions', sec_text, re.IGNORECASE):
                    choice = "Compulsory"

                sections.append(UniversityExamSectionSpec(
                    section_id=f"sec_{match.group(1).lower()}",
                    name=sec_name,
                    marks_per_question=m_val,
                    num_questions=q_count,
                    choice_rule=choice,
                    total_marks=None,
                    question_types=(
                        ["multiple_choice", "very_short_answer"] if m_val is not None and m_val <= 2 else
                        ["short_answer", "descriptive"] if m_val is not None else []
                    )
                ))
        return sections

    @classmethod
    def _estimate_bloom_distribution(cls, text: str) -> Dict[str, float]:
        t_lower = text.lower()
        counts = {
            "remembering": len(re.findall(r'\b(define|state|list|name|identify|what is)\b', t_lower)),
            "understanding": len(re.findall(r'\b(explain|describe|discuss|distinguish|summarize)\b', t_lower)),
            "applying": len(re.findall(r'\b(calculate|compute|solve|apply|demonstrate|determine)\b', t_lower)),
            "analyzing": len(re.findall(r'\b(analyze|compare|contrast|differentiate|classify)\b', t_lower)),
            "evaluating": len(re.findall(r'\b(evaluate|assess|justify|critique|judge)\b', t_lower)),
            "creating": len(re.findall(r'\b(design|formulate|construct|derive|develop)\b', t_lower)),
        }
        total = sum(counts.values()) or 1
        return {k: round((v / total) * 100, 1) for k, v in counts.items()}

    @classmethod
    def _estimate_theory_numerical_ratio(cls, text: str) -> Dict[str, float]:
        t_lower = text.lower()
        numerical_signals = len(re.findall(r'\b(calculate|compute|solve|find the|determine the|cost sheet|variance|bep|ratio|units|rs\.|inr|\$|\d+\s*(?:kg|units|litres|hours))\b', t_lower))
        theory_signals = len(re.findall(r'\b(explain|define|discuss|describe|advantages|disadvantages|principles|concept)\b', t_lower))
        total = numerical_signals + theory_signals
        if not total:
            return {}

        num_pct = round((numerical_signals / total) * 100, 1)
        theory_pct = round(100.0 - num_pct, 1)
        return {"theory_pct": theory_pct, "numerical_pct": num_pct}
