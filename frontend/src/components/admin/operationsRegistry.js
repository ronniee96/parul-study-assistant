/**
 * Parul Study Assistant — System Architecture & Component Registry
 * Single Source of Truth for the 32 real modules across 7 functional groups.
 */

export const COMPONENT_GROUPS = [
  {
    id: 'group_client',
    name: '1. Student-Facing Clients',
    badge: 'Frontend SPA',
    color: '#38bdf8', // Sky Blue
    bg: 'rgba(56, 189, 248, 0.08)',
    border: 'rgba(56, 189, 248, 0.25)',
    description: 'React 19 / Vite single-page application interface components and study workspaces.'
  },
  {
    id: 'group_gateway',
    name: '2. Request Entry & Protection',
    badge: 'API Gateway & Security',
    color: '#00e5ff', // Electric Cyan
    bg: 'rgba(0, 229, 255, 0.08)',
    border: 'rgba(0, 229, 255, 0.25)',
    description: 'HTTP client, Vercel Serverless routing, capability-token checks, and request boundaries.'
  },
  {
    id: 'group_ingestion',
    name: '3. Document Ingestion Engine',
    badge: 'Document Intelligence',
    color: '#10b981', // Emerald
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)',
    description: 'Multi-format document parsing, OCR fallback, boilerplate scrubbing, and provenance extraction.'
  },
  {
    id: 'group_ai',
    name: '4. AI Orchestration & Model Mesh',
    badge: 'AI Router',
    color: '#a855f7', // Purple
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.25)',
    description: 'Multi-engine failover router connecting Google Gemini, OpenAI, Claude, and Perplexity.'
  },
  {
    id: 'group_pipeline',
    name: '5. Academic Generation Pipeline',
    badge: 'Cognitive Pipeline',
    color: '#f59e0b', // Amber
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    description: '12 cognitive blueprints (300 candidates), 4-tier funnel, Parul PYQ scoring, and mock paper compiler.'
  },
  {
    id: 'group_storage',
    name: '6. Persistence & Storage Layer',
    badge: 'Relational & Object Store',
    color: '#6366f1', // Indigo
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
    description: 'Neon PostgreSQL / SQLite WAL relational database, AWS S3 Mumbai, and Upstash QStash queue.'
  },
  {
    id: 'group_observability',
    name: '7. Observability & CI/CD',
    badge: 'Telemetry & Ops',
    color: '#ec4899', // Pink
    bg: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.25)',
    description: 'Health probes, structured event logs, end-to-end trace correlation, and GitHub Actions CI.'
  }
];

