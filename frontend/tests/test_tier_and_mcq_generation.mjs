import assert from 'node:assert/strict';
import { generateDynamicQuestions } from '../src/utils/questionGenerator.js';

console.log("Running 300-Tier & Easy/Medium/Hard MCQ Verification Suite...\n");

const testText = `
=== [DOCUMENT 1: Extempore_and_Strategic_Analysis.pdf] ===
Extempore Speaking is an impromptu verbal presentation delivered without notes to assess spontaneous structure, stage presence, and articulation under time pressure.
SWOT Analysis is a strategic decision-making framework evaluating internal Strengths and Weaknesses alongside external Opportunities and Threats.
SOAR Analysis refers to a strength-based strategy model focusing on Strengths, Opportunities, Aspirations, and measurable Results.
Speech Structuring involves organizing speech into an attention-grabbing hook, 2-3 focused thematic body points, and a memorable concluding summary.
Vocal Modulation encompasses conscious variation in pitch, pace, volume, and deliberate pauses to sustain audience engagement.
`;

const questions = generateDynamicQuestions(testText, "Extempore_and_Strategic_Analysis.pdf");

// 1. Target 300 Count
console.log(`--- Test 1: Full 300-Question Generation ---`);
assert.equal(questions.length, 300, `Expected exactly 300 questions, got ${questions.length}`);
console.log(`✓ Successfully generated exactly ${questions.length} questions.`);

// 2. Tiers Verification
console.log(`\n--- Test 2: Tier Slicing (25, 100, 200, 300) ---`);
const top25 = questions.slice(0, 25);
const top100 = questions.slice(0, 100);
const top200 = questions.slice(0, 200);
const all300 = questions.slice(0, 300);

assert.equal(top25.length, 25, "Top 25 tier must have 25 questions");
assert.equal(top100.length, 100, "Top 100 tier must have 100 questions");
assert.equal(top200.length, 200, "Top 200 tier must have 200 questions");
assert.equal(all300.length, 300, "All 300 tier must have 300 questions");

// Verify evidence scores are sorted descending
for (let i = 0; i < questions.length - 1; i++) {
  assert.ok(
    (questions[i].evidence_score || 0) >= (questions[i + 1].evidence_score || 0),
    `Questions must be sorted descending by evidence_score at index ${i}`
  );
}
console.log(`✓ All tiers (25, 100, 200, 300) verified with descending evidence score ranking.`);

// 3. Easy, Medium, and Hard MCQs
console.log(`\n--- Test 3: Easy, Medium, and Hard MCQs Availability & Filtering ---`);
const mcqs = questions.filter(q => q.type === 'MCQ');
assert.ok(mcqs.length > 50, `Expected at least 50 MCQs in 300 pool, got ${mcqs.length}`);

const easyMcqs = mcqs.filter(q => q.difficulty === 1);
const mediumMcqs = mcqs.filter(q => q.difficulty === 2);
const hardMcqs = mcqs.filter(q => q.difficulty === 3);

assert.ok(easyMcqs.length > 10, `Expected at least 10 Easy MCQs, got ${easyMcqs.length}`);
assert.ok(mediumMcqs.length > 10, `Expected at least 10 Medium MCQs, got ${mediumMcqs.length}`);
assert.ok(hardMcqs.length > 10, `Expected at least 10 Hard MCQs, got ${hardMcqs.length}`);

console.log(`✓ MCQs Breakdown: ${easyMcqs.length} Easy, ${mediumMcqs.length} Medium, ${hardMcqs.length} Hard (Total ${mcqs.length} MCQs).`);

// Verify MCQ format
for (const mcq of mcqs) {
  assert.ok(Array.isArray(mcq.options), "MCQ must have options array");
  assert.equal(mcq.options.length, 4, "MCQ must have exactly 4 options");
  assert.ok(mcq.options[0].startsWith("A) "), "Option 0 must be labeled A) ");
  assert.ok(mcq.options[1].startsWith("B) "), "Option 1 must be labeled B) ");
  assert.ok(mcq.options[2].startsWith("C) "), "Option 2 must be labeled C) ");
  assert.ok(mcq.options[3].startsWith("D) "), "Option 3 must be labeled D) ");
  assert.ok(mcq.answer.includes("Correct Answer: Option"), "Answer must state correct option letter");
}
console.log(`✓ All 4-option MCQ formatting verified.`);

// 4. Zero Irrelevant Boilerplate
console.log(`\n--- Test 4: Zero Irrelevant Cost-Accounting Boilerplate ---`);
const boilerplateSubstrings = [
  "Establishes rigorous standard controls",
  "Relates primary input parameters directly to standardized metrics",
  "Refers exclusively to unverified estimates and disregards standard controls",
  "Discards all input variables and relies on arbitrary assignments"
];

for (const q of questions) {
  for (const bp of boilerplateSubstrings) {
    assert.ok(!q.question.includes(bp), `Question must not contain boilerplate '${bp}'`);
    assert.ok(!q.answer.includes(bp), `Answer must not contain boilerplate '${bp}'`);
  }
}
console.log(`✓ Confirmed zero irrelevant manufacturing cost boilerplate across all 300 questions.`);

console.log("\n======================================================");
console.log("ALL 300-TIER AND MCQ REGRESSION TESTS PASSED (4/4 suites).");
console.log("======================================================");
