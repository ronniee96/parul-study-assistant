"""
Parul Study Assistant — Model Context Protocol (MCP) Server
Allows AI assistants (Cursor, Claude Desktop, Antigravity) to query study tools directly.
"""

import sys
import os
import json
import logging

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import AIService
from app.services.exam_predictor import ExamPredictor
from app.services.question_ranker import QuestionRanker
from app.services.answer_generator import AnswerGenerator
from app.services.document_processor import DocumentProcessor

logger = logging.getLogger("study-assistant-mcp")

def create_mcp_server():
    """Create and configure FastMCP server instance"""
    try:
        from fastmcp import FastMCP
        mcp = FastMCP("Parul Study Assistant MCP Server")
        
        ai_service = AIService()
        exam_predictor = ExamPredictor(ai_service)
        question_ranker = QuestionRanker()
        answer_generator = AnswerGenerator(ai_service)
        doc_processor = DocumentProcessor()

        @mcp.tool()
        def predict_exam(material_text: str, subject_name: str = "Subject", total_marks: int = 40) -> str:
            """Predict exam questions, sections, topic heatmaps, and confidence scores from study material."""
            res = exam_predictor.predict_exam(material_text, None, subject_name, total_marks)
            return json.dumps(res, indent=2)

        @mcp.tool()
        def generate_summary(text: str, max_length: int = 300) -> str:
            """Generate concise academic notes, key points, and definitions from source text."""
            res = ai_service.summarize_text(text, max_length=max_length)
            return json.dumps(res, indent=2)

        @mcp.tool()
        def generate_model_answers(questions_json: str, source_text: str) -> str:
            """Generate university model answers with marking rubrics for a list of questions."""
            questions = json.loads(questions_json)
            res = answer_generator.generate_answers(questions, source_text)
            return json.dumps(res, indent=2)

        @mcp.tool()
        def rank_questions(questions_json: str, material_text: str) -> str:
            """Rank and filter a question bank (300 -> 200 -> 100 -> top 25 high likelihood questions)."""
            questions = json.loads(questions_json)
            res = question_ranker.rank_questions(questions, material_text)
            return json.dumps(res, indent=2)

        return mcp
    except ImportError:
        logger.error("fastmcp or mcp package not installed. Run: uv sync --extra mcp or pip install fastmcp")
        return None

def main():
    mcp = create_mcp_server()
    if mcp:
        mcp.run()
    else:
        print("Error: MCP dependencies not installed. Install with: uv sync --extra mcp", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
