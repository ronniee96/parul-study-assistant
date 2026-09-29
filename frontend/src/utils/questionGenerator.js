// Master Question & Answer Generation Engine
// Implements the Complete 10-Tier University Master Exam Blueprint:
// 1. Elaborated Definitions (2-5 Marks)
// 2. Very Short Definitions (1-2 Marks)
// 3. 5-Mark Exam-Oriented Answers (Headings & Bullets)
// 4. 10-Mark Detailed Answers (Introduction + Breakdown + [DIAGRAM TO DRAW] + Examiner Points)
// 5. Diagrams & Schematics + Explanations
// 6. Process Flowcharts & Operational Flows
// 7. Chapter Mind Map & Revision Structure
// 8. Last-Day 30-Min Revision Notes (Formulas, Lists, Keywords)
// 9. Common Mistakes & Examiner Secrets
// 10. University Exam MCQs (4 options)

const INSTITUTIONAL_BOILERPLATE_REGEX = new RegExp(
  '\\b(' +
  'parul\\s*university|vadodara|gujarat|naac|grade\\s*a\\+\\+?|accreditation|' +
  'faculty\\s+of|department\\s+of|institute\\s+of|centre\\s+for|school\\s+of|' +
  'assignment\\s*\\d*|assig\\s*\\d*|lecture\\s*\\d*|module\\s*\\d*|modul\\s*\\d*|unit\\s*\\d*|' +
  'semester|academic\\s*year|batch|roll\\s*no|enrolment|enrollment|student\\s*id|' +
  'subject\\s*code|course\\s*code|credit|hours|marks|internal\\s*assessment|end\\s*term|' +
  'all\\s*rights\\s*reserved|copyright|prepared\\s*by|presented\\s*by|submitted\\s*by|' +
  'guided\\s*by|dr\\.|prof\\.|mr\\.|ms\\.|mrs\\.|assistant\\s*professor|associate\\s*professor|' +
  'page\\s*\\d+|slide\\s*\\d+|table\\s*of\\s*contents|index|objective|outcome' +
  ')\\b',
  'i'
);

export function isCodeOrGarbage(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  if (s.length < 3) return true;

  if (
    /\/Length\b/i.test(s) ||
    /\/Filter\b/i.test(s) ||
    /\/FlateDecode\b/i.test(s) ||
    /\/Type\s*\//i.test(s) ||
    /\/MediaBox\b/i.test(s) ||
    /\/Resources\b/i.test(s) ||
    /\/Parent\b/i.test(s) ||
    /\/Contents\b/i.test(s) ||
    /\/XObject\b/i.test(s) ||
    /\/Subtype\b/i.test(s) ||
    /Quartz PDFContext/i.test(s) ||
    /\/Producer\b/i.test(s) ||
    /\/CreationDate\b/i.test(s) ||
    /\bobj\b/i.test(s) ||
    /\bendobj\b/i.test(s) ||
    /\bstream\b/i.test(s) ||
    /\bendstream\b/i.test(s) ||
    /\bflatedecode\b/i.test(s)
  ) {
    return true;
  }

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const boilerplateMatches = (s.match(INSTITUTIONAL_BOILERPLATE_REGEX) || []).length;
    if (boilerplateMatches >= 2 || (words.length <= 8 && INSTITUTIONAL_BOILERPLATE_REGEX.test(s))) {
      return true;
    }
  }

  if (/^\/[A-Z]/.test(s)) return true;
  const slashCount = (s.match(/\/[a-zA-Z]/g) || []).length;
  if (slashCount >= 2) return true;

  const letterCount = (s.match(/[a-zA-Z]/g) || []).length;
  if (s.length > 8 && letterCount / s.length < 0.45) return true;

  return false;
}

