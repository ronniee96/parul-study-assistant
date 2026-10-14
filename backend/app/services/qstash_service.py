"""
Upstash QStash Durable Background Job Dispatch & Webhook Verification Service.

Handles:
1. Cryptographic verification of `Upstash-Signature` (HS256 JWT with body SHA-256 claim)
   using `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY`.
2. Idempotent background job dispatch to Upstash QStash (`https://qstash.upstash.io/v2/publish/...`)
   with `Upstash-Deduplication-Id`.
3. Idempotent job state machine (`PENDING` -> `PROCESSING` -> `COMPLETED` / `FAILED`) backed by
   the `processing_jobs` relational table, preventing duplicate question generation on retries.
"""

import os
import time
import hmac
import json
import base64
import hashlib
import logging
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


class QStashSignatureError(PermissionError):
    """Raised when an incoming webhook request fails Upstash-Signature verification (HTTP 401/403)."""


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * ((4 - len(segment) % 4) % 4)
    return base64.urlsafe_b64decode((segment + padding).encode("ascii"))


def create_qstash_jwt_signature(
    raw_body: bytes,
    signing_key: str,
    subject_url: str = "https://parul-study-assistant.vercel.app/api/v1/jobs/webhook",
    expires_in: int = 300,
    issued_at: Optional[int] = None,
) -> str:
    """
    Create a standard Upstash QStash HS256 JWT signature over `raw_body`.
    Used by tests and local signed webhook simulation.
    """
    now = int(issued_at if issued_at is not None else time.time())
    body_sha256_b64 = _b64url_encode(hashlib.sha256(raw_body).digest())

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": "Upstash",
        "sub": subject_url,
        "exp": now + int(expires_in),
        "nbf": now,
        "iat": now,
        "jti": f"msg_{hashlib.sha256(raw_body + str(now).encode()).hexdigest()[:16]}",
        "body": body_sha256_b64,
    }

    signing_input = f"{_b64url_encode(json.dumps(header, separators=(',', ':')).encode())}.{_b64url_encode(json.dumps(payload, separators=(',', ':')).encode())}"
    sig = hmac.new(signing_key.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


class QStashService:
    """
    Manages Upstash QStash job publishing, webhook signature validation, and idempotent job execution.
    """

    def __init__(
        self,
        qstash_token: Optional[str] = None,
        current_signing_key: Optional[str] = None,
        next_signing_key: Optional[str] = None,
        qstash_url: Optional[str] = None,
        webhook_url: Optional[str] = None,
    ):
        self.qstash_token = (qstash_token or os.getenv("QSTASH_TOKEN") or "").strip()
        self.current_signing_key = (
            current_signing_key
            or os.getenv("QSTASH_CURRENT_SIGNING_KEY")
            or "local-dev-qstash-current-signing-key-32bytes"
        ).strip()
        self.next_signing_key = (
            next_signing_key
            or os.getenv("QSTASH_NEXT_SIGNING_KEY")
            or "local-dev-qstash-next-signing-key-32bytes"
        ).strip()
        self.qstash_url = (qstash_url or os.getenv("QSTASH_URL") or "https://qstash.upstash.io").rstrip("/")
        self.webhook_url = (
            webhook_url
            or os.getenv("QSTASH_WEBHOOK_URL")
            or os.getenv("PUBLIC_BACKEND_URL")
            or ""
        ).strip()

        self.live_qstash_configured = bool(
            self.qstash_token
            and os.getenv("QSTASH_CURRENT_SIGNING_KEY")
            and self.webhook_url
        )

    def get_status(self) -> Dict[str, Any]:
        return {
            "live_qstash_configured": self.live_qstash_configured,
            "mode": "upstash_qstash" if self.live_qstash_configured else "local_idempotent_worker_fallback",
            "signature_verification_enforced": True,
        }

    def verify_signature(
        self,
        signature_header: Optional[str],
        raw_body: bytes,
        expected_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify the `Upstash-Signature` JWT header against `QSTASH_CURRENT_SIGNING_KEY`
        and `QSTASH_NEXT_SIGNING_KEY`.
        Raises `QStashSignatureError` on missing, malformed, expired, or forged signatures.
        """
        if not signature_header or not isinstance(signature_header, str) or not signature_header.strip():
            raise QStashSignatureError("Missing Upstash-Signature header")

        token = signature_header.strip()
        parts = token.split(".")
        if len(parts) != 3:
            raise QStashSignatureError("Malformed Upstash-Signature JWT format")

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

        try:
            provided_sig = _b64url_decode(sig_b64)
            header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
            claims = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        except Exception as exc:
            raise QStashSignatureError(f"Failed to decode Upstash-Signature JWT: {exc}") from exc

        if header.get("alg") != "HS256":
            raise QStashSignatureError(f"Unsupported JWT algorithm: {header.get('alg')}")

        valid_key = False
        for key in (self.current_signing_key, self.next_signing_key):
            if not key:
                continue
            expected_sig = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
            if hmac.compare_digest(provided_sig, expected_sig):
                valid_key = True
                break

        if not valid_key:
            raise QStashSignatureError("Upstash-Signature HMAC verification failed")

        if claims.get("iss") != "Upstash":
            raise QStashSignatureError(f"Invalid JWT issuer: {claims.get('iss')}")

        now = int(time.time())
        exp = claims.get("exp")
        if exp is None or int(exp) < now:
            raise QStashSignatureError("Upstash-Signature token has expired")

        nbf = claims.get("nbf")
        if nbf is not None and int(nbf) > now + 60:
            raise QStashSignatureError("Upstash-Signature token is not yet valid (nbf)")

        # Verify request body SHA-256 hash matches the JWT `body` claim
        body_claim = str(claims.get("body") or "")
        actual_sha256_b64 = _b64url_encode(hashlib.sha256(raw_body).digest())
        actual_sha256_std = base64.b64encode(hashlib.sha256(raw_body).digest()).decode("ascii")
        actual_sha256_hex = hashlib.sha256(raw_body).hexdigest()

        if not (
            hmac.compare_digest(body_claim.rstrip("="), actual_sha256_b64.rstrip("="))
            or hmac.compare_digest(body_claim, actual_sha256_std)
            or hmac.compare_digest(body_claim.lower(), actual_sha256_hex.lower())
        ):
            raise QStashSignatureError("Upstash-Signature body hash mismatch: payload was tampered with")

        if expected_url and claims.get("sub") and claims["sub"] != expected_url:
            raise QStashSignatureError(f"Upstash-Signature subject mismatch: {claims.get('sub')}")

        return claims

    def dispatch_document_job(
        self,
        session_manager,
        session_id: str,
        document_id: str,
        content_hash: str,
        worker_fn: Callable[[Dict[str, Any]], Dict[str, Any]],
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Idempotently register and dispatch a document processing job.
        - If a job with the same `(session_id, document_id, content_hash)` already completed,
          returns the existing job without re-running or duplicating work.
        - If live QStash is configured, publishes to QStash with `Upstash-Deduplication-Id`.
        - Otherwise, runs `worker_fn` via the idempotent local state machine.
        """
        job, is_new = session_manager.create_or_get_job(
            session_id=session_id,
            document_id=document_id,
            content_hash=content_hash,
        )

        if not is_new and job["status"] == "COMPLETED" and job.get("result") is not None:
            return {
                **job,
                "idempotent_replay": True,
                "dispatch_mode": "cached_completed_job",
            }

        payload = {
            "job_id": job["job_id"],
            "session_id": session_id,
            "document_id": document_id,
            "content_hash": content_hash,
            "idempotency_key": job["idempotency_key"],
            "options": options or {},
        }

        if self.live_qstash_configured:
            import httpx
            target_webhook = self.webhook_url.rstrip("/")
            if not target_webhook.endswith("/api/v1/jobs/webhook"):
                target_webhook = f"{target_webhook}/api/v1/jobs/webhook"

            publish_url = f"{self.qstash_url}/v2/publish/{target_webhook}"
            headers = {
                "Authorization": f"Bearer {self.qstash_token}",
                "Content-Type": "application/json",
                "Upstash-Deduplication-Id": job["idempotency_key"],
                "Upstash-Retries": "3",
            }
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(publish_url, headers=headers, json=payload)
                if resp.status_code not in (200, 201, 202):
                    raise RuntimeError(f"QStash publish failed ({resp.status_code}): {resp.text[:200]}")
                msg_id = resp.json().get("messageId")
                updated = session_manager.update_job_state(
                    job_id=job["job_id"],
                    status="PENDING",
                    qstash_message_id=msg_id,
                )
                return {
                    **(updated or job),
                    "idempotent_replay": not is_new,
                    "dispatch_mode": "upstash_qstash",
                }

        # Local idempotent execution fallback when external QStash credentials are not configured
        return self.execute_job_payload(session_manager, payload, worker_fn)

    def execute_job_payload(
        self,
        session_manager,
        payload: Dict[str, Any],
        worker_fn: Callable[[Dict[str, Any]], Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Execute a job payload idempotently, transitioning `PENDING` -> `PROCESSING` -> `COMPLETED` / `FAILED`.
        """
        job_id = str(payload.get("job_id") or "")
        session_id = str(payload.get("session_id") or "")
        document_id = str(payload.get("document_id") or "")
        content_hash = str(payload.get("content_hash") or "")

        if not job_id:
            job, _ = session_manager.create_or_get_job(
                session_id=session_id,
                document_id=document_id,
                content_hash=content_hash,
            )
            job_id = job["job_id"]
        else:
            job = session_manager.get_job(job_id)
            if not job:
                raise KeyError(f"Job '{job_id}' not found")

        # Idempotency guard: if already COMPLETED, do not re-execute or duplicate outputs
        if job["status"] == "COMPLETED" and job.get("result") is not None:
            return {
                **job,
                "idempotent_replay": True,
                "dispatch_mode": "idempotent_skip",
            }

        session_manager.update_job_state(
            job_id=job_id,
            status="PROCESSING",
            increment_attempt=True,
        )

        try:
            result = worker_fn({
                "job_id": job_id,
                "session_id": session_id,
                "document_id": document_id,
                "content_hash": content_hash,
                "options": payload.get("options") or {},
            })
            completed = session_manager.update_job_state(
                job_id=job_id,
                status="COMPLETED",
                result=result,
                error_message=None,
            )
            return {
                **(completed or job),
                "idempotent_replay": False,
                "dispatch_mode": "upstash_qstash" if self.live_qstash_configured else "local_idempotent_worker_fallback",
            }
        except Exception as exc:
            logger.error("Job %s failed: %s", job_id, exc)
            failed = session_manager.update_job_state(
                job_id=job_id,
                status="FAILED",
                error_message=str(exc),
            )
            raise RuntimeError(f"Background job '{job_id}' failed: {exc}") from exc


_qstash_service: Optional[QStashService] = None


def get_qstash_service() -> QStashService:
    global _qstash_service
    if _qstash_service is None:
        _qstash_service = QStashService()
    return _qstash_service
