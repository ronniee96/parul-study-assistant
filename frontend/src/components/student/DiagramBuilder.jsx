import React, { useState } from 'react';
import {
  IconDiagram,
  IconZap,
  IconDatabase,
  IconCpu,
  IconCopy,
  IconCheck
} from './StudentIcons';

const PRESETS = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    Icon: IconDiagram,
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
    Icon: IconZap,
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
    Icon: IconDatabase,
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
    Icon: IconCpu,
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
  const [diagramType, setDiagramType] = useState('flowchart');
  const [copied, setCopied] = useState(false);

  const renderFallback = () => {
    return (
      <div className="p-6 bg-black/[0.04] dark:bg-black/60 rounded-xl font-mono text-xs text-[#1d1d1f] dark:text-[#f5f5f7] space-y-2 overflow-x-auto w-full">
        <div className="text-[#0071e3] dark:text-[#388bfd] font-semibold mb-2">// Mermaid Graph Code</div>
        <pre className="text-[12px] leading-relaxed text-[#1d1d1f] dark:text-[#f5f5f7]">{code}</pre>
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
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff2d55]/10 text-[#ff2d55] dark:text-[#ff375f] flex items-center justify-center shrink-0">
              <IconDiagram className="w-4 h-4" />
            </div>
            <span>Flowchart & Mermaid Diagram Studio</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Design sequence diagrams, flowcharts, ERD schemas, and system architecture diagrams with Markdown code.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied Code</span>
              </>
            ) : (
              <>
                <IconCopy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset selector pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-[#86868b] dark:text-[#98989d] mr-1">Presets:</span>
        {PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setDiagramType(p.id);
              setCode(p.code);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
              diagramType === p.id
                ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm'
                : 'bg-white/80 dark:bg-[#1c1c1e]/80 border-black/[0.08] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] hover:border-black/20 dark:hover:border-white/25'
            }`}
          >
            <p.Icon className={`w-3.5 h-3.5 ${diagramType === p.id ? 'text-white' : 'text-[#86868b] dark:text-[#98989d]'}`} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mermaid Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            <span>Mermaid Definition Editor</span>
            <span className="text-[#86868b] dark:text-[#98989d] font-mono text-[11px]">syntax: mermaid.js</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] font-mono text-xs leading-relaxed focus:outline-none focus:border-[#0071e3] transition shadow-xs"
          />
        </div>

        {/* Live Diagram Viewer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            <span>Diagram Preview</span>
            <span className="text-emerald-500 text-[11px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Render</span>
            </span>
          </div>
          <div className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] min-h-[380px] flex items-center justify-center overflow-auto shadow-xs">
            {renderFallback()}
          </div>
        </div>
      </div>
    </div>
  );
}
