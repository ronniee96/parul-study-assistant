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
        """Find the most relevant section of source text for answering"""
        # Split source into paragraphs
        paragraphs = [p.strip() for p in re.split(r'\n{2,}|---\s*Slide\s*\d+\s*---', source_text) if len(p.strip()) > 20]
        
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
        """Extract and format answer from relevant content"""
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', content) if len(s.strip()) > 10]
        
        if not sentences:
            return 'Please refer to the study material for a detailed answer.'
        
        # Number of sentences based on marks
        num_sentences = min(marks * 2, len(sentences))
        
        # Prioritize definition sentences
        definition_sentences = [s for s in sentences if any(
            marker in s.lower() for marker in ['is defined as', 'refers to', 'is the', 'means', 'can be described']
        )]
        
        # Build answer
        answer_parts = []
        
        # Start with definitions if available
        for ds in definition_sentences[:2]:
            answer_parts.append(ds)
            if ds in sentences:
                sentences.remove(ds)
        
        # Add remaining relevant sentences
        for s in sentences:
            if len(answer_parts) >= num_sentences:
                break
            if s not in answer_parts:
                answer_parts.append(s)
        
        answer = ' '.join(answer_parts)
        
        # Add structure for longer answers
        if marks >= 5:
            answer = f"{answer}\n\nIn conclusion, this concept is significant in understanding the broader subject matter and its practical applications."
        
        return answer
    
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
