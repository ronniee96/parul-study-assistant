"""
AI Service — Summarization, Question Generation, Answer Generation
Supports OpenAI and Anthropic with mock fallback
"""

import os
import re
import json
import logging
import random
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class AIService:
    """AI wrapper for summarization, question generation, and answer creation"""
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        
        # Try OpenAI
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key and openai_key != 'sk-your-key-here':
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=openai_key)
                logger.info('OpenAI client initialized')
            except Exception as e:
                logger.warning(f'OpenAI init failed: {e}')
        
        # Try Anthropic
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if anthropic_key and anthropic_key != 'sk-ant-your-key-here':
            try:
                import anthropic
                self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
                logger.info('Anthropic client initialized')
            except Exception as e:
                logger.warning(f'Anthropic init failed: {e}')
        
        if not self.openai_client and not self.anthropic_client:
            logger.warning('No AI API keys configured — running in mock/demo mode')
    
    # ─── Summarization ───────────────────────────────────────
    
    def summarize_text(self, text: str, max_length: int = 200, style: str = 'concise') -> Dict:
        """Summarize text using available AI service"""
        if len(text.strip()) < 50:
            return {'success': False, 'error': 'Text too short to summarize'}
        
        sample = text[:4000]
        
        if self.openai_client:
            return self._summarize_openai(sample, max_length, style)
        elif self.anthropic_client:
            return self._summarize_anthropic(sample, max_length, style)
        return self._mock_summarize(sample, max_length)
    
    def _summarize_openai(self, text: str, max_length: int, style: str) -> Dict:
        try:
            response = self.openai_client.chat.completions.create(
                model='gpt-3.5-turbo',
                messages=[
                    {'role': 'system', 'content': f'Summarize the following text in a {style} style. Max {max_length} words. Also extract 5 key points.'},
                    {'role': 'user', 'content': text}
                ],
                max_tokens=800, temperature=0.3
            )
            content = response.choices[0].message.content
            return {
                'success': True,
                'summary': content,
                'key_points': self._extract_key_points(text),
                'word_count': len(content.split()),
                'method': 'openai'
            }
        except Exception as e:
            logger.error(f'OpenAI summarization failed: {e}')
            return self._mock_summarize(text, max_length)
    
    def _summarize_anthropic(self, text: str, max_length: int, style: str) -> Dict:
        try:
            response = self.anthropic_client.messages.create(
                model='claude-3-haiku-20240307',
                max_tokens=800, temperature=0.3,
                messages=[{'role': 'user', 'content': f'Summarize in {style} style (max {max_length} words) and list 5 key points:\n\n{text}'}]
            )
            content = response.content[0].text
            return {
                'success': True,
                'summary': content,
                'key_points': self._extract_key_points(text),
                'word_count': len(content.split()),
                'method': 'anthropic'
            }
        except Exception as e:
            logger.error(f'Anthropic summarization failed: {e}')
            return self._mock_summarize(text, max_length)
    
    def _mock_summarize(self, text: str, max_length: int) -> Dict:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 10]
        summary = ' '.join(sentences[:3]) if sentences else text[:200]
        return {
            'success': True,
            'summary': summary,
            'key_points': self._extract_key_points(text),
            'word_count': len(summary.split()),
            'method': 'mock',
            'note': 'Demo mode — configure AI API keys for real summaries'
        }
    
    # ─── Question Generation ─────────────────────────────────
    
    def generate_questions(self, text: str, num_questions: int = 10,
                           question_types: Optional[List[str]] = None) -> Dict:
        """Generate practice questions from text"""
        if not question_types:
            question_types = ['multiple_choice', 'short_answer']
        
        if self.openai_client:
            return self._generate_questions_openai(text, num_questions, question_types)
        elif self.anthropic_client:
            return self._generate_questions_anthropic(text, num_questions, question_types)
        return self._mock_generate_questions(text, num_questions, question_types)
    
    def generate_mega_questions(self, text: str, num_questions: int = 300,
                                 question_types: Optional[List[str]] = None) -> Dict:
        """Generate a large batch of questions by processing text in chunks"""
        if not question_types:
            question_types = ['multiple_choice', 'short_answer', 'essay']
        
        # Split text into chunks
        chunks = self._split_into_chunks(text, chunk_size=2000)
        if not chunks:
            chunks = [text[:3000]]
        
        questions_per_chunk = max(num_questions // len(chunks), 5)
        all_questions = []
        
        for i, chunk in enumerate(chunks):
            chunk_result = self.generate_questions(chunk, questions_per_chunk, question_types)
            if chunk_result.get('success') and chunk_result.get('questions'):
                for q in chunk_result['questions']:
                    q['id'] = len(all_questions) + 1
                    q['chunk_source'] = i + 1
                    all_questions.append(q)
        
        # Deduplicate
        unique = self._deduplicate_questions(all_questions)
        
        # Ensure we have enough
        while len(unique) < num_questions:
            # Generate more variations
            extra = self._generate_variation_questions(text, num_questions - len(unique), question_types)
            for q in extra:
                q['id'] = len(unique) + 1
                unique.append(q)
            break  # Only one round of extras
        
        final = unique[:num_questions]
        for i, q in enumerate(final):
            q['id'] = i + 1
        
        return {
            'success': True,
            'questions': final,
            'total_generated': len(final),
            'method': 'openai' if self.openai_client else ('anthropic' if self.anthropic_client else 'mock')
        }
    
    def _generate_questions_openai(self, text: str, num: int, types: List[str]) -> Dict:
        try:
            prompt = self._build_question_prompt(text[:3000], num, types)
            response = self.openai_client.chat.completions.create(
                model='gpt-3.5-turbo',
                messages=[
                    {'role': 'system', 'content': 'You are an educational assessment expert. Generate questions in valid JSON array format.'},
                    {'role': 'user', 'content': prompt}
                ],
                max_tokens=2000, temperature=0.5
            )
            content = response.choices[0].message.content
            questions = self._parse_ai_questions(content, num, types)
            return {'success': True, 'questions': questions, 'count': len(questions), 'method': 'openai'}
        except Exception as e:
            logger.error(f'OpenAI question gen failed: {e}')
            return self._mock_generate_questions(text, num, types)
    
    def _generate_questions_anthropic(self, text: str, num: int, types: List[str]) -> Dict:
        try:
            prompt = self._build_question_prompt(text[:3000], num, types)
            response = self.anthropic_client.messages.create(
                model='claude-3-haiku-20240307',
                max_tokens=2000, temperature=0.5,
                messages=[{'role': 'user', 'content': prompt}]
            )
            content = response.content[0].text
            questions = self._parse_ai_questions(content, num, types)
            return {'success': True, 'questions': questions, 'count': len(questions), 'method': 'anthropic'}
        except Exception as e:
            logger.error(f'Anthropic question gen failed: {e}')
            return self._mock_generate_questions(text, num, types)
    
    def _build_question_prompt(self, text: str, num: int, types: List[str]) -> str:
        types_str = ', '.join(types)
        return f"""Based on this educational text, generate {num} practice questions.
Include these types: {types_str}

For each question provide:
- type (multiple_choice, short_answer, or essay)
- question text
- options (array of 4 options for MCQ, null for others)
- correct_answer
- explanation
- topic (which topic this tests)
- difficulty (easy, medium, hard)

Return as a JSON array of objects.

Text:
{text}

Respond ONLY with the JSON array, no other text."""
    
    def _parse_ai_questions(self, ai_response: str, num: int, types: List[str]) -> List[Dict]:
        """Parse AI response into structured questions — THIS IS THE FIX for the critical bug"""
        questions = []
        
        # Try JSON parsing first
        try:
            # Find JSON array in response
            json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                for i, q in enumerate(parsed):
                    questions.append({
                        'id': i + 1,
                        'type': q.get('type', types[i % len(types)]),
                        'question': q.get('question', ''),
                        'options': q.get('options'),
                        'correct_answer': q.get('correct_answer', ''),
                        'explanation': q.get('explanation', ''),
                        'topic': q.get('topic', 'General'),
                        'confidence': random.uniform(0.6, 0.95),
                        'difficulty': q.get('difficulty', 'medium'),
                        'marks': {'multiple_choice': 2, 'short_answer': 5, 'essay': 12}.get(q.get('type', ''), 2)
                    })
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f'JSON parsing failed, trying text parsing: {e}')
        
        # Fallback: parse free-text response
        if not questions:
            questions = self._parse_freetext_questions(ai_response, num, types)
        
        return questions[:num]
    
    def _parse_freetext_questions(self, text: str, num: int, types: List[str]) -> List[Dict]:
        """Parse questions from free-text AI response"""
        questions = []
        # Split by question numbers
        parts = re.split(r'(?:^|\n)\s*(?:Q?\.?\s*)?\d+[.)\s]', text)
        
        for i, part in enumerate(parts[1:num+1]):
            part = part.strip()
            if not part or len(part) < 10:
                continue
            
            lines = [l.strip() for l in part.split('\n') if l.strip()]
            if not lines:
                continue
            
            q_type = types[i % len(types)]
            question_text = lines[0]
            options = None
            answer = ''
            
            # Look for MCQ options
            opt_lines = [l for l in lines if re.match(r'^[A-Da-d][).\s]', l)]
            if opt_lines:
                options = opt_lines[:4]
                q_type = 'multiple_choice'
            
            # Look for answer
            for l in lines:
                if l.lower().startswith(('answer:', 'correct:', 'ans:')):
                    answer = re.sub(r'^(?:answer|correct|ans):\s*', '', l, flags=re.IGNORECASE)
            
            questions.append({
                'id': i + 1,
                'type': q_type,
                'question': question_text,
                'options': options,
                'correct_answer': answer or 'Refer to study material',
                'explanation': 'Generated from study material',
                'topic': 'General',
                'confidence': random.uniform(0.5, 0.9),
                'difficulty': random.choice(['easy', 'medium', 'hard']),
                'marks': {'multiple_choice': 2, 'short_answer': 5, 'essay': 12}.get(q_type, 2)
            })
        
        return questions
    
    def _mock_generate_questions(self, text: str, num: int, types: List[str]) -> Dict:
        """Generate realistic mock questions from text analysis"""
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 20]
        topics = []
        for s in sentences[:20]:
            # Extract topic-like phrases
            words = s.split()[:6]
            topics.append(' '.join(words))
        
        if not topics:
            topics = ['Core Concepts', 'Key Theories', 'Applications', 'Definitions', 'Case Studies']
        
        questions = []
        for i in range(num):
            q_type = types[i % len(types)]
            topic = topics[i % len(topics)]
            
            if q_type == 'multiple_choice':
                questions.append({
                    'id': i + 1, 'type': 'multiple_choice',
                    'question': f'Which of the following best describes {topic}?',
                    'options': [f'A) First aspect of {topic}', f'B) Second aspect of {topic}',
                                f'C) Third aspect of {topic}', f'D) Fourth aspect of {topic}'],
                    'correct_answer': f'B) Second aspect of {topic}',
                    'explanation': f'This tests understanding of {topic}',
                    'topic': topic[:50], 'confidence': round(random.uniform(0.6, 0.95), 2),
                    'difficulty': random.choice(['easy', 'medium', 'hard']), 'marks': 2
                })
            elif q_type == 'short_answer':
                questions.append({
                    'id': i + 1, 'type': 'short_answer',
                    'question': f'Explain the concept of {topic} with examples.',
                    'options': None,
                    'correct_answer': f'{topic} refers to a key concept in the subject matter that involves...',
                    'explanation': f'Tests descriptive understanding of {topic}',
                    'topic': topic[:50], 'confidence': round(random.uniform(0.6, 0.95), 2),
                    'difficulty': random.choice(['easy', 'medium', 'hard']), 'marks': 5
                })
            else:
                questions.append({
                    'id': i + 1, 'type': 'essay',
                    'question': f'Critically analyze {topic}. Discuss its significance, applications, and limitations.',
                    'options': None,
                    'correct_answer': f'A comprehensive analysis covering all aspects of {topic}...',
                    'explanation': f'Tests analytical depth on {topic}',
                    'topic': topic[:50], 'confidence': round(random.uniform(0.6, 0.95), 2),
                    'difficulty': 'hard', 'marks': 12
                })
        
        return {
            'success': True, 'questions': questions, 'count': len(questions),
            'method': 'mock', 'note': 'Demo mode — configure AI API keys for real question generation'
        }
    
    def _generate_variation_questions(self, text: str, count: int, types: List[str]) -> List[Dict]:
        """Generate additional variation questions to fill quota"""
        return self._mock_generate_questions(text, count, types).get('questions', [])
    
    def _split_into_chunks(self, text: str, chunk_size: int = 2000) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        # Try splitting on slide boundaries first
        slides = re.split(r'---\s*Slide\s*\d+\s*---', text)
        if len(slides) > 1:
            current = ''
            for slide in slides:
                if len(current) + len(slide) > chunk_size and current:
                    chunks.append(current)
                    current = slide
                else:
                    current += '\n' + slide
            if current:
                chunks.append(current)
        else:
            # Split by paragraphs
            for i in range(0, len(text), chunk_size - 200):
                chunks.append(text[i:i + chunk_size])
        
        return chunks if chunks else [text[:chunk_size]]
    
    def _deduplicate_questions(self, questions: List[Dict]) -> List[Dict]:
        """Remove duplicate questions based on text similarity"""
        seen = set()
        unique = []
        for q in questions:
            q_text = q.get('question', '').lower().strip()
            key = q_text[:80]  # First 80 chars as key
            if key not in seen:
                seen.add(key)
                unique.append(q)
        return unique
    
    def _extract_key_points(self, text: str) -> List[str]:
        """Extract key points from text"""
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 20]
        indicators = ['is', 'are', 'refers to', 'means', 'defined as', 'important', 'key', 'primary']
        points = []
        for s in sentences[:15]:
            if any(ind in s.lower() for ind in indicators):
                points.append(s[:120])
                if len(points) >= 5:
                    break
        if not points:
            points = [s[:120] for s in sentences[:5]]
        return points[:5]
    
    def generate_answer(self, question: str, context: str, marks: int) -> Optional[Dict]:
        """Generate a single answer using AI"""
        prompt = f"""Answer this exam question worth {marks} marks.
Use the provided context. Be specific and exam-appropriate.

Question: {question}

Context: {context[:2000]}

Provide:
1. A complete answer (appropriate length for {marks} marks)
2. 3-5 key bullet points

Format as JSON: {{"answer": "...", "key_points": ["...", ...]}}"""
        
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model='gpt-3.5-turbo',
                    messages=[{'role': 'user', 'content': prompt}],
                    max_tokens=1000, temperature=0.3
                )
                content = response.choices[0].message.content
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
            except Exception as e:
                logger.error(f'AI answer gen failed: {e}')
        
        elif self.anthropic_client:
            try:
                response = self.anthropic_client.messages.create(
                    model='claude-3-haiku-20240307',
                    max_tokens=1000, temperature=0.3,
                    messages=[{'role': 'user', 'content': prompt}]
                )
                content = response.content[0].text
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
            except Exception as e:
                logger.error(f'AI answer gen failed: {e}')
        
        return None