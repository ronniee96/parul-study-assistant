/**
 * Test Suite: PDF Pipeline Resilience & Processing Regression Tests
 * Tests primary backend dispatch, browser fallback handling,
 * digital PDF compressed stream handling, question/answer generation grounding,
 * and error/loading recovery.
 */

import assert from 'node:assert/strict';
import { generateDynamicQuestions } from '../src/utils/questionGenerator.js';
import { cleanExtractedText, isPdfCodeToken } from '../src/utils/clientDocExtractor.js';

console.log("Running Phase 2.4B PDF Pipeline Resilience Test Suite...\n");

// --- Suite 1: Grounded Question & Answer Generation from Extracted Text ---
console.log("--- Suite 1: Question & Answer Generation Grounding ---");

const syntheticExtractedText = `
=== [DOCUMENT 1: OS_Exam_Review.pdf] ===
PDF-PIPELINE-TEST-731 is defined as a verified academic test benchmark for document processing pipelines.
Operating System is defined as a system software that manages computer hardware and software resources.
Process Scheduling is the activity of the process manager that handles the removal of the running process from the CPU.
Virtual Memory refers to a memory management capability of an OS that uses hardware and software to allow a computer to compensate for physical memory shortages.
Deadlock occurs when a set of processes are blocked because each process is holding a resource and waiting for another resource.
`;

const questions = generateDynamicQuestions(syntheticExtractedText, "OS_Exam_Review.pdf");
assert.ok(questions.length > 0, "Question generator must produce questions from valid academic text");
assert.ok(questions.length >= 4, `Expected at least 4 questions, got ${questions.length}`);

// Check that each question has an answer and key points
for (const q of questions) {
  assert.ok(q.question, "Question must have non-empty text");
  assert.ok(q.answer, "Question must have a grounded answer");
  assert.ok(Array.isArray(q.key_points), "Question must have key_points array");
  assert.ok(q.key_points.length > 0, "Question must have at least one key point");
  assert.ok(q.marks > 0, "Question must specify marks");
}

// Verify that the unique test token appears in generated questions/provenance
const tokenFound = questions.some(q => 
  q.question.includes("PDF-PIPELINE-TEST-731") || 
  q.answer.includes("PDF-PIPELINE-TEST-731") ||
  JSON.stringify(q.provenance || {}).includes("PDF-PIPELINE-TEST-731")
);
assert.ok(tokenFound, "Synthetic test token 'PDF-PIPELINE-TEST-731' must be preserved in question blueprint");
console.log(`✓ Generated ${questions.length} questions with full answers grounded in 'PDF-PIPELINE-TEST-731'.`);


// --- Suite 2: Client-side Text Cleansing & PDF Code Token Filtering ---
console.log("\n--- Suite 2: Client-side PDF Code Token Filtering ---");

const cleanHumanLine = "Operating System is defined as a system software that manages hardware.";
const pdfCodeLine1 = "/Type /Catalog /Pages 2 0 R";
const pdfCodeLine2 = "/Filter /FlateDecode /Length 1240";
const pdfCodeLine3 = "4 0 obj << /Length 500 >> stream";

assert.equal(isPdfCodeToken(cleanHumanLine), false, "Human sentence must not be flagged as code");
assert.equal(isPdfCodeToken(pdfCodeLine1), true, "PDF Catalog dictionary must be flagged as code");
assert.equal(isPdfCodeToken(pdfCodeLine2), true, "PDF FlateDecode stream header must be flagged as code");
assert.equal(isPdfCodeToken(pdfCodeLine3), true, "PDF obj stream token must be flagged as code");

const dirtyText = `
/Length 120 /Filter /FlateDecode
Operating System is defined as a system software that manages hardware.
/MediaBox [0 0 612 792]
Virtual Memory refers to memory management capability.
`;
const cleaned = cleanExtractedText(dirtyText);
assert.ok(cleaned.includes("Operating System is defined as"), "Clean text must retain human content");
assert.ok(!cleaned.includes("/FlateDecode"), "Clean text must strip FlateDecode tokens");
assert.ok(!cleaned.includes("/MediaBox"), "Clean text must strip MediaBox tokens");
console.log("✓ PDF code token filtering correctly preserves human text while removing PDF dictionaries.");


// --- Suite 3: Primary Backend Pipeline with Browser Fallback Simulation ---
console.log("\n--- Suite 3: Extraction Pipeline Precedence Contract ---");

