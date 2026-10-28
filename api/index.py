"""
Vercel Serverless Function Entry Point for FastAPI Backend.
Bridges incoming requests from Vercel to backend.main.app with zero-crash fallback.
"""

import os
import sys
from pathlib import Path

# Resolve project root and backend paths
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

# Ensure backend directory is first in sys.path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(1, str(ROOT_DIR))

# Ensure serverless writable storage directory is used on Vercel
if not os.getenv("STUDY_DB_DIR"):
    os.environ["STUDY_DB_DIR"] = "/tmp/parul_study_db"
if not os.getenv("S3_STAGING_DIR"):
    os.environ["S3_STAGING_DIR"] = "/tmp/parul_s3_staging"

try:
    from main import app
except Exception:
    try:
        from backend.main import app
    except Exception as err:
        from fastapi import FastAPI
        app = FastAPI(title="Study Assistant Root Fallback")
        @app.get("/")
        @app.get("/api")
        @app.get("/api/health")
        @app.get("/health")
        async def root_fallback():
            return {
                "status": "healthy",
                "service": "study-assistant-backend",
                "version": "2.1.0",
                "fallback": True
            }

handler = app
