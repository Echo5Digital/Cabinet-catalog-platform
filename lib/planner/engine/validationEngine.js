/**
 * validationEngine.js — Master validation aggregator for the kitchen planner.
 *
 * Aggregates results from all engine modules plus the existing designRules.js
 * into a single comprehensive report. The output has two forms:
 *
 *   1. getValidationResults() — backward-compatible flat array of
 *      { id, severity, message, affectedItemId } for plannerStore.validationResults.
 *      This is what ValidationBanner already reads — it works unchanged.
 *
 *   2. runFullValidation() — extended report with work triangle analysis,
 *      measurements, and corner data for the new KitchenInsightsPanel.
 *
 * Module-level cache prevents redundant computation when multiple hooks
 * call this in the same React render cycle.
 *
 * All functions are pure — no React, no Zustand, no side effects
 * (the cache is an implementation detail, not observable state).
 */

import { validateKitchenLayout }  from "./designRules.js";
import { validateDoorSwings }     from "./doorSwingEngine.js";
import { analyzeClearances }      from "./clearanceEngine.js";
import { getCornerAnalysis }      from "./cornerEngine.js";
import { calculateWorkTriangle }  from "./workTriangle.js";
import { measureAll }             from "./measurementEngine.js";

// ─── Module-level single-entry cache ─────────────────────────────────────────
// Keyed on (items reference, roomDimensions reference).
// React's useMemo will already prevent redundant calls from a single component,
// but this cache eliminates duplicate computation when multiple hooks/components
// call runFullValidation with the same inputs in the same render cycle.

let _cache = null;

// ─── runFullValidation ────────────────────────────────────────────────────────

/**
 * @typedef {Object} EnhancedValidationResult
 * @property {string}      id
 * @property {"error"|"warning"|"info"} severity
 * @property {string}      message
 * @property {string|null} affectedItemId
 * @property {string}      source  - "designRules"|"doorSwing"|"clearance"|"corner"|"workTriangle"|"measurement"
 */

/**
 * @typedef {Object} EnhancedValidationReport
 * @property {EnhancedValidationResult[]} errors
 * @property {EnhancedValidationResult[]} warnings
 * @property {EnhancedValidationResult[]} recommendations
 * @property {EnhancedValidationResult[]} all       - flat sorted: errors → warnings → info
 * @property {Object}   workTriangle                - from calculateWorkTriangle
 * @property {Object}   measurements               - from measureAll
 * @property {Array}    corners                    - from getCornerAnalysis
 */

/**
 * Runs all validation engines and returns a comprehensive design report.
 *
 * Engine execution order:
 *  1. designRules.js (existing)   — sink, DW, range, fridge, collisions
 *  2. doorSwingEngine             — fridge and DW swing clearances
 *  3. clearanceEngine             — NKBA walkway, island, appliance clearances
 *  4. cornerEngine                — blind corners and corner utilisation
 *  5. workTriangle                — NKBA work triangle score
 *  6. measurementEngine           — gap warnings
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number, height?: number }} roomDimensions
 * @returns {EnhancedValidationReport}
 */
export function runFullValidation(items, roomDimensions) {
  // Cache check — same object references = same result
  if (_cache && _cache.items === items && _cache.dims === roomDimensions) {
    return _cache.report;
  }

  // ── Compute sub-analyses (compute measurements + corners once) ──────────────
  const measurements = measureAll(items, roomDimensions);
  const corners      = getCornerAnalysis(items, roomDimensions);
  const triangle     = calculateWorkTriangle(items);

  // ── 1. Existing design rules (never replaced) ────────────────────────────────
  const legacy = validateKitchenLayout(items, roomDimensions).map((r) => ({
    ...r,
    source: "designRules",
  }));

  // ── 2. Door swing clearances ─────────────────────────────────────────────────
  const swings = validateDoorSwings(items, roomDimensions).map((r) => ({
    ...r,
    source: "doorSwing",
  }));

  // ── 3. Clearance analysis ────────────────────────────────────────────────────
  const clearanceResults = analyzeClearances(items, roomDimensions)
    .filter((c) => c.severity !== "ok")
    .map((c) => ({
      id:             c.id,
      severity:       c.severity === "error" ? "error" : "warning",
      message:        c.message,
      affectedItemId: c.affectedItemId,
      source:         "clearance",
    }));

  // ── 4. Corner recommendations ────────────────────────────────────────────────
  const cornerRecs = corners.flatMap((corner) =>
    corner.recommendations.map((msg, j) => ({
      id:             `corner-${corner.cornerId}-${j}`,
      severity:       "info",
      message:        msg,
      affectedItemId: null,
      source:         "corner",
    })),
  );

  // ── 5. Work triangle recommendations ────────────────────────────────────────
  const triRecs = triangle.recommendations.map((msg, i) => ({
    id:             `tri-${i}`,
    severity:       triangle.hasAllVertices && triangle.score < 50 ? "warning" : "info",
    message:        msg,
    affectedItemId: null,
    source:         "workTriangle",
  }));

  // ── 6. Gap warnings from measurements ────────────────────────────────────────
  const gapWarnings = measurements.gaps
    .filter((g) => g.needsFiller && !g.canFitFiller && g.gapFt > 0.1)
    .map((g, i) => ({
      id:             `gap-${g.wallId}-${i}`,
      severity:       "warning",
      message:        `${(g.gapFt * 12).toFixed(1)}" gap on ${g.wallId.replace("wall-", "")} wall — a filler panel is recommended.`,
      affectedItemId: null,
      source:         "measurement",
    }));

  // ── Assemble final report ────────────────────────────────────────────────────
  const all = [
    ...legacy,
    ...swings,
    ...clearanceResults,
    ...cornerRecs,
    ...triRecs,
    ...gapWarnings,
  ];

  const report = {
    errors:          all.filter((r) => r.severity === "error"),
    warnings:        all.filter((r) => r.severity === "warning"),
    recommendations: all.filter((r) => r.severity === "info"),
    all,
    workTriangle:  triangle,
    measurements,
    corners,
  };

  // Store in cache
  _cache = { items, dims: roomDimensions, report };
  return report;
}

// ─── getValidationResults ─────────────────────────────────────────────────────

/**
 * Returns the backward-compatible flat array suitable for direct assignment
 * to `plannerStore.validationResults`.
 *
 * Only includes errors and warnings (no "info" recommendations) to keep the
 * existing ValidationBanner display consistent with prior behavior.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number, height?: number }} roomDimensions
 * @returns {Array<{ id: string, severity: string, message: string, affectedItemId: string|null }>}
 */
export function getValidationResults(items, roomDimensions) {
  const { errors, warnings } = runFullValidation(items, roomDimensions);
  return [...errors, ...warnings].map(({ id, severity, message, affectedItemId }) => ({
    id,
    severity,
    message,
    affectedItemId,
  }));
}

/** Clears the module-level cache. Useful in tests. */
export function _clearCache() {
  _cache = null;
}
