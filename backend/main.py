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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import API router
from app.api.v1 import router as api_v1_router

# Initialize FastAPI app
app = FastAPI(
    title="Parul University AI Study Assistant API",
    description="Multi-Agent AI Study Assistant with Academic Research Engine & Transparency Audit",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom error handlers from v1
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: HTTPException):
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


# Include API router
app.include_router(api_v1_router, prefix="/api/v1")

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Ethical MBA Study Assistant API",
        "version": "1.0.0",
        "status": "active",
        "ethical_guidelines": "This tool works only with materials you have legitimate access to",
        "docs": "Visit /docs for API documentation"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "study-assistant-backend"}

def start():
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    start()