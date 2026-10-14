/**
 * Centralized presentation-boundary confidence and metric formatting.
 *
 * System-wide Contract:
 * - API and internal state store confidence and evidence_score as normalized decimals in [0.0, 1.0].
 * - Missing, uncalibrated, or non-AI confidence is null / undefined (never converted to 0).
 * - Conversion to percentage points occurs ONLY at the presentation boundary.
 * - Double-conversion is prevented if legacy/cached state already holds percentage points (1.0, 100.0].
 */

/**
 * Convert a normalized decimal confidence [0.0, 1.0] to integer percentage points [0, 100].
 * Returns null if the value is missing, non-numeric, or out of valid bounds.
 *
 * @param {number|null|undefined} val
 * @returns {number|null}
 */
export function toPercentagePoints(val) {
  if (val === null || val === undefined || val === '') return null;
  // Guard against booleans, objects, arrays, or whitespace strings coercing to numbers
  if (typeof val === 'boolean' || typeof val === 'object') return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 100) return null;

  // Normalized decimal [0.0, 1.0] -> percentage points [0, 100]
  if (num <= 1.0) {
    return Math.round(num * 100);
  }

  // Already in percentage scale (1.0, 100.0] (legacy cache safeguard against double-conversion)
  return Math.round(num);
}

/**
 * Format a confidence value for stats display (e.g., QuickStats).
 * Returns e.g. "92%", "0%", or "Not available".
 *
 * @param {number|null|undefined} val
 * @returns {string}
 */
export function formatConfidencePercent(val) {
  const pct = toPercentagePoints(val);
  if (pct === null) return 'Not available';
  return `${pct}%`;
}

/**
 * Format a model confidence badge for question cards or answer items.
 * Keeps model confidence strictly distinct from evidence score.
 *
 * @param {number|null|undefined} confidence - Model confidence score [0.0, 1.0]
 * @param {number|null|undefined} [evidenceScore=null] - Heuristic evidence score [0.0, 1.0]
 * @returns {string}
 */
export function formatModelConfidenceBadge(confidence, evidenceScore = null) {
  const confPct = toPercentagePoints(confidence);
  if (confPct !== null) {
    return `${confPct}% Model Confidence`;
  }
  if (evidenceScore != null) {
    const evPct = toPercentagePoints(evidenceScore);
    if (evPct !== null) {
      return `Evidence Score: ${evPct}%`;
    }
  }
  return 'Model Confidence: Not available';
}

/**
 * Format confidence / evidence text for PDF exports.
 *
 * @param {number|null|undefined} confidence
 * @param {number|null|undefined} [evidenceScore=null]
 * @returns {string}
 */
export function formatConfidencePDF(confidence, evidenceScore = null) {
  const confPct = toPercentagePoints(confidence);
  if (confPct !== null) {
    return `[Model Confidence: ${confPct}%]`;
  }
  if (evidenceScore != null) {
    const evPct = toPercentagePoints(evidenceScore);
    if (evPct !== null) {
      return `[Evidence: ${evPct}%]`;
    }
  }
  return '[Model Confidence: Not available]';
}
