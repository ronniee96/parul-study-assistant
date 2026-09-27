"""
API v1 Endpoints
Handles document upload, processing, summarization, question generation, and adaptive learning
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Request, Form
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from typing import List, Optional
import io
import json
import os
import logging

from app.services.document_processor import DocumentProcessor
from app.services.ai_service import AIService
from app.services.adaptive_learning import AdaptiveLearningService
from app.services.exam_predictor import ExamPredictor
from app.services.question_ranker import QuestionRanker
from app.services.answer_generator import AnswerGenerator
from app.services.pdf_service import PDFService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
document_processor = DocumentProcessor()
ai_service = AIService()
adaptive_service = AdaptiveLearningService()
exam_predictor = ExamPredictor(ai_service)
question_ranker = QuestionRanker()
answer_generator = AnswerGenerator(ai_service)
pdf_service = PDFService()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and validate study materials
    Only accepts files you have legitimate access to
    """
    # Validate file type
    allowed_extensions = {'.pdf', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx'}
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_extension} not supported. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    # Validate file size (10MB limit)
    max_size = 10 * 1024 * 1024  # 10MB
    contents = await file.read()

    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum 10MB allowed."
        )

    # Reset file position for further processing
    await file.seek(0)

    return {
        "message": f"File '{file.filename}' uploaded successfully",
        "filename": file.filename,
        "size": len(contents),
        "type": file_extension,
        "next_steps": "File received. Use /process to extract content and generate summaries."
    }

@router.post("/process")
async def process_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    generate_summary: bool = True,
    generate_questions: bool = False,
    num_questions: int = 10
):
    """
    Process uploaded document to extract content and optionally generate summaries/questions
    """
    try:
        # Read file content
        contents = await file.read()
        await file.seek(0)  # Reset for potential reuse

        # Process document to extract text
        processing_result = document_processor.process_file(contents, file.filename)

        if not processing_result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to process document: {processing_result['error']}"
            )

        extracted_text = processing_result["text"]
        response_data = {
            "message": "Document processed successfully",
            "filename": file.filename,
            "file_type": processing_result["file_type"],
            "word_count": processing_result["word_count"],
            "character_count": processing_result["character_count"],
            "extracted_text_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
            "features_requested": {
                "summary": generate_summary,
                "questions": generate_questions,
                "question_count": num_questions if generate_questions else 0
            }
        }

        # Generate summary if requested
        if generate_summary:
            summary_result = ai_service.summarize_text(extracted_text)
            response_data["summary"] = summary_result

        # Generate questions if requested
        if generate_questions:
            questions_result = ai_service.generate_questions(
                extracted_text,
                num_questions=num_questions,
                question_types=["multiple_choice", "short_answer"]
            )
            response_data["questions"] = questions_result

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while processing document: {str(e)}"
        )

