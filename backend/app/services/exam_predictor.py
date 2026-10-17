import re
import hashlib
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class ExamPredictor:
    """Source-grounded exam question prediction engine with zero fabricated mock fallbacks."""

    IMPORTANCE_KEYWORDS = [
        'important', 'key concept', 'definition', 'define',
        'fundamental', 'essential', 'primary', 'main',
        'critical', 'significant', 'major', 'core',
        'principle', 'theory', 'framework', 'model',
        'advantages', 'disadvantages', 'types', 'classification',
        'process', 'steps', 'stages', 'factors',
        'difference between', 'compare', 'contrast',
        'explain', 'describe', 'discuss', 'analyze',
        'formula', 'equation', 'calculate'
    ]

    def __init__(self, ai_service=None):
        self.ai_service = ai_service

    def predict_exam(
        self,
        material_text: str,
        past_papers: Optional[List[str]] = None,
        subject_name: str = "Subject",
        total_marks: int = 60,
        api_keys: Optional[Dict[str, str]] = None,
        preferred_order: Optional[List[str]] = None,
        session_id: Optional[str] = None,
        document_id: Optional[str] = None,
        content_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a predicted exam paper grounded strictly in `material_text`."""
        cleaned_material = (material_text or "").strip()
        if len(cleaned_material) < 30:
            return {
                "success": False,
                "error": "Insufficient source material to predict exam questions.",
                "subject_name": subject_name,
                "total_marks": total_marks,
                "time_hours": 3,
                "overall_confidence": None,
                "topic_heatmap": {},
                "sections": [],
            }

        resolved_hash = content_hash or hashlib.sha256(cleaned_material.encode("utf-8")).hexdigest()

        try:
            topics = self._extract_weighted_topics(cleaned_material)
            if past_papers:
                topics = self._boost_from_past_papers(topics, past_papers)

            questions: List[Dict[str, Any]] = []
            engine_used = "Deterministic Syllabus Extractor (Grounded)"
            is_ai_generated = False
            generation_method = "deterministic_syllabus_extraction"

            if self.ai_service and api_keys and any(len(k or '') > 5 for k in api_keys.values()):
                ai_res = self.ai_service.generate_questions_with_failover(
                    cleaned_material[:8000],
                    num_questions=15,
                    question_types=["multiple_choice", "short_answer", "essay"],
                    api_keys=api_keys,
                    preferred_order=preferred_order,
                )
                if ai_res.get('success') and ai_res.get('questions'):
                    questions = ai_res['questions']
                    engine_used = ai_res.get('engine_used', engine_used)
                    is_ai_generated = bool(ai_res.get('is_ai_generated', False))
                    generation_method = ai_res.get('generation_method', 'ai_model' if is_ai_generated else 'deterministic_syllabus_extraction')

            if not questions and topics:
                questions = self._generate_university_questions(topics, cleaned_material)
                engine_used = "Deterministic Syllabus Extractor (Grounded)"
                is_ai_generated = False
                generation_method = "deterministic_syllabus_extraction"

            if not questions:
                return {
                    "success": False,
                    "error": "No grounded exam topics or questions could be extracted from the supplied material.",
                    "subject_name": subject_name,
                    "total_marks": total_marks,
                    "time_hours": 3,
                    "overall_confidence": None,
                    "is_ai_generated": False,
                    "generation_method": "deterministic_syllabus_extraction",
                    "topic_heatmap": {},
                    "sections": [],
                }

            for q in questions:
                if session_id:
                    q["session_id"] = session_id
                if document_id:
                    q["source_document_id"] = document_id
                q["content_hash"] = resolved_hash
                q.setdefault("is_ai_generated", is_ai_generated)
                q.setdefault("generation_method", generation_method)

            paper = self._format_as_university_paper(questions, subject_name, total_marks)
            heatmap = self._create_topic_heatmap(topics)
            sample_qs = questions[:12]
            valid_confs = [float(q['confidence']) for q in sample_qs if q.get('confidence') is not None]
            avg_conf = (
                round(sum(valid_confs) / len(valid_confs), 3)
                if (valid_confs and is_ai_generated) else None
            )

            return {
                "success": True,
                "subject_name": subject_name,
                "total_marks": total_marks,
                "time_hours": 3,
                "overall_confidence": avg_conf,
                "is_ai_generated": is_ai_generated,
                "generation_method": generation_method,
                "topic_heatmap": heatmap,
                "sections": paper,
                "engine_used": engine_used,
                "session_id": session_id,
                "source_document_id": document_id,
                "content_hash": resolved_hash,
            }
        except Exception as e:
            logger.error(f"Exam prediction failed: {e}")
            return {
                "success": False,
                "error": f"Exam prediction failed: {e}",
                "subject_name": subject_name,
                "total_marks": total_marks,
                "time_hours": 3,
                "overall_confidence": None,
                "topic_heatmap": {},
                "sections": [],
            }

    def _extract_weighted_topics(self, text: str) -> List[Dict[str, Any]]:
        """Extract topics with importance weights from material."""
        boilerplate_pattern = re.compile(
            r'\b(parul\s*university|vadodara|gujarat|naac|grade\s*a\+\+?|faculty\s+of|'
            r'department\s+of|institute\s+of|assignment\s*\d*|lecture\s*\d*|module\s*\d*|'
            r'unit\s*\d*|semester|roll\s*no|enrolment|academic\s*year|subject\s*code|'
            r'all\s*rights\s*reserved|copyright|prepared\s*by|presented\s*by|dr\.|prof\.|'
            r'page\s*\d+|slide\s*\d+)\b',
            re.IGNORECASE
        )

        title_pattern = re.compile(
            r'\b(course\s+syllabus|syllabus|curriculum|examination|question\s+paper|end-term)\b',
            re.IGNORECASE
        )

        paragraphs = [
            p.strip()
            for p in re.split(r'\n{2,}|\n(?=\s*(?:Unit|Module|Chapter)\s+\d+[:\.\-])|---\s*Slide\s*\d+\s*---', text)
            if len(p.strip()) > 20
        ]
        topic_scores = {}

        for para in paragraphs:
            cleaned_para = re.sub(
                r'^(?:unit|module|chapter|lecture|section)\s*\d+[:\-\s]*',
                '',
                para.strip(),
                flags=re.IGNORECASE
            )

            sentences = [s.strip() for s in re.split(r'[\.\!\?\n]', cleaned_para) if len(s.strip()) > 8]
            if not sentences:
                continue

            topic = None
            for s in sentences:
                cand = re.sub(
                    r'^(?:unit|module|chapter|lecture|section)\s*\d+[:\-\s]*',
                    '',
                    s.strip(),
                    flags=re.IGNORECASE
                ).strip()
                if not cand or boilerplate_pattern.search(cand) or title_pattern.search(cand):
                    continue
                if len(cand.split()) >= 2:
                    topic = cand[:80]
                    break

            if not topic:
                continue

            importance = 0
            text_lower = para.lower()

            for keyword in self.IMPORTANCE_KEYWORDS:
                if keyword in text_lower:
                    importance += 10

            importance += min(len(para) / 100, 20)

            if any(marker in text_lower for marker in ['is defined as', 'refers to', 'means', 'is the process of']):
                importance += 25

            list_items = re.findall(r'(?:^|\n)\s*[•\-\d]+[.)\s]', para)
            importance += len(list_items) * 5

            if 'example' in text_lower or 'for instance' in text_lower or 'such as' in text_lower:
                importance += 15

            key = topic[:50].lower().strip()
            if key in topic_scores:
                topic_scores[key]['score'] += importance
                topic_scores[key]['content'] += '\n' + para
            else:
                topic_scores[key] = {
                    'topic': topic,
                    'score': importance,
                    'content': para
                }

        sorted_topics = sorted(topic_scores.values(), key=lambda x: x['score'], reverse=True)

        if sorted_topics:
            max_score = sorted_topics[0]['score']
            for t in sorted_topics:
                t['normalized_score'] = round(t['score'] / max_score * 100, 1) if max_score > 0 else 50.0

        return sorted_topics[:30]

    def _boost_from_past_papers(self, topics: List[Dict], past_papers: List[str]) -> List[Dict]:
        """Boost topic scores based on past paper question frequency."""
        combined_past = ' '.join(past_papers).lower()

        for topic in topics:
            topic_words = set(re.findall(r'\b\w{4,}\b', topic['topic'].lower()))
            past_words = set(re.findall(r'\b\w{4,}\b', combined_past))

            overlap = len(topic_words & past_words)
            if overlap > 0:
                boost = min(overlap * 8, 30)
                topic['score'] += boost
                topic['normalized_score'] = min(topic.get('normalized_score', 50) + boost, 100)
                topic['past_paper_match'] = True

        topics.sort(key=lambda x: x['score'], reverse=True)
        return topics

    def _generate_university_questions(self, topics: List[Dict], material_text: str) -> List[Dict]:
        """Generate questions in university exam format grounded in extracted topics."""
        questions = []
        q_id = 1

        for i, topic in enumerate(topics[:25]):
            content = topic.get('content', '')
            topic_name = topic.get('topic', f'Topic {i+1}')
            topic_ev_score = round(float(topic.get('normalized_score', 50)) / 100.0, 3)

            questions.append({
                'id': q_id,
                'type': 'short_answer',
                'question': self._create_definition_question(topic_name, content),
                'correct_answer': self._extract_answer_from_content(content, 'definition'),
                'explanation': f'Based on source passage for {topic_name}',
                'source_evidence': content[:160],
                'topic': topic_name[:60],
                'confidence': None,
                'evidence_score': topic_ev_score,
                'is_ai_generated': False,
                'generation_method': 'deterministic_syllabus_extraction',
                'difficulty': 'easy',
                'marks': 2,
                'options': None
            })
            q_id += 1

            if i < 15:
                questions.append({
                    'id': q_id,
                    'type': 'short_answer',
                    'question': self._create_descriptive_question(topic_name, content),
                    'correct_answer': self._extract_answer_from_content(content, 'descriptive'),
                    'explanation': f'Requires detailed explanation of {topic_name}',
                    'source_evidence': content[:160],
                    'topic': topic_name[:60],
                    'confidence': None,
                    'evidence_score': topic_ev_score,
                    'is_ai_generated': False,
                    'generation_method': 'deterministic_syllabus_extraction',
                    'difficulty': 'medium',
                    'marks': 5,
                    'options': None
                })
                q_id += 1

            if i < 5:
                questions.append({
                    'id': q_id,
                    'type': 'essay',
                    'question': self._create_essay_question(topic_name, content),
                    'correct_answer': self._extract_answer_from_content(content, 'essay'),
                    'explanation': f'Comprehensive analysis of {topic_name}',
                    'source_evidence': content[:160],
                    'topic': topic_name[:60],
                    'confidence': None,
                    'evidence_score': topic_ev_score,
                    'is_ai_generated': False,
                    'generation_method': 'deterministic_syllabus_extraction',
                    'difficulty': 'hard',
                    'marks': 12,
                    'options': None
                })
                q_id += 1

        return questions

    def _create_definition_question(self, topic: str, content: str) -> str:
        topic_clean = re.sub(r'^(the|a|an)\s+', '', topic.strip(), flags=re.IGNORECASE)
        return f"Define {topic_clean}."

    def _create_descriptive_question(self, topic: str, content: str) -> str:
        topic_clean = re.sub(r'^(the|a|an)\s+', '', topic.strip(), flags=re.IGNORECASE)
        content_lower = content.lower()

        if any(w in content_lower for w in ['types', 'classification', 'categories']):
            return f"Explain the different types of {topic_clean} with examples."
        elif any(w in content_lower for w in ['advantages', 'disadvantages', 'pros', 'cons']):
            return f"Discuss the advantages and disadvantages of {topic_clean}."
        elif any(w in content_lower for w in ['process', 'steps', 'stages', 'procedure']):
            return f"Describe the process/steps involved in {topic_clean}."
        elif any(w in content_lower for w in ['factor', 'influence', 'affect']):
            return f"What are the factors affecting {topic_clean}? Explain each."
        else:
            return f"Explain {topic_clean} in detail with relevant examples."

    def _create_essay_question(self, topic: str, content: str) -> str:
        topic_clean = re.sub(r'^(the|a|an)\s+', '', topic.strip(), flags=re.IGNORECASE)
        return (
            f"Critically analyze the concept of {topic_clean}. "
            f"Discuss its significance, applications, and limitations based on the course material."
        )

    def _extract_answer_from_content(self, content: str, answer_type: str) -> str:
        sentences = [s.strip() for s in re.split(r'[.!?]', content) if len(s.strip()) > 15]

        if answer_type == 'definition':
            for s in sentences:
                if any(marker in s.lower() for marker in ['is defined as', 'refers to', 'means', 'is the']):
                    return s + '.'
            return sentences[0] + '.' if sentences else content[:200]

        elif answer_type == 'descriptive':
            return ' '.join(sentences[:5]) + '.' if sentences else content[:400]

        else:
            return ' '.join(sentences[:10]) + '.' if sentences else content[:600]

    def _format_as_university_paper(self, questions: List[Dict], subject: str, total_marks: int) -> List[Dict]:
        section_a = [q for q in questions if q.get('marks', 2) == 2][:5]
        section_b = [q for q in questions if q.get('marks', 5) == 5][:5]
        section_c = [q for q in questions if q.get('marks', 0) >= 10][:2]

        remaining = [q for q in questions if q not in section_a + section_b + section_c]
        while len(section_a) < 5 and remaining:
            q = remaining.pop(0)
            q['marks'] = 2
            section_a.append(q)
        while len(section_b) < 5 and remaining:
            q = remaining.pop(0)
            q['marks'] = 5
            section_b.append(q)
        while len(section_c) < 2 and remaining:
            q = remaining.pop(0)
            q['marks'] = 12
            section_c.append(q)

        return [
            {
                'name': 'Section A — Short Answer Questions',
                'marks_per_question': 2,
                'num_questions': len(section_a),
                'total_marks': len(section_a) * 2,
                'questions': section_a
            },
            {
                'name': 'Section B — Descriptive Questions',
                'marks_per_question': 5,
                'num_questions': len(section_b),
                'total_marks': len(section_b) * 5,
                'questions': section_b
            },
            {
                'name': 'Section C — Essay / Case Study',
                'marks_per_question': 12.5,
                'num_questions': len(section_c),
                'total_marks': len(section_c) * 12.5,
                'questions': section_c
            }
        ]

    def _create_topic_heatmap(self, topics: List[Dict]) -> Dict:
        heatmap = {}
        for t in topics[:15]:
            name = t['topic'][:50]
            score = t.get('normalized_score', 50)
            level = 'HIGH' if score >= 70 else ('MEDIUM' if score >= 40 else 'LOW')
            heatmap[name] = {
                'score': score,
                'level': level,
                'past_paper_match': t.get('past_paper_match', False)
            }
        return heatmap
