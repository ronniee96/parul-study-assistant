/**
 * Examination Blueprint & Question Paper Pattern Configurations
 * Supports Parul University (40M Mid-Term, 60M End-Term), GTU (70M),
 * Unit Tests (30M), Comprehensive (100M), and fully customizable user schemas.
 */

export const PAPER_PATTERN_TEMPLATES = {
  parul_midterm_40: {
    id: 'parul_midterm_40',
    name: 'Parul University — Mid-Term Examination (40 Marks)',
    university: 'PARUL UNIVERSITY',
    faculty: 'FACULTY OF MANAGEMENT STUDIES & HIGHER EDUCATION',
    program: 'University Examination',
    examType: 'Mid-Term Examination',
    time: '1 hr 30 min',
    totalMarks: 40,
    semester: 'Semester: III',
    subjectCode: 'PU302',
    description: 'Parul official mid-term split: 2 Modules (20M each). Q1 (2M), Q2 (12M), Q3 Caselet (6M).',
    sections: [
      {
        id: 'sec-a',
        name: 'SECTION – A (Module 1)',
        marksTotal: 20,
        subSections: [
          { id: 'q1', heading: 'Q1. Attempt Any One Question out of Two (02 Marks Each)', count: 1, choices: 2, marksEach: 2, type: 'Short Answer' },
          { id: 'q2', heading: 'Q2. Attempt Any Two Questions out of Three (06 Marks Each)', count: 2, choices: 3, marksEach: 6, type: 'Descriptive' },
          { id: 'q3', heading: 'Q3. Answer the following question based on Case let (06 Marks)', count: 1, choices: 1, marksEach: 6, type: 'Caselet' }
        ]
      },
      {
        id: 'sec-b',
        name: 'SECTION – B (Module 2)',
        marksTotal: 20,
        subSections: [
          { id: 'q1', heading: 'Q1. Attempt Any One Question out of Two (02 Marks Each)', count: 1, choices: 2, marksEach: 2, type: 'Short Answer' },
          { id: 'q2', heading: 'Q2. Attempt Any Two Questions out of Three (06 Marks Each)', count: 2, choices: 3, marksEach: 6, type: 'Descriptive' },
          { id: 'q3', heading: 'Q3. Answer the following question based on Case let (06 Marks)', count: 1, choices: 1, marksEach: 6, type: 'Caselet' }
        ]
      }
    ]
  },
  parul_endterm_60: {
    id: 'parul_endterm_60',
    name: 'Parul University — End-Term Examination (60 Marks)',
    university: 'PARUL UNIVERSITY',
    faculty: 'FACULTY OF APPLIED SCIENCES & MANAGEMENT',
    program: 'University End-Term Examination',
    examType: 'End-Term Examination',
    time: '3 Hours',
    totalMarks: 60,
    semester: 'Semester: Regular / ATKT',
    subjectCode: 'PU601',
    description: 'Parul University 60-mark blueprint: Section A (10M), Section B (25M), Section C (25M).',
    sections: [
      {
        id: 'sec-a',
        name: 'SECTION – A: Compulsory Short Answer & Concept Definitions',
        marksTotal: 10,
        subSections: [
          { id: 'q1', heading: 'Q1. Answer all questions concisely (02 Marks Each)', count: 5, choices: 5, marksEach: 2, type: 'Short Answer' }
        ]
      },
      {
        id: 'sec-b',
        name: 'SECTION – B: Analytical & Descriptive Problems',
        marksTotal: 25,
        subSections: [
          { id: 'q2', heading: 'Q2. Attempt Any Five Questions out of Seven (05 Marks Each)', count: 5, choices: 7, marksEach: 5, type: 'Descriptive' }
        ]
      },
      {
        id: 'sec-c',
        name: 'SECTION – C: Comprehensive Essay & Strategic Case Studies',
        marksTotal: 25,
        subSections: [
          { id: 'q3', heading: 'Q3. Attempt Any Two Questions out of Three (12.5 Marks Each)', count: 2, choices: 3, marksEach: 12.5, type: 'Essay / Case Study' }
        ]
      }
    ]
  },
  gtu_endterm_70: {
    id: 'gtu_endterm_70',
    name: 'GTU / Technical University — End-Term (70 Marks)',
    university: 'GUJARAT TECHNOLOGICAL UNIVERSITY',
    faculty: 'FACULTY OF ENGINEERING & MANAGEMENT STUDIES',
    program: 'University Regular Examination',
    examType: 'End-Term Examination',
    time: '2 hr 30 min',
    totalMarks: 70,
    semester: 'Semester: Final / Regular',
    subjectCode: 'GTU701',
    description: 'Standard 70-mark university pattern: 14M short, 28M mid-descriptive (7M each), 28M long/design (14M each).',
    sections: [
      {
        id: 'sec-a',
        name: 'SECTION – A: Fundamental Definitions & Short Answers',
        marksTotal: 14,
        subSections: [
          { id: 'q1', heading: 'Q1. Answer any Seven out of Seven Questions (02 Marks Each)', count: 7, choices: 7, marksEach: 2, type: 'Short Answer' }
        ]
      },
      {
        id: 'sec-b',
        name: 'SECTION – B: Core Technical & Numerical Problems',
        marksTotal: 28,
        subSections: [
          { id: 'q2', heading: 'Q2. Attempt Any Four Questions out of Six (07 Marks Each)', count: 4, choices: 6, marksEach: 7, type: 'Descriptive' }
        ]
      },
      {
        id: 'sec-c',
        name: 'SECTION – C: Advanced System Analysis & Caselet',
        marksTotal: 28,
        subSections: [
          { id: 'q3', heading: 'Q3. Attempt Any Two Questions out of Three (14 Marks Each)', count: 2, choices: 3, marksEach: 14, type: 'Essay / Case Study' }
        ]
      }
    ]
  },
  unit_test_30: {
    id: 'unit_test_30',
    name: 'Class / Internal Unit Assessment (30 Marks)',
    university: 'UNIVERSITY / COLLEGE',
    faculty: 'ACADEMIC DEPARTMENT',
    program: 'Continuous Internal Assessment (CIA)',
    examType: 'Unit Test / Class Test',
    time: '1 Hour',
    totalMarks: 30,
    semester: 'Semester: Current',
    subjectCode: 'UT101',
    description: 'Quick internal evaluation: 5 short questions (2M = 10M) and 4 descriptive questions (5M = 20M).',
    sections: [
      {
        id: 'sec-a',
        name: 'SECTION – A: Quick Conceptual Recall',
        marksTotal: 10,
        subSections: [
          { id: 'q1', heading: 'Q1. Answer All Questions (02 Marks Each)', count: 5, choices: 5, marksEach: 2, type: 'Short Answer' }
        ]
      },
      {
        id: 'sec-b',
        name: 'SECTION – B: Core Problem Solving & Analysis',
        marksTotal: 20,
        subSections: [
          { id: 'q2', heading: 'Q2. Attempt Any Four Questions out of Five (05 Marks Each)', count: 4, choices: 5, marksEach: 5, type: 'Descriptive' }
        ]
      }
    ]
  },
  comprehensive_100: {
    id: 'comprehensive_100',
    name: 'Full Comprehensive Examination (100 Marks)',
    university: 'CENTRAL UNIVERSITY',
    faculty: 'FACULTY OF HIGHER STUDIES & COMMERCE',
    program: 'Annual / Semester End Examination',
    examType: 'Full Comprehensive Examination',
    time: '3 Hours',
    totalMarks: 100,
    semester: 'Semester: Final',
    subjectCode: 'UNIV100',
    description: '100-mark paper: Section A (20M), Section B (40M), Section C (40M).',
    sections: [
      {
        id: 'sec-a',
        name: 'SECTION – A: Objective & Concept Definitions',
        marksTotal: 20,
        subSections: [
          { id: 'q1', heading: 'Q1. Answer Ten Questions (02 Marks Each)', count: 10, choices: 10, marksEach: 2, type: 'Short Answer' }
        ]
      },
      {
        id: 'sec-b',
        name: 'SECTION – B: Analytical & Methodological Problems',
        marksTotal: 40,
        subSections: [
          { id: 'q2', heading: 'Q2. Attempt Any Eight Questions out of Ten (05 Marks Each)', count: 8, choices: 10, marksEach: 5, type: 'Descriptive' }
        ]
      },
      {
        id: 'sec-c',
        name: 'SECTION – C: Critical Essay & Strategic Case Studies',
        marksTotal: 40,
        subSections: [
          { id: 'q3', heading: 'Q3. Attempt Any Four Questions out of Five (10 Marks Each)', count: 4, choices: 5, marksEach: 10, type: 'Essay / Case Study' }
        ]
      }
    ]
  }
};