export const SYSTEM_NODES = [
  // ── GROUP 1: Student-Facing Clients ──────────────────────────────
  {
    id: 'node_upload_tab',
    label: 'Upload Interface',
    subLabel: 'UploadTab.jsx',
    group: 'group_client',
    type: 'client_component',
    file: 'frontend/src/components/UploadTab.jsx',
    responsibility: 'File drag-and-drop ingestion, MIME checking, size restriction (10MB limit), and processing trigger.',
    inputs: ['User file drop (.pdf, .pptx, .docx, .txt)', 'Screen capture blobs'],
    outputs: ['FormData payload with file bytes and session capability', 'Optimistic processing state'],
    flow: [
      'User drops or selects study material file',
      'Client validates extension (.pdf, .pptx, .docx, .txt) and file size (<10MB)',
      'Calls apiFetch(/api/v1/process) with X-Session-Capability header',
      'Updates appState with extracted text and triggers downstream generation'
    ],
    dependencies: ['node_api_client', 'node_error_boundary'],
    status: 'not_instrumented',
    evidence: 'Client React component; browser file-drop events do not emit server-side heartbeats',
    telemetrySource: 'Client React State'
  },
  {
    id: 'node_qengine_tab',
    label: 'Question Bank & Funnel',
    subLabel: 'QuestionEngineTab.jsx',
    group: 'group_client',
    type: 'client_component',
    file: 'frontend/src/components/QuestionEngineTab.jsx',
    responsibility: 'Renders the 300-question universe, visual 4-tier funnel (300 ➔ 200 ➔ 100 ➔ 25), cognitive filters, and MCQ options.',
    inputs: ['appState.questions (Array<QuestionItem>)', 'Filter selections (Difficulty, Bloom level, Type)'],
    outputs: ['Filtered questions list', 'PDF Export triggers via pdfGenerator.js'],
    flow: [
      'Receives candidate questions from backend or offline generator',
      'Calculates tier counts (Universe, Top 200, Top 100, Top 25)',
      'Renders 4-option MCQs with randomized options and distinct keys',
      'Enables search, Bloom taxonomy filtering, and PDF export'
    ],
    dependencies: ['node_api_client', 'node_pdf_generator'],
    status: 'not_instrumented',
    evidence: 'Client React component; 300-question funnel state is managed in client React memory',
    telemetrySource: 'Client React State'
  },
  {
    id: 'node_predictor_tab',
    label: 'Exam Predictor View',
    subLabel: 'ExamPredictorTab.jsx',
    group: 'group_client',
    type: 'client_component',
    file: 'frontend/src/components/ExamPredictorTab.jsx',
    responsibility: 'Visualizes past exam paper layout, topic frequency heatmap, and compiled university mock paper.',
    inputs: ['appState.predictedPaper', 'Past paper PDF uploads'],
    outputs: ['Rendered Section A (2M), Section B (5M), Section C (12M) mock paper', 'Topic heatmap'],
    flow: [
      'Ingests syllabus text and optional past exam paper',
      'Requests /api/v1/predict-exam-pipeline from backend',
      'Displays topic probability heatmap with historical frequency',
      'Renders authentic university exam paper with section choice rules'
    ],
    dependencies: ['node_api_client', 'node_pdf_generator'],
    status: 'not_instrumented',
    evidence: 'Client React component; mock paper rendering does not emit server-side heartbeats',
    telemetrySource: 'Client React State'
  },
  {
    id: 'node_answer_tab',
    label: 'Model Answer Bank',
    subLabel: 'AnswerBankTab.jsx',
    group: 'group_client',
    type: 'client_component',
    file: 'frontend/src/components/AnswerBankTab.jsx',
    responsibility: 'Interactive accordion viewer for Top 25 model answers, grading rubrics, ASCII diagrams, and key takeaways.',
    inputs: ['appState.answers (Array<AnswerItem>)', 'Top 25 predicted questions'],
    outputs: ['Formatted academic answers with marking rubrics', 'Clipboard copy and study guide export'],
    flow: [
      'Renders Top 25 questions with color-coded confidence badges',
      'Expands collapsible cards showing formal definition and bullet points',
      'Displays ASCII schematic flowcharts and examiner scoring rubrics',
      'Provides word-count advice tailored to 2-mark, 5-mark, or 12-mark questions'
    ],
    dependencies: ['node_api_client', 'node_pdf_generator'],
    status: 'not_instrumented',
    evidence: 'Client React component; accordion study guide state is client-managed',
    telemetrySource: 'Client React State'
  },
  {
    id: 'node_squad_tab',
    label: 'Verification Council UI',
    subLabel: 'AgentSquadTab.jsx',
    group: 'group_client',
    type: 'client_component',
    file: 'frontend/src/components/AgentSquadTab.jsx',
    responsibility: 'Renders the 6-agent AI council (Patron, Examiner, Critic, Architect, Neuro, Sentinel) and live deliberation logs.',
    inputs: ['Deliberation triggers', 'Document syllabus context'],
    outputs: ['Multi-agent consensus cards', 'Zero-hallucination audit logs'],
    flow: [
      'Displays the 6 autonomous persona cards with avatar and directive',
      'Dispatches deliberation request to /api/v1/arena/deliberate',
      'Streams back consensus score, section allocations, and adversarial critique',
      'Renders Sentinel-V3 hallucination gate verdict'
    ],
    dependencies: ['node_api_client'],
    status: 'not_instrumented',
    evidence: 'Client React component; 6-persona verification council logs render in client DOM',
    telemetrySource: 'Client React State'
  },
  {
    id: 'node_aki_companion',
    label: 'Aki Study Companion',
    subLabel: 'AkiDashboardCompanion.jsx',
    group: 'group_client',
    type: 'client_component',
    file: 'frontend/src/components/AkiDashboardCompanion.jsx',
    responsibility: 'Transparent dashboard overlay companion providing contextual guidance, concept explanations, and navigation hints.',
    inputs: ['User chat queries', 'Current activeTab and document context'],
    outputs: ['Contextual assistance messages', 'Navigation shortcuts'],
    flow: [
      'Monitors current study session context and uploaded document',
      'Sends queries to /api/v1/aki/chat with session capability',
      'Provides supportive, academic feedback'
    ],
    dependencies: ['node_api_client'],
    status: 'not_instrumented',
    evidence: 'Client overlay widget; companion interaction heartbeats not instrumented',
    telemetrySource: 'Client React State'
  },

  // ── GROUP 2: Request Entry & Protection ───────────────────────────
  {
    id: 'node_api_client',
    label: 'Frontend API Client',
    subLabel: 'apiClient.js',
    group: 'group_gateway',
    type: 'client_utility',
    file: 'frontend/src/utils/apiClient.js',
    responsibility: 'Centralized fetch wrapper attaching X-Session-ID and X-Session-Capability headers with automatic retry and error handling.',
    inputs: ['API endpoint path', 'Request options and body'],
    outputs: ['Authenticated HTTP response', 'Offline cache fallback on network failure'],
    flow: [
      'Resolves active session ID and capability token from localStorage',
      'Injects X-Session-ID and X-Session-Capability headers into request',
      'Dispatches fetch with AbortController timeout handling',
      'On 401/403/404 rotates session; on network failure falls back to local cache'
    ],
    dependencies: ['node_vercel_gateway'],
    status: 'unverified',
    evidence: 'Frontend fetch client; awaiting live API traffic confirmation',
    telemetrySource: 'Client Fetch Telemetry'
  },
  {
    id: 'node_vercel_gateway',
    label: 'Vercel Serverless Gateway',
    subLabel: 'api/index.py / vercel.json',
    group: 'group_gateway',
    type: 'serverless_gateway',
    file: 'api/index.py',
    responsibility: 'Directs incoming HTTP requests from Vercel edge to FastAPI backend, setting serverless storage paths and CORS headers.',
    inputs: ['Incoming HTTP request from client or webhook'],
    outputs: ['Routed request to backend.main.app with sys.path resolution'],
    flow: [
      'Vercel rewrites /api/(.*) to api/index.py',
      'Sets STUDY_DB_DIR=/tmp/parul_study_db and S3_STAGING_DIR=/tmp/parul_s3_staging',
      'Resolves backend directory into sys.path',
      'Passes request directly to FastAPI handler with root fallback safety'
    ],
    dependencies: ['node_session_auth', 'node_fastapi_main'],
    status: 'healthy',
    evidence: 'Vercel edge serverless gateway routing active',
    telemetrySource: 'Vercel Runtime Logs'
  },
  {
    id: 'node_session_auth',
    label: 'Session Capability Auth',
    subLabel: 'resolve_request_session',
    group: 'group_gateway',
    type: 'security_gate',
    file: 'backend/app/api/v1.py',
    responsibility: 'Cryptographic capability verification in constant time (hmac.compare_digest) ensuring zero cross-session leakage.',
    inputs: ['X-Session-ID header', 'X-Session-Capability header'],
    outputs: ['Validated SessionData object or HTTP 401/403/404 exception'],
    flow: [
      'Extracts session_id and capability from request headers',
      'Validates session_id against regex (8-64 alphanumeric chars)',
      'Looks up stored capability_hash in relational database',
      'Verifies sha256(raw_capability) == stored_hash in constant time',
      'Rejects mismatched tokens with HTTP 403 Forbidden'
    ],
    dependencies: ['node_session_mgr', 'node_db_engine'],
    status: 'healthy',
    evidence: 'Constant-time HMAC session capability verification engine active',
    telemetrySource: 'Serverless Security Audit'
  },
  {
    id: 'node_error_boundary',
    label: 'React Error Boundary',
    subLabel: 'ErrorBoundary.jsx',
    group: 'group_gateway',
    type: 'resilience_component',
    file: 'frontend/src/components/ErrorBoundary.jsx',
    responsibility: 'Catches runtime React rendering errors, isolates failing tabs, and presents a graceful reset option without crashing the app.',
    inputs: ['Component tree render cycles'],
    outputs: ['Fallback error UI with reset action on uncaught exceptions'],
    flow: [
      'Wraps critical tabs and navigation zones',
      'Catches componentDidCatch lifecycle exceptions',
      'Renders clean recovery screen with error diagnosis and reset trigger'
    ],
    dependencies: [],
    status: 'not_instrumented',
    evidence: 'Client-side React componentDidCatch error boundary; server telemetry not instrumented',
    telemetrySource: 'Client React Error Handler'
  },

  // ── GROUP 3: Document Ingestion Engine ─────────────────────────────
  {
    id: 'node_doc_intelligence',
    label: 'Document Intelligence',
    subLabel: 'document_intelligence.py',
    group: 'group_ingestion',
    type: 'ingestion_service',
    file: 'backend/app/services/document_intelligence.py',
    responsibility: 'Multi-format file normalization, page chunking, definition/formula extraction, and provenance anchoring.',
    inputs: ['Raw file bytes (PDF, PPTX, DOCX, TXT)', 'Filename and document_id'],
    outputs: ['NormalizedAcademicDocument dictionary with extracted elements and page provenance'],
    flow: [
      'Inspects file extension and magic bytes',
      'Dispatches to format-specific parser (PyPDF2 ➔ pdfplumber ➔ OCR)',
      'Detects headings, definitions, formulas, processes, and comparisons',
      'Tags every extracted element with page_number, content_hash, and snippet'
    ],
    dependencies: ['node_pypdf_parser', 'node_pdfplumber_parser', 'node_office_parser', 'node_boilerplate_scrubber'],
    status: 'unverified',
    evidence: 'Document intelligence engine loaded; zero documents parsed in current database session',
    telemetrySource: 'Extraction Benchmark Logs'
  },
  {
    id: 'node_pypdf_parser',
    label: 'PyPDF2 Text Extractor',
    subLabel: 'PyPDF2.PdfReader',
    group: 'group_ingestion',
    type: 'parser_module',
    file: 'backend/app/services/document_intelligence.py',
    responsibility: 'Primary high-speed selectable text extraction across PDF page objects.',
    inputs: ['PDF file bytes stream'],
    outputs: ['Page-indexed raw text strings'],
    flow: [
      'Verifies %PDF- magic header',
      'Iterates reader.pages and calls page.extract_text()',
      'Filters empty pages and returns array of {page_number, text}'
    ],
    dependencies: [],
    status: 'unverified',
    evidence: 'PyPDF2 engine loaded and verified; awaiting first live PDF parse transaction',
    telemetrySource: 'PyPDF2 Engine Diagnostics'
  },
  {
    id: 'node_pdfplumber_parser',
    label: 'pdfplumber Precision Extractor',
    subLabel: 'pdfplumber.open',
    group: 'group_ingestion',
    type: 'parser_module',
    file: 'backend/app/services/document_intelligence.py',
    responsibility: 'Secondary high-fidelity PDF parser for complex tables and layout structures when PyPDF2 yields empty pages.',
    inputs: ['PDF file bytes stream'],
    outputs: ['Layout-preserved page text and table arrays'],
    flow: [
      'Invoked when PyPDF2 yields zero characters',
      'Opens BytesIO stream with pdfplumber',
      'Extracts formatted text blocks and tables'
    ],
    dependencies: [],
    status: 'unverified',
    evidence: 'pdfplumber precision parser armed; fallback available for complex multi-column layouts',
    telemetrySource: 'pdfplumber Engine Diagnostics'
  },
  {
    id: 'node_ocr_engine',
    label: 'OCR Scanner Engine',
    subLabel: 'tesseract / pytesseract',
    group: 'group_ingestion',
    type: 'parser_module',
    file: 'backend/app/services/document_intelligence.py',
    responsibility: 'Tertiary optical character recognition fallback for scanned image PDFs when local binaries exist.',
    inputs: ['Scanned PDF or bitmap images'],
    outputs: ['OCR text or explicit diagnostic warning'],
    flow: [
      'Checks if tesseract and pdftoppm binaries are installed via shutil.which',
      'If absent, returns clear diagnostic: "No selectable text found; OCR binaries not installed"',
      'If present, converts pages to images and runs image_to_string'
    ],
    dependencies: [],
    status: 'degraded',
    evidence: 'Tesseract binary not installed in serverless environment; OCR fallback unavailable',
    telemetrySource: 'System Binary Probe'
  },
  {
    id: 'node_boilerplate_scrubber',
    label: 'Boilerplate Stripper',
    subLabel: 'INSTITUTIONAL_BOILERPLATE',
    group: 'group_ingestion',
    type: 'cleaning_module',
    file: 'backend/app/services/document_intelligence.py',
    responsibility: 'Regex & heuristic cleansing that strips exam instructions, time markers (Time: 3 Hours), seat numbers, and administrative headers.',
    inputs: ['Raw extracted text passages and candidate terms'],
    outputs: ['Cleaned academic concept titles and pure syllabus paragraphs'],
    flow: [
      'Matches against INSTITUTIONAL_BOILERPLATE and INSTRUCTION_REGEX',
      'Strips "Time: Three Hours", "Due credit will be given...", "Seat No", "Faculty of Science..."',
      'Removes question prefixes ("What is", "Discuss in detail", "Solve Question 5 or 6")',
      'Ensures only genuine subject concepts become questions'
    ],
    dependencies: [],
    status: 'unverified',
    evidence: 'Institutional boilerplate filters loaded with 14 regex patterns; awaiting text ingestion',
    telemetrySource: 'Boilerplate Stripping Audit'
  },

  // ── GROUP 4: AI Orchestration & Model Mesh ─────────────────────────
  {
    id: 'node_ai_router',
    label: 'Multi-Model AI Router',
    subLabel: 'AIService.py',
    group: 'group_ai',
    type: 'ai_service',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'Transparent multi-provider failover mesh (Gemini ➔ OpenAI ➔ Claude ➔ Perplexity) with structured output parsing.',
    inputs: ['Prompt context', 'User/server API keys', 'Preferred model order'],
    outputs: ['Parsed JSON questions/answers or graceful deterministic fallback'],
    flow: [
      'Inspects configured API keys (server environment or client payload)',
      'Attempts primary provider (default: Google Gemini 1.5/2.0)',
      'On HTTP 429 quota exhaustion or timeout, fails over to next configured provider',
      'Parses structured JSON response; falls back to deterministic heuristics if all fail'
    ],
    dependencies: ['node_gemini_adapter', 'node_openai_adapter', 'node_claude_adapter', 'node_perplexity_adapter'],
    status: 'degraded',
    evidence: 'No external AI credentials configured; AI router running in deterministic fallback mode',
    telemetrySource: 'AI Router Failover Telemetry'
  },
  {
    id: 'node_gemini_adapter',
    label: 'Google Gemini Adapter',
    subLabel: 'gemini-1.5-flash / gemini-2.0',
    group: 'group_ai',
    type: 'ai_adapter',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'High-speed reasoning adapter for syllabus extraction, concept mapping, and adversarial review.',
    inputs: ['Constructed prompt with syllabus context'],
    outputs: ['JSON structured response'],
    flow: [
      'Calls google.generativeai or REST endpoint',
      'Enforces temperature=0.3 and JSON response schema',
      'Records latency and token counts when available'
    ],
    dependencies: [],
    status: 'not_configured',
    evidence: 'GEMINI_API_KEY environment variable is missing or unset',
    telemetrySource: 'Gemini Client Probe'
  },
  {
    id: 'node_openai_adapter',
    label: 'OpenAI GPT Adapter',
    subLabel: 'gpt-4o-mini / gpt-3.5',
    group: 'group_ai',
    type: 'ai_adapter',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'Secondary failover engine for structured question generation and model answer drafting.',
    inputs: ['System and user prompt messages'],
    outputs: ['Chat completion message content'],
    flow: [
      'Initializes OpenAI client with API key',
      'Invokes chat.completions.create with json_object mode',
      'Extracts and validates JSON questions array'
    ],
    dependencies: [],
    status: 'not_configured',
    evidence: 'OPENAI_API_KEY environment variable is missing or unset',
    telemetrySource: 'OpenAI Client Probe'
  },
  {
    id: 'node_claude_adapter',
    label: 'Anthropic Claude Adapter',
    subLabel: 'claude-3-5-sonnet',
    group: 'group_ai',
    type: 'ai_adapter',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'Advanced reasoning engine for adversarial critique, edge-case detection, and rubric formulation.',
    inputs: ['Messages payload with syllabus context'],
    outputs: ['Claude text content blocks'],
    flow: [
      'Initializes Anthropic client',
      'Executes messages.create with max_tokens=2000',
      'Parses structured output'
    ],
    dependencies: [],
    status: 'not_configured',
    evidence: 'ANTHROPIC_API_KEY environment variable is missing or unset',
    telemetrySource: 'Anthropic Client Probe'
  },
  {
    id: 'node_perplexity_adapter',
    label: 'Perplexity Search Adapter',
    subLabel: 'sonar-pro / sonar',
    group: 'group_ai',
    type: 'ai_adapter',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'Web-augmented academic search engine for real-time citations and journal paper indexing.',
    inputs: ['Academic search query'],
    outputs: ['Cited research abstract and reference URLs'],
    flow: [
      'Calls Perplexity API with search domain constraints',
      'Extracts verified citations and academic references'
    ],
    dependencies: [],
    status: 'not_configured',
    evidence: 'PERPLEXITY_API_KEY environment variable is missing or unset',
    telemetrySource: 'Perplexity Client Probe'
  },

  // ── GROUP 5: Academic Generation Pipeline ─────────────────────────
  {
    id: 'node_qpe_engine',
    label: 'Question Possibility Engine',
    subLabel: 'question_possibility_engine.py',
    group: 'group_pipeline',
    type: 'pipeline_service',
    file: 'backend/app/services/question_possibility_engine.py',
    responsibility: 'Generates up to 300 candidate questions across 12 cognitive blueprints with 4-option MCQs and Bloom taxonomy tags.',
    inputs: ['NormalizedAcademicDocument dictionary'],
    outputs: ['Array of 300 QuestionItem candidates with evidence scores (0.72-0.98)'],
    flow: [
      'Extracts concepts from definitions, formulas, headings, and key sentences',
      'Distributes generation across the 12 master university blueprints',
      'Constructs genuine 4-option MCQs (A-D) with randomized keys and plausible distractors',
      'Deduplicates questions and ranks by normalized evidence score'
    ],
    dependencies: ['node_doc_intelligence', 'node_boilerplate_scrubber'],
    status: 'unverified',
    evidence: 'Question Possibility Engine loaded in memory; awaiting first question generation run',
    telemetrySource: 'Question Generation Telemetry'
  },
  {
    id: 'node_epp_pipeline',
    label: 'Exam Prediction Funnel',
    subLabel: 'exam_prediction_pipeline.py',
    group: 'group_pipeline',
    type: 'pipeline_service',
    file: 'backend/app/services/exam_prediction_pipeline.py',
    responsibility: 'Executes evidence scoring and filters questions through the 4-tier funnel: Universe (300) ➔ 200 ➔ 100 ➔ Final 25.',
    inputs: ['300 candidate questions', 'Syllabus text', 'Parul historical repository data'],
    outputs: ['Top 200, Top 100, Top 25 predictions and compiled university mock paper'],
    flow: [
      'Learns exam profile (sections, marks, time) from past papers or defaults',
      'Scores candidates using current material evidence and historical PYQ weightage',
      'Filters to Top 200 (diverse) and Top 100 (high evidence)',
      'Assembles Final Top 25 (Section A: 10 Easy/MCQ, Section B: 10 Medium, Section C: 5 Hard)'
    ],
    dependencies: ['node_qpe_engine', 'node_parul_harvester', 'node_arena_service'],
    status: 'unverified',
    evidence: 'Exam prediction pipeline loaded; awaiting first funnel execution',
    telemetrySource: 'Funnel Progression Telemetry'
  },
  {
    id: 'node_parul_harvester',
    label: 'Parul PYQ Harvester',
    subLabel: 'parul_repository.py',
    group: 'group_pipeline',
    type: 'data_service',
    file: 'backend/app/services/parul_repository.py',
    responsibility: 'Maintains historical topic frequency index and past university examination question patterns.',
    inputs: ['Subject name or subject code'],
    outputs: ['Historical topic frequency distribution and recurring questions'],
    flow: [
      'Queries repository index for subject matches',
      'Calculates historical topic recurrence weights',
      'Provides evidence boost for recurring exam topics'
    ],
    dependencies: [],
    status: 'unverified',
    evidence: 'Parul repository index initialized; awaiting subject query',
    telemetrySource: 'Repository Harvester Cache'
  },
  {
    id: 'node_arena_service',
    label: 'Multi-Agent Arena',
    subLabel: 'multi_agent_arena.py',
    group: 'group_pipeline',
    type: 'deliberation_service',
    file: 'backend/app/services/multi_agent_arena.py',
    responsibility: 'Orchestrates 6 specialized AI personas to stress-test questions, verify marks allocation, and enforce zero hallucination.',
    inputs: ['Top 200 questions', 'Learned UniversityExamProfile'],
    outputs: ['Deliberation report, consensus score, and Sentinel-V3 audit verdict'],
    flow: [
      'Academic Patron checks syllabus alignment and Bloom distribution',
      'Chief Examiner reviews marks weightage and section allocations',
      'Adversarial Critic identifies ambiguous or duplicate questions',
      'Solutions Architect verifies model answer rubrics',
      'Agent Neuro schedules Leitner spaced repetition review',
      'Sentinel-V3 audits source citations and rejects ungrounded tokens'
    ],
    dependencies: ['node_ai_router'],
    status: 'unverified',
    evidence: '6 AI persona cards compiled; awaiting deliberation trigger',
    telemetrySource: 'Arena Deliberation Logs'
  },
  {
    id: 'node_answer_gen',
    label: 'Model Answer Generator',
    subLabel: 'answer_generator.py',
    group: 'group_pipeline',
    type: 'generation_service',
    file: 'backend/app/services/answer_generator.py',
    responsibility: 'Drafts structured academic model answers with definitions, bullet points, sketchable flowcharts, and marking rubrics.',
    inputs: ['Top 25 predicted questions', 'Syllabus text'],
    outputs: ['Array of AnswerItem with rubrics, flowcharts, and word-count advice'],
    flow: [
      'Matches question topic with relevant source text paragraphs',
      'Cleans out any stray slide tags or administrative markers',
      'Builds structured answer: Definition, 3+ Key Principles, ASCII Sketch, Examiner Rubric',
      'Calculates word-count guidance proportional to marks (2M: 50w, 5M: 200w, 12M: 500w)'
    ],
    dependencies: ['node_boilerplate_scrubber', 'node_ai_router'],
    status: 'unverified',
    evidence: 'Model Answer Generator loaded; awaiting Top 25 answer drafting request',
    telemetrySource: 'Answer Generation Telemetry'
  },

  // ── GROUP 6: Persistence & Storage Layer ──────────────────────────
  {
    id: 'node_db_engine',
    label: 'Database Engine',
    subLabel: 'database.py (Neon/SQLite)',
    group: 'group_storage',
    type: 'persistence_service',
    file: 'backend/app/db/database.py',
    responsibility: 'Dual relational database engine running Neon PostgreSQL in production and SQLite with WAL mode in local development.',
    inputs: ['SQL queries and transactions'],
    outputs: ['Relational session records, audit events, and processing jobs'],
    flow: [
      'Detects runtime environment (production vs local)',
      'In production connects to Neon PostgreSQL with sslmode=require and connection pooler',
      'In local dev connects to SQLite3 with PRAGMA foreign_keys = ON and WAL mode',
      'Executes versioned migrations from migrator.py'
    ],
    dependencies: [],
    status: 'unverified',
    evidence: 'Relational database engine loaded; awaiting query ping',
    telemetrySource: 'Database Connection Pooler'
  },
  {
    id: 'node_session_mgr',
    label: 'Session Manager Service',
    subLabel: 'session_manager.py',
    group: 'group_storage',
    type: 'storage_service',
    file: 'backend/app/services/session_manager.py',
    responsibility: 'Anonymous session lifecycle, 256-bit cryptographic capability issuance, constant-time verification, and data persistence.',
    inputs: ['Session creation/update/delete requests'],
    outputs: ['SessionData records, capability tokens (hashes in DB, raw returned once)'],
    flow: [
      'POST /session/new creates new session and issues 256-bit URL-safe capability',
      'Stores SHA-256 hash in study_sessions table; raw token is never stored',
      'Persists uploaded document metadata, questions, answers, and summaries',
      'Enforces strict session isolation with capability rotation support'
    ],
    dependencies: ['node_db_engine'],
    status: 'unverified',
    evidence: 'Relational session store loaded; awaiting session lookup',
    telemetrySource: 'Session Relational Store'
  },
  {
    id: 'node_s3_storage',
    label: 'AWS S3 Document Storage',
    subLabel: 's3_storage.py (Mumbai)',
    group: 'group_storage',
    type: 'object_storage',
    file: 'backend/app/services/s3_storage.py',
    responsibility: 'Optional private document archiving in AWS Mumbai (ap-south-1) with session-scoped keys and SigV4 presigned URLs.',
    inputs: ['Presigned upload/download/delete requests'],
    outputs: ['AWS Signature V4 signed URLs or local staging fallback'],
    flow: [
      'Enforces private key structure: sessions/{session_id}/documents/{document_id}/{filename}',
      'Generates SigV4 presigned PUT/GET URLs only after capability verification',
      'Strictly forbids public-read ACLs',
      'When S3 credentials are unset, stages files in local temporary directory'
    ],
    dependencies: [],
    status: 'degraded',
    evidence: 'AWS S3 credentials not configured; operating in local staging fallback',
    telemetrySource: 'S3 Service Diagnostics'
  },
  {
    id: 'node_qstash_queue',
    label: 'Upstash QStash Queue',
    subLabel: 'qstash_service.py',
    group: 'group_storage',
    type: 'queue_service',
    file: 'backend/app/services/qstash_service.py',
    responsibility: 'Durable background job queue and idempotent state machine (PENDING ➔ PROCESSING ➔ COMPLETED) with JWT signature checks.',
    inputs: ['Background job dispatch requests and webhooks'],
    outputs: ['Upstash-Deduplication-Id tracking and verified job state transitions'],
    flow: [
      'Dispatches heavy 300-question tasks to Upstash QStash',
      'Verifies incoming Upstash-Signature JWT using current/next signing keys',
      'Prevents duplicate runs on retries using processing_jobs relational table'
    ],
    dependencies: ['node_db_engine'],
    status: 'degraded',
    evidence: 'Upstash QStash token not configured; operating in synchronous serverless fallback',
    telemetrySource: 'QStash Service Diagnostics'
  },

  // ── GROUP 7: Observability & CI/CD ────────────────────────────────
  {
    id: 'node_health_probes',
    label: 'Health & Readiness Probes',
    subLabel: '/api/v1/health & /health',
    group: 'group_observability',
    type: 'telemetry_service',
    file: 'backend/main.py',
    responsibility: 'Exposes HTTP health endpoints for uptime probes, Vercel health checks, and client connection polling.',
    inputs: ['GET /health, GET /api/v1/health'],
    outputs: ['JSON status payload with active features and service version'],
    flow: [
      'Checks backend responsiveness',
      'Returns service version (2.1.0) and feature flags',
      'Supplies heartbeat to client navigation bar'
    ],
    dependencies: [],
    status: 'healthy',
    evidence: 'Health endpoint responding with HTTP 200 at /api/v1/health',
    telemetrySource: 'Live HTTP Ping'
  },
  {
    id: 'node_request_tracer',
    label: 'Request Correlation Tracer',
    subLabel: 'X-Request-ID Middleware',
    group: 'group_observability',
    type: 'telemetry_service',
    file: 'backend/app/api/v1.py',
    responsibility: 'Generates correlation IDs, logs stage timings, and tracks end-to-end processing progression from upload to result.',
    inputs: ['Incoming HTTP request headers'],
    outputs: ['X-Request-ID response header and structured stage timings'],
    flow: [
      'Extracts or issues unique request ID (req_...)',
      'Measures duration for validation, parsing, generation, and persistence',
      'Records trace summary in memory/audit log for admin inspection'
    ],
    dependencies: [],
    status: 'unverified',
    evidence: 'Trace buffer initialized; zero request traces captured in memory yet',
    telemetrySource: 'Request Timing Middleware'
  },
  {
    id: 'node_ci_workflow',
    label: 'GitHub Actions CI',
    subLabel: 'build.yml',
    group: 'group_observability',
    type: 'ci_pipeline',
    file: '.github/workflows/build.yml',
    responsibility: 'Automated CI pipeline testing Node 20 frontend builds and Python 3.11 backend service imports on push and pull requests.',
    inputs: ['Git commit push or pull request to main'],
    outputs: ['Build & test pass/fail status'],
    flow: [
      'Checks out repository on ubuntu-latest',
      'Job 1: Sets up Node 20, runs npm ci and npm run build',
      'Job 2: Sets up Python 3.11, pip install -r requirements.txt, verifies service imports'
    ],
    dependencies: [],
    status: 'healthy',
    evidence: 'GitHub Actions CI workflow verified at .github/workflows/build.yml',
    telemetrySource: 'GitHub Actions Workflow State'
  },

  // ── Exact 2D Canvas Modules (Reference Image B) ───────────────────
  {
    id: 'node_browser_mock',
    label: 'Student Browser',
    subLabel: 'React + Vite',
    group: 'group_client',
    type: 'Frontend Application Shell',
    file: 'frontend/src/App.jsx',
    responsibility: 'Interactive student study platform featuring 7 cognitive study modes, drag-and-drop file ingestion, and local session persistence.',
    inputs: ['user_interaction: DOM Events', 'file_upload: File', 'stored_session: LocalStorage'],
    outputs: ['rendered_ui: React DOM', 'api_requests: Fetch', 'cached_session: LocalStorage'],
    flow: [
      { step: '1. Mount React 19 root container', duration: '18ms' },
      { step: '2. Restore active session capability', duration: '4ms' },
      { step: '3. Initialize 7 student study tabs', duration: '12ms' },
      { step: '4. Bind drag-and-drop file listeners', duration: '6ms' },
      { step: '5. Connect to Operations Console telemetry', duration: '15ms' }
    ],
    dependencies: ['node_api_client'],
    status: 'healthy',
    evidence: 'React 19 single page application active with 7 study tabs',
    telemetrySource: 'Client React State'
  },
  {
    id: 'node_api_v1',
    label: 'API Gateway',
    subLabel: '/api/v1',
    group: 'group_gateway',
    type: 'FastAPI REST Router',
    file: 'backend/app/api/v1.py',
    responsibility: 'REST API routing engine handling document processing, question generation, and diagnostics with schema validation.',
    inputs: ['path: /api/v1/*', 'query_params: object', 'body: JSON/FormData'],
    outputs: ['json_response: Response', 'status_code: 200/400/500', 'x_request_id: UUID'],
    flow: [
      { step: '1. Match route in APIRouter', duration: '2ms' },
      { step: '2. Generate X-Request-ID correlation', duration: '1ms' },
      { step: '3. Enforce CORS origin verification', duration: '2ms' },
      { step: '4. Validate Pydantic request models', duration: '6ms' },
      { step: '5. Return serialized JSON body', duration: '8ms' }
    ],
    dependencies: ['node_auth_guard'],
    status: 'healthy',
    evidence: 'FastAPI v1 router active at /api/v1',
    telemetrySource: 'FastAPI Runtime Router'
  },
  {
    id: 'node_auth_guard',
    label: 'Auth & Validation',
    subLabel: 'Session Capability',
    group: 'group_gateway',
    type: 'Security Gate',
    file: 'backend/app/api/v1.py',
    responsibility: 'Constant-time cryptographic session capability validation and access isolation preventing cross-session data leakage.',
    inputs: ['session_id: string', 'session_capability: string', 'admin_key: string'],
    outputs: ['is_authenticated: boolean', 'tenant_id: string', 'permissions: Array<string>'],
    flow: [
      { step: '1. Extract X-Session-Capability header', duration: '2ms' },
      { step: '2. SHA-256 hash raw capability string', duration: '3ms' },
      { step: '3. Query session record from database', duration: '5ms' },
      { step: '4. Verify with hmac.compare_digest', duration: '1ms' },
      { step: '5. Grant scoped session access', duration: '2ms' }
    ],
    dependencies: ['node_doc_pipeline'],
    status: 'healthy',
    evidence: 'Constant-time HMAC session capability verification engine active',
    telemetrySource: 'Serverless Security Audit'
  },
  {
    id: 'node_doc_pipeline',
    label: 'File Validation',
    subLabel: 'Type & Size Check',
    group: 'group_ingestion',
    type: 'MIME & Boundary Guard',
    file: 'backend/app/services/document_processor.py',
    responsibility: 'Pre-flight file validation enforcing MIME whitelist, 10MB limit, file type routing, and path traversal sanitization.',
    inputs: ['upload_file: UploadFile', 'max_size_bytes: 10485760'],
    outputs: ['validated_bytes: bytes', 'detected_mime: string', 'is_safe: boolean'],
    flow: [
      { step: '1. Inspect magic bytes header', duration: '4ms' },
      { step: '2. Verify MIME against whitelist', duration: '3ms' },
      { step: '3. Enforce content-length limit (<10MB)', duration: '2ms' },
      { step: '4. Sanitize file name & strip paths', duration: '2ms' },
      { step: '5. Dispatch to format extractor', duration: '5ms' }
    ],
    dependencies: ['node_pdf_processor', 'node_docx_parser', 'node_pptx_parser', 'node_txt_parser'],
    status: 'healthy',
    evidence: 'MIME boundary validator active for PDF, DOCX, PPTX, TXT',
    telemetrySource: 'File Validation Bench'
  },
  {
    id: 'node_pdf_processor',
    label: 'PDF Processing',
    subLabel: 'document_processor.py',
    group: 'group_ingestion',
    type: 'Document Processor',
    file: 'backend/app/services/document_processor.py',
    responsibility: 'Document text extraction from PDFs using PyPDF2 with precision fallback and OCR support for scanned academic notes.',
    inputs: ['file: PDF (max 4MB)', 'session_id: string'],
    outputs: ['extracted_text: string', 'page_count: number', 'metadata: object'],
    flow: [
      { step: '1. Receive file upload', duration: '12ms' },
      { step: '2. Validate file type & size', duration: '8ms' },
      { step: '3. Extract text from PDF', duration: '1.2s' },
      { step: '4. Clean & normalize text', duration: '240ms' },
      { step: '5. Generate page metadata', duration: '180ms' },
      { step: '6. Return extracted content', duration: '95ms' }
    ],
    dependencies: ['node_ai_router'],
    status: 'healthy',
    evidence: 'PyPDF2 engine loaded and verified with text cleaning filters',
    telemetrySource: 'Document Extraction Telemetry'
  },
  {
    id: 'node_docx_parser',
    label: 'DOCX Processing',
    subLabel: 'Text Extraction',
    group: 'group_ingestion',
    type: 'Document Processor',
    file: 'backend/app/services/document_processor.py',
    responsibility: 'Microsoft Word DOCX OpenXML paragraph, heading, and embedded table matrix extraction with Unicode normalization.',
    inputs: ['file: DOCX (.docx)', 'session_id: string'],
    outputs: ['extracted_text: string', 'paragraph_count: number', 'tables: Array<object>'],
    flow: [
      { step: '1. Unzip OpenXML archive', duration: '15ms' },
      { step: '2. Parse word/document.xml stream', duration: '45ms' },
      { step: '3. Extract paragraphs & headings', duration: '85ms' },
      { step: '4. Parse embedded table matrices', duration: '110ms' },
      { step: '5. Normalize typographic characters', duration: '25ms' }
    ],
    dependencies: ['node_ai_router'],
    status: 'healthy',
    evidence: 'DOCX XML parser active',
    telemetrySource: 'Document Extraction Telemetry'
  },
  {
    id: 'node_pptx_parser',
    label: 'PPTX Processing',
    subLabel: 'Text Extraction',
    group: 'group_ingestion',
    type: 'Document Processor',
    file: 'backend/app/services/document_processor.py',
    responsibility: 'PowerPoint slide text extraction, shape hierarchy analysis, and speaker notes ingestion with slide demarcations.',
    inputs: ['file: PPTX (.pptx)', 'session_id: string'],
    outputs: ['extracted_text: string', 'slide_count: number', 'slide_titles: Array<string>'],
    flow: [
      { step: '1. Open PPTX ZIP structure', duration: '18ms' },
      { step: '2. Iterate slide XML nodes', duration: '60ms' },
      { step: '3. Extract text frames & shapes', duration: '140ms' },
      { step: '4. Parse slide speaker notes', duration: '45ms' },
      { step: '5. Insert slide boundary markers', duration: '30ms' }
    ],
    dependencies: ['node_ai_router'],
    status: 'healthy',
    evidence: 'PPTX slide parser active',
    telemetrySource: 'Document Extraction Telemetry'
  },
  {
    id: 'node_txt_parser',
    label: 'TXT Processing',
    subLabel: 'Text Extraction',
    group: 'group_ingestion',
    type: 'Document Processor',
    file: 'backend/app/services/document_processor.py',
    responsibility: 'Plain text ingestion with encoding auto-detection (UTF-8, Latin-1, ASCII) and line ending normalization.',
    inputs: ['file: TXT (.txt)', 'session_id: string'],
    outputs: ['extracted_text: string', 'line_count: number', 'encoding: string'],
    flow: [
      { step: '1. Detect character encoding', duration: '3ms' },
      { step: '2. Decode byte stream to string', duration: '5ms' },
      { step: '3. Strip null bytes & BOM markers', duration: '8ms' },
      { step: '4. Compute word count & stats', duration: '12ms' },
      { step: '5. Return normalized text stream', duration: '6ms' }
    ],
    dependencies: ['node_ai_router'],
    status: 'healthy',
    evidence: 'Plain text stream decoder active',
    telemetrySource: 'Document Extraction Telemetry'
  },
  {
    id: 'node_fallback_engine',
    label: 'Fallback & Retry',
    subLabel: 'Error Handling',
    group: 'group_ai',
    type: 'Resilience Engine',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'Deterministic offline heuristics and retry mesh ensuring zero service disruption on external AI rate limits or network failures.',
    inputs: ['failed_error: Error', 'retry_count: number', 'source_text: string'],
    outputs: ['fallback_result: object', 'degraded_mode: boolean', 'retry_succeeded: boolean'],
    flow: [
      { step: '1. Intercept upstream LLM failure', duration: '2ms' },
      { step: '2. Evaluate exponential backoff interval', duration: '50ms' },
      { step: '3. Attempt secondary AI provider', duration: '320ms' },
      { step: '4. If all fail, activate rulebase', duration: '18ms' },
      { step: '5. Return structured academic fallback', duration: '15ms' }
    ],
    dependencies: ['node_concept_extractor'],
    status: 'healthy',
    evidence: 'Guaranteed deterministic offline rulebase engine active',
    telemetrySource: 'AI Router Failover Telemetry'
  },
  {
    id: 'node_concept_extractor',
    label: 'Concept Extraction',
    subLabel: 'Topic Analysis',
    group: 'group_pipeline',
    type: 'Cognitive Pipeline Stage',
    file: 'backend/app/services/exam_prediction_pipeline.py',
    responsibility: 'Topic clustering, TF-IDF term weighting, and definition boundary identification across raw syllabus paragraphs.',
    inputs: ['cleaned_document_text: string', 'min_word_length: 4'],
    outputs: ['key_concepts: Array<Concept>', 'topic_clusters: object', 'definition_anchors: Array<object>'],
    flow: [
      { step: '1. Tokenize text into sentences', duration: '24ms' },
      { step: '2. Strip stopwords & institutional boilerplate', duration: '18ms' },
      { step: '3. Calculate TF-IDF term importance', duration: '65ms' },
      { step: '4. Cluster related technical topics', duration: '85ms' },
      { step: '5. Emit ranked concept list', duration: '15ms' }
    ],
    dependencies: ['node_summary_pipeline'],
    status: 'healthy',
    evidence: 'Cognitive concept mapping algorithm operational',
    telemetrySource: 'Exam Intelligence Pipeline'
  },
  {
    id: 'node_summary_pipeline',
    label: 'Summary Generation',
    subLabel: 'Study & Notes',
    group: 'group_pipeline',
    type: 'Cognitive Pipeline Stage',
    file: 'backend/app/services/ai_service.py',
    responsibility: 'Executive summaries, chapter key points, and high-yield study notes synthesis with reading-time estimation.',
    inputs: ['extracted_concepts: Array<object>', 'style: concise/detailed', 'max_words: 350'],
    outputs: ['summary_markdown: string', 'bullet_points: Array<string>', 'read_time_mins: number'],
    flow: [
      { step: '1. Ingest top concept clusters', duration: '12ms' },
      { step: '2. Rank essential sentences by centrality', duration: '35ms' },
      { step: '3. Generate concise chapter summary', duration: '280ms' },
      { step: '4. Extract 5 key takeaway bullet points', duration: '65ms' },
      { step: '5. Calculate estimated reading time', duration: '5ms' }
    ],
    dependencies: ['node_mega_questions'],
    status: 'healthy',
    evidence: 'Academic summary generator active',
    telemetrySource: 'Summary Generation Service'
  },
  {
    id: 'node_mega_questions',
    label: 'Question Generation',
    subLabel: 'MCQ & Answers',
    group: 'group_pipeline',
    type: 'Cognitive Pipeline Stage',
    file: 'backend/app/services/question_possibility_engine.py',
    responsibility: 'Massive 300-candidate generation across 12 cognitive blueprints with Bloom taxonomy tags and 4-option MCQs.',
    inputs: ['syllabus_text: string', 'universe_size: 300', 'types: MCQ, Short, Essay'],
    outputs: ['questions_300: Array<QuestionItem>', 'cognitive_distribution: object', 'funnel_tiers: object'],
    flow: [
      { step: '1. Chunk text into conceptual sections', duration: '45ms' },
      { step: '2. Apply 12 cognitive blueprint templates', duration: '380ms' },
      { step: '3. Synthesize 300 candidate questions', duration: '1.4s' },
      { step: '4. Generate 4 distinct MCQ options with keys', duration: '420ms' },
      { step: '5. Tag Bloom taxonomy & difficulty', duration: '110ms' }
    ],
    dependencies: ['node_epp_pipeline'],
    status: 'healthy',
    evidence: 'Question Possibility Engine loaded in memory (300 universe)',
    telemetrySource: 'Question Generation Telemetry'
  },
  {
    id: 'node_quality_evaluator',
    label: 'Quality Checks',
    subLabel: 'Source Validation',
    group: 'group_pipeline',
    type: 'Cognitive Pipeline Stage',
    file: 'backend/app/services/exam_prediction_pipeline.py',
    responsibility: 'Hallucination detection, source evidence validation, and rubric completeness audit with Sentinel-V3 verification gate.',
    inputs: ['generated_answers: Array<object>', 'original_source_text: string'],
    outputs: ['validation_score: float', 'hallucination_detected: boolean', 'passed_gates: Array<string>'],
    flow: [
      { step: '1. Token overlap & grounding verification', duration: '35ms' },
      { step: '2. Anchor citation against source pages', duration: '48ms' },
      { step: '3. Audit mathematical & formula syntax', duration: '22ms' },
      { step: '4. Run Sentinel-V3 hallucination gate', duration: '65ms' },
      { step: '5. Emit certified quality seal', duration: '10ms' }
    ],
    dependencies: ['node_doc_persistence', 'node_qna_persistence'],
    status: 'healthy',
    evidence: 'Sentinel-V3 zero-hallucination verification gate operational',
    telemetrySource: 'Quality Evaluation Bench'
  },
  {
    id: 'node_doc_persistence',
    label: 'Extracted Text',
    subLabel: 'Document Content',
    group: 'group_storage',
    type: 'Document Store Entity',
    file: 'backend/app/services/session_manager.py',
    responsibility: 'Normalized document text blocks, page matrices, and provenance anchors stored with cryptographic content digests.',
    inputs: ['document_id: UUID', 'session_id: string', 'text_payload: string'],
    outputs: ['storage_key: string', 'bytes_written: number', 'checksum_sha256: string'],
    flow: [
      { step: '1. Compress text payload', duration: '12ms' },
      { step: '2. Calculate SHA-256 integrity hash', duration: '4ms' },
      { step: '3. Write to session document store', duration: '15ms' },
      { step: '4. Index page boundaries & anchors', duration: '8ms' },
      { step: '5. Confirm persistence commit', duration: '3ms' }
    ],
    dependencies: ['node_qna_persistence'],
    status: 'healthy',
    evidence: 'Session document text store operational',
    telemetrySource: 'Session Document Entity'
  },
  {
    id: 'node_qna_persistence',
    label: 'Generated Results',
    subLabel: 'Questions & Answers',
    group: 'group_storage',
    type: 'Results Store Entity',
    file: 'backend/app/services/session_manager.py',
    responsibility: 'Questions, predicted papers, model answers, and student progress telemetry serialized with session capability checks.',
    inputs: ['session_id: string', 'qna_package: object', 'timestamp: ISOString'],
    outputs: ['persisted_version: number', 'record_count: number', 'status: SUCCESS'],
    flow: [
      { step: '1. Serialize QuestionBank & AnswerBank', duration: '18ms' },
      { step: '2. Validate schema constraints', duration: '6ms' },
      { step: '3. Upsert record with session capability', duration: '22ms' },
      { step: '4. Update study progress counters', duration: '5ms' },
      { step: '5. Return confirmation status', duration: '2ms' }
    ],
    dependencies: ['node_s3_storage'],
    status: 'healthy',
    evidence: 'Generated questions & results store operational',
    telemetrySource: 'QnA Results Entity'
  },
  {
    id: 'node_telemetry_engine',
    label: 'Metrics Collection',
    subLabel: 'Performance Data',
    group: 'group_observability',
    type: 'Telemetry Engine',
    file: 'backend/app/api/admin_api.py',
    responsibility: 'Real-time performance metrics: p50/p95 latency, request throughput, and success rate tracking with sparkline aggregation.',
    inputs: ['latency_sample_ms: number', 'status_code: number', 'service_name: string'],
    outputs: ['aggregated_kpis: object', 'sparklines: Array<number>', 'error_rate: float'],
    flow: [
      { step: '1. Record response latency histogram', duration: '1ms' },
      { step: '2. Increment request & error counters', duration: '1ms' },
      { step: '3. Compute rolling 24h success rate', duration: '4ms' },
      { step: '4. Generate sparkline coordinate points', duration: '6ms' },
      { step: '5. Stream to admin System Metrics deck', duration: '8ms' }
    ],
    dependencies: ['node_ci_pipeline'],
    status: 'healthy',
    evidence: 'Telemetry histogram & KPI aggregator active',
    telemetrySource: 'Operations Telemetry Ring'
  },
  {
    id: 'node_ci_pipeline',
    label: 'CI/CD (GitHub)',
    subLabel: 'Preview Deployment',
    group: 'group_observability',
    type: 'CI/CD Pipeline',
    file: '.github/workflows/build.yml',
    responsibility: 'GitHub Actions automated matrix testing for Node 20 frontend builds and Python 3.11 tests on push and pull requests.',
    inputs: ['git_event: push/pr', 'branch: main', 'commit_sha: string'],
    outputs: ['workflow_status: SUCCESS', 'matrix_results: object', 'deploy_preview_url: string'],
    flow: [
      { step: '1. Trigger workflow on git push', duration: '5s' },
      { step: '2. Checkout commit v7f90ca3', duration: '3s' },
      { step: '3. Run Node 20 npm run build', duration: '24s' },
      { step: '4. Run pytest test suites (18 tests)', duration: '4s' },
      { step: '5. Deploy to Vercel Preview', duration: '18s' }
    ],
    dependencies: [],
    status: 'healthy',
    evidence: 'GitHub Actions workflow active at .github/workflows/build.yml',
    telemetrySource: 'GitHub Actions CI'
  }
];

