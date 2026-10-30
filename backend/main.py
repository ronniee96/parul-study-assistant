"""
Ethical MBA Study Assistant Backend
FastAPI application for processing study materials ethically
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import uvicorn
import os
import logging
# Load environment variables safely
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

# Import API routers
from app.api.v1 import router as api_v1_router
from app.api.admin_api import admin_router, record_request_trace
import time
import uuid

# Initialize FastAPI app
app = FastAPI(
    title="Parul University AI Study Assistant API",
    description="Multi-Agent AI Study Assistant with Academic Research Engine & Transparency Audit",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Telemetry & Correlation ID Middleware
@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
    t0 = time.perf_counter()
    session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
    error_msg = None
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = req_id
        return response
    except Exception as exc:
        error_msg = str(exc)
        raise exc
    finally:
        duration_ms = (time.perf_counter() - t0) * 1000
        # Only record non-static endpoints
        path = request.url.path
        if not path.startswith(("/docs", "/redoc", "/openapi.json")):
            try:
                record_request_trace(
                    method=request.method,
                    path=path,
                    status_code=status_code,
                    duration_ms=duration_ms,
                    session_id=session_id,
                    error=error_msg
                )
            except Exception:
                pass


# Custom error handlers from v1
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: HTTPException):
    if request.url.path.startswith("/api/"):
        detail_msg = getattr(exc, "detail", None)
        if not detail_msg or detail_msg == "Not Found":
            detail_msg = f"API endpoint not found: {request.method} {request.url.path}"
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "detail": detail_msg,
                "error": {
                    "code": "NOT_FOUND",
                    "message": detail_msg
                }
            }
        )
    return HTMLResponse(
        status_code=404,
        content="""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Study Assistant</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c);
                    color: white;
                    text-align: center;
                    padding: 60px 20px;
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    max-width: 600px;
                }
                h1 {
                    font-size: 4rem;
                    margin-bottom: 20px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                h2 {
                    font-size: 2rem;
                    margin-bottom: 30px;
                    opacity: 0.9;
                }
                p {
                    font-size: 1.2rem;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    max-width: 500px;
                }
                .error-code {
                    font-size: 8rem;
                    font-weight: bold;
                    background: rgba(0,0,0,0.3);
                    padding: 20px;
                    border-radius: 20px;
                    margin-bottom: 30px;
                    backdrop-filter: blur(10px);
                }
                .btn {
                    display: inline-block;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    padding: 15px 30px;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    border: 2px solid rgba(255,255,255,0.3);
                }
                .btn:hover {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                .details {
                    background: rgba(0,0,0,0.2);
                    padding: 20px;
                    border-radius: 15px;
                    margin-top: 30px;
                    text-align: left;
                    max-width: 500px;
                }
                .details h3 {
                    margin-top: 0;
                    color: #ffd700;
                }
                .details pre {
                    background: rgba(0,0,0,0.3);
                    padding: 15px;
                    border-radius: 10px;
                    overflow-x: auto;
                    font-size: 0.9rem;
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }
                .floating {
                    animation: float 6s ease-in-out infinite;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-code">404</div>
                <h1>Page Not Found</h1>
                <h2>Looks like you've wandered off the study path</h2>
                <p>The page you're looking for seems to have taken a detour through the library stacks. Let's get you back on track to academic success.</p>
                <div class="btn" onclick="window.history.back()">Go Back</div>
                <div class="details">
                    <h3>Technical Details:</h3>
                    <pre>Requested URL: """ + str(request.url) + """
Method: """ + request.method + """
User Agent: """ + request.headers.get('user-agent', 'Unknown') + """
Timestamp: """ + str(logging.Formatter().formatTime(logging.LogRecord('', 0, '', 0, '', (), None, None))) + """
                    </pre>
                </div>
            </div>
        </body>
        </html>
        """
    )

@app.exception_handler(500)
async def custom_500_handler(request: Request, exc: HTTPException):
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": getattr(exc, 'detail', str(exc)) or "An internal error occurred."
                }
            }
        )
    return HTMLResponse(
        status_code=500,
        content="""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>500 - Study Assistant</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #2c3e50, #4ca1af);
                    color: white;
                    text-align: center;
                    padding: 60px 20px;
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    max-width: 600px;
                }
                h1 {
                    font-size: 4rem;
                    margin-bottom: 20px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                h2 {
                    font-size: 2rem;
                    margin-bottom: 30px;
                    opacity: 0.9;
                }
                p {
                    font-size: 1.2rem;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    max-width: 500px;
                }
                .error-code {
                    font-size: 8rem;
                    font-weight: bold;
                    background: rgba(0,0,0,0.3);
                    padding: 20px;
                    border-radius: 20px;
                    margin-bottom: 30px;
                    backdrop-filter: blur(10px);
                }
                .btn {
                    display: inline-block;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    padding: 15px 30px;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    border: 2px solid rgba(255,255,255,0.3);
                }
                .btn:hover {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                .details {
                    background: rgba(0,0,0,0.2);
                    padding: 20px;
                    border-radius: 15px;
                    margin-top: 30px;
                    text-align: left;
                    max-width: 500px;
                }
                .details h3 {
                    margin-top: 0;
                    color: #ffd700;
                }
                .details pre {
                    background: rgba(0,0,0,0.3);
                    padding: 15px;
                    border-radius: 10px;
                    overflow-x: auto;
                    font-size: 0.9rem;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .pulsing {
                    animation: pulse 2s infinite;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-code pulsing">500</div>
                <h1>Internal Server Error</h1>
                <h2>Our study servers need a coffee break</h2>
                <p>Something went wrong on our end while processing your request. Our team has been notified and is working to resolve the issue.</p>
                <div class="btn" onclick="window.location.reload()">Try Again</div>
                <div class="details">
                    <h3>Technical Details:</h3>
                    <pre>Error: Internal server error occurred
URL: """ + str(request.url) + """
Method: """ + request.method + """
Timestamp: """ + str(logging.Formatter().formatTime(logging.LogRecord('', 0, '', 0, '', (), None, None))) + """
                    </pre>
                </div>
            </div>
        </body>
        </html>
        """
    )


# Include API router (support both /api/v1 and stripped /v1 prefixes)
app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(api_v1_router, prefix="/v1")

# Include Admin Operations router
app.include_router(admin_router, prefix="/api/v1/admin")
app.include_router(admin_router, prefix="/v1/admin")


# Health check endpoints
@app.get("/")
@app.get("/api")
async def root():
    return {
        "message": "Ethical MBA Study Assistant API",
        "version": "2.0.0",
        "status": "active",
        "ethical_guidelines": "This tool works only with materials you have legitimate access to",
        "docs": "Visit /docs for API documentation"
    }

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "study-assistant-backend"}

def start():
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    start()