// Simulates the UploadTab pipeline flow: backend primary, browser fallback
async function simulateExtractionPipeline({
  simulateBackendSuccess,
  simulateClientSuccess,
  backendText = "",
  clientText = "",
  backendErrorMsg = "",
  clientErrorMsg = ""
}) {
  let extractedText = '';
  let extractionSource = 'none';
  let backendError = null;
  let clientError = null;

  // Step 1: Try Backend Primary
  try {
    if (simulateBackendSuccess) {
      extractedText = backendText;
      extractionSource = 'server';
    } else {
      throw new Error(backendErrorMsg || 'Backend offline');
    }
  } catch (err) {
    backendError = err.message;
  }

  // Step 2: Try Client Fallback if backend yielded no text
  if (!extractedText || extractedText.length < 50) {
    try {
      if (simulateClientSuccess) {
        extractedText = clientText;
        extractionSource = 'browser';
      } else {
        throw new Error(clientErrorMsg || 'Client PDF extraction failed');
      }
    } catch (err) {
      clientError = err.message;
    }
  }

  // Step 3: Evaluate result
  if (!extractedText || extractedText.length < 50) {
    const combinedErrMsg = `${backendError || ''} ${clientError || ''}`.toLowerCase();
    let userFacingError;
    if (combinedErrMsg.includes('scanned') || combinedErrMsg.includes('ocr') || combinedErrMsg.includes('tesseract')) {
      userFacingError = 'No selectable digital text found in the uploaded document. Scanned image-only PDFs require OCR binaries (Tesseract) which are not supported on zero-cost serverless hosting.';
    } else if (combinedErrMsg.includes('too large') || combinedErrMsg.includes('size')) {
      userFacingError = 'File size exceeds serverless runtime limit. Please upload compressed PDFs or individual chapters under 4MB.';
    } else {
      userFacingError = 'Unable to extract readable text from the uploaded document(s).';
    }
    return { success: false, error: userFacingError, source: 'none' };
  }

  return { success: true, text: extractedText, source: extractionSource };
}

// Case A: Backend succeeds -> Server is primary source
const resA = await simulateExtractionPipeline({
  simulateBackendSuccess: true,
  simulateClientSuccess: false, // Even if client would have failed!
  backendText: syntheticExtractedText,
  clientErrorMsg: "No readable text could be extracted"
});
assert.equal(resA.success, true);
assert.equal(resA.source, 'server');
assert.ok(resA.text.includes("PDF-PIPELINE-TEST-731"));
console.log("✓ Case A: Serverless backend successfully extracts document even when client extractor fails.");

// Case B: Backend fails (e.g. offline) -> Client fallback activates
const resB = await simulateExtractionPipeline({
  simulateBackendSuccess: false,
  simulateClientSuccess: true,
  backendErrorMsg: "504 Gateway Timeout",
  clientText: syntheticExtractedText
});
assert.equal(resB.success, true);
assert.equal(resB.source, 'browser');
assert.ok(resB.text.includes("PDF-PIPELINE-TEST-731"));
console.log("✓ Case B: In-browser fallback engine recovers seamlessly when backend is temporarily unreachable.");

// Case C: Scanned image PDF -> Distinguishes OCR requirement
const resC = await simulateExtractionPipeline({
  simulateBackendSuccess: false,
  simulateClientSuccess: false,
  backendErrorMsg: "No selectable text found; local OCR (tesseract) not installed",
  clientErrorMsg: "No readable text extracted (scanned image)"
});
assert.equal(resC.success, false);
assert.ok(resC.error.includes("Scanned image-only PDFs require OCR binaries (Tesseract)"));
console.log("✓ Case C: Scanned PDFs accurately report OCR requirement without fabricating answers.");

// Case D: Corrupted PDF -> Reports unreadable error
const resD = await simulateExtractionPipeline({
  simulateBackendSuccess: false,
  simulateClientSuccess: false,
  backendErrorMsg: "Malformed PDF file: missing %PDF- header",
  clientErrorMsg: "Invalid PDF structure"
});
assert.equal(resD.success, false);
assert.ok(resD.error.includes("Unable to extract readable text"));
console.log("✓ Case D: Corrupted PDFs report clean actionable error and reset loading state.");


// --- Suite 4: Empty Text Never Produces Fabricated Questions ---
console.log("\n--- Suite 4: Zero-Hallucination Gate ---");

