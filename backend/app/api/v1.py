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
from app.services.academic_service import AcademicResearchService
from app.services.aki_agent import AkiStudyAgent

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
academic_service = AcademicResearchService()
aki_agent = AkiStudyAgent()

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
            "extracted_text": extracted_text,
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

@router.post("/process-multiple")
async def process_multiple_documents(
    files: List[UploadFile] = File(...),
    generate_summary: bool = True,
    generate_questions: bool = False,
    num_questions: int = 10
):
    """
    Process multiple uploaded documents (PDFs, PPTs, Docs) simultaneously in a single batch.
    Extracts, structures, and combines content across all files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    combined_texts = []
    file_summaries = []
    total_words = 0
    total_chars = 0

    for i, file in enumerate(files):
        try:
            contents = await file.read()
            res = document_processor.process_file(contents, file.filename)
            if res.get("success"):
                text = res.get("text", "")
                w_count = res.get("word_count", 0)
                c_count = res.get("character_count", 0)
                total_words += w_count
                total_chars += c_count

                header = f"=== [DOCUMENT {i+1}: {file.filename}] ===\n"
                combined_texts.append(header + text)

                file_summaries.append({
                    "filename": file.filename,
                    "file_type": res.get("file_type", "Document"),
                    "word_count": w_count,
                    "character_count": c_count,
                    "success": True
                })
            else:
                file_summaries.append({
                    "filename": file.filename,
                    "error": res.get("error", "Unknown extraction error"),
                    "success": False
                })
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            file_summaries.append({
                "filename": file.filename,
                "error": str(e),
                "success": False
            })

    full_extracted_text = "\n\n".join(combined_texts)

    response_data = {
        "message": f"Successfully processed {len(files)} documents",
        "total_files": len(files),
        "files": file_summaries,
        "total_word_count": total_words,
        "total_character_count": total_chars,
        "extracted_text": full_extracted_text,
        "extracted_text_preview": full_extracted_text[:1000] + "..." if len(full_extracted_text) > 1000 else full_extracted_text,
        "features_requested": {
            "summary": generate_summary,
            "questions": generate_questions,
            "question_count": num_questions if generate_questions else 0
        }
    }

    if generate_summary and full_extracted_text:
        summary_res = ai_service.summarize_text(full_extracted_text[:6000])
        response_data["summary"] = summary_res

    if generate_questions and full_extracted_text:
        questions_res = ai_service.generate_questions(
            full_extracted_text[:6000],
            num_questions=num_questions,
            question_types=["multiple_choice", "short_answer"]
        )
        response_data["questions"] = questions_res

    return response_data

@router.post("/summarize")
async def generate_summary_endpoint(request: Request):
    """
    Generate a comprehensive, structured summary of provided text
    Accepts JSON body or query parameters
    """
    text = ""
    max_length = 1500
    style = "comprehensive"
    provider = None
    api_key = None

    try:
        data = await request.json()
        text = data.get("text", "")
        max_length = data.get("max_length", 1500)
        style = data.get("style", "comprehensive")
        provider = data.get("provider")
        api_key = data.get("api_key")
    except Exception:
        # Fallback to query params
        params = request.query_params
        text = params.get("text", "")
        max_length = int(params.get("max_length", 1500))

    if not text or len(text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text too short to summarize meaningfully"
        )

    try:
        result = ai_service.summarize_text(text, max_length=max_length, style=style, provider=provider, api_key=api_key)
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result.get("error", "Failed to generate summary")
            )
        return result
    except HTTPException:
        raise
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
async def generate_mega_questions(request: Request):
    """
    Generate questions (up to 300) with multi-model auto-failover engine
    Accepts JSON body or Form data
    """
    text = ""
    num_questions = 300
    question_types = ['multiple_choice', 'short_answer', 'essay']
    api_keys = None
    preferred_order = None

    try:
        data = await request.json()
        text = data.get("text", "")
        num_questions = int(data.get("num_questions", 300))
        raw_types = data.get("question_types")
        if isinstance(raw_types, list):
            question_types = raw_types
        elif isinstance(raw_types, str):
            question_types = [t.strip() for t in raw_types.split(",")]
        api_keys = data.get("api_keys")
        preferred_order = data.get("preferred_order")
    except Exception:
        form = await request.form()
        text = form.get("text", "")
        num_questions = int(form.get("num_questions", 300))
        raw_types = form.get("question_types", "multiple_choice,short_answer,essay")
        question_types = [t.strip() for t in raw_types.split(",")]
        raw_keys = form.get("api_keys")
        if raw_keys:
            try:
                api_keys = json.loads(raw_keys)
            except Exception:
                pass
        raw_order = form.get("preferred_order")
        if raw_order:
            try:
                preferred_order = json.loads(raw_order)
            except Exception:
                pass

    if not text or len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text too short to generate questions")

    result = ai_service.generate_mega_questions(
        text, num_questions, question_types,
        api_keys=api_keys, preferred_order=preferred_order
    )
    return result

@router.post('/rank-questions')
async def rank_questions_endpoint(request: Request):
    data = {}
    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        body = form.get("body")
        if body:
            data = json.loads(body)

    result = question_ranker.rank_questions(
        data.get('questions', []), data.get('material_text', ''),
        data.get('past_papers')
    )
    return result

@router.post('/predict-exam')
async def predict_exam_endpoint(request: Request):
    """
    Predict university exam paper with multi-model failover
    Accepts JSON body or Form data
    """
    material_text = ""
    subject_name = "Subject"
    total_marks = 60
    past_papers = None
    api_keys = None
    preferred_order = None

    try:
        data = await request.json()
        material_text = data.get("material_text", "")
        subject_name = data.get("subject_name", "Subject")
        total_marks = int(data.get("total_marks", 60))
        past_papers = data.get("past_papers")
        api_keys = data.get("api_keys")
        preferred_order = data.get("preferred_order")
    except Exception:
        form = await request.form()
        material_text = form.get("material_text", "")
        subject_name = form.get("subject_name", "Subject")
        total_marks = int(form.get("total_marks", 60))
        pp = form.get("past_papers")
        if pp:
            try:
                past_papers = json.loads(pp)
            except Exception:
                pass
        raw_keys = form.get("api_keys")
        if raw_keys:
            try:
                api_keys = json.loads(raw_keys)
            except Exception:
                pass
        raw_order = form.get("preferred_order")
        if raw_order:
            try:
                preferred_order = json.loads(raw_order)
            except Exception:
                pass

    if not material_text or len(material_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Material text too short for exam prediction")

    result = exam_predictor.predict_exam(
        material_text, past_papers, subject_name, total_marks,
        api_keys=api_keys, preferred_order=preferred_order
    )
    return result

@router.post('/generate-answers')
async def generate_answers_endpoint(request: Request):
    """
    Generate model answers with failover AI engine
    Accepts JSON body or Form data
    """
    data = {}
    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        body = form.get("body")
        if body:
            data = json.loads(body)

    result = answer_generator.generate_answers(
        data.get('questions', []),
        data.get('source_text', ''),
        api_keys=data.get('api_keys'),
        preferred_order=data.get('preferred_order')
    )
    return result

@router.post('/test-api-key')
async def test_api_key_endpoint(request: Request):
    """
    Verify student's API key for Gemini, OpenAI, or Claude
    """
    data = await request.json()
    provider = data.get("provider", "")
    key = data.get("key", "")
    return ai_service.test_api_key(provider, key)

@router.post('/process-captured-slides')
async def process_captured_slides(request: Request):
    """
    Process captured slide frames from screen capture:
    Multimodal AI analysis & question generation
    """
    data = await request.json()
    frames = data.get("frames", [])
    api_keys = data.get("api_keys", {})
    preferred_order = data.get("preferred_order", ["gemini", "openai", "claude"])

    if not frames:
        raise HTTPException(status_code=400, detail="No captured frames provided")

    result = ai_service.analyze_slides_and_generate(frames, api_keys=api_keys, preferred_order=preferred_order)
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

@router.post('/research/search')
async def research_search_endpoint(request: Request):
    """
    Search academic literature, preprints, textbooks, and university domains:
    arXiv, CrossRef, OpenAlex, OpenLibrary, Gutendex, Art Institute, Hipolabs
    """
    data = await request.json()
    query = data.get("query", "").strip()
    source = data.get("source", "all")
    sources = data.get("sources")
    perplexity_key = data.get("perplexity_key")

    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")

    if source == "arxiv":
        return await academic_service.search_arxiv(query)
    elif source == "crossref":
        return await academic_service.search_crossref(query)
    elif source == "openalex":
        return await academic_service.search_openalex(query)
    elif source == "openlibrary":
        return await academic_service.search_openlibrary(query)
    elif source == "gutendex":
        return await academic_service.search_gutendex(query)
    elif source == "artic":
        return await academic_service.search_artic(query)
    elif source == "universities":
        return await academic_service.search_universities(name=query)
    else:
        # Unified parallel search across all sources
        return await academic_service.unified_deep_search(query, sources=sources, perplexity_key=perplexity_key)

@router.post('/research/ask-perplexity')
async def ask_perplexity_endpoint(request: Request):
    """
    Query Perplexity AI for online research with real-time academic citations
    """
    data = await request.json()
    prompt = data.get("prompt", "").strip()
    api_key = data.get("api_key")
    model = data.get("model", "sonar")

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    return await academic_service.ask_perplexity(prompt, api_key=api_key, model=model)

@router.get('/research/audit-trail')
async def get_audit_trail_endpoint(limit: int = 15):
    """
    Get system audit trail and transparency logs:
    Shows how data was processed, agents invoked, skills used, and APIs queried
    """
    return {
        "success": True,
        "logs": academic_service.get_audit_trail(limit=limit)
    }

@router.post('/aki/chat')
async def aki_chat_endpoint(request: Request):
    """
    Google Antigravity & Aki AI Study Agent Chat Endpoint
    """
    try:
        data = await request.json()
    except Exception:
        data = {}
    
    prompt = data.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
        
    context = data.get("context", "")
    api_key = data.get("api_key")
    
    result = aki_agent.query(prompt=prompt, context=context, user_key=api_key)
    return result

@router.get('/health')
async def health_check():
    return {
        'status': 'healthy', 'service': 'study-assistant-api', 'version': '2.0.0',
        'ai_services': {
            'openai_available': ai_service.openai_client is not None,
            'anthropic_available': ai_service.anthropic_client is not None,
            'aki_antigravity_agent': True
        },
        'features': ['mega_questions', 'exam_prediction', 'answer_generation', 'pdf_creation', 'aki_antigravity_agent']
    }