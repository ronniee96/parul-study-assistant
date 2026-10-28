"""
Direct Vercel Serverless Function for /api/health.
Provides high-availability, zero-rewrite health check.
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="Study Assistant Health API")

@app.get("/api/health")
@app.get("/health")
@app.get("/")
async def health():
    return {
        "status": "healthy",
        "service": "study-assistant-api",
        "version": "2.1.0"
    }

handler = app
