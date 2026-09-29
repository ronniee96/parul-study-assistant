import re
import logging
from typing import Dict, List, Optional, Any
from collections import Counter

logger = logging.getLogger(__name__)

class QuestionRanker:
    """Ranks questions by observable source evidence (not exam likelihood)."""
    
    def rank_questions(self, questions: List[Dict], material_text: str,
                       past_papers: Optional[List[str]] = None) -> Dict[str, Any]:
        """Rank questions and return tiered results"""
        scored = []
        
        for q in questions:
            score = self._calculate_score(q, material_text, past_papers)
            q_copy = dict(q)
            q_copy['evidence_score'] = round(score, 3)
            scored.append(q_copy)
        
        scored.sort(key=lambda x: x['evidence_score'], reverse=True)
        
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
                'avg_evidence_top25': round(sum(q['evidence_score'] for q in top_25) / max(len(top_25), 1), 3),
                'avg_evidence_top100': round(sum(q['evidence_score'] for q in top_100) / max(len(top_100), 1), 3),
                'topic_distribution': dict(Counter(q.get('topic', 'Unknown')[:30] for q in top_25)),
                'type_distribution': dict(Counter(q.get('type', 'unknown') for q in top_25)),
                'difficulty_distribution': dict(Counter(q.get('difficulty', 'medium') for q in top_25))
            }
        }
    
    def _calculate_score(self, question: Dict, material_text: str,
                         past_papers: Optional[List[str]] = None) -> float:
        """Score topic overlap with supplied material, uploaded papers, and citations."""
        topic_words = set(re.findall(r'\b\w{4,}\b', str(question.get('topic', '')).lower()))
        material_words = re.findall(r'\b\w{4,}\b', material_text.lower())
        material_set = set(material_words)
        if not topic_words:
            return 0.0

        material_coverage = len(topic_words & material_set) / len(topic_words)
        frequency = min(sum(material_words.count(word) for word in topic_words) / 10, 1.0)
        history_overlap = 0.0
        if past_papers:
            past_words = set(re.findall(r'\b\w{4,}\b', ' '.join(past_papers).lower()))
            history_overlap = len(topic_words & past_words) / len(topic_words)
        cited = 1.0 if question.get('source_evidence') and question.get('source_pages') else 0.0
        return material_coverage * 0.45 + frequency * 0.25 + history_overlap * 0.20 + cited * 0.10
    
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