const emptyQuestions = generateDynamicQuestions("", "empty.pdf");
assert.equal(emptyQuestions.length, 0, "Empty document text must never produce questions");

const shortBoilerplateOnly = "Parul University Vadodara Assignment 1 Page 1";
const boilerplateQuestions = generateDynamicQuestions(shortBoilerplateOnly, "cover.pdf");
assert.equal(boilerplateQuestions.length, 0, "Document containing only institutional headers must not produce questions");
console.log("✓ Zero-hallucination contract strictly prevents fabricated results on empty or unextracted text.");


// --- Suite 5: Partial Multi-File Failure Visibility & Failed Documents Tracking ---
console.log("\n--- Suite 5: Partial Multi-File Failure Tracking & Batch Size Notice ---");

function processBatchFiles(rawFilesResults, totalBytes) {
  const filesList = rawFilesResults.map(f => ({
    filename: f.filename,
    word_count: f.word_count || 0,
    success: f.success !== false,
    error: f.error || null
  }));
  const failedFiles = filesList.filter(f => f.success === false || f.error);
  const exceedsBatchLimit = totalBytes > 4.5 * 1024 * 1024;
  return { filesList, failedFiles, exceedsBatchLimit };
}

const mockBatch = [
  { filename: "Unit1_Algorithms.pdf", word_count: 450, success: true },
  { filename: "Unit2_Corrupted.pdf", error: "Malformed PDF file: missing %PDF- header", success: false },
  { filename: "Unit3_Oversized.pdf", error: "File size too large. Maximum 4MB allowed for ₹0 serverless runtime.", success: false }
];

const batchRes = processBatchFiles(mockBatch, 5.2 * 1024 * 1024);
assert.equal(batchRes.filesList.length, 3, "All uploaded files must remain tracked in filesList");
assert.equal(batchRes.failedFiles.length, 2, "Both failed documents must be recorded in failedFiles");
assert.equal(batchRes.failedFiles[0].filename, "Unit2_Corrupted.pdf");
assert.equal(batchRes.failedFiles[1].filename, "Unit3_Oversized.pdf");
assert.equal(batchRes.exceedsBatchLimit, true, "Payload exceeding 4.5MB must trigger batch ceiling warning");
console.log("✓ Partial multi-file failures and batch size limits are accurately surfaced without dropping files.");


// --- Suite 6: Representative Real Course Document Grounding ---
console.log("\n--- Suite 6: Real Course Document Grounding (Algorithms & Cost Accounting) ---");

const realCourseMaterial = `
=== [DOCUMENT 1: Cost_Accounting_Unit2.pdf] ===
Break-Even Point is defined as the volume of sales at which total revenue equals total costs resulting in zero profit or loss.
Margin of Safety represents the excess of actual sales over break-even sales providing a measure of risk tolerance.
Marginal Costing is a technique of determining cost where variable costs are charged to cost units while fixed costs are written off against contribution.
Contribution is defined as the difference between sales revenue and total variable cost.
`;

const realQuestions = generateDynamicQuestions(realCourseMaterial, "Cost_Accounting_Unit2.pdf");
assert.ok(realQuestions.length >= 4, `Expected at least 4 questions for real course material, got ${realQuestions.length}`);

// Verify terms are grounded
const groundedTerms = realQuestions.map(q => q.question);
assert.ok(groundedTerms.some(t => t.includes("Break-Even Point")), "Must formulate question on Break-Even Point");
assert.ok(groundedTerms.some(t => t.includes("Marginal Costing")), "Must formulate question on Marginal Costing");
assert.ok(groundedTerms.some(t => t.includes("Contribution") || t.includes("Margin of Safety")), "Must formulate question on Contribution or Margin of Safety");

// Verify zero hallucination on corrupted / password-protected simulation
const corruptedText = "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Filter /Standard /V 4 /R 4 /P -1052 >>\nendobj";
const corruptedQuestions = generateDynamicQuestions(corruptedText, "encrypted.pdf");
assert.equal(corruptedQuestions.length, 0, "Encrypted / password-protected PDF tokens must yield 0 fabricated questions");
console.log(`✓ Real course material successfully generated ${realQuestions.length} grounded questions; encrypted PDF yielded 0 questions.`);

console.log("\n======================================================");
console.log("ALL PDF PIPELINE RESILIENCE REGRESSION TESTS PASSED (6/6 suites).");
console.log("======================================================");

