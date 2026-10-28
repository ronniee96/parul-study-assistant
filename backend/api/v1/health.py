"""
Direct Vercel Serverless Function for /api/v1/health.
Provides high-availability, zero-rewrite V1 health check.
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="Study Assistant V1 Health API")

@app.get("/api/v1/health")
@app.get("/v1/health")
@app.get("/health")
@app.get("/")
async def v1_health():
    return {
        "status": "healthy",
        "service": "study-assistant-api",
        "version": "2.1.0",
        "features": [
            "mega_questions",
            "exam_prediction",
            "answer_generation",
            "pdf_creation",
            "screen_capture",
            "question_tiers_300_200_100_25"
        ]
    }

handler = app