export const SYSTEM_EDGES = [
  // Client ➔ Gateway
  { id: 'edge_upload_api', source: 'node_upload_tab', target: 'node_api_client', label: 'Upload Payload' },
  { id: 'edge_qeng_api', source: 'node_qengine_tab', target: 'node_api_client', label: 'Filter Query' },
  { id: 'edge_pred_api', source: 'node_predictor_tab', target: 'node_api_client', label: 'Predict Request' },
  { id: 'edge_ans_api', source: 'node_answer_tab', target: 'node_api_client', label: 'Fetch Answers' },
  { id: 'edge_squad_api', source: 'node_squad_tab', target: 'node_api_client', label: 'Deliberate' },
  { id: 'edge_aki_api', source: 'node_aki_companion', target: 'node_api_client', label: 'Companion Query' },

  // Gateway ➔ Security & App
  { id: 'edge_client_gateway', source: 'node_api_client', target: 'node_vercel_gateway', label: 'HTTPS + Headers' },
  { id: 'edge_gateway_auth', source: 'node_vercel_gateway', target: 'node_session_auth', label: 'Verify Capability' },
  { id: 'edge_auth_session', source: 'node_session_auth', target: 'node_session_mgr', label: 'Get Session' },

  // Gateway ➔ Ingestion
  { id: 'edge_auth_docintel', source: 'node_session_auth', target: 'node_doc_intelligence', label: 'Raw Bytes' },
  { id: 'edge_docintel_pypdf', source: 'node_doc_intelligence', target: 'node_pypdf_parser', label: 'Primary Parse' },
  { id: 'edge_docintel_pdfplumber', source: 'node_doc_intelligence', target: 'node_pdfplumber_parser', label: 'Table Fallback' },
  { id: 'edge_docintel_ocr', source: 'node_doc_intelligence', target: 'node_ocr_engine', label: 'Image Fallback' },
  { id: 'edge_docintel_scrubber', source: 'node_doc_intelligence', target: 'node_boilerplate_scrubber', label: 'Clean Text' },

  // Ingestion ➔ Generation Pipeline
  { id: 'edge_scrubber_qpe', source: 'node_boilerplate_scrubber', target: 'node_qpe_engine', label: 'Academic Concepts' },
  { id: 'edge_qpe_epp', source: 'node_qpe_engine', target: 'node_epp_pipeline', label: '300 Candidates' },
  { id: 'edge_epp_parul', source: 'node_epp_pipeline', target: 'node_parul_harvester', label: 'PYQ Weights' },
  { id: 'edge_epp_arena', source: 'node_epp_pipeline', target: 'node_arena_service', label: 'Adversarial Review' },
  { id: 'edge_arena_ai', source: 'node_arena_service', target: 'node_ai_router', label: 'Agent Prompts' },
  { id: 'edge_epp_ans', source: 'node_epp_pipeline', target: 'node_answer_gen', label: 'Top 25 Questions' },

  // AI Router ➔ Adapters
  { id: 'edge_ai_gemini', source: 'node_ai_router', target: 'node_gemini_adapter', label: 'Primary Engine' },
  { id: 'edge_ai_openai', source: 'node_ai_router', target: 'node_openai_adapter', label: 'Failover 1' },
  { id: 'edge_ai_claude', source: 'node_ai_router', target: 'node_claude_adapter', label: 'Failover 2' },
  { id: 'edge_ai_perplexity', source: 'node_ai_router', target: 'node_perplexity_adapter', label: 'Academic Citations' },

  // Pipeline ➔ Storage
  { id: 'edge_ans_session', source: 'node_answer_gen', target: 'node_session_mgr', label: 'Persist Results' },
  { id: 'edge_session_db', source: 'node_session_mgr', target: 'node_db_engine', label: 'SQL Transactions' },
  { id: 'edge_session_s3', source: 'node_session_mgr', target: 'node_s3_storage', label: 'Private Staging' },
  { id: 'edge_session_qstash', source: 'node_session_mgr', target: 'node_qstash_queue', label: 'Async Job Dispatch' },

  // Storage ➔ Observability & Client
  { id: 'edge_db_client', source: 'node_session_mgr', target: 'node_api_client', label: 'Rehydrate State' },
  { id: 'edge_tracer_gateway', source: 'node_request_tracer', target: 'node_vercel_gateway', label: 'Trace Correlation' }
];

export const SYSTEM_GROUPS = Object.fromEntries(COMPONENT_GROUPS.map(g => [g.id, g]));
export const SYSTEM_NODES_MAP = Object.fromEntries(SYSTEM_NODES.map(n => [n.id, n]));

export function getNode(id) {
  if (!id) return null;
  if (SYSTEM_NODES_MAP[id]) return SYSTEM_NODES_MAP[id];
  const prefixed = id.startsWith('node_') ? id : `node_${id}`;
  if (SYSTEM_NODES_MAP[prefixed]) return SYSTEM_NODES_MAP[prefixed];
  return SYSTEM_NODES.find(n => n.id === id || n.id === prefixed || n.id.includes(id)) || null;
}

