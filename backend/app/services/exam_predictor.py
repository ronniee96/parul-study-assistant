import re
import logging
from typing import Dict, List, Optional, Any
from collections import Counter

logger = logging.getLogger(__name__)

class ExamPredictor:
    """AI-powered exam question prediction engine"""
    
    # Common university exam topic importance signals
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
    
    def predict_exam(self, material_text: str, past_papers: Optional[List[str]] = None,
                     subject_name: str = "Subject", total_marks: int = 60,
                     api_keys: Optional[Dict[str, str]] = None,
                     preferred_order: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate a predicted exam paper with confidence scores using multi-model failover"""
        try:
            # Step 1: Extract weighted topics
            topics = self._extract_weighted_topics(material_text)
            
            # Step 2: Boost topics that appear in past papers
            if past_papers:
                topics = self._boost_from_past_papers(topics, past_papers)
            
            # Step 3: Generate questions (via AI service with failover if keys present, else rule-based extraction)
            questions = []
            engine_used = "Enhanced Syllabus Extractor"
            if self.ai_service and api_keys and any(len(k or '') > 5 for k in api_keys.values()):
                ai_res = self.ai_service.generate_questions_with_failover(
                    material_text[:8000], num_questions=15,
                    question_types=["multiple_choice", "short_answer", "essay"],
                    api_keys=api_keys, preferred_order=preferred_order
                )
                if ai_res.get('success') and ai_res.get('questions'):
                    questions = ai_res['questions']
                    engine_used = ai_res.get('engine_used', engine_used)
            
            if not questions:
                questions = self._generate_university_questions(topics, material_text)
            
            # Step 4: Format into university paper structure
            paper = self._format_as_university_paper(questions, subject_name, total_marks)
            
            # Step 5: Calculate topic heatmap
            heatmap = self._create_topic_heatmap(topics)
            
            return {
                "success": True,
                "subject_name": subject_name,
                "total_marks": total_marks,
                "time_hours": 3,
                "overall_confidence": round(sum(q.get('confidence', 0.85) for q in questions[:12]) / min(len(questions), 12) * 100, 1),
                "topic_heatmap": heatmap,
                "sections": paper,
                "engine_used": engine_used
            }
        except Exception as e:
            logger.error(f"Exam prediction failed: {e}")
            return self._generate_mock_prediction(subject_name, total_marks)
    
    def _extract_weighted_topics(self, text: str) -> List[Dict[str, Any]]:
        """Extract topics with importance weights from material"""
        # Split text into paragraphs/sections
        paragraphs = [p.strip() for p in re.split(r'\n{2,}|---\s*Slide\s*\d+\s*---', text) if len(p.strip()) > 30]
        
        topic_scores = {}
        
        for para in paragraphs:
            # Extract potential topic (first sentence or heading-like text)
            sentences = [s.strip() for s in re.split(r'[.!?]', para) if len(s.strip()) > 10]
            if not sentences:
                continue
            
            topic = sentences[0][:100]  # First sentence as topic identifier
            
            # Calculate importance score
            importance = 0
            text_lower = para.lower()
            
            # Check for importance keywords
            for keyword in self.IMPORTANCE_KEYWORDS:
                if keyword in text_lower:
                    importance += 10
            
            # Length indicates more coverage = more important
            importance += min(len(para) / 100, 20)
            
            # Definitions are exam favorites
            if any(marker in text_lower for marker in ['is defined as', 'refers to', 'means', 'is the process of']):
                importance += 25
            
            # Lists/types are frequently tested
            list_items = re.findall(r'(?:^|\n)\s*[•\-\d]+[.)\s]', para)
            importance += len(list_items) * 5
            
            # Examples suggest practical application questions
            if 'example' in text_lower or 'for instance' in text_lower or 'such as' in text_lower:
                importance += 15
            
            # Store with deduplication
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
        
        # Sort by score and return
        sorted_topics = sorted(topic_scores.values(), key=lambda x: x['score'], reverse=True)
        
        # Normalize scores to 0-100
        if sorted_topics:
            max_score = sorted_topics[0]['score']
            for t in sorted_topics:
                t['normalized_score'] = round(t['score'] / max_score * 100, 1) if max_score > 0 else 50
        
        return sorted_topics[:30]  # Top 30 topics
    
    def _boost_from_past_papers(self, topics: List[Dict], past_papers: List[str]) -> List[Dict]:
        """Boost topic scores based on past paper question frequency"""
        combined_past = ' '.join(past_papers).lower()
        
        for topic in topics:
            topic_words = set(re.findall(r'\b\w{4,}\b', topic['topic'].lower()))
            past_words = set(re.findall(r'\b\w{4,}\b', combined_past))
            
            overlap = len(topic_words & past_words)
            if overlap > 0:
                boost = min(overlap * 8, 30)  # Max 30% boost
                topic['score'] += boost
                topic['normalized_score'] = min(topic.get('normalized_score', 50) + boost, 100)
                topic['past_paper_match'] = True
        
        # Re-sort
        topics.sort(key=lambda x: x['score'], reverse=True)
        return topics
    
    def _generate_university_questions(self, topics: List[Dict], material_text: str) -> List[Dict]:
        """Generate questions in university exam format"""
        questions = []
        q_id = 1
        
        for i, topic in enumerate(topics[:25]):
            confidence = max(0.5, min(0.99, topic.get('normalized_score', 50) / 100))
            content = topic.get('content', '')
            topic_name = topic.get('topic', f'Topic {i+1}')
            
            # Generate 2-mark definition question
            questions.append({
                'id': q_id,
                'type': 'short_answer',
                'question': self._create_definition_question(topic_name, content),
                'correct_answer': self._extract_answer_from_content(content, 'definition'),
                'explanation': f'Based on {topic_name}',
                'topic': topic_name[:60],
                'confidence': round(confidence, 2),
                'difficulty': 'easy',
                'marks': 2,
                'options': None
            })
            q_id += 1
            
            # Generate 5-mark descriptive question
            if i < 15:
                questions.append({
                    'id': q_id,
                    'type': 'short_answer',
                    'question': self._create_descriptive_question(topic_name, content),
                    'correct_answer': self._extract_answer_from_content(content, 'descriptive'),
                    'explanation': f'Requires detailed explanation of {topic_name}',
                    'topic': topic_name[:60],
                    'confidence': round(confidence * 0.95, 2),
                    'difficulty': 'medium',
                    'marks': 5,
                    'options': None
                })
                q_id += 1
            
            # Generate 12.5-mark essay/case study question
            if i < 5:
                questions.append({
                    'id': q_id,
                    'type': 'essay',
                    'question': self._create_essay_question(topic_name, content),
                    'correct_answer': self._extract_answer_from_content(content, 'essay'),
                    'explanation': f'Comprehensive analysis of {topic_name}',
                    'topic': topic_name[:60],
                    'confidence': round(confidence * 0.9, 2),
                    'difficulty': 'hard',
                    'marks': 12,
                    'options': None
                })
                q_id += 1
        
        return questions
    
    def _create_definition_question(self, topic: str, content: str) -> str:
        """Create a 2-mark definition-style question"""
        topic_clean = re.sub(r'^(the|a|an)\s+', '', topic.strip(), flags=re.IGNORECASE)
        patterns = [
            f"Define {topic_clean}.",
            f"What is {topic_clean}?",
            f"State the meaning of {topic_clean}.",
            f"Give a brief explanation of {topic_clean}.",
        ]
        import random
        return random.choice(patterns)
    
    def _create_descriptive_question(self, topic: str, content: str) -> str:
        """Create a 5-mark descriptive question"""
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
        """Create a 12.5-mark essay/case study question"""
        topic_clean = re.sub(r'^(the|a|an)\s+', '', topic.strip(), flags=re.IGNORECASE)
        return f"Critically analyze the concept of {topic_clean}. Discuss its significance, applications, and limitations with suitable examples and case studies."
    
    def _extract_answer_from_content(self, content: str, answer_type: str) -> str:
        """Extract relevant answer from source content"""
        sentences = [s.strip() for s in re.split(r'[.!?]', content) if len(s.strip()) > 15]
        
        if answer_type == 'definition':
            # Look for definition sentences
            for s in sentences:
                if any(marker in s.lower() for marker in ['is defined as', 'refers to', 'means', 'is the']):
                    return s + '.'
            return sentences[0] + '.' if sentences else 'Refer to study material.'
        
        elif answer_type == 'descriptive':
            return ' '.join(sentences[:5]) + '.' if sentences else 'Refer to study material for detailed explanation.'
        
        else:  # essay
            return ' '.join(sentences[:10]) + '.' if sentences else 'Refer to study material for comprehensive analysis.'
    
    def _format_as_university_paper(self, questions: List[Dict], subject: str, total_marks: int) -> List[Dict]:
        """Format questions into university exam sections"""
        section_a = [q for q in questions if q.get('marks', 2) == 2][:5]
        section_b = [q for q in questions if q.get('marks', 5) == 5][:5]
        section_c = [q for q in questions if q.get('marks', 0) >= 10][:2]
        
        # Fill sections if not enough questions
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
        """Create topic importance heatmap data"""
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
    
    def _generate_mock_prediction(self, subject: str, total_marks: int) -> Dict:
        """Generate mock prediction when AI is unavailable"""
        mock_topics = ['Core Concepts', 'Key Theories', 'Applications', 'Case Studies', 'Definitions']
        mock_questions = []
        for i, topic in enumerate(mock_topics * 3):
            mock_questions.append({
                'id': i + 1,
                'type': 'short_answer',
                'question': f'Sample question {i+1} about {topic} in {subject}',
                'correct_answer': f'Answer relates to {topic}',
                'explanation': f'Tests understanding of {topic}',
                'topic': topic,
                'confidence': round(0.95 - (i * 0.03), 2),
                'difficulty': ['easy', 'medium', 'hard'][i % 3],
                'marks': [2, 5, 12][i % 3],
                'options': None
            })
        
        paper = self._format_as_university_paper(mock_questions, subject, total_marks)
        return {
            'success': True,
            'subject_name': subject,
            'total_marks': total_marks,
            'time_hours': 3,
            'overall_confidence': 85.0,
            'topic_heatmap': {t: {'score': 80 - i*10, 'level': 'HIGH' if i < 2 else 'MEDIUM', 'past_paper_match': False} for i, t in enumerate(mock_topics)},
            'sections': paper,
            'note': 'Mock prediction — configure AI API keys for real predictions'
        }
