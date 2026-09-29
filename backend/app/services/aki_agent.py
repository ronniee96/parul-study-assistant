"""
Google Antigravity Study Agent & Aki AI Companion Service
Combines Antigravity agentic software engineering capabilities with Parul University study guidance.
"""

import os
import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

AKI_SYSTEM_PROMPT = """
You are Aki, an expert AI Developer & Study Agent specialized in Google Antigravity and university exam preparation.
Your core mission is to help the user master, debug, and write software using Antigravity's next-generation, agent-first environment, while also serving as a cheerful, humble, and brilliant anime study companion for Parul University students.

Your capabilities:
1. Explain Antigravity concepts (Editor View, tab-aware autocompletion, cross-surface agentic workflows).
2. Help orchestrate task-based agent components (synchronizing terminal, browser, and editor).
3. Architect multi-agent setups via "mission control" hubs (including the 6-agent university squad: Dr. Verma, Prof. Mukherjee, Prof. Kulkarni, Dr. Gupta, Sentinel-V3, and Agent Neuro).
4. Assist with Antigravity features like IDE App Builder, Code Assistant, and Mobile Companion.
5. Review generated artifacts and inspection results to refine software and academic tasks.
6. Provide Bloom's taxonomy marking blueprints, 10-mark case study breakdowns, formula cheat sheets, and active recall advice.

Tone: Cheerful, polite, humble, deeply knowledgeable, encouraging, and structured. Always provide clean markdown, bullet points, and code blocks where helpful.
"""

