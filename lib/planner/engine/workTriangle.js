/**
 * workTriangle.js — NKBA work triangle analysis for the kitchen planner.
 *
 * Calculates the kitchen work triangle (sink → range → refrigerator) and
 * scores it per NKBA Kitchen Planning Guidelines.
 *
 * NKBA Work Triangle Guidelines:
 *   Each leg:        4–9 ft
 *   Total perimeter: 13–26 ft
 *   No single leg should exceed 9 ft
 *
 * Scoring (0–100):
 *   3 legs × up to 25 pts each  +  perimeter × up to 25 pts = 100 max
 *   Rating: ≥ 90 Excellent | ≥ 70 Good | ≥ 50 Fair | < 50 Poor
 *
 * No automatic repositioning is performed — analysis only.
 *
 * All functions are pure — no React, no Zustand, no side effects.
 */

import { getItemAABB } from "./collision.js";

// ─── NKBA constants ───────────────────────────────────────────────────────────

const LEG_MIN_FT         = 4;    // minimum ideal leg length
const LEG_MAX_FT         = 9;    // maximum ideal leg length
const PERIMETER_MIN_FT   = 13;   // minimum ideal perimeter
const PERIMETER_MAX_FT   = 26;   // maximum ideal perimeter

// ─── calculateWorkTriangle ────────────────────────────────────────────────────

/**
 * @typedef {Object} TriangleLeg
 * @property {string}  from        - category/label of origin vertex ("Sink" etc.)
 * @property {string}  to          - category/label of destination vertex
 * @property {string}  fromId      - item ID of origin vertex
 * @property {string}  toId        - item ID of destination vertex
 * @property {number}  distanceFt  - center-to-center distance in feet
 * @property {boolean} inRange     - true when LEG_MIN_FT ≤ distanceFt ≤ LEG_MAX_FT
 */

/**
 * @typedef {Object} WorkTriangleResult
 * @property {number}   score             - 0–100
 * @property {"Poor"|"Fair"|"Good"|"Excellent"} rating
 * @property {number}   totalPerimeterFt
 * @property {boolean}  perimeterInRange  - true when PERIMETER_MIN ≤ total ≤ PERIMETER_MAX
 * @property {TriangleLeg[]} legs         - always 3 entries (even if missing vertex)
 * @property {string[]} recommendations
 * @property {boolean}  hasAllVertices    - false if any of sink/range/fridge is absent
 * @property {{ xFt: number, zFt: number }|null} sinkCenter
 * @property {{ xFt: number, zFt: number }|null} rangeCenter
 * @property {{ xFt: number, zFt: number }|null} fridgeCenter
 */

/**
 * Computes the NKBA work triangle for the current scene.
 *
 * @param {Object[]} items - scene.items (SceneItem[])
 * @returns {WorkTriangleResult}
 */
export function calculateWorkTriangle(items) {
  const sink  = _findSink(items);
  const range = _findRange(items);
  const fridge = _findFridge(items);

  const sinkCenter  = sink   ? _center(sink)  : null;
  const rangeCenter = range  ? _center(range) : null;
  const fridgeCenter = fridge ? _center(fridge) : null;

  const hasAllVertices = !!(sink && range && fridge);

  // ── Build legs ──────────────────────────────────────────────────────────────
  const legs = [
    _makeLeg("Sink",  sink,  "Range",       range,  sinkCenter,  rangeCenter),
    _makeLeg("Range", range, "Refrigerator", fridge, rangeCenter, fridgeCenter),
    _makeLeg("Refrigerator", fridge, "Sink",  sink,  fridgeCenter, sinkCenter),
  ];

  const totalPerimeterFt   = legs.reduce((s, l) => s + l.distanceFt, 0);
  const perimeterInRange   = totalPerimeterFt >= PERIMETER_MIN_FT && totalPerimeterFt <= PERIMETER_MAX_FT;

  // ── Score ───────────────────────────────────────────────────────────────────
  let score = 0;

  if (!hasAllVertices) {
    score = 0;
  } else {
    // Up to 25 pts per leg
    for (const leg of legs) {
      if (leg.distanceFt >= LEG_MIN_FT && leg.distanceFt <= LEG_MAX_FT) {
        score += 25;
      } else if (leg.distanceFt >= 2 && leg.distanceFt < LEG_MIN_FT) {
        score += 10; // short but functional
      }
      // > LEG_MAX_FT: 0 pts (too far)
    }

    // Up to 25 pts for perimeter
    if (perimeterInRange) {
      score += 25;
    } else if (totalPerimeterFt < PERIMETER_MIN_FT) {
      score += 10;
    } else {
      score += 5; // too large
    }
  }

  score = Math.max(0, Math.min(100, score));

  // ── Rating ──────────────────────────────────────────────────────────────────
  const rating = score >= 90 ? "Excellent"
               : score >= 70 ? "Good"
               : score >= 50 ? "Fair"
               : "Poor";

  // ── Recommendations ─────────────────────────────────────────────────────────
  const recommendations = _buildRecommendations(
    legs, totalPerimeterFt, perimeterInRange, hasAllVertices,
  );

  return {
    score,
    rating,
    totalPerimeterFt: Math.round(totalPerimeterFt * 10) / 10,
    perimeterInRange,
    legs,
    recommendations,
    hasAllVertices,
    sinkCenter,
    rangeCenter,
    fridgeCenter,
  };
}

