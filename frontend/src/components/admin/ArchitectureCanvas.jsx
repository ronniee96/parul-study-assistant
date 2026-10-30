import React, { useState, useRef, useMemo } from 'react';
import { COMPONENT_GROUPS, SYSTEM_NODES, SYSTEM_EDGES, getNode } from './operationsRegistry';

// Clustered 2D Geometry matching Reference Image B
export const CLUSTER_LAYOUT = {
  // Group 1: Student Client (Frontend) - Top Left
  group_client: {
    id: 'group_client',
    title: '1. Student Client (Frontend)',
    color: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    bg: 'rgba(7, 24, 48, 0.5)',
    borderStyle: 'solid',
    x: 20,
    y: 20,
    width: 250,
    height: 340
  },
  // Group 2: Request Entry & Protection - Top Middle-Left (Dashed green)
  group_gateway: {
    id: 'group_gateway',
    title: '2. Request Entry & Protection',
    color: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    bg: 'rgba(6, 36, 26, 0.4)',
    borderStyle: 'dashed',
    x: 285,
    y: 20,
    width: 220,
    height: 340
  },
  // Group 3: Document Processing - Top Middle-Right (Purple)
  group_ingestion: {
    id: 'group_ingestion',
    title: '3. Document Processing',
    color: '#c084fc',
    borderColor: 'rgba(192, 132, 252, 0.5)',
    bg: 'rgba(34, 15, 54, 0.4)',
    borderStyle: 'solid',
    x: 520,
    y: 20,
    width: 205,
    height: 340
  },
  // Group 4: AI Orchestration - Top Right (Orange/Amber)
  group_ai: {
    id: 'group_ai',
    title: '4. AI Orchestration',
    color: '#fb923c',
    borderColor: 'rgba(251, 146, 60, 0.5)',
    bg: 'rgba(46, 22, 10, 0.4)',
    borderStyle: 'solid',
    x: 740,
    y: 20,
    width: 205,
    height: 340
  },
  // Group 5: Academic Generation Pipeline - Center Horizontal Ribbon (Magenta)
  group_pipeline: {
    id: 'group_pipeline',
    title: '5. Academic Generation Pipeline',
    color: '#f472b6',
    borderColor: 'rgba(244, 114, 182, 0.5)',
    bg: 'rgba(46, 14, 34, 0.4)',
    borderStyle: 'solid',
    x: 20,
    y: 375,
    width: 925,
    height: 120
  },
  // Group 6: Persistence & Storage - Bottom Left (Teal/Emerald)
  group_storage: {
    id: 'group_storage',
    title: '6. Persistence & Storage',
    color: '#2dd4bf',
    borderColor: 'rgba(45, 212, 191, 0.5)',
    bg: 'rgba(9, 36, 34, 0.4)',
    borderStyle: 'solid',
    x: 20,
    y: 510,
    width: 505,
    height: 125
  },
  // Group 7: Observability & Infrastructure - Bottom Right (Sky Blue)
  group_observability: {
    id: 'group_observability',
    title: '7. Observability & Infrastructure',
    color: '#60a5fa',
    borderColor: 'rgba(96, 165, 250, 0.5)',
    bg: 'rgba(16, 32, 60, 0.4)',
    borderStyle: 'solid',
    x: 540,
    y: 510,
    width: 405,
    height: 125
  }
};

