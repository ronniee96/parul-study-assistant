# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📋 Common Commands

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint codebase
npm run lint
```

### Backend Development
```bash
cd backend

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend server (runs on http://localhost:8000)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run API tests / verify service imports
python -c "from app.services.exam_predictor import ExamPredictor; print('ExamPredictor OK')"
python -c "from app.services.question_ranker import QuestionRanker; print('QuestionRanker OK')"
python -c "from app.services.answer_generator import AnswerGenerator; print('AnswerGenerator OK')"
python -c "from app.services.pdf_service import PDFService; print('PDFService OK')"
python -c "from app.models.schemas import QuestionItem, ExamPredictionRequest; print('Schemas OK')"
pytest
```

### Full Stack Development
```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 🏗️ Code Architecture (v2.0)

### Directory Structure
```
StudyAssistant/
├── .github/
│   └── workflows/
│       └── build.yml               # CI pipeline for frontend build & backend verification
├── frontend/                       # React 19 + Vite + Tailwind CSS SPA
│   ├── public/
│   │   ├── 404.html                # Custom error page
│   │   └── favicon.svg             # Application favicon
│   ├── src/
│   │   ├── assets/                 # Static images & branding
│   │   ├── components/             # UI Tab modules
│   │   │   ├── AdaptiveTab.jsx     # Ethical performance tracking & difficulty tuning
│   │   │   ├── AnswerBankTab.jsx   # Rubric-based model answers & key points
│   │   │   ├── ExamPredictorTab.jsx# Exam paper prediction & topic heatmap
│   │   │   ├── QuestionEngineTab.jsx# 300 -> 25 question generator & ranking funnel
│   │   │   ├── QuickStats.jsx      # Global sticky metrics footer bar
│   │   │   ├── ScreenCaptureTab.jsx# Lecture stream grabber & slide PDF compiler
│   │   │   ├── Sidebar.jsx         # Navigation sidebar with collapsible state
│   │   │   ├── StudyPlanTab.jsx    # Revision timeline & topic schedules
│   │   │   ├── SummaryTab.jsx      # Key concept synthesis & formula sheets
│   │   │   └── UploadTab.jsx       # Document ingestion (PDF, PPT, DOC, images)
│   │   ├── utils/
│   │   │   ├── pdfGenerator.js     # Client-side jsPDF document exporter
│   │   │   └── screenCapture.js    # Web MediaDevices display capture helper
│   │   ├── App.jsx                 # App root, tab switcher, shared appState
│   │   ├── index.css               # Tailwind CSS v4 directives & glassmorphism
│   │   └── main.jsx                # React DOM mounting
│   ├── .env.example                # Frontend environment template
│   ├── index.html                  # HTML5 shell
│   ├── package.json                # Frontend package dependencies & scripts
│   ├── tailwind.config.js          # Tailwind theme & color extensions
│   └── vite.config.js              # Vite server & proxy configuration
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1.py               # REST endpoints for upload, process, adaptive learning
│   │   ├── core/                   # Core application configuration
│   │   ├── models/                 # Pydantic data schemas
│   │   │   ├── __init__.py
│   │   │   └── schemas.py          # QuestionItem, ExamSection, ExamPrediction, etc.
│   │   ├── services/               # Core business logic services
│   │   │   ├── __init__.py
│   │   │   ├── adaptive_learning.py# GDPR-style consent tracking & learning analytics
│   │   │   ├── ai_service.py       # LLM integration (OpenAI/Anthropic) + offline mocks
│   │   │   ├── answer_generator.py # Exam-ready model answer builder (by marks)
│   │   │   ├── document_processor.py# Text extraction from PDF, PPT, Word, TXT, OCR
│   │   │   ├── exam_predictor.py   # Question paper prediction & confidence scoring
│   │   │   ├── pdf_service.py      # Server-side ReportLab PDF compilation
│   │   │   └── question_ranker.py  # Multi-factor question ranking & variety selection
│   │   └── utils/                  # Helper utilities
│   ├── .env.example                # Backend environment template
│   ├── main.py                     # FastAPI application setup, CORS, and root routes
│   └── requirements.txt            # Python dependencies (FastAPI, PyPDF2, ReportLab, etc.)
├── docs/                           # Documentation assets
├── scripts/                        # Utility scripts
├── CLAUDE.md                       # Developer & agent guidelines (this file)
├── ETHICAL_GUIDELINES.md           # Academic integrity & compliance framework
└── README.md                       # Comprehensive project overview
```

---

## 🌟 Key v2.0 Features

1. **Intelligent Document Ingestion & OCR**:
   - Parses `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx`, `.txt`, and images (`.png`, `.jpg`).
   - Integrates `pytesseract` for scanned lecture slide optical character recognition.

2. **Lecture Slide & Screen Capture**:
   - Snips lecture presentations directly in-browser using `navigator.mediaDevices.getDisplayMedia`.
   - Compiles captured frames on-the-fly into downloadable landscape slide PDFs.

3. **Mega Question Engine (300 → 25 Funnel)**:
   - Generates exhaustive multi-tier question pools.
   - Filters and ranks questions through confidence scoring: `All 300` → `Top 200` → `Top 100` → `Essential Top 25`.

4. **Exam Predictor & Blueprint Generator**:
   - Analyzes syllabus weights and past exam papers.
   - Outputs predicted university exam question papers conforming to Parul University section structures (2-mark definitions, 5-mark short notes, 10/15-mark essays).
   - Generates topic heatmaps and overall confidence percentage.

5. **Exemplary Answer Bank**:
   - Generates rubric-compliant answers with length targets (e.g., 50 words for 2 marks, 200 words for 5 marks, 400 words for 10 marks).
   - Produces structured outlines with highlighted key points.

6. **Ethical Adaptive Learning**:
   - Strictly opt-in user consent model.
   - Evaluates performance metrics (time spent, correctness) to suggest custom question difficulty and revision targets without harvesting unauthorized exam content.

---

## 📡 API Endpoints Reference

All API routes are prefixed with `/api/v1` (defined in `backend/app/api/v1.py` and `backend/main.py`):

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server status and AI service availability |
| `POST` | `/api/v1/upload` | Validates file format and size (max 10MB) |
| `POST` | `/api/v1/process` | Extracts document text and triggers summarization / question generation |
| `POST` | `/api/v1/summarize` | Summarizes provided text into key points |
| `POST` | `/api/v1/generate-questions` | Produces practice questions (MCQs, short answer, essays) |
| `POST` | `/api/v1/adaptive-learning/consent` | Grants user consent for performance tracking |
| `POST` | `/api/v1/adaptive-learning/withdraw-consent` | Revokes consent and purges collected learning telemetry |
| `POST` | `/api/v1/adaptive-learning/record-performance` | Logs user question answers, speed, and accuracy |
| `GET` | `/api/v1/adaptive-learning/recommendations` | Yields topic focus areas based on identified gaps |
| `GET` | `/api/v1/adaptive-learning/insights` | Delivers learning habit and study pattern insights |
| `GET` | `/api/v1/adaptive-learning/suggest-difficulty`| Calculates suggested difficulty (easy / medium / hard) |

---

## 🔄 Data Flow

```
1. Document / Screen Input:
   User uploads syllabus/notes OR captures live lecture slides
      │
      ▼
2. Ingestion & Extraction:
   DocumentProcessor extracts structured text / OCR
      │
      ▼
3. AI Generation & Question Engine:
   AIService + ExamPredictor generate comprehensive question pool (up to 300)
      │
      ▼
4. Funnel & Ranking:
   QuestionRanker computes confidence scores -> extracts Top 200, 100, 25
      │
      ▼
5. Model Answer Synthesis:
   AnswerGenerator pairs questions with mark-weighted key points & model answers
      │
      ▼
6. Export & Adaptive Tracking:
   - Export to formatted PDF via jsPDF (client) / ReportLab (server)
   - User consents -> performance telemetry refines subsequent study plans
```

---

## 🔧 Development Guidelines

1. **State Management**: The frontend uses a centralized `appState` dictionary in `frontend/src/App.jsx` passed down to active tabs, preserving uploaded materials, generated question banks, and telemetry across tab switches.
2. **Graceful Fallbacks**: All backend AI services (`AIService`, `ExamPredictor`, `AnswerGenerator`) provide robust mock/heuristic generation when OpenAI or Anthropic API keys are not supplied.
3. **Pydantic Validation**: Ensure all requests and responses in new backend features utilize strong typing via schemas in `backend/app/models/schemas.py`.
4. **Academic Integrity**: Always enforce the principles in `ETHICAL_GUIDELINES.md`. Never build scrapers for unauthorized academic repositories or implement features that bypass student learning comprehension.

@AGENTS.md
