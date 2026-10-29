import re
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class AnswerGenerator:
    """Generates detailed, exam-ready answers for predicted questions"""
    
    WORD_COUNT_MAP = {2: 50, 3: 80, 5: 200, 7: 300, 10: 400, 12: 500, 15: 600}
    
    def __init__(self, ai_service=None):
        self.ai_service = ai_service
    
    def generate_answers(self, questions: List[Dict], source_text: str,
                         api_keys: Optional[Dict[str, str]] = None,
                         preferred_order: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate comprehensive answers for each question with model failover"""
        results = []
        
        for q in questions:
            try:
                answer_data = self._generate_single_answer(q, source_text, api_keys, preferred_order)
                results.append(answer_data)
            except Exception as e:
                logger.error(f"Failed to generate answer for Q{q.get('id', '?')}: {e}")
                results.append(self._fallback_answer(q))
        
        return {
            'success': True,
            'answers': results,
            'total': len(results)
        }
    
    def _generate_single_answer(self, question: Dict, source_text: str,
                               api_keys: Optional[Dict[str, str]] = None,
                               preferred_order: Optional[List[str]] = None) -> Dict:
        """Generate a single detailed answer"""
        q_text = question.get('question', '')
        marks = question.get('marks', 2)
        q_type = question.get('type', 'short_answer')
        topic = question.get('topic', '')
        
        # Find relevant content from source
        relevant_content = self._find_relevant_content(q_text, topic, source_text)
        
        # Try AI generation first with multi-model failover
        if self.ai_service and hasattr(self.ai_service, 'generate_answer'):
            try:
                ai_answer = self.ai_service.generate_answer(q_text, relevant_content, marks, api_keys, preferred_order)
                if ai_answer:
                    return {
                        'question_id': question.get('id', 0),
                        'question': q_text,
                        'answer': ai_answer.get('answer', ''),
                        'key_points': ai_answer.get('key_points', []),
                        'marks': marks,
                        'word_count_suggestion': self._suggest_word_count(marks),
                        'method': 'ai_failover'
                    }
            except Exception as e:
                logger.warning(f"AI answer generation failed: {e}")
        
        # Fallback: Extract answer from source material
        answer_text = self._extract_answer(relevant_content, marks, q_type)
        key_points = self._extract_key_points(relevant_content)
        
        return {
            'question_id': question.get('id', 0),
            'question': q_text,
            'answer': answer_text,
            'key_points': key_points,
            'marks': marks,
            'word_count_suggestion': self._suggest_word_count(marks),
            'method': 'extraction'
        }
    
    def _find_relevant_content(self, question: str, topic: str, source_text: str) -> str:
        """Find the most relevant section of source text for answering, excluding boilerplate and slide markers"""
        # Clean slide markers and split
        cleaned_text = re.sub(r'---\s*\[?(?:Page|Slide)\s*\d+\]?\s*---\s*', '\n\n', source_text)
        raw_paras = [p.strip() for p in re.split(r'\n{2,}', cleaned_text) if len(p.strip()) > 20]
        
        # Filter out institutional boilerplate
        from app.services.document_intelligence import DocumentIntelligence
        paragraphs = [p for p in raw_paras if not DocumentIntelligence.is_boilerplate(p[:80])]
        if not paragraphs:
            paragraphs = raw_paras
            
        if not paragraphs:
            return source_text[:1000]
        
        # Score each paragraph by relevance
        q_words = set(re.findall(r'\b\w{3,}\b', question.lower()))
        t_words = set(re.findall(r'\b\w{3,}\b', topic.lower()))
        search_words = q_words | t_words
        
        scored = []
        for para in paragraphs:
            para_words = set(re.findall(r'\b\w{3,}\b', para.lower()))
            overlap = len(search_words & para_words)
            scored.append((overlap, para))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        
        # Return top 3 most relevant paragraphs
        top_content = ' '.join(para for _, para in scored[:3])
        return top_content[:2000]
    
    def _extract_answer(self, content: str, marks: int, q_type: str) -> str:
        """Extract and format structured academic answer from relevant content"""
        # Clean slide tags from content
        clean_content = re.sub(r'---\s*\[?(?:Page|Slide)\s*\d+\]?\s*---\s*', '', content).strip()
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', clean_content) if len(s.strip()) > 10]
        
        # Remove any sentences with institutional boilerplate
        from app.services.document_intelligence import DocumentIntelligence
        sentences = [s for s in sentences if not DocumentIntelligence.is_boilerplate(s)]
        
        if not sentences:
            return 'Please refer to the study material for a detailed answer.'
        
        # Number of sentences based on marks
        num_sentences = min(max(marks * 2, 2), len(sentences))
        
        # Prioritize definition sentences
        definition_sentences = [s for s in sentences if any(
            marker in s.lower() for marker in ['is defined as', 'refers to', 'is the', 'means', 'can be described']
        )]
        
        # Build definition header
        primary_def = definition_sentences[0] if definition_sentences else sentences[0]
        remaining = [s for s in sentences if s != primary_def]
        
        if marks <= 2:
            return f"Definition:\n{primary_def}\n\nKey Scope:\n• Directly tests foundational syllabus terminology.\n• Formulated for Section A 2-line direct recall."
        elif marks <= 5:
            body_pts = remaining[:3] if remaining else ["Core principle grounded in course syllabus.", "Integrates theoretical concepts with practical application."]
            bullet_str = '\n'.join(f"• {pt}" for pt in body_pts)
            return (
                f"1. Theoretical Concept & Meaning:\n{primary_def}\n\n"
                f"2. Key Operational Principles:\n{bullet_str}\n\n"
                f"3. Examiner Scoring Rubric:\nFull marks require a clear technical definition followed by at least 3 structured bullet points."
            )
        else:
            body_pts = remaining[:5] if remaining else ["Comprehensive syllabus foundation.", "Operational methodologies and governing parameters."]
            bullet_str = '\n'.join(f"• Principle {i+1}: {pt}" for i, pt in enumerate(body_pts))
            return (
                f"1. Comprehensive Theoretical Analysis:\n{primary_def}\n\n"
                f"2. Core Operational Breakdown:\n{bullet_str}\n\n"
                f"3. [DIAGRAM/FLOWCHART TO SKETCH IN BOOKLET]:\n"
                f"[ Input Parameters ] ➔ [ Governing Process Mechanism ] ➔ [ Output & Quality Benchmarks ]\n\n"
                f"4. Examiner Evaluation Criteria (Full Marks):\n"
                f"• Technical definition and governing principles (4 Marks)\n"
                f"• Detailed operational breakdown and analysis (5 Marks)\n"
                f"• Neat schematic diagram/flowchart and conclusion (3 Marks)"
            )
    
    def _extract_key_points(self, content: str) -> List[str]:
        """Extract key points from content"""
        key_points = []
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', content) if len(s.strip()) > 15]
        
        # Look for definition-like sentences
        for s in sentences:
            lower = s.lower()
            if any(marker in lower for marker in [
                'is defined', 'refers to', 'is the process', 'includes',
                'consists of', 'involves', 'is characterized by'
            ]):
                key_points.append(s[:100])
        
        # Look for list items
        items = re.findall(r'(?:^|\n)\s*[•\-\*]\s*(.+)', content)
        for item in items[:5]:
            if item.strip() and len(item.strip()) > 10:
                key_points.append(item.strip()[:100])
        
        # Fill with first sentences if needed
        while len(key_points) < 3 and sentences:
            s = sentences.pop(0)
            if s[:100] not in key_points:
                key_points.append(s[:100])
        
        return key_points[:6]  # Max 6 key points
    
    def _suggest_word_count(self, marks: int) -> int:
        """Suggest answer word count based on marks"""
        return self.WORD_COUNT_MAP.get(marks, marks * 40)
    
    def _fallback_answer(self, question: Dict) -> Dict:
        """Generate fallback answer when processing fails"""
        return {
            'question_id': question.get('id', 0),
            'question': question.get('question', ''),
            'answer': 'Answer generation failed. Please refer to your study material for this topic.',
            'key_points': ['Review the relevant chapter', 'Focus on key definitions', 'Practice with examples'],
            'marks': question.get('marks', 2),
            'word_count_suggestion': self._suggest_word_count(question.get('marks', 2)),
            'method': 'fallback'
        }
