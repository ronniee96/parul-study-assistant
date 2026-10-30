"""
API v1 Endpoints
Handles document upload, processing, summarization, question generation, and adaptive learning
"""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Request, Form
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from typing import List, Optional, Dict, Any
import io
import json
import os
import uuid
import hashlib
import logging
from collections import Counter
from datetime import datetime

from app.services.document_processor import (
    DocumentProcessor,
    SUPPORTED_DOCUMENT_EXTENSIONS,
    UNSUPPORTED_LEGACY_BINARY_EXTENSIONS,
)
from app.services.ai_service import AIService
from app.services.adaptive_learning import AdaptiveLearningService, get_adaptive_service
from app.services.exam_predictor import ExamPredictor
from app.services.question_ranker import QuestionRanker
from app.services.answer_generator import AnswerGenerator
from app.services.pdf_service import PDFService
from app.services.academic_service import AcademicResearchService
from app.services.aki_agent import AkiStudyAgent
from app.services.document_intelligence import DocumentIntelligence
from app.services.paper_structure_analyzer import PaperStructureAnalyzer
from app.services.parul_repository import ParulRepositoryHarvester
from app.services.question_possibility_engine import QuestionPossibilityEngine
from app.services.exam_prediction_pipeline import ExamPredictionPipeline, UniversityExamProfile
from app.services.session_manager import (
    get_session_manager,
    SessionData,
    MissingCapabilityError,
    InvalidCapabilityError,
    get_session_id_from_request,
    get_capability_from_request,
    get_user_id_from_request,
    get_session_from_request,
)
from app.services.s3_storage import get_s3_service
from app.services.qstash_service import get_qstash_service, QStashSignatureError
from app.services.multi_agent_arena import MultiAgentArena

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
document_processor = DocumentProcessor()
ai_service = AIService()
exam_predictor = ExamPredictor(ai_service)
question_ranker = QuestionRanker()
answer_generator = AnswerGenerator(ai_service)
pdf_service = PDFService()
academic_service = AcademicResearchService()
aki_agent = AkiStudyAgent()
question_possibility_engine = QuestionPossibilityEngine()
exam_prediction_pipeline = ExamPredictionPipeline(ai_service)
parul_harvester = ParulRepositoryHarvester()
session_manager = session_mgr = get_session_manager()
s3_service = get_s3_service()
qstash_service = get_qstash_service()
multi_agent_arena = arena = MultiAgentArena(ai_service)


def resolve_request_session(request: Optional[Request], create_if_none: bool = True) -> SessionData:
    """
    Resolve and capability-authenticate the session from `request`.
    If `X-Session-ID` or `session_id` query param is provided:
      - Validates format (400 Bad Request if invalid or path traversal).
      - Requires `X-Session-Capability` (401 Unauthorized if missing).
      - Verifies capability hash in constant time (403 Forbidden if invalid/rotated).
      - Verifies existence in relational DB (404 Not Found if missing).
    If no `session_id` is supplied:
      - If `create_if_none=True`, issues a new isolated session and capability token.
      - Else raises 401 Unauthorized.
    """
    if not request:
        return session_manager.create_session()

    session_id = get_session_id_from_request(request)
    capability = get_capability_from_request(request)
    user_id = get_user_id_from_request(request)

    if session_id:
        try:
            session = session_manager.get_session(session_id, capability=capability, user_id=user_id)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except MissingCapabilityError as mce:
            raise HTTPException(status_code=401, detail=str(mce))
        except (InvalidCapabilityError, PermissionError) as pe:
            raise HTTPException(status_code=403, detail=str(pe))

        if not session:
            raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
        return session

    if create_if_none:
        return session_manager.create_session(user_id=user_id)
    raise HTTPException(
        status_code=401,
        detail="Authentication required: missing X-Session-ID and X-Session-Capability headers",
    )


