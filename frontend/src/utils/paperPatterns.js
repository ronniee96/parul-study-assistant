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
