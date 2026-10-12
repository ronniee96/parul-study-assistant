import assert from 'assert';
import { generateDynamicQuestions } from './src/utils/questionGenerator.js';
import { generatePredictedPaperFromBlueprint, generateAllPredictedSets, PAPER_PATTERN_TEMPLATES } from './src/utils/paperPatterns.js';

console.log('🧪 Starting Comprehensive Cross-Subject Data Contamination Regression Test Suite\n');

const FORBIDDEN_ACCOUNTING_TERMS = [
  'marginal costing',
  'break-even',
  'cost sheet',
  'variance analysis',
  'standard costing',
  'p/v ratio',
  'contribution margin',
  'factory overhead',
  'prime cost',
  'material cost variance',
  'labor cost variance',
  'flexible budget',
  'absorption costing',
  '$120.00',
  '$280,000'
];

// ==========================================
// Test 1: Personal Development Document Processing
// ==========================================
console.log('Test 1: Processing Personal Development syllabus...');

const personalDevText = `
Personal Development and Professional Ethics:
Self-Efficacy is defined as an individual's belief in their capacity to execute behaviors necessary to produce specific performance attainments. According to Albert Bandura, self-efficacy reflects confidence in the ability to exert control over one's own motivation, behavior, and social environment.
Emotional Intelligence refers to the ability to perceive, control, and evaluate emotions. Daniel Goleman posits five components: self-awareness, self-regulation, motivation, empathy, and social skills.
Active Listening is the practice of preparing to listen, observing what verbal and non-verbal messages are being sent, and then providing appropriate feedback to show attentive comprehension.
Time Management involves organizing and planning how to divide time between specific activities to increase effectiveness, efficiency, and productivity. The Eisenhower Matrix categorizes tasks by urgency and importance.
Growth Mindset is the belief that abilities and intelligence can be developed through dedication, hard work, and constructive feedback, as formulated by Carol Dweck.
Conflict Resolution represents the methods and processes involved in facilitating the peaceful ending of conflict and retribution between differing parties.
`;

const pdQuestions = generateDynamicQuestions(personalDevText, 'Personal_Development_Module_1.pdf');
assert.ok(pdQuestions.length >= 6, `Expected at least 6 generated questions, got ${pdQuestions.length}`);
console.log(`✓ Generated ${pdQuestions.length} dynamic questions for Personal Development.`);

// Assert 0 occurrences of cost accounting terms
let leakCount = 0;
for (const q of pdQuestions) {
  const fullText = `${q.question} ${q.answer} ${(q.key_points || []).join(' ')} ${q.topic}`.toLowerCase();
  for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
    if (fullText.includes(term)) {
      console.error(`❌ Leak detected in question ${q.id}: Found '${term}' in "${q.question}"`);
      leakCount++;
    }
  }
}
assert.strictEqual(leakCount, 0, `Zero accounting terms must leak into Personal Development questions. Found ${leakCount} leaks.`);
console.log('✓ Passed: Zero Cost Accounting leakage in Personal Development Question Bank.\n');

// ==========================================
// Test 2: Exam Predictor Blueprint Generation for Personal Development
// ==========================================
console.log('Test 2: Generating 4 Model Predicted Paper Sets for Personal Development...');

const pdTopics = [
  'Self-Efficacy & Goal Setting',
  'Emotional Intelligence Frameworks',
  'Active Listening & Communication',
  'Time Management & The Eisenhower Matrix',
  'Growth Mindset & Resilience',
  'Conflict Resolution & Negotiation'
];

const blueprint = PAPER_PATTERN_TEMPLATES.parul_midterm_40;
const sets = generateAllPredictedSets(blueprint, pdTopics, 'Personal Development & Professional Ethics');
assert.strictEqual(sets.length, 4, 'Should generate 4 authentic exam sets (Set A, B, C, D)');

let examLeakCount = 0;
for (const set of sets) {
  console.log(`  Evaluating ${set.title}...`);
  const sections = set.paper.sections || [];
  assert.ok(sections.length >= 2, `Expected at least 2 sections in paper, got ${sections.length}`);

  for (const sec of sections) {
    for (const sub of (sec.subSections || [])) {
      if (sub.caseletText) {
        const cText = (sub.caseletText + ' ' + (sub.solution || '')).toLowerCase();
        for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
          if (cText.includes(term)) {
            console.error(`❌ Leak in Caselet (${sub.heading}): found '${term}'`);
            examLeakCount++;
          }
        }
        assert.ok(
          cText.includes('personal development') || cText.includes('scenario') || cText.includes('organization'),
          'Caselet should contextualize Personal Development'
        );
      }
      if (sub.items) {
        for (const item of sub.items) {
          const itemText = (item.question + ' ' + (item.solution || '')).toLowerCase();
          for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
            if (itemText.includes(term)) {
              console.error(`❌ Leak in question item (${item.question}): found '${term}'`);
              examLeakCount++;
            }
          }
        }
      }
    }
  }
}

assert.strictEqual(examLeakCount, 0, `Zero accounting terms must leak into Personal Development Exam Predictor papers. Found ${examLeakCount} leaks.`);
console.log('✓ Passed: Zero Cost Accounting leakage in all 4 Exam Predictor sets (A, B, C, D).\n');

// ==========================================
// Test 3: Fallback Blueprint Generation with 0 Passed Topics
// ==========================================
console.log('Test 3: Fallback Blueprint Generation with Empty Topics...');
const fallbackSet = generatePredictedPaperFromBlueprint(blueprint, [], 'Computer Networks');
const fallbackStr = JSON.stringify(fallbackSet).toLowerCase();

for (const term of FORBIDDEN_ACCOUNTING_TERMS) {
  assert.ok(
    !fallbackStr.includes(term),
    `Empty topics fallback leaked accounting term '${term}' into Computer Networks paper`
  );
}
assert.ok(fallbackStr.includes('computer networks'), 'Fallback should ground in subject name Computer Networks');
console.log('✓ Passed: Empty topic fallback produces clean Computer Networks topics with zero accounting leakage.\n');

// ==========================================
// Test 4: Genuine Dynamic Metrics (No Fake 98% / 99.99%)
// ==========================================
console.log('Test 4: Dynamic Evidence Metrics...');
for (const set of sets) {
  assert.ok(!set.likelihood.includes('99.99%'), `Fabricated percentage 99.99% must be removed from ${set.setId}`);
}

const avgConfidence = Math.round(pdQuestions.reduce((s, q) => s + q.confidence, 0) / pdQuestions.length);
assert.ok(avgConfidence >= 70 && avgConfidence <= 95, `Realistic grounded confidence expected, got ${avgConfidence}%`);
console.log(`✓ Realistic average confidence computed from real records: ${avgConfidence}%.\n`);

console.log('🎉 ALL CROSS-SUBJECT CONTAMINATION REGRESSION TESTS PASSED CLEANLY!');