// ─── Internal: vertex finders ─────────────────────────────────────────────────

function _findSink(items) {
  return items.find((i) => i.category === "Sink") ?? null;
}

function _findRange(items) {
  return items.find((i) => i.category === "Range") ?? null;
}

function _findFridge(items) {
  return items.find((i) => {
    const cat  = (i.category ?? "").toLowerCase();
    const name = (i.name     ?? "").toLowerCase();
    return cat === "refrigerator" || name.includes("refrigerator") || name.includes("fridge");
  }) ?? null;
}

// ─── Internal: geometry ───────────────────────────────────────────────────────

/** Returns the XZ center point of an item (floor footprint centroid). */
function _center(item) {
  const aabb = getItemAABB(item);
  return {
    xFt: (aabb.minX + aabb.maxX) / 2,
    zFt: (aabb.minZ + aabb.maxZ) / 2,
  };
}

/** Euclidean distance between two XZ points. */
function _dist(a, b) {
  if (!a || !b) return 0;
  return Math.sqrt((a.xFt - b.xFt) ** 2 + (a.zFt - b.zFt) ** 2);
}

/** Creates a TriangleLeg. Returns distanceFt=0 if either vertex is missing. */
function _makeLeg(fromLabel, fromItem, toLabel, toItem, fromCenter, toCenter) {
  const distanceFt = fromItem && toItem ? _dist(fromCenter, toCenter) : 0;
  return {
    from:       fromLabel,
    to:         toLabel,
    fromId:     fromItem?.id ?? null,
    toId:       toItem?.id   ?? null,
    distanceFt: Math.round(distanceFt * 10) / 10,
    inRange:    distanceFt >= LEG_MIN_FT && distanceFt <= LEG_MAX_FT,
  };
}

// ─── Internal: recommendations ───────────────────────────────────────────────

function _buildRecommendations(legs, totalFt, perimeterInRange, hasAllVertices) {
  const recs = [];

  if (!hasAllVertices) {
    const missing = [];
    if (!legs[0].fromId) missing.push("sink");
    if (!legs[0].toId)   missing.push("range");
    if (!legs[1].toId)   missing.push("refrigerator");
    if (missing.length > 0) {
      recs.push(`Work triangle is incomplete — missing: ${missing.join(", ")}.`);
    }
    return recs;
  }

  for (const leg of legs) {
    if (leg.distanceFt > LEG_MAX_FT) {
      recs.push(
        `${leg.from}–${leg.to} distance is ${leg.distanceFt} ft. ` +
        `NKBA recommends keeping each leg under ${LEG_MAX_FT} ft.`,
      );
    } else if (leg.distanceFt > 0 && leg.distanceFt < LEG_MIN_FT) {
      recs.push(
        `${leg.from}–${leg.to} distance is ${leg.distanceFt} ft. ` +
        `A minimum of ${LEG_MIN_FT} ft is recommended for comfortable workflow.`,
      );
    }
  }

  if (totalFt > PERIMETER_MAX_FT) {
    recs.push(
      `Work triangle perimeter is ${totalFt.toFixed(1)} ft. ` +
      `NKBA recommends a maximum of ${PERIMETER_MAX_FT} ft for efficiency.`,
    );
  } else if (totalFt < PERIMETER_MIN_FT && totalFt > 0) {
    recs.push(
      `Work triangle perimeter is ${totalFt.toFixed(1)} ft. ` +
      `Consider spreading appliances further for a more comfortable work area.`,
    );
  }

  return recs;
}