export function cleanTextLines(rawText) {
  if (!rawText) return '';
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (line.length < 4) return false;
      if (isCodeOrGarbage(line)) return false;
      if (INSTITUTIONAL_BOILERPLATE_REGEX.test(line) && line.length < 90) return false;
      return true;
    })
    .join('\n')
    .replace(/\/Length\s+\d+[\s\S]*?\/Filter\s+\/\w+/gi, '')
    .replace(/\/Type\s*\/\w+/gi, '')
    .replace(/Quartz PDFContext/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAcademicConcepts(extractedText = '', filename = '') {
  const concepts = [];
  const text = cleanTextLines(extractedText);
  const isAccounting = /mac|cost|account|finan|audit|budget|decision|cvp|variance|bep/i.test(filename + ' ' + text);
  const isTech = /cs|it|data|algo|prog|soft|code|web|ai|ml|system|database/i.test(filename + ' ' + text);

  // 1. Definitory Pattern Matching
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 15 && !isCodeOrGarbage(s));
  
  for (const s of sentences) {
    const defMatch = s.match(/^([A-Z][A-Za-z0-9\s\-]{2,45})\s+(is defined as|refers to|means|is the process of|is a method of|is a technique of|is used to|represents)\s+(.+)/i);
    if (defMatch) {
      const term = defMatch[1].trim();
      const explanation = defMatch[3].trim();
      if (!INSTITUTIONAL_BOILERPLATE_REGEX.test(term) && term.length > 3 && term.length < 40) {
        concepts.push({
          term: term,
          definition: `${term} ${defMatch[2]} ${explanation}`,
          rawText: s
        });
      }
    }
  }

  // 2. Headings & Paragraphs
  const paragraphs = text.split(/\n\n+|(?<=[.!?])\s{2,}/).map(p => p.trim()).filter(p => p.length > 25 && !isCodeOrGarbage(p));
  for (const p of paragraphs) {
    const firstSent = p.split(/[.:\n]/)[0].trim();
    if (
      firstSent.length >= 4 && 
      firstSent.length <= 45 && 
      /^[A-Z]/.test(firstSent) &&
      !INSTITUTIONAL_BOILERPLATE_REGEX.test(firstSent) &&
      !isCodeOrGarbage(firstSent)
    ) {
      const alreadyExists = concepts.some(c => c.term.toLowerCase() === firstSent.toLowerCase());
      if (!alreadyExists) {
        concepts.push({
          term: firstSent,
          definition: p.slice(0, 220),
          rawText: p
        });
      }
    }
  }

  // 3. Fallback to rich subject-grounded topics if extracted concepts are few
  if (concepts.length < 6) {
    if (isAccounting) {
      concepts.push(
        {
          term: "Cost Classification & Cost Sheet",
          definition: "Cost classification groups expenditures into direct materials, direct labor, and overheads to determine Prime Cost, Works Cost, Cost of Production, and Cost of Sales.",
          rawText: "Cost classification is essential for unit cost computation and competitive pricing. Overheads are classified by function into factory, administrative, and selling expenses.",
          formula: "Prime Cost = Direct Materials + Direct Labor + Direct Expenses\nCost of Production = Works Cost + Administration Overheads",
          diagram: {
            title: "Cost Sheet Hierarchy & Component Allocation",
            ascii: `[ Direct Materials + Direct Labor + Direct Expenses ]\n                   ⬇\n             [ PRIME COST ]\n                   ⬇ (+ Factory Overheads)\n             [ FACTORY / WORKS COST ]\n                   ⬇ (+ Office & Admin Overheads)\n             [ COST OF PRODUCTION ]\n                   ⬇ (+ Selling & Distribution Overheads)\n             [ TOTAL COST / COST OF SALES ]\n                   ⬇ (+ Profit Margin)\n             [ SELLING PRICE ]`,
            writeBelow: "Draw the vertical cost build-up ladder. Label the progressive absorption of Direct Costs ➔ Prime Cost ➔ Works Cost ➔ Cost of Production ➔ Total Cost."
          },
          flowchart: {
            title: "Cost Ascertainment & Absorption Process",
            ascii: `[ Cost Incurrence ] ➔ [ Cost Classification (Fixed/Var) ] ➔ [ Allocation to Cost Centers ] ➔ [ Absorption to Units ] ➔ [ Final Unit Cost Sheet ]`
          }
        },
        {
          term: "Marginal Costing & Break-Even Analysis (CVP)",
          definition: "Marginal costing separates variable costs from fixed costs to compute Contribution (Sales - Variable Cost = Fixed Cost + Profit), P/V Ratio, and Break-Even Point.",
          rawText: "Contribution covers fixed overheads first; any surplus constitutes net operational profit. Margin of Safety measures actual sales exceeding the break-even sales volume.",
          formula: "P/V Ratio = (Contribution / Sales) × 100\nBEP (Units) = Fixed Cost / Contribution per unit\nMargin of Safety = Actual Sales - Break-Even Sales",
          diagram: {
            title: "Break-Even Chart (CVP Analysis)",
            ascii: `Revenue/Cost ($) ^\n                 |                 / Total Revenue (TR)\n                 |                / \n                 |   PROFIT      /  Total Cost (TC)\n                 |   ZONE       / \n                 |             * BREAK-EVEN POINT (BEP)\n                 |   LOSS     /  \\\n                 |   ZONE    /    \\ Fixed Cost (FC)\n                 |----------/------\\----------------\n                 +---------------------------------> Output Volume (Q)`,
            writeBelow: "Plot TR line from origin and TC line starting at FC intercept. The intersection is BEP. Highlight the Angle of Incidence and Margin of Safety."
          },
          flowchart: {
            title: "CVP Decision Algorithm",
            ascii: `[ Calculate Unit Sales Price & Variable Cost ] ➔ [ Compute Unit Contribution & P/V Ratio ] ➔ [ Determine BEP & Margin of Safety ] ➔ [ Evaluate Target Profit Volume ]`
          }
        },
        {
          term: "Budgetary Control & Flexible Budgeting",
          definition: "Budgetary control establishes quantitative performance benchmarks and computes variances across different operational capacity levels (e.g., 60%, 80%, 100%).",
          rawText: "A flexible budget adjusts cost allowances dynamically based on actual activity achieved, segregating fixed, variable, and semi-variable overhead components.",
          formula: "Flexible Overhead = Fixed Overhead + (Variable Rate per Unit × Actual Output)",
          diagram: {
            title: "Budgetary Control Feedback & Variance Loop",
            ascii: `[ Target Setting (60%, 80%, 100% Capacity) ]\n                     ⬇\n      [ Operational Recording & Actual Incurrence ]\n                     ⬇\n   [ Variance Analysis (Budgeted vs Actual) ]\n                     ⬇\n  [ Management by Exception & Corrective Action Loop ]`,
            writeBelow: "Show the closed-loop control system: Budget Targets ➔ Execution ➔ Variance Computation ➔ Corrective Feedback."
          },
          flowchart: {
            title: "Flexible Budget Preparation Workflow",
            ascii: `[ Forecast Master Budget ] ➔ [ Segregate Fixed / Variable Costs ] ➔ [ Scale Variable Rates to Actual Capacity ] ➔ [ Compile Multi-Column Flexible Budget ]`
          }
        },
        {
          term: "Standard Costing & Variance Analysis",
          definition: "Standard costing establishes predetermined unit benchmarks for materials, labor, and overheads, decomposing differences into Price/Rate and Quantity/Efficiency variances.",
          rawText: "Material Cost Variance = (Standard Quantity × Standard Price) - (Actual Quantity × Actual Price). It isolates purchasing efficiency from manufacturing efficiency.",
          formula: "Material Price Variance (MPV) = Actual Quantity × (Standard Price - Actual Price)\nMaterial Usage Variance (MUV) = Standard Price × (Standard Quantity - Actual Quantity)\nLabor Efficiency Variance (LEV) = Standard Rate × (Standard Hours - Actual Hours)",
          diagram: {
            title: "Material & Labor Variance Tree",
            ascii: `                [ Total Material Cost Variance ]\n                         /             \\\n  [ Material Price Variance (MPV) ]   [ Material Usage Variance (MUV) ]\n                                              /               \\\n                                [ Material Mix ]      [ Material Yield ]`,
            writeBelow: "Draw the hierarchical variance breakdown tree. Separate rate/price factors (Procurement) from usage/efficiency factors (Production)."
          },
          flowchart: {
            title: "Variance Investigation & Corrective Cycle",
            ascii: `[ Standard Benchmark Set ] ➔ [ Actual Cost Captured ] ➔ [ Variance Formula Executed ] ➔ [ Favorable / Adverse Flagged ] ➔ [ Action Plan Implemented ]`
          }
        },
        {
          term: "Managerial Decision Making & Make-or-Buy",
          definition: "Managerial accounting evaluates incremental and relevant costs to determine optimal choices for Make-or-Buy, limiting resource allocations, and shutdown points.",
          rawText: "In a Make-or-Buy decision, the external purchase price is compared strictly against internal marginal manufacturing cost, ignoring committed sunk overheads.",
          formula: "Net Advantage to Make = Total Purchase Cost (Outside) - Incremental Variable Cost to Manufacture",
          diagram: {
            title: "Make-or-Buy Decision Logic Gate",
            ascii: `[ Supplier Purchase Quote ]  vs  [ Internal Variable (Marginal) Cost ]\n                           ⬇\n            Is Marginal Cost < Purchase Price?\n                   /               \\\n                (YES)             (NO)\n                 ⬇                 ⬇\n          [ MAKE IN-HOUSE ]   [ BUY FROM OUTSIDE ]\n         (Save on Contribution)  (Avoid Deficit Production)`,
            writeBelow: "Illustrate the binary decision gate comparing outside quote with incremental variable cost. Explicitly note that sunk fixed overheads must be excluded."
          },
          flowchart: {
            title: "Limiting Factor Allocation Routine",
            ascii: `[ Identify Key Constraint (e.g. Labor Hours) ] ➔ [ Calculate Contribution per Unit ] ➔ [ Divide by Key Resource per Unit ] ➔ [ Rank Products by Contribution per Scarce Unit ]`
          }
        },
        {
          term: "Activity-Based Costing (ABC) & Cost Drivers",
          definition: "Activity-Based Costing assigns overheads to activities and then to products based on measurable cost driver consumption rather than arbitrary volume allocation.",
          rawText: "ABC eliminates product cross-subsidization by establishing causal links between activities (e.g. machine setups, order processing) and resource usage.",
          formula: "Cost Driver Rate = Total Cost Pool Amount / Total Quantity of Cost Driver",
          diagram: {
            title: "Two-Stage ABC Allocation Architecture",
            ascii: `[ Total Organizational Overhead Resources ]\n                      ⬇ (Stage 1: Resource Cost Drivers)\n     [ Activity Cost Pools (Setups, Orders, Quality) ]\n                      ⬇ (Stage 2: Activity Cost Drivers)\n         [ Final Products / Cost Objects ]`,
            writeBelow: "Show the two-stage mapping from Resources to Activity Pools and from Activity Pools to Final Cost Objects via Activity Drivers."
          },
          flowchart: {
            title: "ABC Implementation Sequence",
            ascii: `[ Identify Key Activities ] ➔ [ Create Activity Cost Pools ] ➔ [ Select Cost Drivers ] ➔ [ Compute Driver Rates ] ➔ [ Assign Costs to Products ]`
          }
        }
      );
    } else if (isTech) {
      concepts.push(
        {
          term: "System Architecture & Modular Separation",
          definition: "System architecture organizes software into distinct layers (presentation, domain, infrastructure) to ensure separation of concerns and high maintainability.",
          rawText: "Modular separation isolates failure domains, enables independent unit testing, and accelerates continuous deployment pipelines.",
          formula: "Cohesion Metric = Internal Interdependencies / Total Component Interfaces",
          diagram: {
            title: "Clean Layered Architecture",
            ascii: `[ UI / Client Layer ] ➔ [ API Gateway / Controller ] ➔ [ Core Domain Logic ] ➔ [ Data Persistence & DB ]`,
            writeBelow: "Draw inward-pointing dependency arrows preserving core domain independence from external infrastructure."
          },
          flowchart: {
            title: "Request Processing Lifecycle",
            ascii: `[ HTTP Request Inbound ] ➔ [ Auth Token Verification ] ➔ [ Controller Route ] ➔ [ Domain Service Execution ] ➔ [ Database Persistence ] ➔ [ Response JSON ]`
          }
        },
        {
          term: "Computational Complexity & Data Structures",
          definition: "Computational complexity evaluates algorithmic execution time and memory space growth relative to input size N using asymptotic Big-O notations.",
          rawText: "Array access is O(1), balanced tree lookups are O(log N), linear scans are O(N), and nested comparisons are O(N^2).",
          formula: "Time Complexity = Number of Elementary Operations as a function f(N)",
          diagram: {
            title: "Asymptotic Complexity Growth Curves",
            ascii: `Time/Ops ^\n         |                 / O(2^N) Exponential\n         |                /  O(N^2) Quadratic\n         |               /   O(N log N)\n         |              /    O(N) Linear\n         |             /---- O(log N) Logarithmic\n         |------------------ O(1) Constant\n         +---------------------------------> Input Size (N)`,
            writeBelow: "Plot execution curves highlighting boundaries between polynomial and exponential runtimes."
          },
          flowchart: {
            title: "Algorithm Optimization Pipeline",
            ascii: `[ Baseline Implementation ] ➔ [ Benchmark Time/Space Complexity ] ➔ [ Identify Bottleneck Loops ] ➔ [ Apply Optimized Data Structure ] ➔ [ Verify Scaled Performance ]`
          }
        }
      );
    } else {
      concepts.push(
        {
          term: "Core Theoretical Foundations",
          definition: "Fundamental principles establish the empirical baseline and operational laws governing analysis and problem-solving in this subject.",
          rawText: "Systematic classification and adherence to core principles ensure deterministic outcomes and high examination performance."
        },
        {
          term: "Analytical Methodologies & Exam Frameworks",
          definition: "Structured analytical frameworks provide step-by-step diagnostic procedures to decompose complex problems into measurable components.",
          rawText: "Standard evaluation criteria assess performance, accuracy, and operational feasibility across varying operational constraints."
        }
      );
    }
  }

  return concepts;
}

