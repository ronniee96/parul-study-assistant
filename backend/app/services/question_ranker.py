import re
import logging
from typing import Dict, List, Optional, Any
from collections import Counter

logger = logging.getLogger(__name__)

class QuestionRanker:
    """Ranks questions by exam likelihood and importance"""
    
    def rank_questions(self, questions: List[Dict], material_text: str,
                       past_papers: Optional[List[str]] = None) -> Dict[str, Any]:
        """Rank questions and return tiered results"""
        scored = []
        
        for q in questions:
            score = self._calculate_score(q, material_text, past_papers)
            q_copy = dict(q)
            q_copy['confidence'] = round(score, 2)
            scored.append(q_copy)
        
        # Sort by confidence descending
        scored.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Ensure variety in top selections
        top_25 = self._ensure_variety(scored[:40])[:25]
        top_100 = self._ensure_variety(scored[:150])[:100]
        top_200 = scored[:200]
        
        return {
            'all_300': scored[:300],
            'top_200': top_200,
            'top_100': top_100,
            'top_25': top_25,
            'stats': {
                'total_ranked': len(scored),
                'avg_confidence_top25': round(sum(q['confidence'] for q in top_25) / max(len(top_25), 1), 2),
                'avg_confidence_top100': round(sum(q['confidence'] for q in top_100) / max(len(top_100), 1), 2),
                'topic_distribution': dict(Counter(q.get('topic', 'Unknown')[:30] for q in top_25)),
                'type_distribution': dict(Counter(q.get('type', 'unknown') for q in top_25)),
                'difficulty_distribution': dict(Counter(q.get('difficulty', 'medium') for q in top_25))
            }
        }
    
    def _calculate_score(self, question: Dict, material_text: str,
                         past_papers: Optional[List[str]] = None) -> float:
        """Calculate importance score for a question (0.0 - 1.0)"""
        score = 0.0
        q_text = question.get('question', '').lower()
        q_topic = question.get('topic', '').lower()
        material_lower = material_text.lower()
        
        # 1. Content Coverage (25%) — How central is this topic?
        topic_words = set(re.findall(r'\b\w{4,}\b', q_topic))
        material_words = re.findall(r'\b\w{4,}\b', material_lower)
        material_word_counts = Counter(material_words)
        
        if topic_words:
            topic_frequency = sum(material_word_counts.get(w, 0) for w in topic_words)
            max_possible = max(material_word_counts.values()) * len(topic_words) if material_word_counts else 1
            coverage = min(topic_frequency / max(max_possible, 1), 1.0)
            score += coverage * 0.25
        
        # 2. Complexity Match (20%) — University-level difficulty
        complexity_score = 0.5  # default medium
        if question.get('difficulty') == 'medium':
            complexity_score = 0.8
        elif question.get('difficulty') == 'hard':
            complexity_score = 0.7
        elif question.get('difficulty') == 'easy':
            complexity_score = 0.6
        score += complexity_score * 0.20
        
        # 3. Topic Frequency (25%) — How often does topic appear in material?
        if q_topic:
            topic_mentions = material_lower.count(q_topic[:20].lower())
            freq_score = min(topic_mentions / 10, 1.0)
            score += freq_score * 0.25
        
        # 4. Question Quality (15%) — Well-formed questions score higher
        quality = 0.5
        if len(q_text) > 20:
            quality += 0.1
        if '?' in question.get('question', ''):
            quality += 0.1
        if question.get('correct_answer') and len(str(question['correct_answer'])) > 10:
            quality += 0.1
        if question.get('explanation') and len(str(question['explanation'])) > 10:
            quality += 0.1
        score += min(quality, 1.0) * 0.15
        
        # 5. Past Paper Correlation (15%)
        if past_papers:
            combined_past = ' '.join(past_papers).lower()
            q_words = set(re.findall(r'\b\w{4,}\b', q_text))
            past_words = set(re.findall(r'\b\w{4,}\b', combined_past))
            if q_words:
                overlap = len(q_words & past_words) / len(q_words)
                score += overlap * 0.15
        else:
            score += 0.08  # Neutral when no past papers
        
        return min(max(score, 0.1), 0.99)  # Clamp to 0.1-0.99
    
    def _ensure_variety(self, questions: List[Dict]) -> List[Dict]:
        """Ensure topic variety in selected questions"""
        selected = []
        topic_counts = Counter()
        max_per_topic = 4
        
        for q in questions:
            topic = q.get('topic', 'Unknown')[:30]
            if topic_counts[topic] < max_per_topic:
                selected.append(q)
                topic_counts[topic] += 1
        
        return selected