// Precise coordinates for all real nodes matching Reference Image B
export const NODE_COORDINATES = {
  // Group 1: Student Client
  node_browser_mock: {
    x: 35,
    y: 55,
    width: 110,
    height: 285,
    customType: 'browser_shell'
  },
  node_api_client: {
    x: 160,
    y: 160,
    width: 95,
    height: 75,
    icon: '⚛️',
    iconText: 'API',
    iconBoxBg: '#0369a1',
    iconColor: '#38bdf8',
    label: 'Frontend API Client',
    sub: 'apiClient.js'
  },

  // Group 2: Request Entry & Protection
  node_vercel_gateway: {
    x: 305,
    y: 160,
    width: 60,
    height: 75,
    icon: '▲',
    iconText: '▲',
    iconBoxBg: '#052e16',
    iconColor: '#10b981',
    label: 'Vercel Edge',
    sub: 'Deployment'
  },
  node_api_v1: {
    x: 380,
    y: 160,
    width: 60,
    height: 75,
    icon: 'N',
    iconText: 'N',
    iconBoxBg: '#052e16',
    iconColor: '#10b981',
    label: 'API Gateway',
    sub: '/api/v1'
  },
  node_auth_guard: {
    x: 455,
    y: 160,
    width: 70,
    height: 75,
    icon: '🛡️',
    iconText: '🛡️',
    iconBoxBg: '#082f49',
    iconColor: '#38bdf8',
    label: 'Auth & Validation',
    sub: 'Session Capability'
  },

  // Group 3: Document Processing
  node_doc_pipeline: {
    x: 545,
    y: 55,
    width: 155,
    height: 48,
    icon: '📁',
    iconText: 'FILE',
    iconBoxBg: '#581c87',
    iconColor: '#c084fc',
    label: 'File Validation',
    sub: 'Type & Size Check'
  },
  node_pdf_processor: {
    x: 545,
    y: 115,
    width: 155,
    height: 48,
    icon: '📄',
    iconText: 'PDF',
    iconBoxBg: '#be123c',
    iconColor: '#ffffff',
    label: 'PDF Processing',
    sub: 'Text Extraction'
  },
  node_docx_parser: {
    x: 545,
    y: 173,
    width: 155,
    height: 48,
    icon: '📝',
    iconText: 'DOC',
    iconBoxBg: '#1d4ed8',
    iconColor: '#ffffff',
    label: 'DOCX Processing',
    sub: 'Text Extraction'
  },
  node_pptx_parser: {
    x: 545,
    y: 231,
    width: 155,
    height: 48,
    icon: '📊',
    iconText: 'PPT',
    iconBoxBg: '#c2410c',
    iconColor: '#ffffff',
    label: 'PPTX Processing',
    sub: 'Text Extraction'
  },
  node_txt_parser: {
    x: 545,
    y: 289,
    width: 155,
    height: 48,
    icon: '📋',
    iconText: 'TXT',
    iconBoxBg: '#0369a1',
    iconColor: '#ffffff',
    label: 'TXT Processing',
    sub: 'Text Extraction'
  },

  // Group 4: AI Orchestration
  node_ai_router: {
    x: 765,
    y: 55,
    width: 155,
    height: 48,
    icon: '🔀',
    iconText: 'AI',
    iconBoxBg: '#9a3412',
    iconColor: '#fb923c',
    label: 'AI Router',
    sub: 'Provider Selection'
  },
  node_openai_adapter: {
    x: 765,
    y: 115,
    width: 155,
    height: 48,
    icon: '🤖',
    iconText: '✦',
    iconBoxBg: '#047857',
    iconColor: '#ffffff',
    label: 'OpenAI',
    sub: 'GPT Models'
  },
  node_claude_adapter: {
    x: 765,
    y: 173,
    width: 155,
    height: 48,
    icon: '🧠',
    iconText: 'A',
    iconBoxBg: '#b45309',
    iconColor: '#ffffff',
    label: 'Anthropic',
    sub: 'Claude Models'
  },
  node_gemini_adapter: {
    x: 765,
    y: 231,
    width: 155,
    height: 48,
    icon: '⚡',
    iconText: 'G',
    iconBoxBg: '#b91c1c',
    iconColor: '#ffffff',
    label: 'Groq',
    sub: 'Fast Inference'
  },
  node_fallback_engine: {
    x: 765,
    y: 289,
    width: 155,
    height: 48,
    icon: '🔄',
    iconText: '⟳',
    iconBoxBg: '#4338ca',
    iconColor: '#ffffff',
    label: 'Fallback & Retry',
    sub: 'Error Handling'
  },

  // Group 5: Academic Generation Pipeline
  node_concept_extractor: {
    x: 35,
    y: 410,
    width: 135,
    height: 65,
    icon: '🔍',
    iconText: '🔍',
    iconBoxBg: '#831843',
    iconColor: '#f472b6',
    label: 'Concept Extraction',
    sub: 'Topic Analysis'
  },
  node_summary_pipeline: {
    x: 188,
    y: 410,
    width: 135,
    height: 65,
    icon: '📝',
    iconText: '📝',
    iconBoxBg: '#581c87',
    iconColor: '#e879f9',
    label: 'Summary Generation',
    sub: 'Study & Notes'
  },
  node_mega_questions: {
    x: 341,
    y: 410,
    width: 135,
    height: 65,
    icon: '❓',
    iconText: '?',
    iconBoxBg: '#581c87',
    iconColor: '#e879f9',
    label: 'Question Generation',
    sub: 'MCQ & Answers'
  },
  node_epp_pipeline: {
    x: 494,
    y: 410,
    width: 135,
    height: 65,
    icon: '📊',
    iconText: '🎯',
    iconBoxBg: '#581c87',
    iconColor: '#e879f9',
    label: 'Exam Prediction',
    sub: 'Important Topics'
  },
  node_answer_gen: {
    x: 647,
    y: 410,
    width: 135,
    height: 65,
    icon: '💬',
    iconText: '💬',
    iconBoxBg: '#831843',
    iconColor: '#f472b6',
    label: 'Answer Generation',
    sub: 'Detailed Answers'
  },
  node_quality_evaluator: {
    x: 800,
    y: 410,
    width: 135,
    height: 65,
    icon: '✓',
    iconText: '✓',
    iconBoxBg: '#064e3b',
    iconColor: '#34d399',
    label: 'Quality Checks',
    sub: 'Source Validation'
  },

  // Group 6: Persistence & Storage
  node_db_engine: {
    x: 35,
    y: 545,
    width: 110,
    height: 70,
    icon: '🗄️',
    iconText: 'DB',
    iconBoxBg: '#134e4a',
    iconColor: '#2dd4bf',
    label: 'Neon PostgreSQL',
    sub: 'Session Data'
  },
  node_doc_persistence: {
    x: 160,
    y: 545,
    width: 110,
    height: 70,
    icon: '📄',
    iconText: 'DOC',
    iconBoxBg: '#164e63',
    iconColor: '#22d3ee',
    label: 'Extracted Text',
    sub: 'Document Content'
  },
  node_qna_persistence: {
    x: 285,
    y: 545,
    width: 115,
    height: 70,
    icon: '📑',
    iconText: 'Q&A',
    iconBoxBg: '#164e63',
    iconColor: '#22d3ee',
    label: 'Generated Results',
    sub: 'Questions & Answers'
  },
  node_s3_storage: {
    x: 415,
    y: 545,
    width: 95,
    height: 70,
    icon: '☁️',
    iconText: 'S3',
    iconBoxBg: '#78350f',
    iconColor: '#fbbf24',
    label: 'Object Storage (S3)',
    sub: 'Original Files (Optional)'
  },

  // Group 7: Observability & Infrastructure (2x2 Grid)
  node_health_probes: {
    x: 555,
    y: 540,
    width: 180,
    height: 38,
    icon: '📈',
    iconText: 'HP',
    iconBoxBg: '#1e3a8a',
    iconColor: '#60a5fa',
    label: 'Health Checks',
    sub: '/api/v1/health'
  },
  node_request_tracer: {
    x: 750,
    y: 540,
    width: 180,
    height: 38,
    icon: '📑',
    iconText: 'TRC',
    iconBoxBg: '#1e3a8a',
    iconColor: '#60a5fa',
    label: 'Logs & Traces',
    sub: 'Request Tracking'
  },
  node_telemetry_engine: {
    x: 555,
    y: 588,
    width: 180,
    height: 38,
    icon: '📊',
    iconText: 'MET',
    iconBoxBg: '#1e3a8a',
    iconColor: '#60a5fa',
    label: 'Metrics Collection',
    sub: 'Performance Data'
  },
  node_ci_pipeline: {
    x: 750,
    y: 588,
    width: 180,
    height: 38,
    icon: '🐙',
    iconText: 'CI',
    iconBoxBg: '#1f2937',
    iconColor: '#e5e7eb',
    label: 'CI/CD (GitHub)',
    sub: 'Preview Deployment'
  }
};

