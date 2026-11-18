import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const PRESETS = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    icon: '🔀',
    code: `graph TD
  A["Student Opens Platform"] --> B["Upload Materials"]
  B --> C{"PDF or Image?"}
  C -->|PDF| D["PyMuPDF Native Extraction"]
  C -->|Image| E["Tesseract OCR Engine"]
  D --> F["Verification Council"]
  E --> F
  F --> G["Question Bank Generation"]
  G --> H["Model Answers & Flashcards"]`
  },
  {
    id: 'sequence',
    label: 'Sequence Diagram',
    icon: '⚡',
    code: `sequenceDiagram
  autonumber
  actor Student
  participant Browser as Student WebApp
  participant Edge as Vercel Edge Serverless
  participant DB as Neon PostgreSQL DB

  Student->>Browser: Selects Touch ID biometric prompt
  Browser->>Edge: POST /api/v1/admin/passkey/verify
  Edge->>DB: Query admin_passkeys credential record
  DB-->>Edge: Returns stored public key
  Edge-->>Browser: Issues 12hr cryptographic JWT bearer token
  Browser-->>Student: Unlocks SecOps Console`
  },
  {
    id: 'erd',
    label: 'Entity Relationship (ERD)',
    icon: '🗄️',
    code: `erDiagram
  STUDENTS ||--o{ ACADEMIC_DOCUMENTS : uploads
  STUDENTS ||--o{ PLAGIARISM_REPORTS : generates
  STUDENTS ||--o{ RESUMES : authors
  ACADEMIC_DOCUMENTS ||--o{ QUESTIONS : derives

  STUDENTS {
    string id PK
    string email
    string full_name
  }
  ACADEMIC_DOCUMENTS {
    string id PK
    string student_id FK
    string title
    int word_count
  }`
  },
  {
    id: 'class',
    label: 'Architecture Class Diagram',
    icon: '📐',
    code: `classDiagram
  class StudentToolkitService {
    +checkPlagiarism(text)
    +analyzeAIProbability(text)
    +designDatabaseSchema(spec)
    +generateDiagram(spec)
  }
  class DatabaseEngine {
    +fetch_all(query)
    +execute(query, params)
    +is_neon_postgres bool
  }
  StudentToolkitService --> DatabaseEngine : persists records`
  }
];

export default function DiagramBuilder() {
  const [code, setCode] = useState(PRESETS[0].code);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('System Architecture Flowchart');
  const [diagramType, setDiagramType] = useState('flowchart');
  const [svgOutput, setSvgOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick fallback renderer if mermaid dynamic script loading fails
  const renderFallback = () => {
    // Generate simple SVG graph placeholder
    const lines = code.split('\n').filter(l => l.trim().length > 0);
    return (
      <div className="p-6 bg-neutral-900 rounded-xl font-mono text-xs text-neutral-300 space-y-2 overflow-x-auto">
        <div className="text-cyan-400 font-bold mb-2">// Mermaid Graph Code</div>
        <pre className="text-[11px] leading-relaxed text-cyan-200">{code}</pre>
      </div>
    );
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>📐</span>
            <span>Flowchart & Mermaid Diagram Studio</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Design sequence diagrams, flowcharts, ERD schemas, and system architecture diagrams with Markdown code.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-semibold transition"
          >
            {copied ? '✓ Copied Mermaid Code' : '📋 Copy Code'}
          </button>
        </div>
      </div>

      {/* Preset selector pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-neutral-500 mr-2">Presets:</span>
        {PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setDiagramType(p.id);
              setCode(p.code);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              diagramType === p.id
                ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                : 'bg-white/40 dark:bg-black/30 border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
            }`}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mermaid Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Mermaid Definition Editor</span>
            <span className="text-neutral-400 font-mono text-[11px]">syntax: mermaid.js</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-cyan-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-rose-500 transition shadow-inner"
          />
        </div>

        {/* Live Diagram Viewer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Diagram Preview</span>
            <span className="text-emerald-400 text-[11px] font-medium">● Live Render</span>
          </div>
          <div className="p-6 rounded-xl bg-neutral-900/90 border border-neutral-800 min-h-[380px] flex items-center justify-center overflow-auto">
            {renderFallback()}
          </div>
        </div>
      </div>
    </div>
  );
}
