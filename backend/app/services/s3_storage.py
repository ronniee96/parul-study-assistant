"""
Private Amazon S3 Document Storage Service (`ap-south-1` Mumbai)
Handles session-isolated object key generation, ownership authorization, and AWS Signature V4
presigned upload (`PUT`) and download (`GET`) URLs.

SECURITY GUARANTEES:
- Every student upload is stored under a private, session-scoped key:
  `sessions/{session_id}/documents/{document_id}/{safe_filename}`
- Historical Parul PYQ corpus data (`parul_pyq/...`) is strictly separated from student uploads.
- Presigned URLs are generated ONLY after the caller's `X-Session-Capability` has been verified.
- Cross-session object key access is rejected with `PermissionError` (HTTP 403).
- Public ACLs (`public-read`, `public-read-write`) are strictly prohibited.
"""

import os
import re
import hmac
import shutil
import urllib.parse
import hashlib
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_S3_REGION = "ap-south-1"
SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9._\-]")
SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{4,64}$")


def sanitize_filename(filename: str) -> str:
    """Sanitize a user-supplied filename to prevent path traversal or control characters."""
    base = os.path.basename((filename or "document.pdf").strip())
    clean = SAFE_FILENAME_RE.sub("_", base)
    clean = clean.lstrip(".")
    return clean[:120] or "document.pdf"


def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _get_signing_key(secret_key: str, date_stamp: str, region_name: str, service_name: str = "s3") -> bytes:
    k_date = _hmac_sha256(("AWS4" + secret_key).encode("utf-8"), date_stamp)
    k_region = _hmac_sha256(k_date, region_name)
    k_service = _hmac_sha256(k_region, service_name)
    k_signing = _hmac_sha256(k_service, "aws4_request")
    return k_signing


