#!/usr/bin/env python3
"""
Test script for MultiAgentArena - verifies the real multi-agent deliberation works
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, '/Users/ronnie/Desktop/StudyAssistant/backend')

from app.services.multi_agent_arena import MultiAgentArena, AGENT_CONFIGS
from app.services.ai_service import AIService

async def test_agent_configs():
    """Test that agent configurations are correct"""
    print("=" * 60)
    print("Testing Agent Configurations")
    print("=" * 60)

    assert len(AGENT_CONFIGS) == 6, f"Expected 6 agents, got {len(AGENT_CONFIGS)}"

    expected_ids = ['president', 'researcher', 'critic', 'architect', 'neuro', 'sentinel']
    for i, (config, expected_id) in enumerate(zip(AGENT_CONFIGS, expected_ids)):
        assert config['id'] == expected_id, f"Agent {i} has wrong ID: {config['id']} != {expected_id}"
        assert 'name' in config, f"Agent {config['id']} missing name"
        assert 'role' in config, f"Agent {config['id']} missing role"
        assert 'model_preference' in config, f"Agent {config['id']} missing model_preference"
        assert isinstance(config['model_preference'], list), f"Agent {config['id']} model_preference not a list"
        assert 'directive' in config, f"Agent {config['id']} missing directive"
        print(f"  ✓ {config['name']} ({config['id']}) - {len(config['model_preference'])} model preferences")

    print("✓ All 6 agent configurations valid\n")

async def test_prompt_building():
    """Test that agent prompts are built correctly"""
    print("=" * 60)
    print("Testing Prompt Building")
    print("=" * 60)

    arena = MultiAgentArena(AIService())

    extracted_text = "Sample syllabus content about Data Structures and Algorithms..."
    questions = [
        {"id": 1, "question": "What is a binary tree?", "topic": "Trees", "marks": 2, "type": "short_answer"},
        {"id": 2, "question": "Explain quicksort algorithm", "topic": "Sorting", "marks": 5, "type": "essay"}
    ]
    exam_profile = {
        "university": "Parul University",
        "subject": "Data Structures",
        "sections": [
            {"name": "Section A", "marks_per_question": 2, "num_questions": 5, "question_types": ["short_answer"]},
            {"name": "Section B", "marks_per_question": 5, "num_questions": 3, "question_types": ["essay"]}
        ]
    }

    for agent_config in AGENT_CONFIGS:
        prompt = arena._build_agent_prompt(
            agent_config=agent_config,
            extracted_text=extracted_text,
            questions=questions,
            exam_profile=exam_profile,
            previous_outputs={}
        )

        assert agent_config['name'] in prompt, f"Agent name not in prompt for {agent_config['id']}"
        assert agent_config['directive'] in prompt, f"Agent directive not in prompt for {agent_config['id']}"
        assert "Parul University" in prompt, f"Exam profile not in prompt for {agent_config['id']}"
        assert "binary tree" in prompt.lower(), f"Questions not in prompt for {agent_config['id']}"
        assert "YOUR TASK:" in prompt, f"Task instruction missing for {agent_config['id']}"
        assert "Output ONLY valid JSON" in prompt, f"JSON instruction missing for {agent_config['id']}"
        print(f"  ✓ {agent_config['name']} prompt built ({len(prompt)} chars)")

    print("✓ All agent prompts build correctly\n")

async def test_consensus_synthesis():
    """Test consensus report synthesis"""
    print("=" * 60)
    print("Testing Consensus Synthesis")
    print("=" * 60)

    arena = MultiAgentArena(AIService())

    # Mock agent outputs
    agent_outputs = {
        "president": {
            "success": True,
            "config": AGENT_CONFIGS[0],
            "output": {"summary": "Governance framework established", "governance_framework": {}}
        },
        "researcher": {
            "success": True,
            "config": AGENT_CONFIGS[1],
            "output": {"summary": "Document analyzed, blueprint created", "exam_blueprint": {}}
        },
        "critic": {
            "success": True,
            "config": AGENT_CONFIGS[2],
            "output": {
                "summary": "Adversarial review complete",
                "overall_stats": {"approved": 18, "total_reviewed": 20, "avg_quality_score": 0.92}
            }
        },
        "architect": {
            "success": True,
            "config": AGENT_CONFIGS[3],
            "output": {"summary": "Model answers drafted"}
        },
        "sentinel": {
            "success": True,
            "config": AGENT_CONFIGS[5],
            "output": {
                "summary": "Grounding verification complete",
                "overall_verification": {"fully_grounded": 19, "total_checked": 20, "avg_verification_score": 0.95}
            }
        },
        "neuro": {
            "success": False,
            "config": AGENT_CONFIGS[4],
            "output": {"error": "No API key"}
        }
    }

    questions = [{"id": i} for i in range(20)]
    exam_profile = {"subject": "Test"}

    consensus = arena._synthesize_consensus(agent_outputs, questions, exam_profile)

    assert consensus["agentsParticipated"] == 5
    assert consensus["agentsTotal"] == 6
    assert consensus["hallucinationRisk"] == "0.00%"
    assert consensus["questionsApproved"] == 18
    assert "Agent Neuro" in consensus["failedAgents"]  # Note: failed agent name from config
    assert len(consensus["keyFindings"]) > 0
    print(f"  ✓ Consensus: {consensus['status']}")
    print(f"  ✓ Confidence: {consensus['overallConfidence']}")
    print(f"  ✓ Agents participated: {consensus['agentsParticipated']}/{consensus['agentsTotal']}")
    print(f"  ✓ Questions approved: {consensus['questionsApproved']}")
    print(f"  ✓ Hallucination risk: {consensus['hallucinationRisk']}")
    print(f"  ✓ Failed agents: {consensus['failedAgents']}")
    print(f"  ✓ Key findings: {len(consensus['keyFindings'])}")

    print("✓ Consensus synthesis works correctly\n")

async def test_compact_questions():
    """Test question compaction for token efficiency"""
    print("=" * 60)
    print("Testing Question Compaction")
    print("=" * 60)

    arena = MultiAgentArena(AIService())

    questions = [
        {"id": i, "question": "Q" * 400, "topic": f"Topic {i}", "marks": 5, "type": "essay", "bloom_level": "analyzing"}
        for i in range(60)
    ]

    compact = arena._compact_questions(questions)

    assert len(compact) == 50, f"Expected 50 compacted questions, got {len(compact)}"
    for q in compact:
        assert len(q["question"]) <= 300, f"Question not truncated: {len(q['question'])}"
        assert "id" in q
        assert "topic" in q
        assert "marks" in q
        assert "type" in q

    print(f"  ✓ Compacted {len(questions)} questions to {len(compact)}")
    print(f"  ✓ Questions truncated to ≤300 chars")
    print("✓ Question compaction works correctly\n")

async def test_summarize_profile():
    """Test exam profile summarization"""
    print("=" * 60)
    print("Testing Exam Profile Summarization")
    print("=" * 60)

    arena = MultiAgentArena(AIService())

    exam_profile = {
        "university": "Parul University",
        "subject": "Data Structures",
        "total_marks": 70,
        "duration_hours": 3,
        "sections": [
            {"name": "Section A", "marks_per_question": 2, "num_questions": 5, "choice_rule": "Compulsory", "question_types": ["short_answer"]},
            {"name": "Section B", "marks_per_question": 5, "num_questions": 4, "choice_rule": "Any 3", "question_types": ["essay"]}
        ],
        "bloom_distribution": {"remembering": 0.2, "understanding": 0.3},
        "theory_vs_numerical": {"theory": 0.7, "numerical": 0.3},
        "recurring_command_verbs": ["Define", "Explain", "Analyze"],
        "learned_from_past_papers": True
    }

    summary = arena._summarize_profile(exam_profile)

    assert summary["university"] == "Parul University"
    assert summary["subject"] == "Data Structures"
    assert summary["total_marks"] == 70
    assert summary["duration_hours"] == 3
    assert len(summary["sections"]) == 2
    assert summary["sections"][0]["name"] == "Section A"
    assert summary["learned_from_past_papers"] is True

    print(f"  ✓ Profile summarized with {len(summary['sections'])} sections")
    print("✓ Profile summarization works correctly\n")

async def main():
    print("\n🧪 MultiAgentArena Test Suite")
    print("=" * 60)

    await test_agent_configs()
    await test_prompt_building()
    await test_consensus_synthesis()
    await test_compact_questions()
    await test_summarize_profile()

    print("=" * 60)
    print("✅ ALL TESTS PASSED")
    print("=" * 60)
    print("\nThe MultiAgentArena is ready for real multi-agent deliberation!")
    print("Run the frontend and click 'Run Multi-Agent Deliberation' to test end-to-end.")

if __name__ == "__main__":
    asyncio.run(main())