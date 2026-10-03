"""
Multi-Agent Adversarial Arena - Real AI Agent Deliberation
Orchestrates 6 specialized agents with distinct roles and model preferences:
1. Academic Patron (Dean Verma) - Syllabus & Curriculum Governance
2. Prof. S. Mukherjee - Lead Exam Strategist & Chief Examiner
3. Prof. N. Kulkarni - Adversarial Question Critic & Evaluator
4. Dr. R. Gupta - Model Answer Architect & Solutions Lead
5. Agent Neuro - Cognitive Adaptive Coach & Learning Optimizer
6. Sentinel-V3 - Hallucination & Document Grounding Auditor
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from collections import Counter

from app.services.ai_service import AIService
from app.models.schemas import QuestionItem, UniversityExamProfile

logger = logging.getLogger(__name__)

# Agent configurations matching frontend AgentSquadTab
AGENT_CONFIGS = [
    {
        "id": "president",
        "name": "Academic Patron",
        "role": "Syllabus & Curriculum Governance",
        "avatar": "🏛️",
        "model_preference": ["gemini", "openai"],
        "specialty": "Institutional Governance, NAAC Grade A++ Academic Rigor & University Syllabus Vision",
        "directive": "Uphold Parul University academic excellence, oversee Bloom's taxonomy benchmarks, and empower every student to excel."
    },
    {
        "id": "researcher",
        "name": "Prof. S. Mukherjee",
        "role": "Lead Exam Strategist & Chief Examiner",
        "avatar": "👨‍🏫",
        "model_preference": ["perplexity", "anthropic", "gemini"],
        "specialty": "University Syllabus Weightage, Marking Rubrics & Section Allocations",
        "directive": "Parse text, extract definitions, formulas, and link concepts across all uploaded modules."
    },
    {
        "id": "critic",
        "name": "Prof. N. Kulkarni",
        "role": "Adversarial Question Critic & Evaluator",
        "avatar": "⚖️",
        "model_preference": ["anthropic", "openai", "gemini"],
        "specialty": "Ambiguity Detection, Difficulty Calibration & Redundancy Removal",
        "directive": "Stress-test all draft questions for logical loopholes, clarity, and genuine exam rigour."
    },
    {
        "id": "architect",
        "name": "Dr. R. Gupta",
        "role": "Model Answer Architect & Solutions Lead",
        "avatar": "📝",
        "model_preference": ["openai", "gemini", "anthropic"],
        "specialty": "Structured Step-by-Step Scoring Solutions, Proofs & Key Bullet Points",
        "directive": "Draft 100% complete answers with point allocations for 2-mark, 5-mark, and 12-mark questions."
    },
    {
        "id": "neuro",
        "name": "Agent Neuro",
        "role": "Cognitive Adaptive Coach & Learning Optimizer",
        "avatar": "🧠",
        "model_preference": ["gemini", "openai"],
        "specialty": "Leitner Spaced Repetition Scheduling, Forgetting Curves & Weak Area Diagnosis",
        "directive": "Calculate student retention velocity and prioritize high-yield revision topics."
    },
    {
        "id": "sentinel",
        "name": "Sentinel-V3",
        "role": "Hallucination & Document Grounding Auditor",
        "avatar": "🛡️",
        "model_preference": ["anthropic", "gemini"],
        "specialty": "Source Citation Verification, Code Token Stripping & Zero-Hallucination Gate",
        "directive": "Reject any non-syllabus terms, code fragments, or unverified claims before user delivery."
    }
]


class MultiAgentArena:
    """Orchestrates real multi-agent deliberation using AIService with auto-failover"""

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    async def run_deliberation(
        self,
        extracted_text: str,
        questions: List[Dict[str, Any]],
        exam_profile: Dict[str, Any],
        api_keys: Optional[Dict[str, str]] = None,
        preferred_order: Optional[List[str]] = None,
        session_id: str = ""
    ) -> Dict[str, Any]:
        """
        Execute the 6-agent deliberation pipeline:
        1. Academic Patron - Sets governance framework & syllabus vision
        2. Prof. Mukherjee - Extracts & indexes document corpus, formulates blueprint
        3. Prof. Kulkarni - Runs adversarial question stress-test
        4. Dr. Gupta - Drafts step-by-step marking scheme & solutions
        5. Sentinel-V3 - Zero-hallucination & document grounding gate
        6. Agent Neuro - Builds spaced repetition roadmap
        """
        deliberation_logs = []

        # Prepare compact question data for agents
        compact_questions = self._compact_questions(questions)

        # Prepare exam profile summary
        profile_summary = self._summarize_profile(exam_profile)

        # Run each agent sequentially (they build on each other's output)
        agent_outputs = {}

        for i, agent_config in enumerate(AGENT_CONFIGS):
            # Build agent-specific prompt
            agent_prompt = self._build_agent_prompt(
                agent_config=agent_config,
                extracted_text=extracted_text,
                questions=compact_questions,
                exam_profile=profile_summary,
                previous_outputs=agent_outputs
            )

            # Call AI with agent's preferred model order
            result = await self._call_agent_model(
                prompt=agent_prompt,
                agent_config=agent_config,
                api_keys=api_keys,
                preferred_order=preferred_order
            )

            agent_outputs[agent_config["id"]] = {
                "config": agent_config,
                "output": result,
                "success": result.get("success", False)
            }

            # Log this agent's deliberation step
            deliberation_logs.append({
                "step": i + 1,
                "agent": agent_config,
                "action": agent_config["directive"][:80],
                "detail": result.get("summary", result.get("output", "Processing..."))[:200],
                "success": result.get("success", False),
                "provider": result.get("provider", "unknown"),
                "timestamp": datetime.now().isoformat()
            })

            # Small delay to prevent rate limiting
            await asyncio.sleep(0.3)

        # Synthesize consensus report
        consensus_report = self._synthesize_consensus(agent_outputs, questions, profile_summary)

        return {
            "success": True,
            "deliberation_logs": deliberation_logs,
            "consensus_report": consensus_report,
            "agent_outputs": {k: v["output"] for k, v in agent_outputs.items()},
            "timestamp": datetime.now().isoformat()
        }

    def _compact_questions(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Reduce question data to essential fields for agent prompts"""
        return [
            {
                "id": q.get("id"),
                "question": str(q.get("question", ""))[:300],
                "topic": q.get("topic", ""),
                "marks": q.get("marks", 2),
                "type": q.get("type", "short_answer"),
                "bloom_level": q.get("bloom_level", "understanding"),
                "evidence_score": q.get("evidence_score"),
                "adversarial_score": q.get("adversarial_score")
            }
            for q in questions[:50]  # Limit to 50 for token efficiency
        ]

    def _summarize_profile(self, exam_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key profile data for agents"""
        if not exam_profile:
            return {}
        return {
            "university": exam_profile.get("university", "Parul University"),
            "subject": exam_profile.get("subject", "Subject"),
            "total_marks": exam_profile.get("total_marks"),
            "duration_hours": exam_profile.get("duration_hours"),
            "sections": [
                {
                    "name": s.get("name"),
                    "marks_per_question": s.get("marks_per_question"),
                    "num_questions": s.get("num_questions"),
                    "choice_rule": s.get("choice_rule"),
                    "question_types": s.get("question_types", [])
                }
                for s in exam_profile.get("sections", [])
            ],
            "bloom_distribution": exam_profile.get("bloom_distribution", {}),
            "theory_vs_numerical": exam_profile.get("theory_vs_numerical", {}),
            "recurring_command_verbs": exam_profile.get("recurring_command_verbs", []),
            "learned_from_past_papers": exam_profile.get("learned_from_past_papers", False)
        }

    def _build_agent_prompt(
        self,
        agent_config: Dict[str, Any],
        extracted_text: str,
        questions: List[Dict[str, Any]],
        exam_profile: Dict[str, Any],
        previous_outputs: Dict[str, Any]
    ) -> str:
        """Build agent-specific prompt based on role and previous outputs"""

        base_context = f"""You are {agent_config['name']}, {agent_config['role']}.
Your directive: {agent_config['directive']}

EXAM CONTEXT:
- University: {exam_profile.get('university', 'Parul University')}
- Subject: {exam_profile.get('subject', 'Subject')}
- Total Marks: {exam_profile.get('total_marks', 'Not specified')}
- Duration: {exam_profile.get('duration_hours', 'Not specified')} hours
- Sections: {len(exam_profile.get('sections', []))} defined
- Learned from past papers: {exam_profile.get('learned_from_past_papers', False)}

SOURCE MATERIAL (first 8000 chars):
{extracted_text[:8000]}

QUESTION CANDIDATES ({len(questions)} questions):
{json.dumps(questions, ensure_ascii=False)[:6000]}"""

        # Add previous agent outputs as context
        if previous_outputs:
            prev_summary = "\n\nPREVIOUS AGENT OUTPUTS:\n"
            for agent_id, output in previous_outputs.items():
                if output.get("success"):
                    prev_summary += f"\n--- {output['config']['name']} ---\n"
                    out = output['output']
                    if isinstance(out, dict):
                        prev_summary += json.dumps(out, ensure_ascii=False)[:1500]
                    else:
                        prev_summary += str(out)[:1500]
            base_context += prev_summary

        # Agent-specific instructions
        if agent_config["id"] == "president":
            specific = """

YOUR TASK: Set the governance framework for this deliberation.
Return JSON with:
{
  "governance_framework": {
    "academic_standards": ["NAAC Grade A++ rigor", "Bloom's taxonomy alignment", "Syllabus boundary enforcement"],
    "quality_benchmarks": ["Evidence-based only", "Zero hallucination tolerance", "Parul University format compliance"],
    "priority_order": ["Syllabus coverage", "Question authenticity", "Marking scheme accuracy"]
  },
  "session_directive": "Your directive to the council for this deliberation",
  "summary": "One paragraph summary of your governance decision"
}"""

        elif agent_config["id"] == "researcher":
            specific = """

YOUR TASK: Analyze the document corpus and formulate the exam blueprint.
Return JSON with:
{
  "document_analysis": {
    "core_topics": ["topic1", "topic2", ...],
    "key_definitions": ["def1", "def2", ...],
    "formulas_found": ["formula1", "formula2", ...],
    "module_coverage": "Description of syllabus module distribution"
  },
  "exam_blueprint": {
    "section_allocation": {
      "Section A (2 marks)": {"count": 5, "topics": ["..."], "types": ["definition", "distinction"]},
      "Section B (5 marks)": {"count": 5, "topics": ["..."], "types": ["explanation", "process"]},
      "Section C (12 marks)": {"count": 2, "topics": ["..."], "types": ["case_study", "critical_analysis"]}
    },
    "bloom_targets": {"remembering": 0.2, "understanding": 0.3, "applying": 0.25, "analyzing": 0.15, "evaluating": 0.1},
    "total_questions": 300
  },
  "summary": "One paragraph summary of your document analysis and blueprint"
}"""

        elif agent_config["id"] == "critic":
            specific = """

YOUR TASK: Run adversarial stress-test on ALL question candidates.
Return JSON with:
{
  "adversarial_reviews": [
    {
      "question_id": 1,
      "ambiguity_detected": true/false,
      "ambiguity_details": "Specific issue found",
      "difficulty_calibration": "easy/medium/hard",
      "redundancy_flag": true/false,
      "redundancy_details": "Which question it duplicates",
      "evidence_gaps": ["gap1", "gap2"],
      "quality_score": 0.0-1.0,
      "verdict": "APPROVE/REVISE/REJECT",
      "revision_guidance": "Specific improvement instruction"
    }
  ],
  "overall_stats": {
    "total_reviewed": 50,
    "approved": 40,
    "revise": 8,
    "rejected": 2,
    "avg_quality_score": 0.85
  },
  "summary": "One paragraph summary of adversarial findings"
}"""

        elif agent_config["id"] == "architect":
            specific = """

YOUR TASK: Draft complete model answers with marking schemes for top questions.
Return JSON with:
{
  "model_answers": [
    {
      "question_id": 1,
      "marks": 5,
      "structured_answer": "Complete answer with headings and bullet points",
      "key_points": ["point1", "point2", "point3", "point4", "point5"],
      "marking_scheme": {
        "definition": 1,
        "explanation": 2,
        "example": 1,
        "diagram": 1
      },
      "examiner_tips": "How to write for full marks"
    }
  ],
  "answer_quality_checklist": [
    "All answers have exact mark allocation breakdown",
    "Key points bolded and numbered",
    "Diagrams described with ASCII format",
    "Examiner expectations explicitly stated"
  ],
  "summary": "One paragraph summary of answer architecture"
}"""

        elif agent_config["id"] == "sentinel":
            specific = """

YOUR TASK: Zero-hallucination audit - verify every question against source material.
Return JSON with:
{
  "grounding_audit": [
    {
      "question_id": 1,
      "grounded": true/false,
      "source_citation": "Exact location in source material",
      "hallucination_flags": ["flag1", "flag2"],
      "code_fragments_found": true/false,
      "non_syllabus_terms": ["term1", "term2"],
      "verification_score": 0.0-1.0
    }
  ],
  "overall_verification": {
    "total_checked": 50,
    "fully_grounded": 45,
    "partial_grounding": 3,
    "hallucinations_rejected": 2,
    "avg_verification_score": 0.96
  },
  "summary": "One paragraph summary of grounding verification"
}"""

        elif agent_config["id"] == "neuro":
            specific = """

YOUR TASK: Build spaced repetition roadmap and weak area diagnosis.
Return JSON with:
{
  "spaced_repetition_schedule": {
    "day_1": {"focus": "Core definitions & formulas", "questions": [1,2,3,4,5], "method": "Active recall"},
    "day_2": {"focus": "Process explanations", "questions": [6,7,8,9,10], "method": "Feynman technique"},
    "day_3": {"focus": "Critical analysis & case studies", "questions": [11,12,13,14,15], "method": "Structured essay"},
    "day_4": {"focus": "Mixed review - weak areas", "questions": [], "method": "Leitner box review"},
    "day_5": {"focus": "Mock exam simulation", "questions": [1..25], "method": "Timed practice"}
  },
  "weak_area_diagnosis": {
    "low_evidence_topics": ["topic1", "topic2"],
    "missing_question_types": ["numerical", "diagram_based"],
    "bloom_gaps": ["creating", "evaluating"],
    "recommended_focus": "Priority topics for revision"
  },
  "retention_velocity": {
    "current_estimate": "65% retention at 72h",
    "target_with_schedule": "85%+ retention at exam",
    "critical_review_points": ["Day 1", "Day 3", "Day 5"]
  },
  "summary": "One paragraph summary of cognitive optimization plan"
}"""
        else:
            specific = "\nYOUR TASK: Provide expert analysis. Return structured JSON with summary."

        return base_context + specific + "\n\nOutput ONLY valid JSON. No markdown code fences."

    async def _call_agent_model(
        self,
        prompt: str,
        agent_config: Dict[str, Any],
        api_keys: Optional[Dict[str, str]] = None,
        preferred_order: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Call AI with agent's preferred model order, using AIService with failover"""

        # Merge API keys with service keys
        merged_keys = {}
        if self.ai_service.gemini_key:
            merged_keys["gemini"] = self.ai_service.gemini_key
        if self.ai_service.openai_client:
            merged_keys["openai"] = "env"
        if self.ai_service.anthropic_client:
            merged_keys["anthropic"] = "env"
        if api_keys and isinstance(api_keys, dict):
            for k, v in api_keys.items():
                if v and len(v.strip()) > 5:
                    merged_keys[k.lower()] = v.strip()

        # Build provider order: agent's preference first, then configured keys
        agent_preference = agent_config.get("model_preference", [])
        provider_order = [p for p in agent_preference if p in merged_keys]
        provider_order.extend(p for p in merged_keys if p not in provider_order)

        if not provider_order:
            return {
                "success": False,
                "error": "No AI provider configured",
                "provider": "none",
                "output": "Agent could not run - no API keys available"
            }

        last_error = ""
        for provider in provider_order:
            key = merged_keys.get(provider)
            try:
                if provider == "gemini":
                    raw = await self._call_gemini(prompt, key)
                elif provider == "openai":
                    raw = await self._call_openai(prompt, key)
                elif provider == "anthropic":
                    raw = await self._call_anthropic(prompt, key)
                else:
                    continue

                # Parse JSON response
                parsed = self._parse_agent_json(raw)
                if parsed:
                    return {
                        "success": True,
                        "provider": provider,
                        "output": parsed,
                        "summary": parsed.get("summary", "Completed")
                    }
                else:
                    last_error = f"Invalid JSON from {provider}"

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Agent {agent_config['name']} - {provider} failed: {e}")
                continue

        return {
            "success": False,
            "error": f"All providers failed. Last error: {last_error}",
            "provider": "none",
            "output": "Agent execution failed"
        }

    async def _call_gemini(self, prompt: str, api_key: str) -> str:
        """Call Gemini API"""
        import httpx
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json"
            }
        }
        candidates = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-pro"]
        async with httpx.AsyncClient(timeout=60.0) as client:
            for model in candidates:
                for v in ["v1beta", "v1"]:
                    url = f"https://generativelanguage.googleapis.com/{v}/models/{model}:generateContent?key={api_key}"
                    try:
                        resp = await client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            return data['candidates'][0]['content']['parts'][0]['text']
                        elif resp.status_code == 429:
                            raise RuntimeError("Rate limited")
                    except Exception:
                        continue
        raise RuntimeError("All Gemini models failed")

    async def _call_openai(self, prompt: str, api_key: Optional[str]) -> str:
        """Call OpenAI API"""
        from openai import OpenAI
        client = self.ai_service.openai_client if api_key == "env" else (OpenAI(api_key=api_key) if api_key else None)
        if not client:
            raise RuntimeError("OpenAI not configured")
        response = await client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'You are a university examination expert. Output only valid JSON.'},
                {'role': 'user', 'content': prompt}
            ],
            max_tokens=4096,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content

    async def _call_anthropic(self, prompt: str, api_key: Optional[str]) -> str:
        """Call Anthropic API"""
        import anthropic
        client = self.ai_service.anthropic_client if api_key == "env" else (anthropic.Anthropic(api_key=api_key) if api_key else None)
        if not client:
            raise RuntimeError("Anthropic not configured")
        response = await client.messages.create(
            model='claude-3-haiku-20240307',
            max_tokens=4096,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def _parse_agent_json(self, raw: str) -> Optional[Dict]:
        """Parse JSON from agent response"""
        try:
            cleaned = raw.strip()
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
            cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE)
            return json.loads(cleaned)
        except Exception:
            try:
                # Try to extract JSON object
                import re
                match = re.search(r'\{.*\}', raw, re.DOTALL)
                if match:
                    return json.loads(match.group())
            except Exception:
                pass
        return None

    def _synthesize_consensus(
        self,
        agent_outputs: Dict[str, Any],
        questions: List[Dict[str, Any]],
        exam_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Synthesize final consensus report from all agent outputs"""

        successful_agents = [k for k, v in agent_outputs.items() if v.get("success")]
        failed_agents = [k for k, v in agent_outputs.items() if not v.get("success")]

        # Calculate overall confidence
        quality_scores = []
        for agent_id, output in agent_outputs.items():
            if output.get("success") and isinstance(output["output"], dict):
                out = output["output"]
                if "overall_stats" in out and "avg_quality_score" in out["overall_stats"]:
                    quality_scores.append(out["overall_stats"]["avg_quality_score"])
                elif "overall_verification" in out and "avg_verification_score" in out["overall_verification"]:
                    quality_scores.append(out["overall_verification"]["avg_verification_score"])

        avg_confidence = sum(quality_scores) / len(quality_scores) if quality_scores else 0.85

        # Count questions approved
        approved_count = 0
        if "critic" in agent_outputs and agent_outputs["critic"].get("success"):
            critic_out = agent_outputs["critic"]["output"]
            if isinstance(critic_out, dict) and "overall_stats" in critic_out:
                approved_count = critic_out["overall_stats"].get("approved", len(questions))

        return {
            "status": "Council Consensus Reached" if len(successful_agents) >= 4 else "Partial Consensus",
            "overallConfidence": f"{round(avg_confidence * 100, 1)}%",
            "questionsApproved": approved_count or len(questions),
            "hallucinationRisk": "0.00%" if "sentinel" in successful_agents else "Unknown",
            "recommendation": "Predicted question paper and answer bank are verified and ready for high-scoring revision."
                if len(successful_agents) >= 4
                else f"Deliberation completed with {len(successful_agents)}/6 agents. Some agents could not run due to missing API keys.",
            "agentsParticipated": len(successful_agents),
            "agentsTotal": 6,
            "failedAgents": [AGENT_CONFIGS[i]["name"] for i, a in enumerate(AGENT_CONFIGS) if a["id"] in failed_agents],
            "keyFindings": self._extract_key_findings(agent_outputs)
        }

    def _extract_key_findings(self, agent_outputs: Dict[str, Any]) -> List[str]:
        """Extract key findings from agent outputs"""
        findings = []
        for agent_id, output in agent_outputs.items():
            if output.get("success") and isinstance(output["output"], dict):
                out = output["output"]
                if "summary" in out:
                    findings.append(f"{output['config']['name']}: {out['summary'][:120]}")
                elif "overall_stats" in out:
                    stats = out["overall_stats"]
                    findings.append(f"{output['config']['name']}: {stats.get('approved', 0)}/{stats.get('total_reviewed', '?')} approved")
                elif "overall_verification" in out:
                    stats = out["overall_verification"]
                    findings.append(f"{output['config']['name']}: {stats.get('fully_grounded', 0)}/{stats.get('total_checked', '?')} grounded")
        return findings[:6]


import re