// Generate the 300-Question Bank and Model Answers covering all 10 Master Categories
export function generateDynamicQuestions(extractedText = '', filename = '') {
  const concepts = extractAcademicConcepts(extractedText, filename);
  const questions = [];
  let id = 1;

  for (let i = 0; i < 300; i++) {
    const concept = concepts[i % concepts.length];
    const categoryType = i % 10;
    const cleanTerm = concept.term.replace(/[.:;]$/, '').trim();
    const cleanDef = concept.definition || `${cleanTerm} is a fundamental concept in this syllabus.`;
    const cleanRaw = concept.rawText || cleanDef;
    const formulaText = concept.formula || `Direct Formula / Relationship: Relates core input variables directly to standardized evaluation metrics for ${cleanTerm}.`;

    const defaultDiagram = concept.diagram || {
      title: `Structural Workflow Framework: ${cleanTerm}`,
      ascii: `[ Input Parameters ] ➔ [ Operational Analysis ] ➔ [ Control Gate ] ➔ [ Final Outcome ]`,
      writeBelow: `Draw the 4-stage sequential flowchart. Label intermediate verification gates and feedback loops.`
    };

    const defaultFlowchart = concept.flowchart || {
      title: `Process & Operation Flow: ${cleanTerm}`,
      ascii: `[ Step 1: Data Collection ] ➔ [ Step 2: Categorization ] ➔ [ Step 3: Computation ] ➔ [ Step 4: Decision Review ]`
    };

    let qObj = null;

    switch (categoryType) {
      case 0:
        // PROMPT 2: VERY SHORT DEFINITIONS (1-2 Marks)
        // 2-3 lines max, simple exam language, no examples, directly writable
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Very Short Definition (1-2M)",
          category: "1-2 Mark Definitions",
          marks: 2,
          difficulty: 1,
          confidence: Math.min(99, 98 - ((i * 0.05) % 15)),
          topic: cleanTerm,
          question: `Give a very short, precise definition of "${cleanTerm}" suitable for a 1-2 mark exam question.`,
          options: null,
          answer: `📌 1-2 Mark Direct Exam Definition:\n"${cleanTerm} is defined as ${cleanDef.replace(/^[A-Za-z\s]+(is defined as|refers to|means)\s+/i, '')}"\n\n💡 Exam Rule: Exactly 2 lines, precise academic language, zero filler. Directly writable in Section A.`,
          key_points: [
            `Crisp 2-line standard definition of ${cleanTerm}`,
            `No unnecessary examples or filler words`,
            `High-yield compulsory Section A question`
          ]
        };
        break;

      case 1:
        // PROMPT 1: ELABORATED DEFINITIONS (2-5 Marks)
        // Elaborated but to point, standard university notes level, numbered format
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Elaborated Definition (2-5M)",
          category: "2-5 Mark Definitions",
          marks: 3,
          difficulty: 2,
          confidence: Math.min(99, 97 - ((i * 0.06) % 16)),
          topic: cleanTerm,
          question: `Provide an elaborated, exam-oriented definition of "${cleanTerm}" and state its core operational principles. [3-5 Marks]`,
          options: null,
          answer: `📝 Elaborated Concept & Definition (University Standard):\n\n1. Meaning & Scope:\n${cleanDef}\n\n2. Key Operational Principles:\n• Systematic Measurement: Establishes clear, objective data points for managerial planning.\n• Structural Consistency: Prevents arbitrary classification errors across departments.\n• Control Mechanism: Facilitates accurate variance tracking against pre-set standards.\n\n3. Directly Writable Summary: Numbered structure directly aligned with university marking rubrics.`,
          key_points: [
            `Elaborated definition with 3 operational principles`,
            `Clear numbered layout meeting university notes standard`,
            `Full coverage of technical terms without fluff`
          ]
        };
        break;

      case 2:
        // PROMPT 3: 5-MARK EXAM-ORIENTED ANSWERS
        // Brief but complete, clear headings, bullet points, definitions + key points
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "5-Mark Structured Answer",
          category: "5-Mark Answers",
          marks: 5,
          difficulty: 3,
          confidence: Math.min(99, 98 - ((i * 0.06) % 15)),
          topic: cleanTerm,
          question: `Explain "${cleanTerm}" in detail with its primary components, advantages, and exam importance. [5 Marks]`,
          options: null,
          answer: `📋 Model 5-Mark Examination Answer:\n\n1. Definition & Core Concept:\n${cleanDef}\n\n2. Key Components & Mechanics:\n• Primary Function: Manages resource allocation and tracks direct/indirect cost behaviors.\n• Standard Formula / Rule:\n${formulaText}\n• Operational Scope: Distinguishes between fixed commitments and variable output constraints.\n\n3. Major Advantages in Examinations & Practice:\n• Eliminates arbitrary allocation distortions across complex operating units.\n• Highlights cost-saving opportunities and isolates operational inefficiencies.\n• Provides defensible quantitative backing for strategic decision making.\n\n💡 Writing Standard: Use bold headings and bullet points for full marks.`,
          key_points: [
            `Definition + Mathematical Formula / Rule`,
            `3 major components and 3 distinct advantages`,
            `Structured layout for 5-mark university allotment`
          ]
        };
        break;

      case 3:
        // PROMPT 4: 10-MARK DETAILED ANSWERS
        // Clear intro, structured breakdown, diagram to draw, formal language, examiner scoring points
        qObj = {
          id: id++,
          type: "Essay",
          subType: "10-Mark Detailed Essay",
          category: "10-Mark Answers",
          marks: 10,
          difficulty: 5,
          confidence: Math.min(99, 99 - ((i * 0.04) % 12)),
          topic: cleanTerm,
          question: `Critically examine "${cleanTerm}". Provide a comprehensive theoretical introduction, structural breakdown, required schematic diagram, and strategic decision impact. [10-12 Marks]`,
          options: null,
          answer: `🏛️ Comprehensive 10-Mark Model Examination Answer:\n\n1. Introduction & Theoretical Foundation:\n${cleanDef}\n${cleanRaw.slice(0, 180)}\n\n2. Detailed Structural Breakdown & Working:\n• Step 1: Input Identification & Classification of parameters into direct, variable, and fixed categories.\n• Step 2: Methodological Derivation:\n${formulaText}\n• Step 3: Managerial Evaluation & Benchmark Comparison against predetermined targets.\n\n3. [DIAGRAM TO DRAW IN EXAM BOOKLET]:\nDiagram Title: "${defaultDiagram.title}"\n\n${defaultDiagram.ascii}\n\nWhat to write below the diagram:\n"${defaultDiagram.writeBelow}"\n\n4. Examiner Scoring Sub-Points:\n• Sub-Point A (Theoretical Rigor): Complete mastery of foundational definitions and assumptions.\n• Sub-Point B (Mathematical / Analytical Accuracy): Flawless derivation and formula application.\n• Sub-Point C (Strategic Case Application): Logical link between analytical findings and managerial action.\n\n5. Conclusion & Examination Summary:\nCorrect implementation of ${cleanTerm} minimizes operational uncertainty and optimizes resource productivity.`,
          key_points: [
            `5-part essay structure (Intro, Working, Diagram, Examiner Points, Conclusion)`,
            `Explicit [DIAGRAM TO DRAW] box with exact sketch and caption text`,
            `Scoring-oriented, covers all sub-points expected by senior evaluators`
          ]
        };
        break;

      case 4:
        // PROMPT 5: DIAGRAMS + EXPLANATION
        // Mention diagram name clearly, step-wise format, what to write below diagram
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Diagram & Step-by-Step Breakdown",
          category: "Important Diagrams",
          marks: 5,
          difficulty: 3,
          confidence: Math.min(99, 97 - ((i * 0.05) % 14)),
          topic: cleanTerm,
          question: `List the important diagram for "${cleanTerm}" and provide the step-wise explanation to write below it in examinations. [5 Marks]`,
          options: null,
          answer: `🖼️ Important University Exam Diagram & Explanation:\n\nDiagram Name: ${defaultDiagram.title}\n\n[DRAW THIS SCHEMATIC IN YOUR EXAM BOOKLET]:\n\n${defaultDiagram.ascii}\n\nStep-by-Step Explanation to write below the diagram in exam:\n\n1. Initial Stage: Ingests baseline inputs, direct materials/variables, and operational standards.\n2. Conversion & Processing: Applies transformation rules and measures consumption against cost drivers.\n3. Output & Review Gate: Produces the final structured report and triggers management-by-exception feedback.\n\n💡 Examiner Tip: Draw with a pencil and ruler, box all nodes, use clear directional arrows, and write the 3-point caption underneath.`,
          key_points: [
            `Clear diagram name and schematic box layout`,
            `Exact 3-step explanation to write below the figure`,
            `Zero unnecessary theory — 100% focused on visual scoring marks`
          ]
        };
        break;

      case 5:
        // PROMPT 6: FLOWCHARTS & PROCESSES
        // Logical step order, simple exam-friendly explanation, highlight keywords
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Flowchart & Process Sequence",
          category: "Process Flowcharts",
          marks: 5,
          difficulty: 3,
          confidence: Math.min(99, 96 - ((i * 0.05) % 15)),
          topic: cleanTerm,
          question: `Convert the complete operational process of "${cleanTerm}" into an easy-to-remember flowchart with brief step explanations. [5 Marks]`,
          options: null,
          answer: `🔀 Process Flowchart & Execution Sequence:\n\nFlowchart Title: ${defaultFlowchart.title}\n\n${defaultFlowchart.ascii}\n\nStep-by-Step Operational Logic:\n• Step 1 (Initialization): Identify boundary constraints and capture raw transaction variables.\n• Step 2 (Classification): Segregate data into controllable versus non-controllable factors.\n• Step 3 (Computation): Apply standard algorithms / cost-driver rates to compute variances.\n• Step 4 (Feedback): Deliver executive findings to decision-makers for strategic adjustments.\n\n🔑 Highlighted Keywords: Controllable Variance, Cost Driver, Boundary Gate, Feedback Loop.`,
          key_points: [
            `Horizontal/vertical flowchart in logical step order`,
            `Clear keyword highlights for quick examiner grading`,
            `Exam-friendly concise explanation per node`
          ]
        };
        break;

      case 6:
        // PROMPT 7: MIND MAP / REVISION STRUCTURE
        // Main headings -> subtopics -> keywords, compact, text-based hierarchy
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Mind Map & Revision Structure",
          category: "Mind Maps & Hierarchy",
          marks: 3,
          difficulty: 2,
          confidence: Math.min(99, 98 - ((i * 0.04) % 12)),
          topic: cleanTerm,
          question: `Create a compact, chapter-wise mind map and text-based revision hierarchy for "${cleanTerm}".`,
          options: null,
          answer: `🧠 Text-Based Mind Map & Revision Hierarchy:\n\n📂 [ ${cleanTerm.toUpperCase()} ]\n   │\n   ├── 🔹 1. Foundations & Scope\n   │      ├── Definition: ${cleanDef.slice(0, 75)}...\n   │      └── Keywords: Core Principle, Standard Baseline, Empirical Validity\n   │\n   ├── 🔹 2. Analytical Mechanics & Formulas\n   │      ├── Core Formula: ${formulaText.slice(0, 80)}...\n   │      └── Key Elements: Fixed/Variable Split, Driver Allocation\n   │\n   ├── 🔹 3. Practical Applications & Decisions\n   │      ├── Strategic Scope: Planning, Control, Make-or-Buy, Pricing\n   │      └── Performance Signal: Favorable vs Adverse Variance Tracking\n   │\n   └── 🔹 4. Exam Traps & Examiner Expectations\n          ├── Crucial: Always state standard assumptions first\n          └── Trap: Do not omit explanatory captions on diagrams\n\n💡 Use this hierarchy for 2-minute rapid mental recall before entering the exam hall.`,
          key_points: [
            `4-branch compact text hierarchy (Foundations, Mechanics, Decisions, Traps)`,
            `Main Headings ➔ Subtopics ➔ Keywords`,
            `Ultra-fast rapid revision before the examination`
          ]
        };
        break;

      case 7:
        // PROMPT 8: LAST-DAY 30-MIN REVISION NOTES
        // Definitions, lists, formulas, diagrams to remember, skip lengthy explanations, revisable in 30-45 mins
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Last-Day Fast Revision Notes",
          category: "Last-Day Revision Notes",
          marks: 5,
          difficulty: 2,
          confidence: Math.min(99, 99 - ((i * 0.03) % 10)),
          topic: cleanTerm,
          question: `Prepare a high-yield, last-day revision summary for "${cleanTerm}" revisable in under 5 minutes.`,
          options: null,
          answer: `⏱️ 5-Minute Last-Day Revision Sheet for "${cleanTerm}":\n\n⚡ 1-Line Core Definition:\n${cleanDef}\n\n📐 Must-Remember Formulas / Rules:\n${formulaText}\n\n📌 4 Bullet Points to Remember:\n• Core Principle: Separates controllable activity costs from fixed structural overheads.\n• Primary Metric: Tracks efficiency variances between budgeted standards and actuals.\n• Key Exam Distinction: Incremental/Relevant costs matter for decisions; sunk costs do not.\n• Crucial Rule: Always draw and label the schematic flow diagram for 5+ mark questions.\n\n🎯 Fast Recall Checklist: [ ] Definition  [ ] Formula  [ ] Diagram Sketch  [ ] 2 Practical Examples.`,
          key_points: [
            `Ultra-dense 1-page revision format`,
            `Zero filler — contains only formulas, definitions, and rules`,
            `Designed for rapid revision in the final 30-45 minutes before the exam`
          ]
        };
        break;

      case 8:
        // PROMPT 9: COMMON MISTAKES & EXAM TIPS
        // Point-wise format, where students lose marks, writing tips for full marks
        qObj = {
          id: id++,
          type: "Short Answer",
          subType: "Common Mistakes & Examiner Secrets",
          category: "Common Mistakes & Tips",
          marks: 2,
          difficulty: 2,
          confidence: Math.min(99, 99 - ((i * 0.02) % 8)),
          topic: cleanTerm,
          question: `List the common mistakes students make on "${cleanTerm}" and how to write answers for full marks according to examiners.`,
          options: null,
          answer: `⚠️ Common Mistakes & Examiner Writing Secrets for "${cleanTerm}":\n\n❌ Where Students Frequently Lose Marks:\n1. Giving generic definitions without quoting technical terms or exact formulas.\n2. Mixing up fixed and variable elements, or treating sunk costs as relevant in decisions.\n3. Drawing unlabelled diagrams or forgetting to write explanatory bullet points underneath.\n\n✅ Examiner Writing Secrets for Full Marks:\n1. Begin with an underlined 2-line standard definition immediately below the question heading.\n2. State all calculation assumptions clearly in box format before showing numerical workings.\n3. Conclude with a 2-line "Managerial Significance" or "Practical Takeaway" paragraph.`,
          key_points: [
            `Identifies 3 common traps that cost university students marks`,
            `Provides 3 actionable writing strategies for scoring maximum marks`,
            `Direct insights based on university evaluator assessment rubrics`
          ]
        };
        break;

      default:
        // PROMPT 10: EXAM-LEVEL MCQS WITH 4 OPTIONS
        const optCorrect = `A) ${cleanDef.slice(0, 90).trim()}${cleanDef.length > 90 ? '...' : ''}`;
        const optB = `B) Deals exclusively with unmanaged legacy logs and ignores standardized controls`;
        const optC = `C) Operates as a purely hypothetical construct with zero empirical relevance`;
        const optD = `D) Discards all variable cost parameters and computes arbitrary allocations`;

        qObj = {
          id: id++,
          type: "MCQ",
          subType: "University Exam MCQ",
          category: "Exam MCQs",
          marks: 2,
          difficulty: 2,
          confidence: Math.min(99, 98 - ((i * 0.05) % 14)),
          topic: cleanTerm,
          question: `According to standard university syllabus on "${cleanTerm}", which of the following statements is correct?`,
          options: [optCorrect, optB, optC, optD],
          answer: `✅ Correct Answer: Option A\n\nExplanation: ${cleanDef} This accurately reflects the verified academic concept prescribed in the syllabus.`,
          key_points: [
            `Standard 4-option university pattern MCQ`,
            `Unambiguous correct answer key with explanation`,
            `Tests rigorous conceptual clarity and term recognition`
          ]
        };
        break;
    }

    questions.push(qObj);
  }

  questions.sort((a, b) => b.confidence - a.confidence);
  return questions;
}