@router.post("/summarize")
async def generate_summary_endpoint(text: str, max_length: int = 200):
    """
    Generate a summary of provided text
    """
    if not text or len(text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text too short to summarize meaningfully"
        )

    try:
        result = ai_service.summarize_text(text, max_length)
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result["error"]
            )
        return result
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/generate-questions")
async def generate_questions_endpoint(
    text: str,
    num_questions: int = 10,
    question_types: list = ["multiple_choice", "short_answer"]
):
    """
    Generate practice questions from provided text
    """
    if not text or len(text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Text too short to generate meaningful questions"
        )

    try:
        result = ai_service.generate_questions(text, num_questions, question_types)
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result["error"]
            )
        return result
    except Exception as e:
        logger.error(f"Error in question generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# Adaptive Learning Endpoints
@router.post("/adaptive-learning/consent")
async def give_adaptive_consent(consent_types: list = None):
    """
    Record user consent for adaptive learning features
    """
    try:
        result = adaptive_service.give_consent(consent_types)
        return {
            "success": result,
            "message": "Consent recorded for adaptive learning features",
            "consent_status": "given" if result else "not_given"
        }
    except Exception as e:
        logger.error(f"Error recording consent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/adaptive-learning/withdraw-consent")
async def withdraw_adaptive_consent():
    """
    Withdraw consent for adaptive learning features
    """
    try:
        result = adaptive_service.withdraw_consent()
        return {
            "success": result,
            "message": "Consent withdrawn for adaptive learning features",
            "consent_status": "withdrawn" if not result else "error"
        }
    except Exception as e:
        logger.error(f"Error withdrawing consent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/adaptive-learning/record-performance")
async def record_question_performance(
    question_id: str,
    question_type: str,
    is_correct: bool,
    time_taken_seconds: float,
    topic: str = None,
    difficulty: str = "medium"
):
    """
    Record user's performance on a practice question for ethical adaptation
    """
    try:
        result = adaptive_service.record_question_performance(
            question_id, question_type, is_correct, time_taken_seconds, topic, difficulty
        )
        if "error" in result:
            raise HTTPException(
                status_code=403,
                detail=result["error"]
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording performance: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/adaptive-learning/recommendations")
async def get_personalized_recommendations():
    """
    Get personalized study recommendations based on user performance
    """
    try:
        result = adaptive_service.get_personalized_recommendations()
        if "error" in result:
            raise HTTPException(
                status_code=403,
                detail=result["error"]
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/adaptive-learning/insights")
async def get_learning_insights():
    """
    Get insights about learning patterns and habits
    """
    try:
        result = adaptive_service.get_learning_insights()
        if "error" in result:
            raise HTTPException(
                status_code=403,
                detail=result["error"]
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/adaptive-learning/suggest-difficulty")
async def suggest_question_difficulty():
    """
    Get suggested difficulty level for next questions based on recent performance
    """
    try:
        difficulty = adaptive_service.suggest_question_difficulty()
        return {
            "suggested_difficulty": difficulty,
            "consent_status": "given" if adaptive_service.consent_given else "required"
        }
    except Exception as e:
        logger.error(f"Error suggesting difficulty: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post('/generate-mega-questions')
async def generate_mega_questions(text: str = Form(...), num_questions: int = Form(300),
                                   question_types: str = Form('multiple_choice,short_answer,essay')):
    types = [t.strip() for t in question_types.split(',')]
    result = ai_service.generate_mega_questions(text, num_questions, types)
    return result

@router.post('/rank-questions')
async def rank_questions_endpoint(body: str = Form(...)):
    data = json.loads(body)
    result = question_ranker.rank_questions(
        data.get('questions', []), data.get('material_text', ''),
        data.get('past_papers')
    )
    return result

@router.post('/predict-exam')
async def predict_exam_endpoint(material_text: str = Form(...),
                                 subject_name: str = Form('Subject'),
                                 total_marks: int = Form(60),
                                 past_papers: str = Form('')):
    pp = json.loads(past_papers) if past_papers else None
    result = exam_predictor.predict_exam(material_text, pp, subject_name, total_marks)
    return result

@router.post('/generate-answers')
async def generate_answers_endpoint(body: str = Form(...)):
    data = json.loads(body)
    result = answer_generator.generate_answers(data.get('questions', []), data.get('source_text', ''))
    return result

@router.post('/create-pdf')
async def create_pdf_endpoint(images: List[UploadFile] = File(...), title: str = Form('Captured Slides')):
    image_bytes = [await img.read() for img in images]
    pdf_bytes = pdf_service.create_pdf_from_images(image_bytes, title)
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type='application/pdf',
                             headers={'Content-Disposition': f'attachment; filename="{title}.pdf"'})

@router.post('/create-question-paper-pdf')
async def create_question_paper_pdf(body: str = Form(...)):
    data = json.loads(body)
    pdf_bytes = pdf_service.create_question_paper_pdf(data.get('sections', []), data.get('metadata', {}))
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type='application/pdf',
                             headers={'Content-Disposition': 'attachment; filename="predicted_exam.pdf"'})

@router.post('/create-answer-guide-pdf')
async def create_answer_guide_pdf(body: str = Form(...)):
    data = json.loads(body)
    pdf_bytes = pdf_service.create_answer_guide_pdf(data.get('answers', []), data.get('metadata', {}))
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type='application/pdf',
                             headers={'Content-Disposition': 'attachment; filename="study_guide.pdf"'})

@router.get('/health')
async def health_check():
    return {
        'status': 'healthy', 'service': 'study-assistant-api', 'version': '2.0.0',
        'ai_services': {
            'openai_available': ai_service.openai_client is not None,
            'anthropic_available': ai_service.anthropic_client is not None
        },
        'features': ['mega_questions', 'exam_prediction', 'answer_generation', 'pdf_creation']
    }