def _attach_provenance_to_questions(
    questions: List[Dict[str, Any]],
    session_id: str,
    document_id: Optional[str] = None,
    content_hash: Optional[str] = None,
    job_id: Optional[str] = None,
    filename: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Ensure every generated question carries owning session, document, content_hash, and job provenance."""
    enriched: List[Dict[str, Any]] = []
    for idx, q in enumerate(questions):
        q_dict = dict(q if isinstance(q, dict) else q.model_dump())
        q_dict["id"] = q_dict.get("id") or (idx + 1)
        q_dict["session_id"] = session_id
        if document_id:
            q_dict.setdefault("source_document_id", document_id)
        if filename:
            q_dict.setdefault("source_filename", filename)
        if content_hash:
            q_dict["content_hash"] = content_hash
        if job_id:
            q_dict["job_id"] = job_id
        enriched.append(q_dict)
    return enriched


# ─── Isolated Session Lifecycle & Capability Endpoints ────────────────────

@router.post("/session/new")
@router.post("/sessions")
async def create_new_session(request: Request):
    """
    Create a new isolated study session and issue a high-entropy server capability token.
    Only the SHA-256 hash of `session_capability` is stored server-side.
    """
    user_id = get_user_id_from_request(request)
    session = session_manager.create_session(user_id=user_id)
    return {
        "success": True,
        "session_id": session.session_id,
        "session_capability": session.session_capability,
        "capability_version": session.capability_version,
        "created_at": session.created_at,
        "message": (
            "New study session created. Pass session_id in X-Session-ID and "
            "session_capability in X-Session-Capability for all subsequent requests."
        ),
    }


@router.post("/session/{session_id}/rotate-capability")
@router.post("/sessions/{session_id}/rotate-capability")
async def rotate_session_capability(session_id: str, request: Request):
    """
    Rotate the session capability token, immediately invalidating the previous token.
    Requires the current valid `X-Session-Capability`.
    """
    capability = get_capability_from_request(request)
    try:
        rotated = session_manager.rotate_capability(session_id, current_capability=capability)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except MissingCapabilityError as mce:
        raise HTTPException(status_code=401, detail=str(mce))
    except (InvalidCapabilityError, PermissionError) as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    if not rotated:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    return {
        "success": True,
        "session_id": rotated.session_id,
        "session_capability": rotated.session_capability,
        "capability_version": rotated.capability_version,
        "updated_at": rotated.updated_at,
        "message": "Session capability rotated; previous capability token is now invalid.",
    }


@router.get("/session/{session_id}")
@router.get("/sessions/{session_id}")
async def get_session_data(session_id: str, request: Request):
    """
    Get all data for a specific session.
    Strictly enforces format validation and `X-Session-Capability` verification.
    """
    capability = get_capability_from_request(request)
    user_id = get_user_id_from_request(request)
    try:
        session = session_manager.get_session(session_id, capability=capability, user_id=user_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except MissingCapabilityError as mce:
        raise HTTPException(status_code=401, detail=str(mce))
    except (InvalidCapabilityError, PermissionError) as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    return {
        "success": True,
        "session_id": session.session_id,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "capability_version": session.capability_version,
        "documents": session.documents,
        "questions": session.questions,
        "ranked_questions": session.ranked_questions,
        "summary": session.summary,
        "predicted_paper": session.predicted_paper,
        "answers": session.answers,
        "captures": session.captures,
        "stats": session.stats,
        "extracted_text": session.extracted_text,
        "metadata": session.metadata,
        "session": {
            "session_id": session.session_id,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "capability_version": session.capability_version,
            "documents": session.documents,
            "questions": session.questions,
            "ranked_questions": session.ranked_questions,
            "summary": session.summary,
            "predicted_paper": session.predicted_paper,
            "answers": session.answers,
            "captures": session.captures,
            "stats": session.stats,
            "extracted_text": session.extracted_text,
            "has_extracted_text": bool(session.extracted_text),
        },
    }


@router.delete("/session/{session_id}")
@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, request: Request):
    """
    Delete a session, its relational records, and its private S3 staged objects.
    Strictly enforces `X-Session-Capability` verification.
    """
    capability = get_capability_from_request(request)
    user_id = get_user_id_from_request(request)

    doc_keys = []
    try:
        rows = session_manager.db.fetch_all(
            "SELECT s3_object_key FROM session_documents WHERE session_id = ?",
            (session_id,),
        )
        doc_keys = [r["s3_object_key"] for r in rows if r.get("s3_object_key")]
    except Exception:
        pass

    try:
        success = session_manager.delete_session(session_id, capability=capability, user_id=user_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except MissingCapabilityError as mce:
        raise HTTPException(status_code=401, detail=str(mce))
    except (InvalidCapabilityError, PermissionError) as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    if not success:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    s3_service.delete_session_objects(session_id, object_keys=doc_keys)
    return {
        "success": True,
        "session_id": session_id,
        "message": f"Session {session_id} and all associated objects deleted",
    }


# ─── Private S3 Storage Endpoints (`ap-south-1` Mumbai) ───────────────────

@router.post("/storage/presign-upload")
async def presign_s3_upload(request: Request):
    """
    Generate a private AWS S3 Signature V4 presigned `PUT` URL in `ap-south-1` (Mumbai)
    scoped strictly to the authenticated session (`sessions/{session_id}/documents/{document_id}/{filename}`).
    """
    session = resolve_request_session(request, create_if_none=False)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON request body")

    filename = str(data.get("filename") or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="filename is required")

    ext = os.path.splitext(filename)[1].lower()
    if ext in UNSUPPORTED_LEGACY_BINARY_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Legacy binary '{ext}' format is not supported. Please convert to '{ext}x' or PDF.",
        )
    if ext not in SUPPORTED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not supported. Allowed: {', '.join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))}",
        )

    file_size = int(data.get("file_size") or 0)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size too large. Maximum 10MB allowed.")

    requested_acl = data.get("acl")
    if requested_acl and str(requested_acl).lower() != "private":
        raise HTTPException(status_code=403, detail="Public S3 ACLs are forbidden for student uploads.")

    document_id = str(data.get("document_id") or f"doc_{uuid.uuid4().hex[:12]}")
    content_type = str(data.get("content_type") or "application/octet-stream")
    expires_in = int(data.get("expires_in") or 900)

    try:
        object_key = s3_service.build_object_key(session.session_id, document_id, filename)
        if s3_service.live_s3_configured:
            presigned = s3_service.generate_presigned_url(
                method="PUT",
                session_id=session.session_id,
                object_key=object_key,
                content_type=content_type,
                expires_in=expires_in,
                acl="private",
            )
        else:
            presigned = {
                "mode": "zero_cost_neon",
                "url": "/api/v1/upload",
                "method": "POST",
                "object_key": object_key,
                "region": "neon",
                "bucket": "neon-session-storage",
                "expires_in": expires_in,
                "headers": {"Content-Type": content_type},
            }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    return {
        "success": True,
        "session_id": session.session_id,
        "document_id": document_id,
        **presigned,
    }


@router.post("/storage/presign-download")
async def presign_s3_download(request: Request):
    """
    Generate a private AWS S3 Signature V4 presigned `GET` URL in `ap-south-1` (Mumbai)
    ONLY if `object_key` belongs to the authenticated session.
    Preserves ₹0 compatibility when live AWS credentials are not configured.
    """
    session = resolve_request_session(request, create_if_none=False)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON request body")

    object_key = str(data.get("object_key") or "").strip()
    if not object_key:
        raise HTTPException(status_code=400, detail="object_key is required")

    expires_in = int(data.get("expires_in") or 900)
    try:
        if s3_service.live_s3_configured:
            presigned = s3_service.generate_presigned_url(
                method="GET",
                session_id=session.session_id,
                object_key=object_key,
                expires_in=expires_in,
            )
        else:
            s3_service.validate_object_ownership(session.session_id, object_key)
            presigned = {
                "mode": "zero_cost_neon",
                "url": f"/api/v1/session/{session.session_id}",
                "method": "GET",
                "object_key": object_key,
                "region": "neon",
                "bucket": "neon-session-storage",
                "expires_in": expires_in,
                "headers": {},
            }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    return {
        "success": True,
        "session_id": session.session_id,
        **presigned,
    }


@router.post("/storage/presign-delete")
async def presign_s3_delete(request: Request):
    """
    Generate a private AWS S3 Signature V4 presigned `DELETE` URL in `ap-south-1` (Mumbai)
    ONLY if `object_key` belongs to the authenticated session.
    """
    session = resolve_request_session(request, create_if_none=False)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON request body")

    object_key = str(data.get("object_key") or "").strip()
    if not object_key:
        raise HTTPException(status_code=400, detail="object_key is required")

    expires_in = int(data.get("expires_in") or 300)
    try:
        if s3_service.live_s3_configured:
            presigned = s3_service.generate_presigned_url(
                method="DELETE",
                session_id=session.session_id,
                object_key=object_key,
                expires_in=expires_in,
            )
        else:
            s3_service.validate_object_ownership(session.session_id, object_key)
            presigned = {
                "mode": "zero_cost_neon",
                "url": f"/api/v1/session/{session.session_id}",
                "method": "DELETE",
                "object_key": object_key,
                "region": "neon",
                "bucket": "neon-session-storage",
                "expires_in": expires_in,
                "headers": {},
            }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    return {
        "success": True,
        "session_id": session.session_id,
        **presigned,
    }


# ─── Upstash QStash Durable Background Jobs Endpoints ─────────────────────

def _execute_document_processing_worker(job_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Idempotent background worker for extracting a session document and generating
    grounded questions with full provenance (`session_id`, `document_id`, `content_hash`, `job_id`).
    """
    job_id = job_ctx["job_id"]
    session_id = job_ctx["session_id"]
    document_id = job_ctx["document_id"]
    content_hash = job_ctx["content_hash"]
    options = job_ctx.get("options") or {}

    doc_row = session_manager.db.fetch_one(
        "SELECT * FROM session_documents WHERE document_id = ? AND session_id = ?",
        (document_id, session_id),
    )
    if not doc_row:
        raise ValueError(f"Document '{document_id}' not found in session '{session_id}'")

    if doc_row.get("content_hash") and doc_row["content_hash"] != content_hash:
        raise ValueError("Document content_hash mismatch for background job")

    filename = doc_row["filename"]
    extracted_text = doc_row.get("extracted_text") or ""

    if not extracted_text and doc_row.get("s3_object_key"):
        try:
            raw_bytes = s3_service.get_object_bytes(session_id, doc_row["s3_object_key"])
            proc = document_processor.process_file(raw_bytes, filename, document_id=document_id)
            if proc.get("success"):
                extracted_text = proc["text"]
        except Exception as e:
            logger.warning("Could not load bytes from S3/staging for %s: %s", document_id, e)

    if not extracted_text or len(extracted_text.strip()) < 10:
        raise ValueError("Document has no readable text for background processing")

    sess_row = session_manager.db.fetch_one(
        "SELECT * FROM study_sessions WHERE session_id = ?",
        (session_id,),
    )
    if not sess_row:
        raise ValueError(f"Session '{session_id}' no longer exists")

    num_questions = int(options.get("num_questions") or 10)
    generate_summary = bool(options.get("generate_summary", True))
    generate_questions = bool(options.get("generate_questions", True))

    summary_res = None
    if generate_summary:
        summary_res = ai_service.summarize_text(extracted_text)
        if summary_res.get("success"):
            summary_res["session_id"] = session_id
            summary_res["source_document_id"] = document_id
            summary_res["content_hash"] = content_hash
            summary_res["job_id"] = job_id

    questions_list: List[Dict[str, Any]] = []
    if generate_questions:
        doc_intel = DocumentIntelligence.extract_rich_document(
            extracted_text.encode("utf-8", errors="ignore"),
            filename=filename,
            document_id=document_id,
        )
        candidates = question_possibility_engine.generate_document_universe(doc_intel, target_count=num_questions)
        questions_list = _attach_provenance_to_questions(
            [q.model_dump() for q in candidates],
            session_id=session_id,
            document_id=document_id,
            content_hash=content_hash,
            job_id=job_id,
            filename=filename,
        )

    # Persist directly to relational session tables using internal capability hash
    session_obj = SessionData(
        session_id=session_id,
        created_at=sess_row["created_at"],
        updated_at=sess_row["updated_at"],
        user_id=sess_row.get("user_id"),
        capability_version=int(sess_row.get("capability_version") or 1),
        documents=[{
            "document_id": document_id,
            "session_id": session_id,
            "filename": filename,
            "file_type": doc_row["file_type"],
            "file_size": doc_row["file_size"],
            "content_hash": content_hash,
            "s3_bucket": doc_row.get("s3_bucket"),
            "s3_region": doc_row.get("s3_region", "ap-south-1"),
            "s3_object_key": doc_row.get("s3_object_key"),
            "storage_status": "PROCESSED",
            "extracted_text": extracted_text,
            "created_at": doc_row["created_at"],
        }],
        questions=questions_list,
        summary=summary_res,
        extracted_text=extracted_text,
        _capability_hash=sess_row["capability_hash"],
    )
    session_manager.update_session(session_obj)

    return {
        "session_id": session_id,
        "document_id": document_id,
        "content_hash": content_hash,
        "job_id": job_id,
        "question_count": len(questions_list),
        "has_summary": summary_res is not None,
    }


@router.post("/jobs/dispatch")
async def dispatch_background_job(request: Request):
    """
    Dispatch an idempotent document processing job through Upstash QStash
    (or the local idempotent state machine when live QStash credentials are absent).
    Requires `X-Session-Capability`.
    """
    session = resolve_request_session(request, create_if_none=False)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON request body")

    document_id = str(data.get("document_id") or "").strip()
    if not document_id:
        raise HTTPException(status_code=400, detail="document_id is required")

    doc_row = session_manager.db.fetch_one(
        "SELECT * FROM session_documents WHERE document_id = ? AND session_id = ?",
        (document_id, session.session_id),
    )
    if not doc_row:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{document_id}' not found in session '{session.session_id}'",
        )

    content_hash = str(data.get("content_hash") or doc_row["content_hash"])
    options = {
        "generate_summary": bool(data.get("generate_summary", True)),
        "generate_questions": bool(data.get("generate_questions", True)),
        "num_questions": int(data.get("num_questions", 10)),
    }

    try:
        job_info = qstash_service.dispatch_document_job(
            session_manager=session_manager,
            session_id=session.session_id,
            document_id=document_id,
            content_hash=content_hash,
            worker_fn=_execute_document_processing_worker,
            options=options,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "success": True,
        **job_info,
    }