class S3StorageService:
    """
    Amazon S3 storage service pinned to `ap-south-1` (Mumbai) with AWS Signature V4 presigning
    and isolated local staging fallback when live AWS credentials are not configured.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        session_token: Optional[str] = None,
        staging_dir: Optional[str] = None,
    ):
        self.region = (region or os.getenv("AWS_REGION") or os.getenv("S3_REGION") or DEFAULT_S3_REGION).strip()
        self.bucket_name = (
            bucket_name
            or os.getenv("S3_BUCKET_NAME")
            or os.getenv("AWS_S3_BUCKET")
            or "parul-study-assistant-private-ap-south-1"
        ).strip()
        self.access_key_id = (access_key_id or os.getenv("AWS_ACCESS_KEY_ID") or "").strip()
        self.secret_access_key = (secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY") or "").strip()
        self.session_token = (session_token or os.getenv("AWS_SESSION_TOKEN") or "").strip() or None

        is_dummy_key = (
            "your-access-key" in self.access_key_id.lower()
            or "your-secret-access-key" in self.secret_access_key.lower()
            or "example" in self.access_key_id.lower()
        )
        self.live_s3_configured = bool(
            self.access_key_id
            and self.secret_access_key
            and not is_dummy_key
            and (os.getenv("S3_BUCKET_NAME") or os.getenv("AWS_S3_BUCKET") or bucket_name)
        )

        default_staging = "/tmp/parul_s3_staging" if os.getenv("VERCEL") else "./sessions/s3_staging"
        self.staging_dir = Path(staging_dir or os.getenv("S3_STAGING_DIR") or default_staging).resolve()
        self.staging_dir.mkdir(parents=True, exist_ok=True)

    def get_status(self) -> Dict[str, Any]:
        return {
            "region": self.region,
            "bucket": self.bucket_name,
            "live_s3_configured": self.live_s3_configured,
            "mode": "aws_s3_ap_south_1" if self.live_s3_configured else "local_staging_fallback",
            "private_acl_enforced": True,
        }

    def build_object_key(self, session_id: str, document_id: str, filename: str) -> str:
        """
        Construct a strictly isolated S3 object key for a session document:
        `sessions/{session_id}/documents/{document_id}/{safe_filename}`
        """
        clean_sid = (session_id or "").strip()
        clean_did = (document_id or "").strip()
        if not SAFE_ID_RE.match(clean_sid):
            raise ValueError(f"Invalid session_id for S3 object key: '{session_id}'")
        if not SAFE_ID_RE.match(clean_did):
            raise ValueError(f"Invalid document_id for S3 object key: '{document_id}'")

        safe_name = sanitize_filename(filename)
        return f"sessions/{clean_sid}/documents/{clean_did}/{safe_name}"

    def validate_object_ownership(self, session_id: str, object_key: str) -> bool:
        """
        Ensure `object_key` strictly belongs to `session_id` and is not a path traversal
        or historical PYQ object.
        Raises `PermissionError` or `ValueError` on violation.
        """
        clean_sid = (session_id or "").strip()
        if not SAFE_ID_RE.match(clean_sid):
            raise ValueError(f"Invalid session_id: '{session_id}'")

        if not object_key or not isinstance(object_key, str):
            raise ValueError("S3 object_key cannot be empty")

        normalized = object_key.strip()
        if normalized.startswith("/") or "\\" in normalized or ".." in normalized.split("/"):
            raise ValueError(f"Invalid S3 object key path: '{object_key}'")

        if normalized.startswith("parul_pyq/"):
            raise PermissionError("Historical Parul PYQ repository objects are separated from private session uploads")

        expected_prefix = f"sessions/{clean_sid}/documents/"
        if not normalized.startswith(expected_prefix):
            raise PermissionError(
                f"Access denied: S3 object '{object_key}' does not belong to session '{clean_sid}'"
            )

        remainder = normalized[len(expected_prefix):]
        parts = [p for p in remainder.split("/") if p]
        if len(parts) != 2 or not SAFE_ID_RE.match(parts[0]):
            raise ValueError(f"Malformed session document object key: '{object_key}'")

        return True

    def generate_presigned_url(
        self,
        method: str,
        session_id: str,
        object_key: str,
        content_type: Optional[str] = None,
        expires_in: int = 900,
        acl: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate an AWS Signature Version 4 (`AWS4-HMAC-SHA256`) presigned URL in `ap-south-1`
        after verifying that `object_key` belongs to `session_id`.
        """
        http_method = method.upper().strip()
        if http_method not in ("PUT", "GET", "DELETE"):
            raise ValueError(f"Unsupported presign HTTP method: {http_method}")

        if acl and acl.lower() != "private":
            raise PermissionError(f"Public or non-private S3 ACL '{acl}' is forbidden for student uploads")

        self.validate_object_ownership(session_id, object_key)

        ttl = max(60, min(int(expires_in), 3600))
        now = datetime.now(timezone.utc)
        amz_date = now.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = now.strftime("%Y%m%d")

        # Use configured AWS credentials or deterministic local test signer when unconfigured
        akid = self.access_key_id or "AKIALOCALDEVTESTONLY"
        secret = self.secret_access_key or "local-dev-only-unconfigured-aws-secret-key"

        host = f"{self.bucket_name}.s3.{self.region}.amazonaws.com"
        canonical_uri = "/" + "/".join(urllib.parse.quote(part, safe="") for part in object_key.split("/"))

        credential_scope = f"{date_stamp}/{self.region}/s3/aws4_request"
        signed_headers = "host"
        canonical_headers = f"host:{host}\n"

        query_params = {
            "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
            "X-Amz-Credential": f"{akid}/{credential_scope}",
            "X-Amz-Date": amz_date,
            "X-Amz-Expires": str(ttl),
            "X-Amz-SignedHeaders": signed_headers,
        }
        if self.session_token:
            query_params["X-Amz-Security-Token"] = self.session_token

        canonical_querystring = "&".join(
            f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
            for k, v in sorted(query_params.items())
        )

        payload_hash = "UNSIGNED-PAYLOAD"
        canonical_request = "\n".join([
            http_method,
            canonical_uri,
            canonical_querystring,
            canonical_headers,
            signed_headers,
            payload_hash,
        ])

        string_to_sign = "\n".join([
            "AWS4-HMAC-SHA256",
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ])

        signing_key = _get_signing_key(secret, date_stamp, self.region, "s3")
        signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

        presigned_url = f"https://{host}{canonical_uri}?{canonical_querystring}&X-Amz-Signature={signature}"

        required_headers: Dict[str, str] = {}
        if http_method == "PUT" and content_type:
            required_headers["Content-Type"] = content_type

        return {
            "url": presigned_url,
            "method": http_method,
            "bucket": self.bucket_name,
            "region": self.region,
            "object_key": object_key,
            "expires_in": ttl,
            "acl": "private",
            "live_s3_configured": self.live_s3_configured,
            "headers": required_headers,
        }

    def put_object_bytes(
        self,
        session_id: str,
        object_key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> Dict[str, Any]:
        """
        Store private document bytes for `(session_id, object_key)`.
        Uploads to Amazon S3 (`ap-south-1`) when live credentials are configured,
        and writes to isolated local staging otherwise.
        """
        self.validate_object_ownership(session_id, object_key)
        content_hash = hashlib.sha256(data).hexdigest()

        if self.live_s3_configured:
            import httpx
            presigned = self.generate_presigned_url(
                method="PUT",
                session_id=session_id,
                object_key=object_key,
                content_type=content_type,
                expires_in=300,
            )
            with httpx.Client(timeout=30.0) as client:
                resp = client.put(
                    presigned["url"],
                    content=data,
                    headers={"Content-Type": content_type},
                )
                if resp.status_code not in (200, 201, 204):
                    raise RuntimeError(f"S3 PUT failed ({resp.status_code}): {resp.text[:200]}")

        # Also persist in isolated local staging when not using live S3 (or as local verification cache)
        target_path = (self.staging_dir / object_key).resolve()
        target_path.relative_to(self.staging_dir)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(data)

        return {
            "bucket": self.bucket_name,
            "region": self.region,
            "object_key": object_key,
            "size": len(data),
            "content_hash": content_hash,
            "storage_mode": "aws_s3_ap_south_1" if self.live_s3_configured else "local_staging_fallback",
        }

    def get_object_bytes(self, session_id: str, object_key: str) -> bytes:
        """
        Retrieve private document bytes after verifying session ownership of `object_key`.
        """
        self.validate_object_ownership(session_id, object_key)

        target_path = (self.staging_dir / object_key).resolve()
        target_path.relative_to(self.staging_dir)
        if target_path.exists():
            return target_path.read_bytes()

        if self.live_s3_configured:
            import httpx
            presigned = self.generate_presigned_url(
                method="GET",
                session_id=session_id,
                object_key=object_key,
                expires_in=300,
            )
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(presigned["url"])
                if resp.status_code == 200:
                    return resp.content
                raise FileNotFoundError(f"S3 GET failed ({resp.status_code}) for key '{object_key}'")

        raise FileNotFoundError(f"Document object '{object_key}' not found in storage")

    def delete_object(self, session_id: str, object_key: str) -> bool:
        """
        Delete a single private document object after verifying session ownership.
        Deletes from Amazon S3 (ap-south-1) when live credentials are configured,
        and removes from local staging.
        """
        self.validate_object_ownership(session_id, object_key)
        deleted = False

        if self.live_s3_configured:
            import httpx
            presigned = self.generate_presigned_url(
                method="DELETE",
                session_id=session_id,
                object_key=object_key,
                expires_in=300,
            )
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.delete(presigned["url"])
                    if resp.status_code in (200, 204):
                        deleted = True
                    else:
                        logger.warning(f"S3 DELETE failed ({resp.status_code}) for '{object_key}': {resp.text[:200]}")
            except Exception as e:
                logger.error(f"Error executing S3 DELETE for '{object_key}': {e}")

        target_path = (self.staging_dir / object_key).resolve()
        try:
            target_path.relative_to(self.staging_dir)
            if target_path.exists():
                target_path.unlink()
                deleted = True
        except ValueError:
            pass

        return deleted

    def delete_session_objects(self, session_id: str, object_keys: Optional[List[str]] = None) -> int:
        """Remove all staged and S3 objects for `session_id` upon session deletion/reset."""
        clean_sid = (session_id or "").strip()
        if not SAFE_ID_RE.match(clean_sid):
            return 0

        count = 0
        if object_keys:
            for k in object_keys:
                try:
                    if self.delete_object(clean_sid, k):
                        count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete S3 object '{k}': {e}")

        session_dir = (self.staging_dir / "sessions" / clean_sid).resolve()
        try:
            session_dir.relative_to(self.staging_dir)
        except ValueError:
            return count

        if session_dir.exists() and session_dir.is_dir():
            staged_count = sum(1 for _ in session_dir.rglob("*") if _.is_file())
            shutil.rmtree(session_dir, ignore_errors=True)
            count = max(count, staged_count)
        return count


_s3_service: Optional[S3StorageService] = None


def get_s3_service() -> S3StorageService:
    global _s3_service
    if _s3_service is None:
        _s3_service = S3StorageService()
    return _s3_service