export const DEFAULT_PAPER_PATTERN = PAPER_PATTERN_TEMPLATES.parul_midterm_40;

/**
 * Computes total marks dynamically from sections and subsections
 */
export function calculatePatternTotalMarks(pattern) {
  if (!pattern || !pattern.sections || !Array.isArray(pattern.sections)) return 0;
  return pattern.sections.reduce((secTotal, sec) => {
    if (sec.subSections && Array.isArray(sec.subSections)) {
      const subTotal = sec.subSections.reduce((sTotal, sub) => {
        const count = Number(sub.count) || 0;
        const marksEach = Number(sub.marksEach) || 0;
        return sTotal + (count * marksEach);
      }, 0);
      return secTotal + subTotal;
    }
    return secTotal + (Number(sec.marksTotal) || 0);
  }, 0);
}

/**
 * Loads the active paper pattern from localStorage or returns default
 */
export function getSavedPaperPattern() {
  try {
    const saved = localStorage.getItem('study_assistant_paper_pattern');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.sections && parsed.sections.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load paper pattern:", e);
  }
  return DEFAULT_PAPER_PATTERN;
}

export function savePaperPattern(pattern) {
  try {
    localStorage.setItem('study_assistant_paper_pattern', JSON.stringify(pattern));
  } catch (e) {
    console.warn("Failed to save paper pattern to localStorage:", e);
  }
}