@router.post("/jobs/webhook")
async def qstash_webhook_endpoint(request: Request):
    """
    Upstash QStash webhook receiver.
    Verifies `Upstash-Signature` JWT (HS256 + body SHA-256 digest) before executing the job idempotently.
    """
    raw_body = await request.body()
    sig_header = request.headers.get("Upstash-Signature")

    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing Upstash-Signature header")

    try:
        claims = qstash_service.verify_signature(sig_header, raw_body)
    except QStashSignatureError as qse:
        raise HTTPException(status_code=403, detail=str(qse))

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON webhook body")

    try:
        job_info = qstash_service.execute_job_payload(
            session_manager=session_manager,
            payload=payload,
            worker_fn=_execute_document_processing_worker,
        )
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "success": True,
        "verified_issuer": claims.get("iss"),
        **job_info,
    }


@router.get("/jobs/{job_id}")
async def get_job_status_endpoint(job_id: str, request: Request):
    """
    Retrieve status and provenance of a processing job.
    Requires `X-Session-Capability` for the session that owns `job_id`.
    """
    session = resolve_request_session(request, create_if_none=False)
    capability = get_capability_from_request(request)
    try:
        job = session_manager.get_job(
            job_id,
            session_id=session.session_id,
            capability=capability,
        )
    except (InvalidCapabilityError, PermissionError) as pe:
        raise HTTPException(status_code=403, detail=str(pe))

    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return {
        "success": True,
        "job": job,
    }


# ─── Document Upload & Processing Endpoints ───────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), request: Request = None):
    """
    Upload and validate study materials, storing private bytes in session-scoped S3 (`ap-south-1`).
    """
    session = resolve_request_session(request, create_if_none=True)
    file_extension = os.path.splitext(file.filename or "")[1].lower()

    if file_extension in UNSUPPORTED_LEGACY_BINARY_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type {file_extension} not supported in serverless runtime. "
                f"Please convert to {file_extension}x or PDF."
            ),
        )

    if file_extension not in SUPPORTED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_extension} not supported. Allowed: {', '.join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))}",
        )

    upload_max_mb = int(os.getenv("UPLOAD_MAX_SIZE_MB", 4))
    max_size = upload_max_mb * 1024 * 1024
    contents = await file.read()

    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size too large. Maximum {upload_max_mb}MB allowed for ₹0 serverless runtime.",
        )

    await file.seek(0)

    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    content_hash = hashlib.sha256(contents).hexdigest()
    object_key = s3_service.build_object_key(session.session_id, document_id, file.filename)

    # Synchronous extraction for immediate relational persistence in Neon PostgreSQL
    proc = document_processor.process_file(contents, file.filename, document_id=document_id)
    extracted_text = proc.get("text", "") if proc.get("success") else ""

    s3_meta = {
        "bucket": None,
        "region": "neon",
        "object_key": object_key,
    }
    if s3_service.live_s3_configured:
        try:
            s3_meta = s3_service.put_object_bytes(
                session_id=session.session_id,
                object_key=object_key,
                data=contents,
                content_type=file.content_type or "application/octet-stream",
            )
        except Exception as s3_err:
            logger.warning("Optional S3 upload skipped (%s); persisting extracted text in Neon", s3_err)

    document_info = {
        "document_id": document_id,
        "session_id": session.session_id,
        "filename": file.filename,
        "file_size": len(contents),
        "size": len(contents),
        "file_type": file_extension,
        "type": file_extension,
        "content_hash": content_hash,
        "s3_bucket": s3_meta.get("bucket"),
        "s3_region": s3_meta.get("region", "neon"),
        "s3_object_key": s3_meta.get("object_key", object_key),
        "storage_status": "PROCESSED" if extracted_text else "UPLOADED",
        "extracted_text": extracted_text,
        "pages": proc.get("pages", []) if proc.get("success") else [],
        "uploaded_at": datetime.now().isoformat(),
    }
    session.documents.append(document_info)
    if extracted_text:
        session.extracted_text = extracted_text
    session_manager.update_session(session)

    response = {
        "message": f"File '{file.filename}' uploaded successfully",
        "filename": file.filename,
        "document_id": document_id,
        "content_hash": content_hash,
        "s3_region": s3_meta["region"],
        "s3_object_key": s3_meta["object_key"],
        "size": len(contents),
        "type": file_extension,
        "session_id": session.session_id,
        "next_steps": "File received. Use /process or /jobs/dispatch to extract content and generate questions.",
    }
    if session.session_capability:
        response["session_capability"] = session.session_capability
    return response


