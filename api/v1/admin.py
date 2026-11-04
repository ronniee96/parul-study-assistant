"""
Direct Vercel Serverless Function for /api/v1/admin endpoints.
Enables high-availability execution of Admin Operations on Vercel Edge/Serverless.
"""

import os
import sys
from pathlib import Path

# Resolve project root and backend paths
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(1, str(ROOT_DIR))

# Ensure serverless writable storage directory is used on Vercel
if not os.getenv("STUDY_DB_DIR"):
    os.environ["STUDY_DB_DIR"] = "/tmp/parul_study_db"
if not os.getenv("S3_STAGING_DIR"):
    os.environ["S3_STAGING_DIR"] = "/tmp/parul_s3_staging"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.admin_api import admin_router

app = FastAPI(title="Study Assistant Admin Operations API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router, prefix="/api/v1/admin")
app.include_router(admin_router, prefix="/v1/admin")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(admin_router)

handler = app