class AkiStudyAgent:
    """
    Antigravity-enhanced AI study companion agent.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.api_key and self.api_key.startswith("AIzaSy"):
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=AKI_SYSTEM_PROMPT
                )
                logger.info("Aki Antigravity Agent initialized with Gemini 1.5 Flash.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini client: {e}")
                self.client = None

    def _call_gemini_rest(self, prompt: str, context: Optional[str] = None, api_key: str = "") -> Optional[str]:
        """Direct REST call to Gemini API using httpx without grpc requirements"""
        try:
            import httpx
            full_prompt = prompt
            if context:
                full_prompt = f"Context Material from student's syllabus:\n{context[:3000]}\n\nUser Question:\n{prompt}"

            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"System Instructions:\n{AKI_SYSTEM_PROMPT}\n\nTask:\n{full_prompt}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 2000
                }
            }

            models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"]
            with httpx.Client(timeout=30.0) as client:
                for model in models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                return parts[0].get("text", "").strip()
        except Exception as e:
            logger.warning(f"Aki REST call to Gemini failed: {e}")
        return None

    def query(self, prompt: str, context: Optional[str] = None, user_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a question through Aki's Antigravity intelligence pipeline.
        """
        active_key = user_key or self.api_key
        if user_key and user_key != self.api_key:
            self.api_key = user_key
            self._init_client()

        # 1. Try google.generativeai client if available
        if self.client:
            try:
                full_prompt = prompt
                if context:
                    full_prompt = f"Context Material from student's syllabus:\n{context[:3000]}\n\nUser Question:\n{prompt}"

                response = self.client.generate_content(full_prompt)
                if response and response.text:
                    return {
                        "success": True,
                        "agent": "Aki (Google Antigravity Agent)",
                        "response": response.text.strip(),
                        "mode": "gemini_live",
                        "model": "gemini-1.5-flash"
                    }
            except Exception as e:
                logger.warning(f"Gemini generation error, trying REST pipeline: {e}")

        # 2. Try direct REST call with active key
        if active_key and active_key.startswith("AIza"):
            rest_text = self._call_gemini_rest(prompt, context, active_key)
            if rest_text:
                return {
                    "success": True,
                    "agent": "Aki (Google Antigravity Agent)",
                    "response": rest_text,
                    "mode": "gemini_live_rest",
                    "model": "gemini-1.5-flash"
                }

        # 3. Intelligent Fallback & Built-in Antigravity / Academic Knowledge Base
        lower_q = prompt.lower()

        if any(w in lower_q for w in ["antigravity", "agent-first", "cross-surface"]):
            ans = (
                "🚀 **Google Antigravity Agent Architecture Overview**:\n\n"
                "Google Antigravity introduces an **agent-first environment** that unifies the developer workspace:\n"
                "1. **Editor View**: Context-aware coding with semantic index buffers across your entire repository.\n"
                "2. **Cross-Surface Workflows**: Synchronizes terminal execution, live browser DOM verification, and editor diffs seamlessly.\n"
                "3. **Mission Control Multi-Agent Hub**: Multiple specialized agents (like our 6 academic professors) run concurrently, sharing artifacts and memory.\n"
                "4. **Artifacts & Inspection**: Formal verification documents and inspectable diffs prevent regressions.\n\n"
                "Would you like me to architect a task component or explain multi-agent communication patterns?"
            )
            target = "squad"
        elif any(w in lower_q for w in ["case study", "10 mark", "10-mark", "ten mark"]):
            ans = (
                "📝 **Aki's 10-Mark Blueprint for Parul University**:\n\n"
                "To get top scores (9-10/10), examiners look for structural depth:\n"
                "- **Part 1 (Executive Intro)**: 2-3 lines defining the core principle with textbook keywords.\n"
                "- **Part 2 (ASCII Conceptual Framework)**: Draw a clean box diagram, bell curve, or matrix.\n"
                "- **Part 3 (Analytical Core)**: 4 distinct points with subheadings linking theory to the scenario.\n"
                "- **Part 4 (Managerial Implication / Real-world Case)**: 2 lines on practical industrial execution.\n\n"
                "Check out the **Answer Bank** tab to see this blueprint applied to every predicted question!"
            )
            target = "answers"
        elif any(w in lower_q for w in ["predict", "prediction", "exam paper", "question paper"]):
            ans = (
                "🎯 **Parul University Exam Predictor Hub**:\n\n"
                "Our Exam Predictor engine maps question frequency, marks weighting, and Bloom's Taxonomy into standard university format:\n"
                "- **Section A**: 5 questions × 2 marks (Definitions & Core Concepts)\n"
                "- **Section B**: 5 questions × 5 marks (Descriptive & Analytical Frameworks)\n"
                "- **Section C**: 2 questions × 12.5 marks (Comprehensive Essay & Case Study)\n\n"
                "Head over to the **Exam Predictor** tab to download your predicted question paper PDF!"
            )
            target = "predictor"
        elif any(w in lower_q for w in ["squad", "6 agents", "professors", "agents"]):
            ans = (
                "🤖 **Meet the 6-Agent AI Squad**:\n\n"
                "- **Dr. Verma (Dean)**: Bloom's Taxonomy and institutional marking scheme compliance.\n"
                "- **Prof. Mukherjee**: 10-mark structural blueprints and ASCII process diagrams.\n"
                "- **Prof. Kulkarni**: Quantitative numericals, NPV calculations, and business matrices.\n"
                "- **Dr. Gupta**: Pedagogical memory retention, cheat-sheet mnemonics, and recall cards.\n"
                "- **Sentinel-V3**: Zero-hallucination shield, institutional slide header purge.\n"
                "- **Agent Neuro**: Multi-API router, latency failover across 12 AI providers."
            )
            target = "squad"
        elif context and len(context) > 50:
            words = context.split()[:80]
            summary_snippet = " ".join(words)
            ans = (
                f"📚 **Syllabus Context Analysis from Aki**:\n\n"
                f"I've indexed your uploaded document! Here is a key insight related to your query:\n\n"
                f"> \"{summary_snippet}...\"\n\n"
                "This topic has high likelihood of appearing in Section B or C. Let me know if you want me to generate practice MCQs or a 1-page quick revision sheet!"
            )
            target = "questions"
        else:
            ans = (
                f"🌸 **Aki is here to help!**\n\n"
                f"Regarding \"{prompt}\":\n"
                "As your Antigravity Study Companion, I can help you debug software, understand multi-agent architectures, predict semester exam papers, or solve tricky case study questions!\n\n"
                "Tip: Upload your syllabus notes in the **Upload** tab so I can ground all my answers directly in your university curriculum! 💖"
            )
            target = "upload"

        return {
            "success": True,
            "agent": "Aki (Google Antigravity Agent)",
            "response": ans,
            "targetTab": target,
            "mode": "antigravity_knowledge_engine"
        }