@router.post("/process")
async def process_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    generate_summary: bool = True,
    generate_questions: bool = False,
    num_questions: int = 10,
    request: Request = None,
):
    """
    Process uploaded document to extract content and optionally generate summaries/questions.
    Stores private document in session-scoped S3 (`ap-south-1`), tracks an idempotent job in
    `processing_jobs`, and attaches full provenance (`session_id`, `document_id`, `content_hash`, `job_id`).
    """
    session = resolve_request_session(request, create_if_none=True)

    # Support options passed via query parameters or multipart form data
    if request is not None:
        try:
            form = await request.form()
            if "generate_questions" in form:
                generate_questions = str(form.get("generate_questions", "")).lower() in ("true", "1", "yes")
            if "generate_summary" in form:
                generate_summary = str(form.get("generate_summary", "")).lower() in ("true", "1", "yes")
            if "num_questions" in form:
                try:
                    num_questions = int(form.get("num_questions", 10))
                except (ValueError, TypeError):
                    pass
        except Exception:
            pass

    file_extension = os.path.splitext(file.filename or "")[1].lower()
    if file_extension in UNSUPPORTED_LEGACY_BINARY_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_extension} not supported. Please convert to {file_extension}x or PDF.",
        )
    if file_extension not in SUPPORTED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_extension} not supported. Allowed: {', '.join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))}",
        )

    upload_max_mb = int(os.getenv("UPLOAD_MAX_SIZE_MB", 4))
    contents = await file.read()
    if len(contents) > upload_max_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File size too large. Maximum {upload_max_mb}MB allowed for ₹0 serverless runtime.",
        )
    await file.seek(0)

    try:
        content_hash = hashlib.sha256(contents).hexdigest()
        # Reuse document_id if this exact content_hash was already uploaded in this session
        existing_doc = next(
            (d for d in session.documents if d.get("content_hash") == content_hash),
            None,
        )
        doc_id = (
            existing_doc["document_id"]
            if existing_doc and existing_doc.get("document_id")
            else f"doc_{uuid.uuid4().hex[:12]}"
        )

        processing_result = document_processor.process_file(contents, file.filename, document_id=doc_id)

        if not processing_result["success"]:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to process document: {processing_result['error']}",
            )

        extracted_text = processing_result["text"]
        object_key = s3_service.build_object_key(session.session_id, doc_id, file.filename)

        s3_meta = {
            "bucket": None,
            "region": "neon",
            "object_key": object_key,
        }
        if s3_service.live_s3_configured:
            try:
                s3_meta = s3_service.put_object_bytes(
                    session_id=session.session_id,
                    object_key=object_key,
                    data=contents,
                    content_type=file.content_type or "application/octet-stream",
                )
            except Exception as s3_err:
                logger.warning("Optional S3 upload skipped (%s); persisting extracted text in Neon", s3_err)

        document_data = {
            "document_id": doc_id,
            "session_id": session.session_id,
            "filename": file.filename,
            "file_type": processing_result["file_type"],
            "file_size": len(contents),
            "content_hash": content_hash,
            "s3_bucket": s3_meta.get("bucket"),
            "s3_region": s3_meta.get("region", "neon"),
            "s3_object_key": s3_meta.get("object_key", object_key),
            "storage_status": "PROCESSED",
            "word_count": processing_result["word_count"],
            "character_count": processing_result["character_count"],
            "extracted_text": extracted_text,
            "text": extracted_text,
            "headings": processing_result.get("headings", []),
            "topics": processing_result.get("topics", []),
            "definitions": processing_result.get("definitions", []),
            "formulas": processing_result.get("formulas", []),
            "elements": processing_result.get("elements", []),
            "pages": processing_result.get("pages", []),
            "processed_at": datetime.now().isoformat(),
        }

        updated_docs = [d for d in session.documents if d.get("document_id") != doc_id]
        updated_docs.append(document_data)
        session.documents = updated_docs
        session.extracted_text = extracted_text
        session_manager.update_session(session)

        # Register idempotent processing job
        job, is_new_job = session_manager.create_or_get_job(
            session_id=session.session_id,
            document_id=doc_id,
            content_hash=content_hash,
        )
        job_id = job["job_id"]
        if is_new_job or job["status"] != "COMPLETED":
            session_manager.update_job_state(job_id, status="PROCESSING", increment_attempt=True)

        response_data: Dict[str, Any] = {
            "message": "Document processed successfully",
            "session_id": session.session_id,
            "document_id": doc_id,
            "content_hash": content_hash,
            "job_id": job_id,
            "idempotent_replay": not is_new_job and job["status"] == "COMPLETED",
            "s3_region": s3_meta["region"],
            "s3_object_key": s3_meta["object_key"],
            "filename": file.filename,
            "file_type": processing_result["file_type"],
            "word_count": processing_result["word_count"],
            "character_count": processing_result["character_count"],
            "extracted_text_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
            "extracted_text": extracted_text,
            "features_requested": {
                "summary": generate_summary,
                "questions": generate_questions,
                "question_count": num_questions if generate_questions else 0,
            },
        }
        if session.session_capability:
            response_data["session_capability"] = session.session_capability

        if generate_summary:
            summary_result = ai_service.summarize_text(extracted_text)
            if isinstance(summary_result, dict):
                summary_result["session_id"] = session.session_id
                summary_result["source_document_id"] = doc_id
                summary_result["content_hash"] = content_hash
                summary_result["job_id"] = job_id
            response_data["summary"] = summary_result
            session.summary = summary_result

        if generate_questions:
            questions_result = ai_service.generate_questions(
                extracted_text,
                num_questions=num_questions,
                question_types=["multiple_choice", "short_answer"],
            )
            if questions_result.get("success") and questions_result.get("questions"):
                enriched_qs = _attach_provenance_to_questions(
                    questions_result["questions"],
                    session_id=session.session_id,
                    document_id=doc_id,
                    content_hash=content_hash,
                    job_id=job_id,
                    filename=file.filename,
                )
                questions_result["questions"] = enriched_qs
                session.questions = enriched_qs
            response_data["questions"] = questions_result

        session_manager.update_session(session)
        session_manager.update_job_state(
            job_id,
            status="COMPLETED",
            result={
                "document_id": doc_id,
                "content_hash": content_hash,
                "question_count": len(session.questions),
            },
        )
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while processing document: {str(e)}",
        )


@router.post("/process-multiple")
async def process_multiple_documents(
    files: List[UploadFile] = File(...),
    generate_summary: bool = False,
    generate_questions: bool = False,
    num_questions: int = 10,
    request: Request = None,
):
    """
    Process multiple uploaded documents simultaneously in a single isolated session batch.
    """
    session = resolve_request_session(request, create_if_none=True)

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    combined_texts = []
    file_summaries = []
    total_words = 0
    total_chars = 0
    processed_documents = []

    upload_max_mb = int(os.getenv("UPLOAD_MAX_SIZE_MB", 4))
    max_size = upload_max_mb * 1024 * 1024

    for i, file in enumerate(files):
        try:
            contents = await file.read()
            if len(contents) > max_size:
                file_summaries.append({
                    "filename": file.filename,
                    "error": f"File size too large. Maximum {upload_max_mb}MB allowed for ₹0 serverless runtime.",
                    "success": False,
                })
                continue

            res = document_processor.process_file(contents, file.filename)
            if res.get("success"):
                text = res.get("text", "")
                w_count = res.get("word_count", 0)
                c_count = res.get("character_count", 0)
                total_words += w_count
                total_chars += c_count

                header = f"=== [DOCUMENT {i+1}: {file.filename}] ===\n"
                combined_texts.append(header + text)

                doc_id = res.get("document_id") or f"doc_{uuid.uuid4().hex[:10]}"
                c_hash = res.get("content_hash") or hashlib.sha256(contents).hexdigest()
                obj_key = s3_service.build_object_key(session.session_id, doc_id, file.filename)
                try:
                    s3_meta = s3_service.put_object_bytes(session.session_id, obj_key, contents)
                except Exception as s3_err:
                    logger.warning("Optional S3 staging skipped in process-multiple: %s", s3_err)
                    s3_meta = {"bucket": None, "region": "local", "object_key": obj_key}

                doc_summary = {
                    "document_id": doc_id,
                    "session_id": session.session_id,
                    "filename": file.filename,
                    "file_type": res.get("file_type", "Document"),
                    "file_size": len(contents),
                    "content_hash": c_hash,
                    "s3_bucket": s3_meta["bucket"],
                    "s3_region": s3_meta["region"],
                    "s3_object_key": s3_meta["object_key"],
                    "word_count": w_count,
                    "character_count": c_count,
                    "extracted_text": text,
                    "text": text,
                    "headings": res.get("headings", []),
                    "topics": res.get("topics", []),
                    "definitions": res.get("definitions", []),
                    "formulas": res.get("formulas", []),
                    "elements": res.get("elements", []),
                    "pages": res.get("pages", []),
                    "success": True,
                }
                file_summaries.append(doc_summary)
                processed_documents.append(doc_summary)
            else:
                file_summaries.append({
                    "filename": file.filename,
                    "error": res.get("error", "Unknown extraction error"),
                    "success": False,
                })
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            file_summaries.append({
                "filename": file.filename,
                "error": str(e),
                "success": False,
            })

    full_extracted_text = "\n\n".join(combined_texts)
    session.extracted_text = full_extracted_text
    session.documents = processed_documents

    response_data: Dict[str, Any] = {
        "success": any(file.get("success") for file in file_summaries),
        "message": f"Extracted {sum(bool(file.get('success')) for file in file_summaries)} of {len(files)} documents",
        "session_id": session.session_id,
        "total_files": len(files),
        "files": file_summaries,
        "total_word_count": total_words,
        "total_character_count": total_chars,
        "extracted_text": full_extracted_text,
        "extracted_text_preview": full_extracted_text[:1000] + "..." if len(full_extracted_text) > 1000 else full_extracted_text,
        "features_requested": {
            "summary": generate_summary,
            "questions": generate_questions,
            "question_count": num_questions if generate_questions else 0,
        },
    }
    if session.session_capability:
        response_data["session_capability"] = session.session_capability

    if generate_summary and full_extracted_text:
        summary_res = ai_service.summarize_text(full_extracted_text[:6000])
        response_data["summary"] = summary_res
        session.summary = summary_res

    if generate_questions and full_extracted_text:
        questions_res = ai_service.generate_questions(
            full_extracted_text[:6000],
            num_questions=num_questions,
            question_types=["multiple_choice", "short_answer"],
        )
        if questions_res.get("success") and questions_res.get("questions"):
            primary_doc_id = processed_documents[0]["document_id"] if processed_documents else "doc_1"
            primary_hash = processed_documents[0]["content_hash"] if processed_documents else hashlib.sha256(full_extracted_text.encode()).hexdigest()
            enriched = _attach_provenance_to_questions(
                questions_res["questions"],
                session_id=session.session_id,
                document_id=primary_doc_id,
                content_hash=primary_hash,
            )
            questions_res["questions"] = enriched
            session.questions = enriched
        response_data["questions"] = questions_res

    session_manager.update_session(session)
    return response_data


