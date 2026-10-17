"""
AI Service — Multi-Provider Auto-Failover Engine
Supports Google Gemini, OpenAI ChatGPT, and Anthropic Claude
Automatically switches between providers when rate limits / quotas (HTTP 429) are reached.
Falls back to Enhanced Parul University Academic Syllabus Engine directly grounded in uploaded slides.
"""

import os
import re
import json
import time
import logging
import random
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class AIService:
    """AI engine with automatic multi-model failover for exam preparation"""
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        
        # Try OpenAI from env
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key and openai_key != 'sk-your-key-here':
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=openai_key)
                logger.info('OpenAI client initialized')
            except Exception as e:
                logger.warning(f'OpenAI init failed: {e}')
        
        # Try Anthropic from env
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if anthropic_key and anthropic_key != 'sk-ant-your-key-here':
            try:
                import anthropic
                self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
                logger.info('Anthropic client initialized')
            except Exception as e:
                logger.warning(f'Anthropic init failed: {e}')
        
        # Try Gemini from env
        gemini_k = os.getenv('GEMINI_API_KEY')
        if gemini_k and gemini_k.strip() and 'your-key-here' not in gemini_k.lower() and 'example' not in gemini_k.lower():
            self.gemini_key = gemini_k.strip()
        else:
            self.gemini_key = None

    # ─── API Key Verification & Testing ────────────────────────

    def test_api_key(self, provider: str, key: str) -> Dict[str, Any]:
        """Test if a student's API key is valid and has active quota"""
        key = key.strip()
        if not key:
            return {"valid": False, "provider": provider, "message": "API key cannot be empty"}

        provider_norm = provider.lower().strip()

        if provider_norm == "gemini":
            try:
                import httpx
                # 1. Try ListModels first (Google's official model discovery endpoint)
                with httpx.Client(timeout=12.0) as client:
                    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
                    list_resp = client.get(list_url)
                    if list_resp.status_code == 200:
                        models = list_resp.json().get("models", [])
                        gen_models = [m.get("name", "").replace("models/", "") for m in models 
                                      if "generateContent" in m.get("supportedGenerationMethods", [])]
                        best_model = gen_models[0] if gen_models else "gemini"
                        return {"valid": True, "provider": "gemini", "model": best_model, "message": f"Google Gemini Connected & Active ({best_model})"}
                    elif list_resp.status_code == 429:
                        return {"valid": False, "rate_limited": True, "provider": "gemini", "message": "Gemini Quota or Rate Limit reached (HTTP 429). Auto-failover will switch."}
                    elif list_resp.status_code in [400, 403]:
                        err_text = list_resp.json().get("error", {}).get("message", list_resp.text[:100])
                        if "API_KEY_INVALID" in err_text or "not valid" in err_text.lower():
                            return {"valid": False, "provider": "gemini", "message": f"Gemini API key rejected: {err_text}"}

                    # 2. Try candidate models across v1beta and v1
                    candidate_models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"]
                    for m in candidate_models:
                        for v in ["v1beta", "v1"]:
                            url = f"https://generativelanguage.googleapis.com/{v}/models/{m}:generateContent?key={key}"
                            payload = {"contents": [{"parts": [{"text": "OK"}]}], "generationConfig": {"maxOutputTokens": 2}}
                            try:
                                gen_resp = client.post(url, json=payload)
                                if gen_resp.status_code == 200:
                                    return {"valid": True, "provider": "gemini", "model": m, "message": f"Google Gemini Connected & Active ({m})"}
                                elif gen_resp.status_code == 429:
                                    return {"valid": False, "rate_limited": True, "provider": "gemini", "message": "Gemini Quota or Rate Limit reached (HTTP 429). Auto-failover will switch."}
                            except Exception:
                                continue

                    error_msg = list_resp.json().get('error', {}).get('message', list_resp.text[:100]) if list_resp.status_code != 200 else "Model unavailable"
                    return {"valid": False, "provider": "gemini", "message": f"Gemini error: {error_msg}"}
            except Exception as e:
                return {"valid": False, "provider": "gemini", "message": f"Gemini connection failed: {str(e)}"}

        elif provider_norm == "openai":
            try:
                from openai import OpenAI
                client = OpenAI(api_key=key)
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=5
                )
                return {"valid": True, "provider": "openai", "message": "OpenAI ChatGPT Connected & Active"}
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "quota" in err_str.lower():
                    return {"valid": False, "rate_limited": True, "provider": "openai", "message": "OpenAI Quota exhausted (HTTP 429). Auto-failover will switch."}
                return {"valid": False, "provider": "openai", "message": f"OpenAI error: {err_str[:120]}"}

        elif provider_norm in ["anthropic", "claude"]:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=key)
                resp = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=5,
                    messages=[{"role": "user", "content": "ping"}]
                )
                return {"valid": True, "provider": "claude", "message": "Anthropic Claude Connected & Active"}
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "rate" in err_str.lower():
                    return {"valid": False, "rate_limited": True, "provider": "claude", "message": "Claude Rate Limit reached. Auto-failover will switch."}
        elif provider.lower() in ["perplexity", "pplx"]:
            try:
                import httpx
                resp = httpx.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={"model": "sonar", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 5},
                    timeout=10.0
                )
                if resp.status_code == 200:
                    return {"valid": True, "provider": "perplexity", "message": "Perplexity AI Connected & Active (Sonar)"}
                elif resp.status_code == 429:
                    return {"valid": False, "rate_limited": True, "provider": "perplexity", "message": "Perplexity Rate Limit reached."}
                else:
                    return {"valid": False, "provider": "perplexity", "message": f"Perplexity error: HTTP {resp.status_code}"}
            except Exception as e:
                return {"valid": False, "provider": "perplexity", "message": f"Perplexity connection error: {str(e)[:120]}"}

        return {"valid": False, "provider": provider, "message": f"Unknown provider: {provider}"}

    # ─── Summarization with Auto-Failover ──────────────────────

    def summarize_text(self, text: str, max_length: int = 1500, style: str = 'comprehensive',
                       provider: Optional[str] = None, api_key: Optional[str] = None,
                       api_keys: Optional[Dict[str, str]] = None,
                       preferred_order: Optional[List[str]] = None) -> Dict:
        """Summarize text using available AI service with automatic quota failover"""
        if len(text.strip()) < 20:
            return {'success': False, 'error': 'Text too short to summarize'}
        
        sample = text[:12000]

        # Gather keys
        merged_keys = {}
        if self.gemini_key:
            merged_keys['gemini'] = self.gemini_key
        if self.openai_client:
            merged_keys['openai'] = 'env'
        if self.anthropic_client:
            merged_keys['anthropic'] = 'env'

        if api_keys and isinstance(api_keys, dict):
            for k, v in api_keys.items():
                if v and len(v.strip()) > 5:
                    merged_keys[k.lower()] = v.strip()

        if api_key and len(api_key.strip()) > 5:
            p = provider or ('gemini' if api_key.startswith('AIza') else 'openai')
            merged_keys[p.lower()] = api_key.strip()

        # Build order
        order = preferred_order or ['gemini', 'openai', 'anthropic']
        # Ensure configured keys come first in order
        configured_order = [p for p in order if p in merged_keys]
        for p in merged_keys:
            if p not in configured_order:
                configured_order.append(p)

        failover_log = []

        for p in configured_order:
            k = merged_keys.get(p)
            try:
                if p == 'gemini':
                    res = self._summarize_gemini(sample, max_length, k)
                    if res.get('success'):
                        res['failover_log'] = failover_log
                        return res
                elif p == 'openai':
                    custom_k = k if k != 'env' else None
                    res = self._summarize_openai(sample, max_length, style, custom_key=custom_k)
                    if res.get('success'):
                        res['failover_log'] = failover_log
                        return res
                elif p in ['anthropic', 'claude']:
                    custom_k = k if k != 'env' else None
                    res = self._summarize_anthropic(sample, max_length, style, custom_key=custom_k)
                    if res.get('success'):
                        res['failover_log'] = failover_log
                        return res
                elif p in ['perplexity', 'pplx']:
                    res = self._summarize_perplexity(sample, max_length, style, k)
                    if res.get('success'):
                        res['failover_log'] = failover_log
                        return res
            except Exception as e:
                msg = f"{p.title()} error/rate-limit: {str(e)[:90]}. Switching to next provider..."
                logger.warning(msg)
                failover_log.append(msg)
                continue

        # Fallback to source-grounded extractive summary when no external LLM keys are configured
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', sample) if len(s.strip()) > 15]
        summary_sentences = sentences[:6] if len(sentences) >= 6 else sentences
        summary_text = " ".join(summary_sentences) if summary_sentences else sample[:300]
        key_pts = self._extract_key_points(sample)
        return {
            'success': True,
            'summary': summary_text,
            'key_points': key_pts,
            'word_count': len(summary_text.split()),
            'method': 'Extractive Document Summary (Source Grounded)',
            'failover_log': failover_log
        }

    def _call_gemini_api(self, prompt: str, api_key: str, max_tokens: int = 3000, 
                         json_mode: bool = False, temperature: float = 0.3) -> str:
        """Call Google Gemini API with dynamic model discovery and multi-version fallback"""
        import httpx
        candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash",
            "gemini-1.5-pro",
            "gemini-pro"
        ]
        
        generation_config = {
            "temperature": temperature,
            "maxOutputTokens": max_tokens
        }
        if json_mode:
            generation_config["responseMimeType"] = "application/json"
            
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": generation_config
        }
        
        last_error = ""
        with httpx.Client(timeout=45.0) as client:
            # Step 1: List models for discovery
            try:
                list_resp = client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
                if list_resp.status_code == 200:
                    models = list_resp.json().get("models", [])
                    gen_models = [m.get("name", "").replace("models/", "") for m in models 
                                  if "generateContent" in m.get("supportedGenerationMethods", [])]
                    if gen_models:
                        candidates = [m for m in gen_models if "flash" in m] + [m for m in gen_models if "pro" in m] + gen_models + candidates
                elif list_resp.status_code == 429:
                    raise RuntimeError("Gemini Quota Exceeded / Rate Limit reached (HTTP 429)")
            except RuntimeError:
                raise
            except Exception:
                pass

            # Step 2: Try candidate models across v1beta and v1
            tried = set()
            for model_name in candidates:
                if model_name in tried:
                    continue
                tried.add(model_name)
                for api_ver in ["v1beta", "v1"]:
                    url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{model_name}:generateContent?key={api_key}"
                    try:
                        resp = client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            return data['candidates'][0]['content']['parts'][0]['text']
                        elif resp.status_code == 429:
                            raise RuntimeError("Gemini Quota Exceeded / Rate Limit reached (HTTP 429)")
                        else:
                            last_error = f"{model_name} ({api_ver}) status {resp.status_code}: {resp.text[:120]}"
                    except httpx.RequestError as req_err:
                        last_error = str(req_err)

        raise RuntimeError(f"Gemini API request failed across available models. Last error: {last_error}")

    def _summarize_gemini(self, text: str, max_length: int, api_key: str) -> Dict:
        """Summarize using Google Gemini API"""
        prompt = f"""You are a senior university professor and curriculum specialist.
Create a comprehensive, highly structured academic study guide and lecture notes from this material for semester examinations.
Target around {max_length} words.

Ensure the notes strictly contain:
1. Executive Summary & Core Learning Objective
2. Deep Dive Into Core Concepts (detailed explanations, step-by-step breakdown)
3. Essential Theories, Models & Architectural Frameworks
4. Real-World Industry Case Applications
5. Critical Exam Traps & Examiner Expectations (common mistakes students make)
6. Key Formulae, Definitions & Glossary
7. 10 High-Yield Exam Takeaways

Format with clear Markdown headings (##, ###), bullet points, and bold text.

Study Material:
{text}"""

        content = self._call_gemini_api(prompt, api_key, max_tokens=3000, temperature=0.3)
        return {
            'success': True,
            'summary': content,
            'key_points': self._extract_key_points(content),
            'word_count': len(content.split()),
            'reading_time': f"{max(2, round(len(content.split()) / 200))} mins",
            'method': 'google_gemini_api'
        }

    def _summarize_openai(self, text: str, max_length: int, style: str, custom_key: Optional[str] = None) -> Dict:
        client = self.openai_client
        if custom_key:
            from openai import OpenAI
            client = OpenAI(api_key=custom_key)
        if not client:
            raise RuntimeError("OpenAI client not configured")

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': f'You are a university assessment expert. Create in-depth academic study notes ({max_length} words) with Executive Summary, Concept Deep-Dive, Theories, Case Studies, Exam Traps, and Key Points.'},
                {'role': 'user', 'content': text}
            ],
            max_tokens=2500, temperature=0.3
        )
        content = response.choices[0].message.content
        return {
            'success': True,
            'summary': content,
            'key_points': self._extract_key_points(content),
            'word_count': len(content.split()),
            'reading_time': f"{max(2, round(len(content.split()) / 200))} mins",
            'method': 'openai_gpt'
        }

    def _summarize_anthropic(self, text: str, max_length: int, style: str, custom_key: Optional[str] = None) -> Dict:
        client = self.anthropic_client
        if custom_key:
            import anthropic
            client = anthropic.Anthropic(api_key=custom_key)
        if not client:
            raise RuntimeError("Anthropic client not configured")

        response = client.messages.create(
            model='claude-3-haiku-20240307',
            max_tokens=2500, temperature=0.3,
            messages=[{'role': 'user', 'content': f'Create comprehensive university study notes with Executive Summary, Detailed Concept Breakdown, Theories, Exam Traps, and Takeaways:\n\n{text}'}]
        )
        content = response.content[0].text
        return {
            'success': True,
            'summary': content,
            'key_points': self._extract_key_points(content),
            'word_count': len(content.split()),
            'reading_time': f"{max(2, round(len(content.split()) / 200))} mins",
            'method': 'anthropic_claude'
        }

    def _summarize_perplexity(self, text: str, max_length: int, style: str, api_key: str) -> Dict:
        import httpx
        prompt = f"Create comprehensive university study notes with Executive Summary, Detailed Concept Breakdown, Theories, Exam Traps, and Key Formulas from this course syllabus:\n\n{text[:10000]}"
        resp = httpx.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "sonar",
                "messages": [
                    {"role": "system", "content": "You are a university academic professor creating study notes for exams."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 2500,
                "temperature": 0.2
            },
            timeout=30.0
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Perplexity error: HTTP {resp.status_code} - {resp.text[:100]}")
        data = resp.json()
        content = data['choices'][0]['message']['content']
        return {
            'success': True,
            'summary': content,
            'key_points': self._extract_key_points(content),
            'word_count': len(content.split()),
            'reading_time': f"{max(2, round(len(content.split()) / 200))} mins",
            'method': 'perplexity_ai'
        }

    def _academic_deep_summarize(self, text: str, max_length: int, style: str) -> Dict:
        """
        Extractive Source-Grounded Summary Engine.
        Summarizes only concepts and passages explicitly present in `text`.
        """
        raw_paras = [p.strip() for p in re.split(r'\n{2,}|---\s*Slide\s*\d+\s*---', text) if len(p.strip()) > 20]
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 15]
        summary_sentences = sentences[:8] if len(sentences) >= 8 else sentences
        summary_body = " ".join(summary_sentences) if summary_sentences else text[:400].strip()
        key_points = self._extract_key_points(text)

        sections = [
            "# Extracted Study Material Summary",
            summary_body,
        ]
        if raw_paras:
            sections.append("## Extracted Passages")
            for idx, para in enumerate(raw_paras[:5]):
                sections.append(f"### Passage {idx + 1}\n{para}")

        full_markdown = "\n\n".join(sections)
        word_count = len(full_markdown.split())

        return {
            'success': True,
            'summary': full_markdown,
            'executive_summary': summary_body,
            'key_points': key_points,
            'word_count': word_count,
            'reading_time': f"{max(1, round(word_count / 200))} mins",
            'method': 'Extractive Document Summary (Source Grounded)',
        }

    def adversarial_review_questions(
        self,
        questions: List[Dict[str, Any]],
        exam_profile: Dict[str, Any],
        api_keys: Optional[Dict[str, str]] = None,
        preferred_order: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Ask a configured model to critique candidates using only supplied evidence."""
        merged_keys = {}
        if self.gemini_key:
            merged_keys["gemini"] = self.gemini_key
        if self.openai_client:
            merged_keys["openai"] = "env"
        if self.anthropic_client:
            merged_keys["anthropic"] = "env"
        for provider, key in (api_keys or {}).items():
            if isinstance(key, str) and len(key.strip()) > 5:
                merged_keys[provider.lower()] = key.strip()

        provider_order = preferred_order or ["gemini", "openai", "anthropic"]
        providers = [p for p in provider_order if p in merged_keys]
        providers.extend(p for p in merged_keys if p not in providers)
        if not providers:
            return {"success": False, "status": "not_configured", "reviews": {}}

        compact_questions = [
            {
                "question_id": q.get("id"),
                "question": str(q.get("question", ""))[:500],
                "topic": q.get("topic", ""),
                "marks": q.get("marks"),
                "type": q.get("type"),
                "evidence": [
                    value for value in (
                        q.get("current_material_evidence"),
                        q.get("historical_evidence"),
                        q.get("university_pattern_evidence"),
                        q.get("source_evidence"),
                    ) if value and not str(value).startswith("No verified")
                ][:4],
            }
            for q in questions
        ]
        prompt = (
            "Evaluate each exam-question candidate adversarially. Use only the supplied evidence; "
            "never invent historical recurrence, syllabus coverage, citations, or approval. For each "
            "question return one concise supporting reason, one concise counterargument, one specific "
            "risk, and an evidence-fit score from 0 to 1. Output valid JSON only as "
            "{\"reviews\":[{\"question_id\":1,\"pros\":[\"...\"],\"cons\":[\"...\"],\"risk\":\"...\",\"score\":0.5}]} .\n"
            f"Exam profile: {json.dumps(exam_profile, ensure_ascii=False)}\n"
            f"Candidates: {json.dumps(compact_questions, ensure_ascii=False)}"
        )

        for provider in providers:
            key = merged_keys[provider]
            try:
                if provider == "gemini":
                    raw = self._call_gemini_api(prompt, key, max_tokens=10000, json_mode=True, temperature=0.1)
                elif provider == "openai":
                    from openai import OpenAI
                    client = self.openai_client if key == "env" else OpenAI(api_key=key)
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"},
                        max_tokens=10000,
                        temperature=0.1,
                    )
                    raw = response.choices[0].message.content
                elif provider in ("anthropic", "claude"):
                    import anthropic
                    client = self.anthropic_client if key == "env" else anthropic.Anthropic(api_key=key)
                    response = client.messages.create(
                        model="claude-3-haiku-20240307",
                        max_tokens=10000,
                        temperature=0.1,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    raw = response.content[0].text
                else:
                    continue

                decoded = json.loads(raw)
                entries = decoded.get("reviews", []) if isinstance(decoded, dict) else decoded
                allowed_ids = {str(q.get("id")) for q in questions}
                reviews = {}
                for entry in entries if isinstance(entries, list) else []:
                    qid = str(entry.get("question_id", ""))
                    if qid not in allowed_ids:
                        continue
                    try:
                        score = max(0.0, min(1.0, float(entry.get("score", 0))))
                    except (TypeError, ValueError):
                        score = 0.0
                    reviews[qid] = {
                        "pros": [str(x)[:400] for x in entry.get("pros", []) if x][:3],
                        "cons": [str(x)[:400] for x in entry.get("cons", []) if x][:3],
                        "risk": str(entry.get("risk", ""))[:500],
                        "score": score,
                    }
                return {
                    "success": True,
                    "status": "complete" if len(reviews) == len(questions) else "partial",
                    "provider": provider,
                    "reviews": reviews,
                }
            except Exception as exc:
                logger.warning("Adversarial review provider %s failed (%s)", provider, type(exc).__name__)

        return {"success": False, "status": "provider_error", "reviews": {}}

    # ─── Multi-Model Question Generation & Auto-Failover ───────

    def generate_questions_with_failover(self, text: str, num_questions: int = 10,
                                         question_types: Optional[List[str]] = None,
                                         api_keys: Optional[Dict[str, str]] = None,
                                         preferred_order: Optional[List[str]] = None) -> Dict:
        """
        Attempts question generation using primary model.
        On HTTP 429 (rate limit / quota exhausted) or connection error,
        automatically switches to next provider in the chain!
        """
        if not question_types:
            question_types = ['multiple_choice', 'short_answer', 'essay']

        # Gather keys
        merged_keys = {}
        if self.gemini_key:
            merged_keys['gemini'] = self.gemini_key
        if self.openai_client:
            merged_keys['openai'] = 'env'
        if self.anthropic_client:
            merged_keys['anthropic'] = 'env'

        if api_keys and isinstance(api_keys, dict):
            for k, v in api_keys.items():
                if v and len(v.strip()) > 5:
                    merged_keys[k.lower()] = v.strip()

        order = preferred_order or ['gemini', 'openai', 'anthropic']
        configured_order = [p for p in order if p in merged_keys]
        for p in merged_keys:
            if p not in configured_order:
                configured_order.append(p)

        failover_log = []

        for p in configured_order:
            k = merged_keys.get(p)
            try:
                if p == 'gemini':
                    logger.info("Attempting question generation with Google Gemini...")
                    questions = self._generate_questions_gemini(text, num_questions, question_types, k)
                    if questions:
                        for q in questions:
                            q['is_ai_generated'] = True
                            q['generation_method'] = 'ai_model'
                        return {
                            'success': True,
                            'questions': questions,
                            'count': len(questions),
                            'engine_used': 'Google Gemini 1.5 Flash',
                            'is_ai_generated': True,
                            'generation_method': 'ai_model',
                            'failover_log': failover_log
                        }
                elif p == 'openai':
                    logger.info("Attempting question generation with OpenAI ChatGPT...")
                    custom_k = k if k != 'env' else None
                    questions = self._generate_questions_openai(text, num_questions, question_types, custom_k)
                    if questions:
                        for q in questions:
                            q['is_ai_generated'] = True
                            q['generation_method'] = 'ai_model'
                        return {
                            'success': True,
                            'questions': questions,
                            'count': len(questions),
                            'engine_used': 'OpenAI ChatGPT (GPT-4o Mini)',
                            'is_ai_generated': True,
                            'generation_method': 'ai_model',
                            'failover_log': failover_log
                        }
                elif p in ['anthropic', 'claude']:
                    logger.info("Attempting question generation with Anthropic Claude...")
                    custom_k = k if k != 'env' else None
                    questions = self._generate_questions_anthropic(text, num_questions, question_types, custom_k)
                    if questions:
                        for q in questions:
                            q['is_ai_generated'] = True
                            q['generation_method'] = 'ai_model'
                        return {
                            'success': True,
                            'questions': questions,
                            'count': len(questions),
                            'engine_used': 'Anthropic Claude',
                            'is_ai_generated': True,
                            'generation_method': 'ai_model',
                            'failover_log': failover_log
                        }
                elif p in ['perplexity', 'pplx']:
                    logger.info("Attempting question generation with Perplexity AI...")
                    questions = self._generate_questions_perplexity(text, num_questions, question_types, k)
                    if questions:
                        for q in questions:
                            q['is_ai_generated'] = True
                            q['generation_method'] = 'ai_model'
                        return {
                            'success': True,
                            'questions': questions,
                            'count': len(questions),
                            'engine_used': 'Perplexity AI (Sonar)',
                            'is_ai_generated': True,
                            'generation_method': 'ai_model',
                            'failover_log': failover_log
                        }
            except Exception as e:
                reason = str(e)
                log_entry = f"{p.title()} quota or rate limit triggered ({reason[:80]}). Automatically switching to next engine..."
                logger.warning(log_entry)
                failover_log.append(log_entry)
                continue

        # If all cloud models failed or none configured: execute Enhanced Academic Syllabus Engine
        logger.info("Using Enhanced Academic Syllabus Engine directly on uploaded text...")
        fallback_questions = self._generate_questions_deep_academic(text, num_questions, question_types)
        return {
            'success': True,
            'questions': fallback_questions,
            'count': len(fallback_questions),
            'engine_used': 'Deterministic Syllabus Extractor (Grounded)',
            'is_ai_generated': False,
            'generation_method': 'deterministic_syllabus_extraction',
            'failover_log': failover_log,
            'note': 'Questions directly extracted from uploaded slides using deterministic syllabus extraction. Connect an AI key to enable live cloud models.'
        }

    def generate_questions(self, text: str, num_questions: int = 10,
                           question_types: Optional[List[str]] = None,
                           api_keys: Optional[Dict[str, str]] = None,
                           preferred_order: Optional[List[str]] = None) -> Dict:
        """Standard question generation entry point"""
        return self.generate_questions_with_failover(text, num_questions, question_types, api_keys, preferred_order)

    def generate_mega_questions(self, text: str, num_questions: int = 300,
                                question_types: Optional[List[str]] = None,
                                api_keys: Optional[Dict[str, str]] = None,
                                preferred_order: Optional[List[str]] = None,
                                timeout_seconds: Optional[float] = None) -> Dict:
        """
        Generate comprehensive question bank (up to 300 questions) by processing text in chunks
        using the auto-failover engine with strict deadline protection.
        """
        if not question_types:
            question_types = ['multiple_choice', 'short_answer', 'essay']

        # Determine deadline budget (default: 7.5s in serverless/Vercel to fit within 10s ceiling)
        if timeout_seconds is None:
            if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
                timeout_seconds = float(os.getenv("AI_GENERATION_TIMEOUT_SECONDS", "7.5"))
            else:
                timeout_seconds = float(os.getenv("AI_GENERATION_TIMEOUT_SECONDS", "30.0"))

        start_time = time.time()
        deadline = (start_time + timeout_seconds) if (timeout_seconds and timeout_seconds > 0) else None

        chunks = self._split_into_chunks(text, chunk_size=3000)
        if not chunks:
            chunks = [text[:4000]]

        all_questions = []
        engine_used = 'Enhanced Academic Engine'
        failover_log = []
        timed_out = False

        # Generate from chunks
        questions_per_chunk = max(num_questions // len(chunks), 8)
        for i, chunk in enumerate(chunks):
            if deadline and time.time() >= deadline:
                timed_out = True
                log_msg = f"AI generation reached execution deadline ({timeout_seconds:.1f}s) after chunk {i} of {len(chunks)}."
                logger.warning(log_msg)
                failover_log.append(log_msg)
                break

            res = self.generate_questions_with_failover(
                chunk, questions_per_chunk, question_types, api_keys, preferred_order
            )
            if (
                res.get('success') and res.get('questions')
                and res.get('engine_used') != 'Enhanced Parul University Academic Syllabus Engine'
            ):
                engine_used = res.get('engine_used', engine_used)
                failover_log.extend(res.get('failover_log', []))
                for q in res['questions']:
                    q['chunk_source'] = i + 1
                    all_questions.append(q)

        # Deduplicate
        unique = self._deduplicate_questions(all_questions)

        final = unique[:num_questions]
        for i, q in enumerate(final):
            q['id'] = i + 1

        is_incomplete = timed_out or (len(final) < num_questions)

        error_message = None
        if not final:
            error_message = 'AI generation timed out before any questions could be returned.' if timed_out else 'No configured AI provider returned source-based questions.'

        return {
            'success': bool(final),
            'questions': final,
            'total_generated': len(final),
            'engine_used': engine_used if final else None,
            'failover_log': list(set(failover_log)),
            'timed_out': timed_out,
            'incomplete': is_incomplete,
            **({'error': error_message} if error_message else {}),
        }

    # ─── Individual Provider Implementations ───────────────────

    def _generate_questions_gemini(self, text: str, num: int, types: List[str], api_key: str) -> List[Dict]:
        """Generate high-yield university exam questions using Google Gemini API"""
        import httpx
        prompt = f"""You are a senior university examination controller and professor for Parul University.
Create an official, authentic university examination question set based STRICTLY on the provided lecture slides and course material.

Number of questions needed: {num}
Question types to include: {', '.join(types)}

EXAM STANDARDS & STRUCTURE (MANDATORY):
1. Ground every question strictly in the provided material (Unit/Module concepts, core definitions, models, principles, advantages/disadvantages).
2. 2-Mark Questions: Formulate as precise definitions or direct distinctions ("Define ...", "State two characteristics of ...", "Differentiate between X and Y").
3. 5-Mark Questions: Formulate as descriptive and procedural questions ("Explain the architecture of ...", "Describe the step-by-step process of ...", "Discuss advantages and limitations of ...").
4. 12-Mark Questions: Formulate as critical analytical essays or case scenarios ("Critically analyze ...", "Evaluate the architectural trade-offs of ... with case examples").
5. MCQs: Must have 4 distinct, plausible options (A, B, C, D) with exactly one unambiguous correct answer and an insightful explanation.
6. Provide a complete, structured MODEL ANSWER for every question with 3-5 bullet key points.

Return ONLY a JSON array of objects conforming to this schema:
[
  {{
    "type": "multiple_choice" | "short_answer" | "essay",
    "question": "Question text...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
    "correct_answer": "Complete, comprehensive model answer...",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "explanation": "Why this answer is correct...",
    "topic": "Specific Topic Name from text",
    "difficulty": "easy" | "medium" | "hard",
    "marks": 2 | 5 | 12,
    "confidence": 0.95
  }}
]

Course Material:
{text[:10000]}"""

        raw_text = self._call_gemini_api(prompt, api_key, max_tokens=4096, json_mode=True, temperature=0.2)
        return self._parse_ai_questions(raw_text, num, types)

    def _generate_questions_openai(self, text: str, num: int, types: List[str], api_key: Optional[str] = None) -> List[Dict]:
        """Generate questions using OpenAI ChatGPT"""
        client = self.openai_client
        if api_key:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
        if not client:
            raise RuntimeError("OpenAI client not configured")

        prompt = f"""You are a senior university examination controller for Parul University.
Generate {num} authentic university examination questions from this text.
Types to include: {', '.join(types)}

Return ONLY a JSON array of objects conforming to this schema:
[
  {{
    "type": "multiple_choice" | "short_answer" | "essay",
    "question": "Question text...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
    "correct_answer": "Complete, comprehensive model answer...",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "explanation": "Why this answer is correct...",
    "topic": "Specific Topic Name from text",
    "difficulty": "easy" | "medium" | "hard",
    "marks": 2 | 5 | 12,
    "confidence": 0.95
  }}
]

Text:
{text[:8000]}"""

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'You are a university examination expert. You output strictly valid JSON arrays of examination questions.'},
                {'role': 'user', 'content': prompt}
            ],
            max_tokens=3500, temperature=0.2
        )
        content = response.choices[0].message.content
        return self._parse_ai_questions(content, num, types)

    def _generate_questions_anthropic(self, text: str, num: int, types: List[str], api_key: Optional[str] = None) -> List[Dict]:
        """Generate questions using Anthropic Claude"""
        client = self.anthropic_client
        if api_key:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
        if not client:
            raise RuntimeError("Anthropic client not configured")

        prompt = f"""You are a university examination controller for Parul University.
Generate {num} authentic examination questions strictly based on this text.
Types to include: {', '.join(types)}

Output ONLY a JSON array of question objects (no intro or markdown code blocks):
[
  {{
    "type": "multiple_choice" | "short_answer" | "essay",
    "question": "Question text...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
    "correct_answer": "Complete model answer...",
    "key_points": ["Point 1", "Point 2"],
    "explanation": "Evaluation note...",
    "topic": "Topic Name",
    "difficulty": "easy" | "medium" | "hard",
    "marks": 2 | 5 | 12,
    "confidence": 0.95
  }}
]

Text:
{text[:8000]}"""

        response = client.messages.create(
            model='claude-3-haiku-20240307',
            max_tokens=3500, temperature=0.2,
            messages=[{'role': 'user', 'content': prompt}]
        )
        content = response.content[0].text
        return self._parse_ai_questions(content, num, types)

    def _generate_questions_deep_academic(self, text: str, num: int, types: List[str]) -> List[Dict]:
        """
        Enhanced Parul University Academic Syllabus Engine.
        Extracts genuine concepts, definitions, bullet points, and structures
        directly from the student's uploaded material following the Master Prompt Set.
        """
        # Institutional metadata filter
        boilerplate_pattern = re.compile(
            r'\b(parul\s*university|vadodara|gujarat|naac|grade\s*a\+\+?|faculty\s+of|'
            r'department\s+of|institute\s+of|assignment\s*\d*|lecture\s*\d*|module\s*\d*|'
            r'unit\s*\d*|semester|roll\s*no|enrolment|academic\s*year|subject\s*code|'
            r'all\s*rights\s*reserved|copyright|prepared\s*by|presented\s*by|dr\.|prof\.|'
            r'page\s*\d+|slide\s*\d+)\b',
            re.IGNORECASE
        )

        raw_paras = [p.strip() for p in re.split(r'\n{2,}|---\s*Slide\s*\d+\s*---', text) if len(p.strip()) > 20]
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 15]

        # Extract topics and definitions
        extracted_topics = []
        for p in raw_paras:
            if boilerplate_pattern.search(p) and len(p.split()) < 15:
                continue
            first_sent = p.split('.')[0].strip()
            first_sent = re.sub(r'^[•\-\*\d\.\)]+\s*', '', first_sent)
            
            # Match definitions "X is defined as...", "X refers to..."
            def_match = re.match(r'^([A-Z][A-Za-z0-9\s\-]{2,45})\s+(is defined as|refers to|means|is the process of|is a method of)\s+(.+)', p, re.IGNORECASE)
            if def_match:
                term = def_match.group(1).strip()
                if not boilerplate_pattern.search(term):
                    extracted_topics.append({
                        'title': term,
                        'content': p,
                        'sentences': [p]
                    })
            elif 5 <= len(first_sent) <= 45 and not boilerplate_pattern.search(first_sent):
                extracted_topics.append({
                    'title': first_sent,
                    'content': p,
                    'sentences': [s.strip() for s in re.split(r'(?<=[.!?])\s+', p) if len(s.strip()) > 10]
                })

        if not extracted_topics:
            # Dynamically derive topics from any available sentences in the uploaded text
            for s in sentences:
                clean_s = boilerplate_pattern.sub('', s).strip()
                words = [w for w in re.findall(r'\b[A-Za-z]{3,}\b', clean_s)]
                if len(words) >= 2:
                    cand = " ".join(words[:4]).title()
                    extracted_topics.append({
                        'title': cand,
                        'content': s,
                        'sentences': [s]
                    })
                if len(extracted_topics) >= 6:
                    break

        if not extracted_topics:
            return []

        questions = []
        max_candidates = min(num, len(extracted_topics) * 10)
        for i in range(max_candidates):
            cat_idx = i // len(extracted_topics) if len(extracted_topics) > 1 else i
            cat_idx = cat_idx % 10
            topic_item = extracted_topics[i % len(extracted_topics)]
            topic_title = topic_item['title']
            content = topic_item['content']
            sents = topic_item['sentences']
            base_conf = None

            clean_term = re.sub(r'^(the|a|an|explain|define|what is|overview of)\s+', '', topic_title, flags=re.IGNORECASE).strip()
            clean_term = re.sub(r'["\':;]', '', clean_term).strip()

            other_topics = [
                t for t in extracted_topics
                if t['title'].lower() != topic_title.lower()
            ]

            if (cat_idx == 0 or types == ['multiple_choice']) and len(other_topics) >= 3:
                correct_def = sents[0] if sents else content[:120]
                d1 = (other_topics[0]['sentences'][0] if other_topics[0]['sentences'] else other_topics[0]['content'])[:90].strip()
                d2 = (other_topics[1]['sentences'][0] if other_topics[1]['sentences'] else other_topics[1]['content'])[:90].strip()
                d3 = (other_topics[2]['sentences'][0] if other_topics[2]['sentences'] else other_topics[2]['content'])[:90].strip()

                options = [
                    f"A) {correct_def[:85]}",
                    f"B) {d1[:85]}",
                    f"C) {d2[:85]}",
                    f"D) {d3[:85]}"
                ]

                questions.append({
                    'id': i + 1,
                    'type': 'multiple_choice',
                    'category': 'Exam MCQs',
                    'question': f"According to the syllabus on '{clean_term}', which statement is correct?",
                    'options': options,
                    'correct_answer': f"Correct: Option A\n\nExplanation: {correct_def}",
                    'key_points': [
                        f"Core academic definition of {clean_term}",
                        "Standard university curriculum grounding",
                        "Differentiated against related syllabus concepts"
                    ],
                    'explanation': f"Directly grounded in unit lecture slides for {clean_term}.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'medium',
                    'marks': 2,
                    'confidence': None,
                    'is_ai_generated': False,
                    'generation_method': 'deterministic_syllabus_extraction',
                })

            elif cat_idx == 0 or types == ['multiple_choice']:
                # Fewer than 3 distinct topics in material: do not fabricate fake distractors.
                # Emit a grounded 2-mark syllabus definition question instead.
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': '1-2 Mark Definitions',
                    'question': f"Define '{clean_term}' and state its primary role according to the syllabus. [2 Marks]",
                    'options': None,
                    'correct_answer': f"📌 Direct Syllabus Definition (2 Marks):\n\"{clean_term} is defined as {sents[0] if sents else content[:110]}\"\n\n💡 Writing Rule: Exactly 2 lines, crisp academic wording.",
                    'key_points': [
                        f"2-line precise definition of {clean_term}",
                        "Directly writable in Section A"
                    ],
                    'explanation': f"Compulsory Section A definition for {clean_term}.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'easy',
                    'marks': 2,
                    'confidence': None,
                    'is_ai_generated': False,
                    'generation_method': 'deterministic_syllabus_extraction',
                })

            elif cat_idx == 1:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': '1-2 Mark Definitions',
                    'question': f"Define '{clean_term}'. [1-2 Marks]",
                    'options': None,
                    'correct_answer': f"📌 Direct Exam Definition (1-2 Marks):\n\"{clean_term} is defined as {sents[0] if sents else content[:110]}\"\n\n💡 Writing Rule: Exactly 2 lines, crisp academic wording, zero filler.",
                    'key_points': [
                        f"2-line precise definition of {clean_term}",
                        "Zero fluff, directly writable in Section A"
                    ],
                    'explanation': "High-yield compulsory Section A question.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'easy',
                    'marks': 2,
                    'confidence': base_conf
                })

            elif cat_idx == 2:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': '2-5 Mark Definitions',
                    'question': f"Explain the concept of '{clean_term}' and state its essential operational objectives. [3-5 Marks]",
                    'options': None,
                    'correct_answer': (
                        f"📝 Elaborated Concept & Definition (Standard University Level):\n\n"
                        f"1. Meaning & Foundational Premise:\n{content[:180]}\n\n"
                        f"2. Core Conceptual Objectives:\n"
                        f"• Comprehensive Understanding: Establishes foundational principles of {clean_term}.\n"
                        f"• Systematic Application: Structures theoretical concepts into actionable academic knowledge.\n"
                        f"• Analytical Evaluation: Enables critical assessment and problem solving."
                    ),
                    'key_points': [
                        "Structured definition with 3 operational objectives",
                        "Standard university notes format"
                    ],
                    'explanation': "University standard notes for 3-5 marks.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'medium',
                    'marks': 3,
                    'confidence': base_conf
                })

            elif cat_idx == 3:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': '5-Mark Answers',
                    'question': f"Discuss '{clean_term}' in detail with its primary components, advantages, and exam importance. [5 Marks]",
                    'options': None,
                    'correct_answer': (
                        f"📋 Model 5-Mark Examination Answer:\n\n"
                        f"1. Definition & Core Meaning:\n{content[:150]}\n\n"
                        f"2. Key Academic Components:\n"
                        f"• Conceptual Framework: Establishes primary principles and structural properties.\n"
                        f"• Methodological Scope: Defines scope, relationships, and operational boundaries.\n\n"
                        f"3. Major Advantages in Examinations:\n"
                        f"• Provides precise conceptual clarity and theoretical grounding.\n"
                        f"• Demonstrates structured academic understanding to examiners.\n"
                        f"• Directly addresses standard university marking rubrics.\n\n"
                        f"💡 Scoring Tip: Present using explicit headings and bullet points for full marks."
                    ),
                    'key_points': [
                        "Definition + 2 key components",
                        "3 clear advantages for full 5-mark allotment"
                    ],
                    'explanation': "Exam-oriented 5-mark answer.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'medium',
                    'marks': 5,
                    'confidence': base_conf
                })

            elif cat_idx == 4:
                questions.append({
                    'id': i + 1,
                    'type': 'essay',
                    'category': '10-Mark Answers',
                    'question': f"Critically analyze '{clean_term}'. Provide a comprehensive theoretical introduction, structural breakdown, required schematic diagram, and strategic impact. [10-12 Marks]",
                    'options': None,
                    'correct_answer': (
                        f"🏛️ Comprehensive 10-Mark Model Examination Answer:\n\n"
                        f"1. Introduction & Theoretical Foundation:\n{content}\n\n"
                        f"2. Detailed Structural Breakdown:\n"
                        f"• Step 1: Input Identification & Classification into core structural elements.\n"
                        f"• Step 2: Methodological Derivation and standard conceptual benchmarking.\n"
                        f"• Step 3: Analytical Review and continuous feedback loop.\n\n"
                        f"3. [DIAGRAM TO DRAW IN EXAM BOOKLET]:\n"
                        f"Diagram Name: \"Structural Architecture of {clean_term}\"\n\n"
                        f"[ Input Parameters ] ➔ [ Analytical Processing ] ➔ [ Evaluation Gate ] ➔ [ Synthesized Output ]\n\n"
                        f"What to write below the diagram:\n"
                        f"\"Draw the sequential flowchart illustrating core stages and relationships in {clean_term}.\"\n\n"
                        f"4. Key Examiner Scoring Points:\n"
                        f"• Precise definition and assumptions stated in opening box.\n"
                        f"• Clear step-by-step conceptual or procedural derivation.\n"
                        f"• Conclusive academic and practical recommendation.\n\n"
                        f"5. Conclusion:\nMastery of {clean_term} provides an empirically grounded framework for university examination success."
                    ),
                    'key_points': [
                        "5-part essay structure (Intro, Breakdown, Diagram, Examiner Points, Conclusion)",
                        "Includes explicit [DIAGRAM TO DRAW] box with sketch and caption text"
                    ],
                    'explanation': "10-12 mark comprehensive essay question.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'hard',
                    'marks': 10,
                    'confidence': base_conf
                })

            elif cat_idx == 5:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': 'Important Diagrams',
                    'question': f"List the important diagram for '{clean_term}' and provide the step-wise explanation to write below it in examinations. [5 Marks]",
                    'options': None,
                    'correct_answer': (
                        f"🖼️ Important University Exam Diagram & Explanation:\n\n"
                        f"Diagram Name: \"Schematic Diagram: {clean_term} Analytical Flow\"\n\n"
                        f"[DRAW THIS SCHEMATIC IN YOUR EXAM BOOKLET]:\n\n"
                        f"[ Stage 1: Resource Inputs ] ➔ [ Stage 2: Processing & Measurement ] ➔ [ Stage 3: Control & Reporting ]\n\n"
                        f"Step-by-Step Explanation to write below the diagram:\n"
                        f"1. Stage 1: Captures initial baseline parameters and direct variables.\n"
                        f"2. Stage 2: Measures operational behavior and assigns driver rates.\n"
                        f"3. Stage 3: Compares results against predetermined benchmarks.\n\n"
                        f"💡 Examiner Tip: Draw with a pencil, box all nodes, and write the 3-point caption underneath."
                    ),
                    'key_points': [
                        "Clear diagram name and schematic box layout",
                        "Exact 3-step explanation to write below the figure"
                    ],
                    'explanation': "High-yield diagrammatic scoring question.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'medium',
                    'marks': 5,
                    'confidence': base_conf
                })

            elif cat_idx == 6:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': 'Process Flowcharts',
                    'question': f"Convert the complete operational process of '{clean_term}' into an easy-to-remember flowchart with brief step explanations. [5 Marks]",
                    'options': None,
                    'correct_answer': (
                        f"🔀 Process Flowchart & Execution Sequence:\n\n"
                        f"Flowchart Title: \"Operational Lifecycle of {clean_term}\"\n\n"
                        f"[ Step 1: Input Collection ] ➔ [ Step 2: Classification ] ➔ [ Step 3: Computation ] ➔ [ Step 4: Decision Review ]\n\n"
                        f"Step-by-Step Logic:\n"
                        f"• Step 1: Capture raw transaction variables and boundary constraints.\n"
                        f"• Step 2: Segregate data into core versus supporting factors.\n"
                        f"• Step 3: Apply standard analytical algorithms to compute outcomes.\n"
                        f"• Step 4: Deliver structured findings to decision-makers."
                    ),
                    'key_points': [
                        "Flowchart in logical step order",
                        "Exam-friendly concise explanation per node"
                    ],
                    'explanation': "Process and operations question.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'medium',
                    'marks': 5,
                    'confidence': base_conf
                })

            elif cat_idx == 7:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': 'Mind Maps & Hierarchy',
                    'question': f"Create a compact, chapter-wise mind map and text-based revision hierarchy for '{clean_term}'.",
                    'options': None,
                    'correct_answer': (
                        f"🧠 Text-Based Mind Map & Revision Hierarchy:\n\n"
                        f"📂 [ {clean_term.upper()} ]\n"
                        f"   ├── 🔹 1. Foundations & Scope (Meaning, Baseline, Assumptions)\n"
                        f"   ├── 🔹 2. Analytical Mechanics (Principles, Variables, Interactions)\n"
                        f"   ├── 🔹 3. Core Applications (Planning, Evaluation, Implementation)\n"
                        f"   └── 🔹 4. Exam Traps (State assumptions first, label all diagram nodes)\n\n"
                        f"💡 Use this hierarchy for 2-minute rapid recall before the exam."
                    ),
                    'key_points': [
                        "4-branch compact text hierarchy",
                        "Main Headings ➔ Subtopics ➔ Keywords"
                    ],
                    'explanation': "Mind map and revision hierarchy.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'easy',
                    'marks': 3,
                    'confidence': base_conf
                })

            elif cat_idx == 8:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': 'Last-Day Revision Notes',
                    'question': f"Prepare a high-yield, last-day revision summary for '{clean_term}' revisable in under 5 minutes.",
                    'options': None,
                    'correct_answer': (
                        f"⏱️ 5-Minute Last-Day Revision Sheet for '{clean_term}':\n\n"
                        f"⚡ 1-Line Core Definition:\n{sents[0] if sents else content[:120]}\n\n"
                        f"📌 4 Bullet Points to Remember:\n"
                        f"• Separates core functional concepts from secondary structural aspects.\n"
                        f"• Evaluates primary mechanisms and verified operational outcomes.\n"
                        f"• Grounded in empirical course concepts directly relevant to examination topics.\n"
                        f"• Always draw and label the schematic flow diagram for 5+ mark questions."
                    ),
                    'key_points': [
                        "Ultra-dense 1-page revision format",
                        "Zero filler — contains only formulas, definitions, and rules"
                    ],
                    'explanation': "Last-day 30-45 min revision sheet.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'easy',
                    'marks': 5,
                    'confidence': base_conf
                })

            else:
                questions.append({
                    'id': i + 1,
                    'type': 'short_answer',
                    'category': 'Common Mistakes & Tips',
                    'question': f"List the common mistakes students make on '{clean_term}' and how to write answers for full marks according to examiners.",
                    'options': None,
                    'correct_answer': (
                        f"⚠️ Common Mistakes & Examiner Writing Secrets for '{clean_term}':\n\n"
                        f"❌ Where Students Frequently Lose Marks:\n"
                        f"1. Giving vague definitions without quoting technical terms or exact formulas.\n"
                        f"2. Mixing up core definitions and secondary features, or leaving key terms undefined.\n"
                        f"3. Drawing unlabelled diagrams or forgetting to write explanatory bullet points underneath.\n\n"
                        f"✅ Examiner Writing Secrets for Full Marks:\n"
                        f"1. Begin with an underlined 2-line standard definition immediately below the question heading.\n"
                        f"2. State all foundational assumptions clearly in box format before showing detailed workings.\n"
                        f"3. Conclude with a 2-line 'Core Significance' or 'Practical Takeaway' paragraph."
                    ),
                    'key_points': [
                        "Identifies top 3 marks-loss traps in university exams",
                        "Provides 3 actionable writing strategies for scoring full marks"
                    ],
                    'explanation': "Common mistakes and examiner writing secrets.",
                    'source_evidence': content[:160],
                    'topic': clean_term[:50],
                    'difficulty': 'easy',
                    'marks': 2,
                    'confidence': base_conf
                })

        deduped = self._deduplicate_questions(questions)
        for idx, q in enumerate(deduped):
            q['id'] = idx + 1
            q['is_ai_generated'] = False
            q['generation_method'] = 'deterministic_syllabus_extraction'
            q['confidence'] = None
        return deduped[:num]

    # ─── Utility Helpers ───────────────────────────────────────

    def _parse_ai_questions(self, ai_response: str, num: int, types: List[str]) -> List[Dict]:
        """Parse structured questions from JSON or free-text AI output"""
        questions = []
        try:
            # Clean markdown code fences if present
            cleaned = re.sub(r'^```(?:json)?\s*', '', ai_response.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r'```\s*$', '', cleaned.strip(), flags=re.MULTILINE)

            json_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                for i, q in enumerate(parsed):
                    q_type = q.get('type', types[i % len(types)])
                    marks = q.get('marks')
                    if not marks:
                        marks = 2 if q_type == 'multiple_choice' else (12 if q_type == 'essay' else 5)

                    raw_conf = q.get('confidence')
                    parsed_conf = None
                    if raw_conf is not None:
                        try:
                            conf_val = float(raw_conf)
                            if 0.0 <= conf_val <= 1.0:
                                parsed_conf = round(conf_val, 3)
                        except (ValueError, TypeError):
                            parsed_conf = None

                    questions.append({
                        'id': i + 1,
                        'type': q_type,
                        'question': q.get('question', ''),
                        'options': q.get('options'),
                        'correct_answer': q.get('correct_answer', ''),
                        'key_points': q.get('key_points', []),
                        'explanation': q.get('explanation', ''),
                        'topic': q.get('topic', 'Core Concept'),
                        'confidence': parsed_conf,
                        'difficulty': q.get('difficulty', 'medium'),
                        'marks': marks
                    })
        except Exception as e:
            logger.warning(f"JSON parsing error: {e}")

        if not questions:
            questions = self._parse_freetext_questions(ai_response, num, types)

        return questions[:num]

    def _parse_freetext_questions(self, text: str, num: int, types: List[str]) -> List[Dict]:
        questions = []
        parts = re.split(r'(?:^|\n)\s*(?:Q?\.?\s*)?\d+[.)\s]', text)
        for i, part in enumerate(parts[1:num+1]):
            part = part.strip()
            if not part or len(part) < 10:
                continue

            lines = [l.strip() for l in part.split('\n') if l.strip()]
            q_type = types[i % len(types)]
            question_text = lines[0]
            options = None
            answer = ''

            opt_lines = [l for l in lines if re.match(r'^[A-Da-d][).\s]', l)]
            if opt_lines:
                options = opt_lines[:4]
                q_type = 'multiple_choice'

            for l in lines:
                if l.lower().startswith(('answer:', 'correct:', 'ans:')):
                    answer = re.sub(r'^(?:answer|correct|ans):\s*', '', l, flags=re.IGNORECASE)

            questions.append({
                'id': i + 1,
                'type': q_type,
                'question': question_text,
                'options': options,
                'correct_answer': answer or 'Refer to unit lecture slides for detailed solution.',
                'key_points': ['Core syllabus definition', 'Practical architectural application'],
                'explanation': 'Extracted from unit material.',
                'topic': 'Unit Concept',
                'confidence': None,
                'difficulty': 'medium',
                'marks': 2 if q_type == 'multiple_choice' else (12 if q_type == 'essay' else 5)
            })

        return questions

    def _split_into_chunks(self, text: str, chunk_size: int = 3000) -> List[str]:
        chunks = []
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
            for i in range(0, len(text), chunk_size - 200):
                chunks.append(text[i:i + chunk_size])
        return chunks if chunks else [text[:chunk_size]]

    def _deduplicate_questions(self, questions: List[Dict]) -> List[Dict]:
        seen = set()
        unique = []
        for q in questions:
            q_text = q.get('question', '').lower().strip()
            key = q_text[:75]
            if key not in seen:
                seen.add(key)
                unique.append(q)
        return unique

    def _extract_key_points(self, text: str) -> List[str]:
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

    def generate_answer(self, question: str, context: str, marks: int,
                        api_keys: Optional[Dict[str, str]] = None,
                        preferred_order: Optional[List[str]] = None) -> Optional[Dict]:
        """Generate high-scoring exam answer with model failover"""
        prompt = f"""You are a university examination evaluator. Provide an official, high-scoring model answer for this exam question worth {marks} marks.
Question: {question}
Source Context: {context[:2000]}

Provide:
1. Complete detailed answer matching {marks} marks standard.
2. 3-5 key bullet points for grading.

Format as JSON: {{"answer": "...", "key_points": ["...", ...]}}"""

        # Try live keys first
        merged_keys = {}
        if self.gemini_key:
            merged_keys['gemini'] = self.gemini_key
        if self.openai_client:
            merged_keys['openai'] = 'env'
        if api_keys and isinstance(api_keys, dict):
            for k, v in api_keys.items():
                if v and len(v.strip()) > 5:
                    merged_keys[k.lower()] = v.strip()

        order = preferred_order or ['gemini', 'openai', 'anthropic']
        configured = [p for p in order if p in merged_keys]

        for p in configured:
            k = merged_keys.get(p)
            try:
                if p == 'gemini':
                    content = self._call_gemini_api(prompt, k, max_tokens=1500, json_mode=True, temperature=0.2)
                    m = re.search(r'\{.*\}', content, re.DOTALL)
                    if m:
                        return json.loads(m.group())
                    return json.loads(content)
                elif p == 'openai':
                    client = self.openai_client if k == 'env' else None
                    if not client and k:
                        from openai import OpenAI
                        client = OpenAI(api_key=k)
                    if client:
                        response = client.chat.completions.create(
                            model='gpt-4o-mini',
                            messages=[{'role': 'user', 'content': prompt}],
                            max_tokens=1000, temperature=0.2
                        )
                        content = response.choices[0].message.content
                        m = re.search(r'\{.*\}', content, re.DOTALL)
                        if m:
                            return json.loads(m.group())
            except Exception as e:
                logger.warning(f"Answer gen failover from {p}: {e}")
                continue

        return None

    def analyze_slides_and_generate(self, frames: List[str], api_keys: Optional[Dict[str, str]] = None, preferred_order: Optional[List[str]] = None) -> Dict[str, Any]:
        """Analyze captured slide screenshots, extract content, and generate questions and study breakdown"""
        if not frames:
            return {"success": False, "error": "No frames provided"}

        total_frames = len(frames)
        if total_frames <= 10:
            sampled_indices = list(range(total_frames))
        else:
            step = total_frames / 10
            sampled_indices = [int(i * step) for i in range(10)]
            if (total_frames - 1) not in sampled_indices:
                sampled_indices[-1] = total_frames - 1

        sampled_frames = [frames[i] for i in sampled_indices]

        merged_keys = {}
        if self.gemini_key:
            merged_keys['gemini'] = self.gemini_key
        if self.openai_client:
            merged_keys['openai'] = 'env'
        if self.anthropic_client:
            merged_keys['anthropic'] = 'env'

        if api_keys and isinstance(api_keys, dict):
            for k, v in api_keys.items():
                if v and len(v.strip()) > 5:
                    merged_keys[k.lower()] = v.strip()

        order = preferred_order or ['gemini', 'openai', 'anthropic']
        configured = [p for p in order if p in merged_keys]

        # Only Gemini vision is implemented for image-frame input.
        if 'gemini' in configured or merged_keys.get('gemini'):
            gem_key = merged_keys.get('gemini')
            try:
                import httpx
                candidates = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"]
                
                parts = [
                    {"text": """You are an elite academic curriculum specialist and university professor.
Analyze these captured lecture slide/textbook screenshots.
1. Extract all key topics, principles, definitions, models, and equations into comprehensive structured Markdown study notes (use ## headings and bullet points).
2. Formulate 15 critical, examination-standard questions based directly on what is taught in these slides:
   - 7 Multiple Choice Questions (with 4 options, marked correct answer, and explanation)
   - 5 Short Answer Questions (5 marks each)
   - 3 Deep-Dive Essay Questions (12 marks each)

Return ONLY a valid JSON object matching this schema:
{
  "notes": "Comprehensive Markdown study notes with ## headings and bullet points...",
  "key_points": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4", "Key takeaway 5"],
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "B) ...",
      "explanation": "Why correct...",
      "topic": "Topic Name",
      "difficulty": "medium",
      "marks": 2,
                }
  ]
}"""}
                ]

                for sf in sampled_frames:
                    b64 = sf.split(",", 1)[1] if "," in sf else sf
                    parts.append({
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": b64
                        }
                    })

                payload = {
                    "contents": [{"parts": parts}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 4096,
                        "responseMimeType": "application/json"
                    }
                }

                with httpx.Client(timeout=60.0) as client:
                    for model in candidates:
                        for v in ["v1beta", "v1"]:
                            url = f"https://generativelanguage.googleapis.com/{v}/models/{model}:generateContent?key={gem_key}"
                            try:
                                resp = client.post(url, json=payload)
                                if resp.status_code == 200:
                                    res_data = resp.json()
                                    txt = res_data['candidates'][0]['content']['parts'][0]['text']
                                    parsed = json.loads(txt)
                                    notes = parsed.get("notes")
                                    if not isinstance(notes, str) or not notes.strip():
                                        continue
                                    questions = parsed.get("questions", [])
                                    if not isinstance(questions, list):
                                        questions = []
                                    for question in questions:
                                        if not isinstance(question, dict):
                                            continue
                                        raw_c = question.get("confidence")
                                        parsed_c = None
                                        if raw_c is not None:
                                            try:
                                                c_val = float(raw_c)
                                                if 0.0 <= c_val <= 1.0:
                                                    parsed_c = round(c_val, 3)
                                            except (ValueError, TypeError):
                                                parsed_c = None
                                        question["confidence"] = parsed_c
                                    return {
                                        "success": True,
                                        "method": "gemini_multimodal_vision",
                                        "model": model,
                                        "slide_count": total_frames,
                                        "notes": notes,
                                        "key_points": parsed.get("key_points", []),
                                        "questions": [q for q in questions if isinstance(q, dict) and q.get("question")]
                                    }
                            except Exception:
                                continue
            except Exception as e:
                logger.warning("Gemini vision analysis failed (%s)", type(e).__name__)

        return {
            "success": False,
            "error": "No configured Gemini vision provider completed slide extraction; no questions were generated.",
        }
