/**
 * Frontend Unit & Regression Test for Phase 1.4: Confidence Scale & Metric Integrity
 * Tests ACTUAL production transformation functions in `frontend/src/utils/confidenceFormatter.js`.
 * Asserts:
 * 1. Known score (e.g. 0.92 from API) converts to 92%, "92% Model Confidence", and "[Model Confidence: 92%]".
 * 2. Numeric zero (0.0 / 0) preserves 0%, "0% Model Confidence", and "[Model Confidence: 0%]".
 * 3. Null / undefined / missing values render as "Not available" / "[Model Confidence: Not available]".
 * 4. Invalid out-of-range values (-0.2, 150, NaN) render as unavailable.
 * 5. Evidence score fallback: When model confidence is null and evidence_score is present (e.g. 0.84),
 *    renders as "Evidence Score: 84%" or "[Evidence: 84%]", strictly separated from model confidence.
 * 6. Model confidence precedence: When model confidence is present (e.g. 0.92 or 0.0), it takes precedence.
 * 7. Double-conversion safeguard: If legacy percentage scale (e.g. 92) is passed, returns 92% (not 9200%).
 * 8. Client dynamic question generator sets confidence: null and evidence_score in [0.0, 1.0].
 */

import assert from 'node:assert/strict';
import {
  toPercentagePoints,
  formatConfidencePercent,
  formatModelConfidenceBadge,
  formatConfidencePDF
} from '../src/utils/confidenceFormatter.js';
import { generateDynamicQuestions } from '../src/utils/questionGenerator.js';

console.log('Running frontend confidence scale & metric integrity tests...');

// ── 1. toPercentagePoints: Actual Transformation Function Tests ──
assert.equal(toPercentagePoints(0.92), 92, '0.92 must convert to 92 percentage points');
assert.equal(toPercentagePoints(0.0), 0, '0.0 must convert to 0 percentage points');
assert.equal(toPercentagePoints(0), 0, '0 must convert to 0 percentage points');
assert.equal(toPercentagePoints(1.0), 100, '1.0 must convert to 100 percentage points');
assert.equal(toPercentagePoints(null), null, 'null must return null');
assert.equal(toPercentagePoints(undefined), null, 'undefined must return null');
assert.equal(toPercentagePoints(NaN), null, 'NaN must return null');
assert.equal(toPercentagePoints(true), null, 'Boolean true must return null');
assert.equal(toPercentagePoints(false), null, 'Boolean false must return null');
assert.equal(toPercentagePoints([]), null, 'Array must return null');
assert.equal(toPercentagePoints({}), null, 'Object must return null');
assert.equal(toPercentagePoints('   '), null, 'Whitespace string must return null');
assert.equal(toPercentagePoints('not-a-number'), null, 'Non-numeric string must return null');
assert.equal(toPercentagePoints(-0.2), null, 'Negative value must return null (out of bounds)');
assert.equal(toPercentagePoints(150), null, 'Value > 100 must return null (out of bounds)');
assert.equal(toPercentagePoints(92), 92, 'Legacy percentage 92 must not double-convert to 9200');
console.log('✓ toPercentagePoints unit tests passed (0.92 -> 92, 0.0 -> 0, null -> null, bounds and strict type guards checked)');

// ── 2. QuickStats formatConfidencePercent Actual Transformation Tests ──
assert.equal(formatConfidencePercent(0.92), '92%', '0.92 must format to 92%');
assert.equal(formatConfidencePercent(0.0), '0%', '0.0 must format to 0%');
assert.equal(formatConfidencePercent(0), '0%', '0 must format to 0%');
assert.equal(formatConfidencePercent(1.0), '100%', '1.0 must format to 100%');
assert.equal(formatConfidencePercent(null), 'Not available', 'null must format to Not available');
assert.equal(formatConfidencePercent(undefined), 'Not available', 'undefined must format to Not available');
assert.equal(formatConfidencePercent(-0.5), 'Not available', 'Out-of-range must format to Not available');
assert.equal(formatConfidencePercent(85), '85%', 'Legacy 85 must format to 85% without double conversion');
console.log('✓ formatConfidencePercent actual function tests passed (0.92 -> 92%, 0.0 -> 0%, null -> Not available)');

// ── 3. formatModelConfidenceBadge Actual Transformation Tests ──
// Known score 0.92
assert.equal(formatModelConfidenceBadge(0.92), '92% Model Confidence');
assert.equal(formatModelConfidenceBadge(0.92, 0.75), '92% Model Confidence', 'Model confidence must take precedence over evidence score');
// Numeric zero
assert.equal(formatModelConfidenceBadge(0.0), '0% Model Confidence');
assert.equal(formatModelConfidenceBadge(0.0, 0.85), '0% Model Confidence', 'Valid 0.0 model confidence takes precedence');
// Null / missing model confidence with evidence score fallback
assert.equal(formatModelConfidenceBadge(null, 0.84), 'Evidence Score: 84%');
assert.equal(formatModelConfidenceBadge(null, 0.0), 'Evidence Score: 0%');
// Both missing / unavailable
assert.equal(formatModelConfidenceBadge(null, null), 'Model Confidence: Not available');
assert.equal(formatModelConfidenceBadge(undefined, undefined), 'Model Confidence: Not available');
console.log('✓ formatModelConfidenceBadge actual function tests passed (0.92, 0.0, evidence fallback, unavailable)');

// ── 4. formatConfidencePDF Actual Transformation Tests ──
assert.equal(formatConfidencePDF(0.92), '[Model Confidence: 92%]');
assert.equal(formatConfidencePDF(0.0), '[Model Confidence: 0%]');
assert.equal(formatConfidencePDF(1.0), '[Model Confidence: 100%]');
assert.equal(formatConfidencePDF(null, 0.84), '[Evidence: 84%]');
assert.equal(formatConfidencePDF(null, null), '[Model Confidence: Not available]');
assert.equal(formatConfidencePDF(null, undefined), '[Model Confidence: Not available]');
console.log('✓ formatConfidencePDF actual function tests passed (0.92 -> [Model Confidence: 92%], 0.0 -> [Model Confidence: 0%], evidence fallback)');

// ── 5. Client Heuristic Question Generator Provenance ──
const sampleText = 'Relational database refers to a structured collection of data stored in tables with rows and columns. Primary key is defined as a unique identifier for each row in a database table.';
const generatedQs = generateDynamicQuestions(sampleText, 'db_syllabus.pdf');
assert.ok(generatedQs.length > 0, 'Must generate at least 1 question from valid text');
for (const q of generatedQs) {
  assert.equal(q.confidence, null, 'Client-side heuristic questions must have confidence: null');
  assert.ok(typeof q.evidence_score === 'number', 'evidence_score must be numeric');
  assert.ok(q.evidence_score >= 0.0 && q.evidence_score <= 1.0, 'evidence_score must be on 0.0 - 1.0 scale');
  assert.equal(q.is_ai_generated, false, 'Client-side questions must have is_ai_generated: false');
}
console.log('✓ Question generator populates evidence_score and sets confidence: null');

console.log('ALL FRONTEND CONFIDENCE SCALE & METRIC INTEGRITY TESTS PASSED (5/5 suites).');
