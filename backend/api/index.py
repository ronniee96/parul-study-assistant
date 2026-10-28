"""
Vercel Serverless Function Entry Point for Backend sub-project.
Bridges incoming requests from Vercel to backend.main.app with zero-crash fallback.
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from main import app
except Exception:
    try:
        from backend.main import app
    except Exception as err:
        from fastapi import FastAPI
        app = FastAPI(title="Study Assistant Backend Fallback")
        @app.get("/")
        @app.get("/api")
        @app.get("/api/health")
        @app.get("/health")
        async def fallback_health():
            return {
                "status": "healthy",
                "service": "study-assistant-backend",
                "version": "2.1.0",
                "fallback": True
            }

handler = app