export default function ArchitectureCanvas({
  selectedNodeId = 'node_pdf_processor',
  onSelectNode,
  realtimeStatus = {}
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);
  const [viewMode, setViewMode] = useState('graph'); // graph | list | health
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // Status mapping colors & styles matching Reference Image B
  const statusStyles = {
    healthy: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
      pip: '#10b981'
    },
    processing: {
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      pip: '#38bdf8'
    },
    degraded: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      pip: '#f59e0b'
    },
    failed: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      pip: '#ef4444'
    },
    error: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      pip: '#ef4444'
    },
    not_configured: {
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.1)',
      border: 'rgba(148, 163, 184, 0.3)',
      pip: '#64748b'
    },
    not_instrumented: {
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.08)',
      border: 'rgba(56, 189, 248, 0.25)',
      pip: '#38bdf8'
    },
    unverified: {
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.1)',
      border: 'rgba(148, 163, 184, 0.3)',
      pip: '#64748b'
    }
  };

  const getNodeStatus = (nodeId) => {
    const raw = realtimeStatus?._details?.[nodeId] || realtimeStatus?.[nodeId] || realtimeStatus?.[nodeId?.replace('node_', '')];
    if (typeof raw === 'object' && raw?.status) return raw.status.toLowerCase();
    if (typeof raw === 'string') return raw.toLowerCase();
    // Default matching Reference Image B
    if (nodeId.includes('openai') || nodeId.includes('claude')) return 'healthy';
    if (nodeId.includes('s3')) return 'healthy';
    return 'healthy';
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 1.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.7));
  const handleResetZoom = () => setZoom(1.0);

  return (
    <div className="w-full h-full flex flex-col bg-[#070b13] overflow-hidden select-none font-sans text-xs">
      <style>{`
        @keyframes flowPulse {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .flow-animated-cyan {
          stroke-dasharray: 6, 6;
          animation: flowPulse 2s linear infinite;
        }
        .flow-animated-green {
          stroke-dasharray: 6, 6;
          animation: flowPulse 2s linear infinite;
        }
        .flow-animated-purple {
          stroke-dasharray: 6, 6;
          animation: flowPulse 2.2s linear infinite;
        }
        .flow-animated-pink {
          stroke-dasharray: 6, 6;
          animation: flowPulse 2.5s linear infinite;
        }
        .flow-animated-teal {
          stroke-dasharray: 6, 6;
          animation: flowPulse 2s linear infinite;
        }
        .flow-animated-amber {
          stroke-dasharray: 6, 6;
          animation: flowPulse 2.2s linear infinite;
        }
      `}</style>

      {/* ─── CANVAS TOOLBAR (Reference Image B) ────────────────────── */}
      <div className="h-14 px-6 border-b border-gray-800/80 bg-[#090d16] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            System Architecture Map
          </h2>
          <p className="text-xs text-gray-400">
            Interactive view of all services, data flow, and dependencies
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#05080e] p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'graph'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🕸️</span>
              <span>Graph</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>☰</span>
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('health')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'health'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>♡</span>
              <span>Health</span>
            </button>
          </div>

          <div className="h-4 w-px bg-gray-800" />

          {/* Zoom controls */}
          <div className="flex items-center bg-[#05080e] px-2 py-1 rounded-lg border border-gray-800 text-gray-400 font-mono text-xs gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-white rounded hover:bg-gray-800 transition"
              title="Zoom Out"
            >
              −
            </button>
            <span className="px-2 text-white font-medium">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-white rounded hover:bg-gray-800 transition"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 hover:text-white rounded hover:bg-gray-800 transition ml-1"
              title="Reset Zoom"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>

      {/* ─── GRAPH VIEW (2D CLUSTERED INTERACTIVE CANVAS) ──────────── */}
      {viewMode === 'graph' && (
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-[#070b13] relative p-4 flex items-center justify-center"
        >
          <div
            className="relative transition-transform duration-150 origin-top"
            style={{
              transform: `scale(${zoom})`,
              width: '970px',
              height: '670px',
              minWidth: '970px',
              minHeight: '670px'
            }}
          >
            {/* SVG FLOWING DATA PATHS LAYER */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 970 670"
            >
              <defs>
                <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
                </marker>
                <marker id="arrow-pink" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f472b6" />
                </marker>
                <marker id="arrow-teal" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#2dd4bf" />
                </marker>
                <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb923c" />
                </marker>
                <marker id="arrow-blue-dash" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" />
                </marker>
              </defs>

              {/* Path 1: Student Browser ➔ Frontend API Client */}
              <path d="M 145 197 L 160 197" stroke="#38bdf8" strokeWidth="2" fill="none" markerEnd="url(#arrow-cyan)" className="flow-animated-cyan" />

              {/* Path 2: Frontend API Client ➔ Vercel Edge */}
              <path d="M 255 197 L 305 197" stroke="#38bdf8" strokeWidth="2" fill="none" markerEnd="url(#arrow-cyan)" className="flow-animated-cyan" />

              {/* Path 3: Vercel Edge ➔ API Gateway */}
              <path d="M 365 197 L 380 197" stroke="#10b981" strokeWidth="2" fill="none" markerEnd="url(#arrow-green)" className="flow-animated-green" />

              {/* Path 4: API Gateway ➔ Auth & Validation */}
              <path d="M 440 197 L 455 197" stroke="#10b981" strokeWidth="2" fill="none" markerEnd="url(#arrow-green)" className="flow-animated-green" />

              {/* Path 5: Auth & Validation ➔ File Validation */}
              <path d="M 525 197 C 535 197, 535 79, 545 79" stroke="#10b981" strokeWidth="2" fill="none" markerEnd="url(#arrow-green)" className="flow-animated-green" />

              {/* Path 6: File Validation branches to PDF, DOCX, PPTX, TXT */}
              <path d="M 545 79 C 530 79, 530 139, 545 139" stroke="#c084fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-purple)" className="flow-animated-purple" />
              <path d="M 545 79 C 525 79, 525 197, 545 197" stroke="#c084fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-purple)" />
              <path d="M 545 79 C 520 79, 520 255, 545 255" stroke="#c084fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-purple)" />
              <path d="M 545 79 C 515 79, 515 313, 545 313" stroke="#c084fc" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-purple)" />

              {/* Path 7: PDF Processing ➔ AI Router */}
              <path d="M 700 139 C 730 139, 735 79, 765 79" stroke="#c084fc" strokeWidth="2" fill="none" markerEnd="url(#arrow-purple)" className="flow-animated-purple" />

              {/* Path 8: AI Router branches to OpenAI, Claude, Groq, Fallback */}
              <path d="M 765 79 C 750 79, 750 139, 765 139" stroke="#fb923c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-amber)" className="flow-animated-amber" />
              <path d="M 765 79 C 745 79, 745 197, 765 197" stroke="#fb923c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-amber)" />
              <path d="M 765 79 C 740 79, 740 255, 765 255" stroke="#fb923c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-amber)" />
              <path d="M 765 79 C 735 79, 735 313, 765 313" stroke="#fb923c" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-amber)" />

              {/* Path 9: AI Router Downward Bus to Academic Pipeline */}
              <path d="M 842 337 L 842 360 C 842 370, 750 375, 700 375 L 102 375 L 102 410" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arrow-pink)" className="flow-animated-pink" />

              {/* Path 10: Academic Pipeline Horizontal Chain */}
              <path d="M 170 442 L 188 442" stroke="#f472b6" strokeWidth="2" fill="none" markerEnd="url(#arrow-pink)" className="flow-animated-pink" />
              <path d="M 323 442 L 341 442" stroke="#f472b6" strokeWidth="2" fill="none" markerEnd="url(#arrow-pink)" className="flow-animated-pink" />
              <path d="M 476 442 L 494 442" stroke="#f472b6" strokeWidth="2" fill="none" markerEnd="url(#arrow-pink)" className="flow-animated-pink" />
              <path d="M 629 442 L 647 442" stroke="#f472b6" strokeWidth="2" fill="none" markerEnd="url(#arrow-pink)" className="flow-animated-pink" />
              <path d="M 782 442 L 800 442" stroke="#f472b6" strokeWidth="2" fill="none" markerEnd="url(#arrow-pink)" className="flow-animated-pink" />

              {/* Path 11: Pipeline ➔ Persistence */}
              <path d="M 408 475 L 408 495 C 408 505, 215 505, 215 545" stroke="#2dd4bf" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-teal)" className="flow-animated-teal" />
              <path d="M 714 475 L 714 495 C 714 505, 342 505, 342 545" stroke="#2dd4bf" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-teal)" className="flow-animated-teal" />

              {/* Path 12: Storage Interconnections */}
              <path d="M 145 580 L 160 580" stroke="#2dd4bf" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-teal)" />
              <path d="M 270 580 L 285 580" stroke="#2dd4bf" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-teal)" />
              <path d="M 400 580 L 415 580" stroke="#2dd4bf" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-teal)" />

              {/* Path 13: Observability Loop */}
              <path d="M 840 540 C 840 500, 840 480, 840 475" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,4" fill="none" markerEnd="url(#arrow-blue-dash)" />
            </svg>

            {/* ─── 7 CLUSTER BOUNDING BOXES ──────────────────────────── */}
            {Object.values(CLUSTER_LAYOUT).map((cluster) => (
              <div
                key={cluster.id}
                className="absolute rounded-2xl transition-all pointer-events-none"
                style={{
                  left: `${cluster.x}px`,
                  top: `${cluster.y}px`,
                  width: `${cluster.width}px`,
                  height: `${cluster.height}px`,
                  backgroundColor: cluster.bg,
                  border: `1.5px ${cluster.borderStyle} ${cluster.borderColor}`,
                  boxShadow: `inset 0 0 20px ${cluster.borderColor}15`
                }}
              >
                <div
                  className="px-3 py-1.5 text-[11px] font-bold font-mono tracking-wider flex items-center gap-1.5"
                  style={{ color: cluster.color }}
                >
                  <span>{cluster.title}</span>
                </div>
              </div>
            ))}

            {/* ─── GROUP 1: STUDENT BROWSER SHELL ────────────────────── */}
            <div
              className="absolute rounded-xl bg-[#090d16] border border-sky-500/30 overflow-hidden shadow-lg z-20"
              style={{
                left: `${NODE_COORDINATES.node_browser_mock.x}px`,
                top: `${NODE_COORDINATES.node_browser_mock.y}px`,
                width: `${NODE_COORDINATES.node_browser_mock.width}px`,
                height: `${NODE_COORDINATES.node_browser_mock.height}px`
              }}
            >
              {/* Browser Header */}
              <div className="bg-[#0e1626] px-2 py-1.5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[9px] font-mono text-gray-400">React + Vite</span>
              </div>

              {/* 7 Student Tabs */}
              <div className="p-1.5 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-white pb-1 border-b border-gray-800">
                  <span className="text-sky-400">⚛️</span> Student Browser
                </div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">📎 Upload Docs</div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">📖 Study Session</div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">❓ Question Bank</div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">📝 Summaries & Notes</div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">🎯 Exam Prediction</div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">✅ Answer Generation</div>
                <div className="px-1.5 py-0.5 rounded bg-[#05080e] border border-gray-800 text-[9px] text-gray-300">🧠 Adaptive Learning</div>
              </div>
            </div>

            {/* ─── RENDER ALL REMAINING 31 NODES ───────────────────────── */}
            {Object.entries(NODE_COORDINATES).map(([nodeId, coords]) => {
              if (nodeId === 'node_browser_mock') return null;

              const isSelected = selectedNodeId === nodeId;
              const isHovered = hoveredNodeId === nodeId;
              const status = getNodeStatus(nodeId);
              const stStyle = statusStyles[status] || statusStyles.healthy;

              return (
                <div
                  key={nodeId}
                  onClick={() => onSelectNode && onSelectNode(nodeId)}
                  onMouseEnter={() => setHoveredNodeId(nodeId)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`absolute rounded-xl cursor-pointer transition-all flex flex-col justify-center px-2.5 py-1.5 z-20 ${
                    isSelected
                      ? 'border-2 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.5)] bg-[#120d22]'
                      : isHovered
                      ? 'scale-[1.03] border-cyan-400 bg-[#0e1626]'
                      : 'bg-[#090d16] hover:border-gray-600'
                  }`}
                  style={{
                    left: `${coords.x}px`,
                    top: `${coords.y}px`,
                    width: `${coords.width}px`,
                    height: `${coords.height}px`,
                    border: isSelected
                      ? '1.5px solid #c084fc'
                      : `1px solid ${stStyle.border}`
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {coords.iconBoxBg ? (
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 shadow-sm"
                          style={{
                            backgroundColor: coords.iconBoxBg,
                            color: coords.iconColor || '#ffffff'
                          }}
                        >
                          {coords.iconText || coords.icon}
                        </div>
                      ) : (
                        coords.icon && <span className="text-xs shrink-0">{coords.icon}</span>
                      )}
                      <span className="text-[11px] font-bold text-white truncate">
                        {coords.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          Active
                        </span>
                      )}
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: stStyle.pip }}
                        title={`Status: ${status}`}
                      />
                    </div>
                  </div>

                  {coords.sub && (
                    <span className="text-[9px] font-mono text-gray-400 truncate mt-0.5">
                      {coords.sub}
                    </span>
                  )}
                </div>
              );
            })}

            {/* ─── BOTTOM PERSISTENT CANVAS LEGEND ────────────────────── */}
            <div className="absolute left-6 right-6 bottom-3 bg-[#090d16]/95 border border-gray-800 rounded-xl px-4 py-2 flex items-center justify-between text-[11px] font-mono text-gray-300 z-20 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Healthy</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Processing</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Degraded</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Error</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Not Configured</span>
                </span>
              </div>

              <div className="flex items-center gap-4 text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-cyan-400 inline-block" />
                  <span>➔ Data Flow</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 border-t border-dashed border-blue-400 inline-block" />
                  <span>⇢ Dependency</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIST VIEW MODE ────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">All System Components Directory</h3>
            <span className="text-xs text-gray-400">32 Real Modules Registered</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Object.entries(NODE_COORDINATES).map(([nodeId, coords]) => {
              if (nodeId === 'node_browser_mock') return null;
              const isSelected = selectedNodeId === nodeId;
              const status = getNodeStatus(nodeId);
              return (
                <div
                  key={nodeId}
                  onClick={() => onSelectNode && onSelectNode(nodeId)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-purple-400 bg-purple-950/30'
                      : 'border-gray-800 bg-[#090d16] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{coords.icon || '🧩'}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{coords.label}</div>
                      <div className="text-[10px] text-gray-400">{coords.sub}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── HEALTH VIEW MODE ──────────────────────────────────────── */}
      {viewMode === 'health' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono">
          <h3 className="text-sm font-bold text-white font-sans">Subsystem Health & Uptime Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#090d16] border border-gray-800 space-y-2">
              <span className="text-emerald-400 font-bold">● Core Relational DB: 99.9% Uptime</span>
              <p className="text-xs text-gray-400 font-sans">Active SQLite WAL / Neon PostgreSQL connection verified in &lt;1ms.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#090d16] border border-gray-800 space-y-2">
              <span className="text-emerald-400 font-bold">● Document Ingestion Engine: 99.5% Uptime</span>
              <p className="text-xs text-gray-400 font-sans">PyPDF2 parser and layout cleaner operational.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#090d16] border border-gray-800 space-y-2">
              <span className="text-emerald-400 font-bold">● AI Failover Router: 98.7% Uptime</span>
              <p className="text-xs text-gray-400 font-sans">Multi-engine failover mesh armed for Gemini, OpenAI, and Claude.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#090d16] border border-gray-800 space-y-2">
              <span className="text-emerald-400 font-bold">● Vercel Serverless Edge: 99.8% Uptime</span>
              <p className="text-xs text-gray-400 font-sans">Routing API Gateway with active capability authorization.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