/**
 * Intelligently parses raw text extracted from an uploaded Question Paper Pattern (PDF / DOCX / TXT)
 */
export function parseQuestionPaperPattern(text = '', filename = '') {
  const cleanDocTitle = filename
    ? filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim()
    : "University Examination Pattern";

  const headText = (text || '').slice(0, 4000);

  // 1. University Name Extraction
  let university = "PARUL UNIVERSITY";
  const univMatch = headText.match(/\b([A-Z\s]{4,45}\s+(?:UNIVERSITY|INSTITUTE|COLLEGE|ACADEMY))\b/i);
  if (univMatch && univMatch[1].trim().length > 5) {
    university = univMatch[1].trim().toUpperCase();
  } else if (/gtu|gujarat\s*technological/i.test(headText)) {
    university = "GUJARAT TECHNOLOGICAL UNIVERSITY";
  } else if (/delhi\s*university|du\b/i.test(headText)) {
    university = "UNIVERSITY OF DELHI";
  } else if (/mumbai\s*university|mu\b/i.test(headText)) {
    university = "UNIVERSITY OF MUMBAI";
  } else if (/pune|sppu/i.test(headText)) {
    university = "SAVITRIBAI PHULE PUNE UNIVERSITY";
  } else if (/parul/i.test(headText)) {
    university = "PARUL UNIVERSITY";
  }

  // 2. Faculty / Department
  let faculty = "FACULTY OF MANAGEMENT STUDIES & HIGHER EDUCATION";
  const facMatch = headText.match(/(?:faculty|department|dept|school)\s+of\s+([^\n\r,;:]{3,60})/i);
  if (facMatch && facMatch[1].trim()) {
    faculty = `FACULTY OF ${facMatch[1].trim().toUpperCase()}`;
  }

  // 3. Examination Type / Heading
  let examType = "Mid-Term Examination";
  if (/end[- ]term|end[- ]sem|final\s*exam|semester[- ]end/i.test(headText)) {
    examType = "End-Term Examination";
  } else if (/unit[- ]test|class[- ]test|internal\s*test|cia/i.test(headText)) {
    examType = "Internal Assessment Examination";
  } else if (/remedial|atkt/i.test(headText)) {
    examType = "Remedial Examination";
  }

  // 4. Subject Name & Subject Code
  let subjectCode = "PU302";
  const codeMatch = headText.match(/(?:subject|course|paper)\s*code\s*[:\-]?\s*([A-Za-z0-9\-_]{3,15})/i);
  if (codeMatch) {
    subjectCode = codeMatch[1].trim().toUpperCase();
  }

  let subject = cleanDocTitle;
  const subMatch = headText.match(/(?:subject|course|paper)\s*(?:name)?\s*[:\-]\s*([^\n\r,]{3,60})/i);
  if (subMatch && subMatch[1].trim().length > 3) {
    subject = subMatch[1].trim();
  }

  // 5. Semester
  let semester = "Semester: III";
  const semMatch = headText.match(/(?:semester|sem)\s*[:\-]?\s*([0-9IVX]+)/i);
  if (semMatch) {
    semester = `Semester: ${semMatch[1].trim()}`;
  }

  // 6. Total Marks
  let totalMarks = 40;
  const marksMatch = headText.match(/(?:total|max|maximum)\s*marks\s*[:\-]?\s*(\d{2,3})/i);
  if (marksMatch) {
    totalMarks = parseInt(marksMatch[1], 10);
  }

  // 7. Time / Duration
  let time = "1 hr 30 min";
  const timeMatch = headText.match(/(?:time|duration)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|mins?|minutes?)/i);
  if (timeMatch) {
    time = `${timeMatch[1]} Hours`;
  } else if (totalMarks >= 60) {
    time = "3 Hours";
  } else if (totalMarks <= 30) {
    time = "1 Hour";
  }

  // 8. Parse Sections
  const detectedSections = [];
  const secRegex = /(?:SECTION|PART|MODULE)\s*[-–—:]?\s*([A-Z0-9]+)([^\n\r]*)/gi;
  let match;
  const sectionPositions = [];
  while ((match = secRegex.exec(text)) !== null) {
    sectionPositions.push({
      label: match[1].toUpperCase(),
      subTitle: match[2]?.trim() || '',
      index: match.index
    });
  }

  if (sectionPositions.length >= 2) {
    for (let i = 0; i < sectionPositions.length; i++) {
      const cur = sectionPositions[i];
      const start = cur.index;
      const end = i + 1 < sectionPositions.length ? sectionPositions[i + 1].index : text.length;
      const secChunk = text.slice(start, end);

      const subSections = [];
      const qMatches = [...secChunk.matchAll(/(?:^|\n)\s*(?:Q\.?\s*(\d+)|(\d+)\.)\s*([^\n\r]*)/gi)];

      if (qMatches.length > 0) {
        qMatches.slice(0, 4).forEach((qm, qIdx) => {
          const qNum = qm[1] || qm[2] || (qIdx + 1);
          const qHeader = qm[3] || '';

          let mEach = 2;
          const mMatch = (qm[0] + ' ' + secChunk.slice(qm.index, qm.index + 200)).match(/\[\s*(\d+(?:\.\d+)?)\s*M|\(\s*(\d+(?:\.\d+)?)\s*Mark/i);
          if (mMatch) {
            mEach = parseFloat(mMatch[1] || mMatch[2]);
          } else if (qIdx === 0) {
            mEach = 2;
          } else if (qIdx === 1) {
            mEach = totalMarks > 50 ? 5 : 6;
          } else {
            mEach = totalMarks > 50 ? 12.5 : 6;
          }

          let qType = mEach <= 2 ? 'Short Answer' : (mEach <= 7 ? 'Descriptive' : 'Caselet');
          if (/case/i.test(qHeader) || /caselet/i.test(qHeader)) qType = 'Caselet';

          let count = 1;
          let choices = 2;
          if (/attempt\s*any\s*(\d+)/i.test(qHeader)) {
            const cm = qHeader.match(/attempt\s*any\s*(\d+)/i);
            count = parseInt(cm[1], 10);
            choices = count + 1;
          } else if (/all\s*questions/i.test(qHeader)) {
            count = 5;
            choices = 5;
          }

          subSections.push({
            id: `q${qNum}`,
            heading: `Q${qNum}. ${qHeader || (count > 1 ? `Attempt Any ${count} Questions (${mEach} Marks Each)` : `Answer the Question (${mEach} Marks)`)}`,
            count: count,
            choices: choices,
            marksEach: mEach,
            type: qType
          });
        });
      }

      if (subSections.length === 0) {
        subSections.push(
          { id: 'q1', heading: 'Q1. Concept Definitions & Short Questions (02 Marks Each)', count: 1, choices: 2, marksEach: 2, type: 'Short Answer' },
          { id: 'q2', heading: 'Q2. Analytical & Descriptive Questions (06 Marks Each)', count: 2, choices: 3, marksEach: 6, type: 'Descriptive' },
          { id: 'q3', heading: 'Q3. Practical Caselet / Applied Numerical Problem (06 Marks)', count: 1, choices: 1, marksEach: 6, type: 'Caselet' }
        );
      }

      const secMarks = subSections.reduce((sum, s) => sum + (s.count * s.marksEach), 0);

      detectedSections.push({
        id: `sec-${cur.label.toLowerCase()}`,
        name: `SECTION – ${cur.label}${cur.subTitle ? ` (${cur.subTitle})` : ''}`,
        marksTotal: secMarks || Math.round(totalMarks / sectionPositions.length),
        subSections: subSections
      });
    }
  }

  // Fallback to closest standard template if no sections could be parsed
  if (detectedSections.length === 0) {
    let baseTemplate = PAPER_PATTERN_TEMPLATES.parul_midterm_40;
    if (totalMarks >= 90) baseTemplate = PAPER_PATTERN_TEMPLATES.comprehensive_100;
    else if (totalMarks >= 65) baseTemplate = PAPER_PATTERN_TEMPLATES.gtu_endterm_70;
    else if (totalMarks >= 50) baseTemplate = PAPER_PATTERN_TEMPLATES.parul_endterm_60;
    else if (totalMarks <= 30) baseTemplate = PAPER_PATTERN_TEMPLATES.unit_test_30;

    baseTemplate.sections.forEach(sec => {
      detectedSections.push(JSON.parse(JSON.stringify(sec)));
    });
  }

  const computedTotal = detectedSections.reduce((acc, s) => {
    return acc + (s.subSections?.reduce((subAcc, sub) => subAcc + (sub.count * sub.marksEach), 0) || s.marksTotal || 0);
  }, 0);

  return {
    id: `custom_pattern_${Date.now()}`,
    name: `${university} — ${examType} (${computedTotal || totalMarks} Marks)`,
    university: university,
    faculty: faculty,
    program: `University Examination (Uploaded Pattern Blueprint)`,
    examType: examType,
    time: time,
    totalMarks: computedTotal || totalMarks,
    semester: semester,
    subjectCode: subjectCode,
    subject: subject,
    isCustomUploaded: true,
    uploadedFilename: filename,
    description: `Custom pattern parsed from ${filename || 'user document'} with ${detectedSections.length} sections and ${computedTotal || totalMarks} Total Marks.`,
    instructions: [
      "1. All questions in all sections are structured strictly according to the uploaded examination blueprint.",
      "2. Figures to the right indicate full marks. Make suitable mathematical and academic assumptions wherever necessary.",
      "3. Each question aligns 100% with the prescribed course outcomes and Bloom's taxonomy levels."
    ],
    sections: detectedSections
  };
}

/**
 * Dynamically synthesizes an authentic examination paper conforming strictly to ANY blueprint
 */
export function generatePredictedPaperFromBlueprint(blueprint, topics = [], subjectName = 'Course Examination', setIndex = 0) {
  const activeTopics = (topics && topics.length > 0) ? topics : [
    `${subjectName} Theoretical Foundations & Architecture`,
    `${subjectName} Core Principles & Analytical Methods`,
    `${subjectName} Operational Mechanics & Problem Solving`,
    `${subjectName} Comparative Evaluation & System Optimization`,
    `${subjectName} Strategic Implementation & Case Analysis`,
    `${subjectName} Performance Monitoring & Quality Benchmarks`
  ];

  const setConfigs = [
    {
      setId: 'SET-A',
      title: 'Set A: Core Theory & Conceptual Foundations',
      badge: 'High Priority',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300',
      likelihood: 'Tier 1 Priority',
      focus: 'Foundational Definitions, Classifications, Flowcharts & Core Marking Rubrics'
    },
    {
      setId: 'SET-B',
      title: 'Set B: Applied Problem Solving & Analytical Mechanics',
      badge: 'Analytical Focus',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
      likelihood: 'Tier 2 Priority',
      focus: 'Step-by-Step Methodological Formulations, Application & Problem Solving'
    },
    {
      setId: 'SET-C',
      title: 'Set C: Executive Decision Making & Applied Caselets',
      badge: 'Case Study Focus',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300',
      likelihood: 'Tier 3 Priority',
      focus: 'Real-World Scenarios, Comparative Analysis & Strategic Justifications'
    },
    {
      setId: 'SET-D',
      title: 'Set D: Grand Master Mock (Comprehensive Exam)',
      badge: 'Comprehensive Mock',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
      likelihood: 'Comprehensive Tier',
      focus: 'Complete Syllabus Merged, Highest-Weightage University Questions & Official Scoring Scheme'
    }
  ];

  const config = setConfigs[setIndex] || setConfigs[0];
  const metadata = {
    university: blueprint.university || "PARUL UNIVERSITY",
    faculty: blueprint.faculty || "FACULTY OF HIGHER EDUCATION & APPLIED STUDIES",
    program: blueprint.program || `University Examination (${config.setId} - Model Paper)`,
    examType: blueprint.examType || "Mid-Term Examination",
    semester: blueprint.semester || "Semester: III",
    date: "--/--/2026",
    subjectCode: `${blueprint.subjectCode || "PU302"}-${config.setId.replace('SET-', '')}`,
    subject: blueprint.subject || subjectName,
    time: blueprint.time || "1 hr 30 min",
    totalMarks: blueprint.totalMarks || calculatePatternTotalMarks(blueprint) || 40
  };

  const sectionsRendered = [];
  let topicCursor = (setIndex * 2) % activeTopics.length;

  blueprint.sections.forEach((sec, sIdx) => {
    const renderedSec = {
      id: sec.id || `sec-${sIdx}`,
      title: sec.name || `SECTION – ${String.fromCharCode(65 + sIdx)}`,
      marksTotal: `(${sec.marksTotal || 20} Marks)`,
      subSections: []
    };

    (sec.subSections || []).forEach((sub, subIdx) => {
      const qNum = subIdx + 1;
      const t = activeTopics[topicCursor % activeTopics.length];
      topicCursor++;
      const tNext = activeTopics[topicCursor % activeTopics.length];

      if (sub.type === 'Caselet' || sub.marksEach >= 10) {
        // Render Caselet
        const caseletObj = {
          id: `${config.setId}-S${sIdx}-Q${qNum}`,
          heading: sub.heading || `Q${qNum}. Answer the following question based on Case let (${sub.marksEach} Marks)`,
          marksTotal: `(${String(sub.marksEach).padStart(2, '0')} Marks)`,
          marks: sub.marksEach,
          co: `CO${Math.min(sIdx * 2 + subIdx + 1, 6)}`,
          bt: sub.marksEach >= 10 ? 'BT-6' : 'BT-5',
          caseletText: `Case Study (${t}):\nAn organization is evaluating its strategy and operations regarding ${t} within the context of ${subjectName}.\n\nContext & Scenario:\n• The team is tasked with analyzing key factors, parameters, and methodologies governing ${t}.\n• Initial observations indicate that proper implementation of standard frameworks significantly improves analytical accuracy and operational outcomes.\n• Management is reviewing alternative approaches to optimize resource utilization and achieve target objectives.\n\nRequired Question:\n(a) Analyze the core principles and operational challenges associated with ${t} in this scenario.\n(b) Propose a structured, evidence-based strategy that management should implement to resolve the operational challenges, justifying your recommendations with specific reference to course concepts.`,
          solution: `Case Study Analysis & Strategic Framework for ${t}:\n\nPart (a) Situational & Conceptual Analysis:\n1. Core Principles: ${t} requires structured identification of key variables, baseline assumptions, and operational constraints.\n2. Key Challenges: Common operational bottlenecks include inconsistent parameter measurement, insufficient coordination across operational units, and lack of standard evaluation criteria.\n3. Systemic Impact: Addressing these challenges directly enhances overall operational efficiency and reduces systematic error within ${subjectName}.\n\nPart (b) Strategic Recommendations & Implementation Protocol:\n1. Phase 1 — Diagnostic Baseline: Establish standardized operational metrics and performance benchmarks for ${t}.\n2. Phase 2 — Process Execution: Implement structured workflows with clearly delineated responsibility centers.\n3. Phase 3 — Continuous Review: Establish regular feedback loops to evaluate actual performance against benchmark criteria.\n\nStrategic Recommendation:\nBy grounding operational execution in established theoretical frameworks for ${t}, the organization achieves sustainable performance improvement aligned with academic and professional standards.`,
          key_points: [
            `Systematic situational analysis of ${t.slice(0, 45)}`,
            `Identification of key operational variables and performance bottlenecks`,
            `Actionable 3-phase strategic roadmap tailored to ${subjectName}`
          ]
        };
        renderedSec[`q${qNum}`] = caseletObj;
        renderedSec.subSections.push(caseletObj);
      } else {
        // Regular items (Q1, Q2, etc.)
        const items = [];
        const choicesCount = sub.choices || (sub.count > 1 ? sub.count + 1 : 2);

        for (let c = 0; c < choicesCount; c++) {
          const curTopic = (c % 2 === 0) ? t : tNext;
          const romanNo = ['i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.'][c] || `${c+1}.`;

          if (sub.marksEach <= 2) {
            items.push({
              id: `${config.setId}-S${sIdx}-Q${qNum}-${c+1}`,
              no: romanNo,
              question: c === 0
                ? `Define "${curTopic}" and state its primary significance in ${subjectName}.`
                : `State the essential operational distinction governing "${curTopic}".`,
              marks: sub.marksEach,
              co: `CO${sIdx * 2 + 1}`,
              bt: c === 0 ? 'BT-1' : 'BT-2',
              solution: `Academic Definition & Scope:\n${curTopic} represents the systematic analysis, measurement, and operational application of concepts within ${subjectName}.\n\nCore Operational Value:\nIt establishes foundational understanding, provides deterministic frameworks for analysis, and ensures rigorous alignment with curriculum outcomes.`,
              key_points: [`Formal academic definition of ${curTopic.slice(0, 45)}`, `Direct operational impact on analysis and evaluation`]
            });
          } else {
            items.push({
              id: `${config.setId}-S${sIdx}-Q${qNum}-${c+1}`,
              no: romanNo,
              question: c === 0
                ? `Explain the fundamental operational mechanics and step-by-step formulation of "${curTopic}". Illustrate with practical application in ${subjectName}.`
                : (c === 1
                    ? `Derive the analytical and methodological formulations governing "${curTopic}". How do practitioners utilize it for systematic control?`
                    : `Critically evaluate "${curTopic}". Compare its strategic advantages and operational limitations.`),
              marks: sub.marksEach,
              co: `CO${sIdx * 2 + 2}`,
              bt: c === 0 ? 'BT-2' : (c === 1 ? 'BT-3' : 'BT-4'),
              solution: `Comprehensive Analytical Treatment for ${curTopic}:\n\n1. Operational Mechanics:\nThe framework systematically establishes benchmark performance indicators and analyzes deviations at each operational stage.\n\n2. Methodological Formulation:\nCore Relationships = Baseline Parameters Evaluated Against Standardized Operational Benchmarks. By decomposing factors into rate, volume, and efficiency drivers, the methodology delivers actionable insight.\n\n3. Strategic Significance:\nEnables proactive bottleneck elimination, optimizes scarce resource allocation, and ensures 100% adherence to curriculum objectives.`,
              key_points: [
                `Sequential step-by-step operational mechanics of ${curTopic.slice(0, 40)}`,
                `Systematic derivation and decomposition of core drivers`,
                `Actionable protocol for continuous optimization`
              ]
            });
          }
        }

        const subObj = {
          id: `${config.setId}-S${sIdx}-Q${qNum}`,
          heading: sub.heading || `Q${qNum}. Attempt Any ${sub.count} Questions out of ${sub.choices} (${sub.marksEach} Marks Each)`,
          marksTotal: `(${String(sub.count * sub.marksEach).padStart(2, '0')} Marks)`,
          items: items
        };
        renderedSec[`q${qNum}`] = subObj;
        renderedSec.subSections.push(subObj);
      }
    });

    sectionsRendered.push(renderedSec);
  });

  const paperObj = {
    metadata: metadata,
    sections: sectionsRendered
  };

  // Map legacy sectionA and sectionB for full backwards compatibility
  if (sectionsRendered.length >= 2) {
    paperObj.sectionA = sectionsRendered[0];
    paperObj.sectionB = sectionsRendered[1];
  } else if (sectionsRendered.length === 1) {
    paperObj.sectionA = sectionsRendered[0];
    paperObj.sectionB = sectionsRendered[0];
  }

  return {
    setId: config.setId,
    title: config.title,
    badge: config.badge,
    badgeColor: config.badgeColor,
    likelihood: config.likelihood,
    focus: config.focus,
    paper: paperObj
  };
}

/**
 * Generates all 4 model examination sets based on active blueprint
 */
export function generateAllPredictedSets(blueprint, topics = [], subjectName = 'Course Examination') {
  return [0, 1, 2, 3].map(setIndex => {
    return generatePredictedPaperFromBlueprint(blueprint, topics, subjectName, setIndex);
  });
}