@router.post("/summarize")
async def generate_summary_endpoint(request: Request):
    """
    Generate a comprehensive, structured summary of provided text.
    Scoped to the capability-verified session.
    """
    session = resolve_request_session(request, create_if_none=True)

    text = ""
    max_length = 1500
    style = "comprehensive"
    provider = None
    api_key = None
    api_keys = None
    preferred_order = None

    try:
        data = await request.json()
        text = data.get("text", "")
        max_length = data.get("max_length", 1500)
        style = data.get("style", "comprehensive")
        provider = data.get("provider")
        api_key = data.get("api_key")
        api_keys = data.get("api_keys")
        preferred_order = data.get("preferred_order")
    except HTTPException:
        raise
    except Exception:
        params = request.query_params
        text = params.get("text", "")
        max_length = int(params.get("max_length", 1500))

    if not text or len(text.strip()) < 10:
        text = session.extracted_text

    if not text or len(text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text too short to summarize meaningfully. Please upload a study material first.",
        )

    try:
        result = ai_service.summarize_text(
            text, max_length=max_length, style=style, provider=provider, api_key=api_key,
            api_keys=api_keys, preferred_order=preferred_order,
        )
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result.get("error", "Failed to generate summary"),
            )
        result["session_id"] = session.session_id
        result["content_hash"] = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if session.documents:
            result["source_document_id"] = session.documents[0].get("document_id")
        if session.session_capability:
            result["session_capability"] = session.session_capability
        session.summary = result
        session_manager.update_session(session)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}",
        )


@router.post("/generate-questions")
async def generate_questions_endpoint(request: Request):
    """
    Generate practice questions from provided text.
    Stores results with provenance in the capability-verified session.
    """
    session = resolve_request_session(request, create_if_none=True)

    text = request.query_params.get("text", "")
    num_questions = 10
    try:
        if request.query_params.get("num_questions"):
            num_questions = int(request.query_params.get("num_questions"))
    except Exception:
        pass
    question_types = ["multiple_choice", "short_answer"]

    try:
        data = await request.json()
        if isinstance(data, dict):
            text = data.get("text", text)
            num_questions = data.get("num_questions", num_questions)
            question_types = data.get("question_types", question_types)
    except Exception:
        pass

    if not text or len(text.strip()) < 50:
        text = session.extracted_text

    if not text or len(text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Text too short to generate meaningful questions. Please upload a study material first.",
        )

    try:
        result = ai_service.generate_questions(text, num_questions, question_types)
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result["error"],
            )

        doc_id = session.documents[0].get("document_id") if session.documents else "doc_1"
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if result.get("questions"):
            enriched = _attach_provenance_to_questions(
                result["questions"],
                session_id=session.session_id,
                document_id=doc_id,
                content_hash=content_hash,
            )
            result["questions"] = enriched
            session.questions = enriched
            session_manager.update_session(session)

        result["session_id"] = session.session_id
        result["source_document_id"] = doc_id
        result["content_hash"] = content_hash
        if session.session_capability:
            result["session_capability"] = session.session_capability
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in question generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}",
        )

def _resolve_session_adaptive_service(request: Request) -> tuple[SessionData, AdaptiveLearningService]:
    """
    Resolve the capability-authenticated session and return an AdaptiveLearningService
    scoped strictly to `session.session_id` (never trusting client-supplied `X-User-ID`),
    hydrating its profile from relational `session.metadata["adaptive_profile"]`.
    """
    session = resolve_request_session(request, create_if_none=True)
    srv = get_adaptive_service(session.session_id)
    stored_profile = (session.metadata or {}).get("adaptive_profile")
    if isinstance(stored_profile, dict) and stored_profile:
        srv.learning_profile = dict(stored_profile)
        srv.consent_given = bool(srv.learning_profile.get("consent", {}).get("given", False))
    return session, srv


def _persist_session_adaptive_profile(session: SessionData, srv: AdaptiveLearningService) -> None:
    """Persist the session's adaptive learning profile in relational `study_sessions.metadata_json`."""
    meta = dict(session.metadata or {})
    meta["adaptive_profile"] = srv.learning_profile
    session.metadata = meta
    session_manager.update_session(session)


# Adaptive Learning Endpoints (Scoped per capability-verified session)
@router.post("/adaptive-learning/consent")
async def give_adaptive_consent(request: Request, consent_types: list = None):
    """
    Record user consent for adaptive learning features within the authenticated session.
    """
    session, srv = _resolve_session_adaptive_service(request)
    try:
        result = srv.give_consent(consent_types)
        _persist_session_adaptive_profile(session, srv)
        res = {
            "success": result,
            "session_id": session.session_id,
            "message": "Consent recorded for adaptive learning features",
            "consent_status": "given" if result else "not_given",
        }
        if session.session_capability:
            res["session_capability"] = session.session_capability
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording consent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/adaptive-learning/withdraw-consent")
async def withdraw_adaptive_consent(request: Request):
    """
    Withdraw consent for adaptive learning features within the authenticated session.
    """
    session, srv = _resolve_session_adaptive_service(request)
    try:
        result = srv.withdraw_consent()
        _persist_session_adaptive_profile(session, srv)
        res = {
            "success": result,
            "session_id": session.session_id,
            "message": "Consent withdrawn for adaptive learning features",
            "consent_status": "withdrawn" if not result else "error",
        }
        if session.session_capability:
            res["session_capability"] = session.session_capability
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error withdrawing consent: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/adaptive-learning/record-performance")
async def record_question_performance(
    request: Request,
    question_id: str,
    question_type: str,
    is_correct: bool,
    time_taken_seconds: float,
    topic: str = None,
    difficulty: str = "medium"
):
    """
    Record user's performance on a practice question for ethical adaptation within the authenticated session.
    """
    session, srv = _resolve_session_adaptive_service(request)
    try:
        result = srv.record_question_performance(
            question_id, question_type, is_correct, time_taken_seconds, topic, difficulty
        )
        if "error" in result:
            raise HTTPException(
                status_code=403,
                detail=result["error"]
            )
        _persist_session_adaptive_profile(session, srv)
        result["session_id"] = session.session_id
        if session.session_capability:
            result["session_capability"] = session.session_capability
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
async def get_personalized_recommendations(request: Request):
    """
    Get personalized study recommendations based on session performance.
    """
    session, srv = _resolve_session_adaptive_service(request)
    try:
        result = srv.get_personalized_recommendations()
        if "error" in result:
            raise HTTPException(
                status_code=403,
                detail=result["error"]
            )
        result["session_id"] = session.session_id
        if session.session_capability:
            result["session_capability"] = session.session_capability
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
async def get_learning_insights(request: Request):
    """
    Get insights about learning patterns and habits within the authenticated session.
    """
    session, srv = _resolve_session_adaptive_service(request)
    try:
        result = srv.get_learning_insights()
        if "error" in result:
            raise HTTPException(
                status_code=403,
                detail=result["error"]
            )
        result["session_id"] = session.session_id
        if session.session_capability:
            result["session_capability"] = session.session_capability
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
async def suggest_question_difficulty(request: Request):
    """
    Get suggested difficulty level for next questions based on recent session performance.
    """
    session, srv = _resolve_session_adaptive_service(request)
    try:
        difficulty = srv.suggest_question_difficulty()
        res = {
            "session_id": session.session_id,
            "suggested_difficulty": difficulty,
            "consent_status": "given" if srv.consent_given else "required",
        }
        if session.session_capability:
            res["session_capability"] = session.session_capability
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suggesting difficulty: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# ── Deep Academic Document Intelligence & University PYQ Endpoints ──

@router.post('/document-intelligence/extract')
async def extract_document_intelligence_endpoint(file: UploadFile = File(...)):
    """
    Deep Academic Content Extraction:
    Extracts text, headings, definitions, formulas, processes, comparisons,
    and page/slide provenance from any academic document (PDF, PPTX, DOCX, Image/OCR, TXT).
    """
    try:
        contents = await file.read()
        intel = DocumentIntelligence.extract_rich_document(contents, file.filename)
        return intel
    except Exception as e:
        logger.error(f"Error in document intelligence extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract document intelligence: {str(e)}")

@router.post('/exam-pattern/analyze')
async def analyze_exam_pattern_endpoint(request: Request):
    """
    Analyzes uploaded past examination paper(s) to learn authentic university blueprint:
    duration, total marks, section breakdowns, compulsory vs optional OR-choices,
    Bloom's Taxonomy distribution, theory vs numerical balance, and command verbs.
    """
    try:
        data = await request.json()
        paper_text = data.get("text", "")
        filename = data.get("filename", "Past Paper")
        if not paper_text or len(paper_text.strip()) < 30:
            raise HTTPException(status_code=400, detail="Paper text is required for pattern analysis")
        profile = PaperStructureAnalyzer.analyze_paper_structure(paper_text, filename=filename)
        return {
            "success": True,
            "profile": profile.model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing exam pattern: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/parul-pyq/search')
async def search_parul_pyq_endpoint(query: str = "", subject_code: str = ""):
    """
    Searches Parul University Digital Repository (ir.paruluniversity.ac.in)
    for historical examination papers, recurring questions, and topic frequencies.
    """
    try:
        results = await parul_harvester.search_repository(query, subject_code=subject_code)
        hist_analysis = parul_harvester.get_historical_topics_and_questions(query, subject_code=subject_code)
        return {
            "success": True,
            "query": query,
            "subject_code": subject_code,
            "results_count": len(results),
            "papers": results,
            "historical_intelligence": hist_analysis
        }
    except Exception as e:
        logger.error(f"Error searching Parul PYQ repository: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/multi-doc-questions')
async def multi_doc_questions_endpoint(request: Request):
    """
    Multiple Document Intelligence:
    Generates ~300 unique questions PER document independently (e.g. 2 docs -> ~600 candidate questions),
    clusters duplicates, and builds a cross-document concept reinforcement map.
    """
    try:
        data = await request.json()
        documents = data.get("documents", [])
        num_per_doc = int(data.get("num_per_document", 300))

        if not documents:
            raise HTTPException(status_code=400, detail="Documents list cannot be empty")

        # Process each document
        processed_docs = []
        for i, doc in enumerate(documents):
            d_text = doc.get("text") or doc.get("full_text") or ""
            d_name = doc.get("filename", f"Document_{i+1}")
            d_id = doc.get("id") or f"doc_{i+1}"
            if not d_text.strip():
                raise HTTPException(status_code=400, detail=f"Document {d_name} has no readable text")
            rich_doc = DocumentIntelligence.extract_rich_document(
                d_text.encode('utf-8', errors='ignore'),
                f"{os.path.splitext(d_name)[0]}.txt",
                document_id=d_id,
            )
            rich_doc["filename"] = d_name
            processed_docs.append(rich_doc)

        result = question_possibility_engine.process_multiple_documents(processed_docs, target_per_doc=num_per_doc)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating multi-doc questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/generate-mega-questions')
async def generate_mega_questions(request: Request):
    """
    Generate comprehensive question universe (up to 300 questions per document)
    with full cognitive taxonomy (MCQ, Short, Long, Numerical, Derivations, Comparisons)
    and exact source page provenance. Scoped to the capability-verified session.
    """
    session = resolve_request_session(request, create_if_none=True)

    text = ""
    num_questions = 300
    question_types = ['multiple_choice', 'short_answer', 'essay', 'numerical', 'differentiate']
    api_keys = None
    preferred_order = None
    doc_id = "doc_1"
    filename = "Study Material"

    try:
        data = await request.json()
        text = data.get("text", "")
        num_questions = int(data.get("num_questions", 300))
        if not 1 <= num_questions <= 1000:
            raise HTTPException(status_code=400, detail="num_questions must be between 1 and 1000")
        raw_types = data.get("question_types")
        if isinstance(raw_types, list):
            question_types = raw_types
        elif isinstance(raw_types, str):
            question_types = [t.strip() for t in raw_types.split(",")]
        api_keys = data.get("api_keys")
        preferred_order = data.get("preferred_order")
        doc_id = data.get("document_id", "doc_1")
        filename = data.get("filename", "Study Material")
    except HTTPException:
        raise
    except Exception:
        form = await request.form()
        text = form.get("text", "")
        num_questions = int(form.get("num_questions", 300))
        raw_types = form.get("question_types", "multiple_choice,short_answer,essay,numerical,differentiate")
        question_types = [t.strip() for t in raw_types.split(",")]
        doc_id = form.get("document_id", "doc_1")
        filename = form.get("filename", "Study Material")

    if not 1 <= num_questions <= 1000:
        raise HTTPException(status_code=400, detail="num_questions must be between 1 and 1000")

    # Fall back to session extracted text if not provided in payload
    if not text or len(text.strip()) < 20:
        text = session.extracted_text or ""
        if session.documents and doc_id == "doc_1":
            doc_id = session.documents[0].get("document_id", doc_id)
            filename = session.documents[0].get("filename", filename)

    if not text or len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text too short to generate questions")

    content_hash = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()

    # Extract deep document intelligence elements
    doc_data = DocumentIntelligence.extract_rich_document(
        text.encode('utf-8', errors='ignore'),
        filename=filename,
        document_id=doc_id
    )
    if not doc_data.get("success"):
        raise HTTPException(status_code=422, detail=doc_data.get("error", "Could not extract readable source text"))

    questions = []
    method = "Source-supported local generator"
    failover_log = []
    supplied_keys = api_keys if isinstance(api_keys, dict) else {}
    valid_api_keys = {
        key.lower(): value for key, value in supplied_keys.items()
        if key.lower() in {"gemini", "openai", "anthropic", "claude", "perplexity", "pplx"}
        and isinstance(value, str) and len(value.strip()) > 5
    }
    has_server_provider = bool(ai_service.gemini_key or ai_service.openai_client or ai_service.anthropic_client)

    ai_timed_out = False
    ai_incomplete = False
    if valid_api_keys or has_server_provider:
        generated = ai_service.generate_mega_questions(
            text, num_questions=num_questions, question_types=question_types,
            api_keys=api_keys, preferred_order=preferred_order
        )
        failover_log = generated.get("failover_log", [])
        ai_timed_out = bool(generated.get("timed_out"))
        ai_incomplete = bool(generated.get("incomplete"))
        if generated.get("success"):
            method = generated.get("engine_used", "Configured AI provider")
            questions = [dict(question) for question in generated.get("questions", []) if question.get("question")]
            for question in questions:
                raw_c = question.get("confidence")
                question["confidence"] = float(raw_c) if raw_c is not None else None
                question["source_document_id"] = doc_id
                question["source_filename"] = filename
                question["source_evidence"] = "Generated from the uploaded document text; page-level matching was not verified."

    if not questions:
        questions = [q.model_dump() for q in question_possibility_engine.generate_document_universe(doc_data, target_count=num_questions)]
        for q in questions:
            q["confidence"] = None
            q["is_ai_generated"] = False
            q["generation_method"] = "deterministic_local_engine"
        if ai_timed_out:
            method = "Deterministic local generator (AI execution timed out within serverless deadline)"
        elif valid_api_keys or has_server_provider:
            method = "Deterministic local generator (AI provider did not return questions)"
        else:
            method = "Deterministic local generator (Source-grounded heuristics)"

    # Filter by user preferred types if specified and not default
    if question_types and len(question_types) < 4:
        filtered = [q for q in questions if (q.get("type") if isinstance(q, dict) else getattr(q, "type", None)) in question_types]
        if len(filtered) >= 10:
            questions = filtered

    serialized_questions = [q if isinstance(q, dict) else q.model_dump() for q in questions]
    serialized_questions = _attach_provenance_to_questions(
        serialized_questions,
        session_id=session.session_id,
        document_id=doc_id,
        content_hash=content_hash,
    )

    # Save generated questions to session
    if serialized_questions:
        session.questions = serialized_questions
        session_manager.update_session(session)

    target_met = len(serialized_questions) >= num_questions
    status = "completed" if (target_met and not ai_timed_out) else ("incomplete_timeout" if ai_timed_out else ("partial" if serialized_questions else "failed"))

    note = None
    if ai_timed_out:
        note = "AI processing reached the execution deadline. Candidate questions were produced via deterministic local heuristics with model confidence marked as null."
    elif not target_met:
        note = f"Generated {len(serialized_questions)} distinct candidates from the available source; the requested {num_questions} was not reached without repeating candidates."

    response_payload = {
        "success": bool(serialized_questions),
        "status": status,
        "timed_out": ai_timed_out,
        "session_id": session.session_id,
        "questions": serialized_questions,
        "total_generated": len(serialized_questions),
        "document_id": doc_id,
        "content_hash": content_hash,
        "filename": filename,
        "method": method,
        "requested_count": num_questions,
        "target_met": target_met,
        "failover_log": failover_log,
        "note": note,
        "taxonomy_distribution": dict(Counter((q.get("type") if isinstance(q, dict) else getattr(q, "type", "unknown")) for q in serialized_questions)),
        "bloom_distribution": dict(Counter((q.get("bloom_level") if isinstance(q, dict) else getattr(q, "bloom_level", "unknown")) for q in serialized_questions))
    }
    if session.session_capability:
        response_payload["session_capability"] = session.session_capability
    return response_payload

@router.post('/predict-exam-pipeline')
async def predict_exam_pipeline_endpoint(request: Request):
    """
    Forensic Multi-Stage Exam Intelligence Pipeline:
    Candidate Universe (~300/600) -> Top 200 (Diverse) -> Adversarial AI Review -> Top 100 -> Final Top 25
    Outputs transparent evidence scores, pro/con arguments, and an authentic mock paper.
    Scoped to the capability-verified session.
    """
    session = resolve_request_session(request, create_if_none=True)

    try:
        data = await request.json()
        documents = data.get("documents", [])
        material_text = data.get("material_text", "")
        past_papers = data.get("past_papers", [])
        subject_name = data.get("subject_name", "Subject")
        subject_code = data.get("subject_code")
        api_keys = data.get("api_keys")
        preferred_order = data.get("preferred_order")
        raw_profile = data.get("exam_profile")

        # Session fallback
        if not documents and session.documents:
            documents = session.documents
        if not material_text and session.extracted_text:
            material_text = session.extracted_text

        exam_profile = None
        if raw_profile:
            exam_profile = UniversityExamProfile(**raw_profile)

        # Build candidate pool
        candidate_pool = []
        cross_doc_concepts = []
        per_document_counts = {}
        primary_doc_id = "doc_1"

        if documents and len(documents) > 1:
            multi_res = question_possibility_engine.process_multiple_documents(documents, target_per_doc=300)
            candidate_pool = multi_res["combined_questions"]
            cross_doc_concepts = multi_res["cross_document_concepts"]
            per_document_counts = multi_res["per_document_counts"]
            primary_doc_id = documents[0].get("document_id") or documents[0].get("id") or "doc_1"
            if not material_text:
                material_text = "\n\n".join(d.get("text", "") for d in documents)
        else:
            document = dict(documents[0]) if documents else {}
            txt = document.get("text") or document.get("full_text") or material_text
            if not txt:
                raise HTTPException(status_code=400, detail="Course material text is required")
            fname = document.get("filename", "Course Material")
            primary_doc_id = document.get("document_id") or document.get("id") or "doc_1"
            if not document.get("elements") and not document.get("definitions") and not document.get("formulas"):
                doc_data = DocumentIntelligence.extract_rich_document(txt.encode('utf-8', errors='ignore'), "course-material.txt", document_id=primary_doc_id)
                doc_data["filename"] = fname
            else:
                doc_data = document
                doc_data["full_text"] = txt
            doc_data.setdefault("document_id", primary_doc_id)
            doc_data["filename"] = fname
            candidate_pool = question_possibility_engine.generate_document_universe(doc_data, target_count=300)
            per_document_counts = {doc_data["document_id"]: len(candidate_pool)}
            material_text = txt

        content_hash = hashlib.sha256(material_text.encode("utf-8", errors="ignore")).hexdigest()

        pipeline_result = exam_prediction_pipeline.run_pipeline(
            candidate_pool=candidate_pool,
            material_text=material_text,
            past_papers=past_papers,
            exam_profile=exam_profile,
            subject_name=subject_name,
            subject_code=subject_code,
            cross_doc_concepts=cross_doc_concepts,
            api_keys=api_keys,
            preferred_order=preferred_order,
            per_document_candidate_counts=per_document_counts,
        )

        # Persist results to session
        if pipeline_result.get("top_25"):
            top_25_dicts = [q.model_dump() if hasattr(q, "model_dump") else dict(q) for q in pipeline_result["top_25"]]
            top_25_dicts = _attach_provenance_to_questions(
                top_25_dicts,
                session_id=session.session_id,
                document_id=primary_doc_id,
                content_hash=content_hash,
            )
            session.ranked_questions = top_25_dicts
        if pipeline_result.get("predicted_mock_paper"):
            session.predicted_paper = pipeline_result["predicted_mock_paper"]
        session_manager.update_session(session)
        review_st = pipeline_result.get("adversarial_review_status", "not_run")
        pipeline_status = "completed" if review_st in ("complete", "not_configured") else ("partial_review" if review_st == "partial" else "incomplete_review")
        pipeline_result["status"] = pipeline_status
        pipeline_result["session_id"] = session.session_id
        pipeline_result["source_document_id"] = primary_doc_id
        pipeline_result["content_hash"] = content_hash
        if session.session_capability:
            pipeline_result["session_capability"] = session.session_capability
        return pipeline_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running prediction pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/rank-questions')
async def rank_questions_endpoint(request: Request):
    """Rank questions by exam likelihood and importance with active session scoping."""
    session = resolve_request_session(request, create_if_none=True)

    data = {}
    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        body = form.get("body")
        if body:
            data = json.loads(body)

    questions = data.get('questions', [])
    material_text = data.get('material_text', '')
    past_papers = data.get('past_papers')

    # Fall back to session state if omitted
    if not questions and session.questions:
        questions = session.questions
    if not material_text and session.extracted_text:
        material_text = session.extracted_text

    result = question_ranker.rank_questions(
        questions, material_text, past_papers
    )

    doc_id = session.documents[0].get("document_id") if session.documents else "doc_1"
    content_hash = hashlib.sha256((material_text or "").encode("utf-8", errors="ignore")).hexdigest()

    if result.get("all_300"):
        enriched_all = _attach_provenance_to_questions(
            result["all_300"],
            session_id=session.session_id,
            document_id=doc_id,
            content_hash=content_hash,
        )
        result["all_300"] = enriched_all
        session.ranked_questions = enriched_all
        session_manager.update_session(session)

    result["session_id"] = session.session_id
    result["source_document_id"] = doc_id
    result["content_hash"] = content_hash
    if session.session_capability:
        result["session_capability"] = session.session_capability
    return result

@router.post('/predict-exam')
async def predict_exam_endpoint(request: Request):
    """
    Predict university exam paper with multi-stage forensic evidence pipeline
    Maintains full backward compatibility with existing UI contracts.
    Scoped to capability-verified user session.
    """
    session = resolve_request_session(request, create_if_none=True)

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

    if not material_text and session.extracted_text:
        material_text = session.extracted_text

    if not material_text or len(material_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Material text too short for exam prediction")

    doc_id = session.documents[0].get("document_id") if session.documents else "doc_1"
    content_hash = hashlib.sha256(material_text.encode("utf-8", errors="ignore")).hexdigest()

    # Run the comprehensive forensic pipeline
    doc_data = DocumentIntelligence.extract_rich_document(
        material_text.encode('utf-8', errors='ignore'),
        filename="Syllabus Material",
        document_id=doc_id,
    )
    candidates = question_possibility_engine.generate_document_universe(doc_data, target_count=300)

    pipeline_result = exam_prediction_pipeline.run_pipeline(
        candidate_pool=candidates,
        material_text=material_text,
        past_papers=past_papers,
        subject_name=subject_name,
        api_keys=api_keys,
        preferred_order=preferred_order,
    )

    # Format into backward-compatible response for existing frontend UI
    mock_paper = pipeline_result["predicted_mock_paper"]
    sections = []
    for s in mock_paper.get("sections", []):
        sections.append({
            "name": s.get("name"),
            "marks_per_question": s.get("marks_per_question", 2.0),
            "num_questions": len(s.get("questions", [])),
            "total_marks": s.get("total_marks", 0.0),
            "choice_rule": s.get("choice_rule", "Compulsory"),
            "questions": s.get("questions", [])
        })

    avg_evidence = None
    if pipeline_result.get("top_25"):
        scores = [float(q.evidence_score) for q in pipeline_result["top_25"] if getattr(q, "evidence_score", None) is not None]
        avg_evidence = round((sum(scores) / len(scores)) * 100, 1) if scores else None

    top_25_serialized = _attach_provenance_to_questions(
        [q.model_dump() for q in pipeline_result["top_25"]],
        session_id=session.session_id,
        document_id=doc_id,
        content_hash=content_hash,
    )

    predicted_summary = {
        "session_id": session.session_id,
        "source_document_id": doc_id,
        "content_hash": content_hash,
        "subject_name": subject_name,
        "total_marks": mock_paper.get("total_marks", total_marks),
        "time_hours": mock_paper.get("duration_hours", 2.5),
        "overall_confidence": None,
        "evidence_score_average": avg_evidence,
        "confidence_metric": "heuristic_evidence_score",
        "topic_heatmap": pipeline_result["topic_heatmap"],
        "sections": sections
    }
    session.predicted_paper = predicted_summary
    if top_25_serialized:
        session.ranked_questions = top_25_serialized
    session_manager.update_session(session)

    response_payload = {
        "success": True,
        "session_id": session.session_id,
        "source_document_id": doc_id,
        "content_hash": content_hash,
        "subject_name": subject_name,
        "total_marks": mock_paper.get("total_marks", total_marks),
        "time_hours": mock_paper.get("duration_hours", 2.5),
        "overall_confidence": None,
        "evidence_score_average": avg_evidence,
        "confidence_metric": "heuristic_evidence_score",
        "topic_heatmap": pipeline_result["topic_heatmap"],
        "sections": sections,
        "candidate_universe_count": pipeline_result["candidate_universe_count"],
        "top_200_count": pipeline_result["top_200_count"],
        "top_100_count": pipeline_result["top_100_count"],
        "final_top_25": top_25_serialized,
        "top_100": [q.model_dump() for q in pipeline_result["top_100"][:30]],
        "top_200": [q.model_dump() for q in pipeline_result["top_200"][:30]],
        "learned_exam_profile": pipeline_result["learned_exam_profile"],
        "methodology_notes": pipeline_result["methodology_notes"]
    }
    if session.session_capability:
        response_payload["session_capability"] = session.session_capability
    return response_payload

@router.post('/generate-answers')
async def generate_answers_endpoint(request: Request):
    """
    Generate model answers with failover AI engine
    Accepts JSON body or Form data. Scoped to capability-verified user session.
    """
    session = resolve_request_session(request, create_if_none=True)

    data = {}
    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        body = form.get("body")
        if body:
            data = json.loads(body)

    questions = data.get('questions', [])
    source_text = data.get('source_text', '')

    # Fall back to session state if omitted
    if not questions:
        questions = session.ranked_questions or session.questions
    if not source_text and session.extracted_text:
        source_text = session.extracted_text

    result = answer_generator.generate_answers(
        questions,
        source_text,
        api_keys=data.get('api_keys'),
        preferred_order=data.get('preferred_order')
    )

    doc_id = session.documents[0].get("document_id") if session.documents else "doc_1"
    content_hash = hashlib.sha256((source_text or "").encode("utf-8", errors="ignore")).hexdigest()

    if result.get("success") and result.get("answers"):
        for ans in result["answers"]:
            if isinstance(ans, dict):
                ans["session_id"] = session.session_id
                ans["source_document_id"] = doc_id
                ans["content_hash"] = content_hash
        session.answers = result["answers"]
        session_manager.update_session(session)

    result["session_id"] = session.session_id
    result["source_document_id"] = doc_id
    result["content_hash"] = content_hash
    if session.session_capability:
        result["session_capability"] = session.session_capability
    return result

@router.post('/test-api-key')
@router.post('/test-key')
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
    Multimodal AI analysis & question generation. Scoped to capability-verified user session.
    """
    session = resolve_request_session(request, create_if_none=True)

    data = await request.json()
    frames = data.get("frames", [])
    api_keys = data.get("api_keys", {})
    preferred_order = data.get("preferred_order", ["gemini", "openai", "claude"])

    if not frames:
        raise HTTPException(status_code=400, detail="No captured frames provided")

    result = ai_service.analyze_slides_and_generate(frames, api_keys=api_keys, preferred_order=preferred_order)

    # Persist frame count and outputs into session
    capture_records = [{"frame_index": i, "captured_at": datetime.now().isoformat()} for i in range(len(frames))]
    session.captures = capture_records

    if result.get("success"):
        if result.get("questions"):
            session.questions = _attach_provenance_to_questions(
                result["questions"],
                session_id=session.session_id,
                document_id="captured_slides",
                content_hash=hashlib.sha256((result.get("extracted_text") or "").encode()).hexdigest(),
            )
            result["questions"] = session.questions
        if result.get("extracted_text"):
            session.extracted_text = result["extracted_text"]

    session_manager.update_session(session)

    result["session_id"] = session.session_id
    if session.session_capability:
        result["session_capability"] = session.session_capability
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
    session = resolve_request_session(request, create_if_none=True)
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
        res = await academic_service.unified_deep_search(query, sources=sources, perplexity_key=perplexity_key, session_id=session.session_id)
        if session.session_capability:
            res["session_capability"] = session.session_capability
        return res

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
async def get_audit_trail_endpoint(request: Request, limit: int = 15):
    """
    Get system audit trail and transparency logs:
    Shows how data was processed, agents invoked, skills used, and APIs queried for this session
    """
    session = resolve_request_session(request, create_if_none=True)
    res = {
        "success": True,
        "session_id": session.session_id,
        "logs": academic_service.get_audit_trail(session_id=session.session_id, limit=limit)
    }
    if session.session_capability:
        res["session_capability"] = session.session_capability
    return res

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

# ─── Multi-Agent Deliberation Endpoints ─────────────────────────

@router.post("/multi-agent/deliberate")
@router.post("/arena/deliberate")
async def multi_agent_deliberation_endpoint(request: Request):
    """
    Real Multi-Agent Deliberation Pipeline across 6 specialized agents:
    Academic Patron, Prof. Mukherjee, Prof. Kulkarni, Dr. Gupta, Agent Neuro, Sentinel-V3.
    Scoped to the capability-verified isolated user session.
    """
    session = resolve_request_session(request, create_if_none=True)

    try:
        data = await request.json()
    except Exception:
        data = {}

    extracted_text = data.get("extracted_text", "")
    questions = data.get("questions", [])
    exam_profile = data.get("exam_profile", {})
    api_keys = data.get("api_keys")
    preferred_order = data.get("preferred_order")

    # Fall back to session state if omitted
    if not extracted_text and session.extracted_text:
        extracted_text = session.extracted_text
    if not questions:
        questions = session.ranked_questions or session.questions

    result = await arena.run_deliberation(
        extracted_text=extracted_text,
        questions=questions,
        exam_profile=exam_profile,
        api_keys=api_keys,
        preferred_order=preferred_order,
        session_id=session.session_id
    )
    result["session_id"] = session.session_id
    if session.session_capability:
        result["session_capability"] = session.session_capability
    return result

@router.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'service': 'study-assistant-api',
        'version': '2.1.0',
        'ai_services': {
            'openai_available': ai_service.openai_client is not None,
            'anthropic_available': ai_service.anthropic_client is not None,
            'aki_antigravity_agent': True,
            'multi_agent_arena': True,
            'session_isolation': True,
            'session_capability_auth': True,
        },
        'persistence': session_manager.db.get_status(),
        'storage': s3_service.get_status(),
        'jobs': qstash_service.get_status(),
        'ocr': document_processor.get_ocr_capabilities(),
        'features': [
            'mega_questions',
            'exam_prediction',
            'answer_generation',
            'pdf_creation',
            'aki_antigravity_agent',
            'multi_agent_arena',
            'session_isolation',
            'server_issued_capabilities',
            'durable_relational_persistence',
            's3_ap_south_1_presigned_storage',
            'qstash_durable_jobs',
        ]
    }
