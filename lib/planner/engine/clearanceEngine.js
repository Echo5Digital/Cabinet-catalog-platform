/**
 * clearanceEngine.js — Professional kitchen clearance analysis (NKBA standards).
 *
 * Measures walkway widths, island side clearances, and appliance door-zone
 * clearances. Returns structured results with pass/fail status and advisory
 * messages. Never blocks actions — advisory only.
 *
 * NKBA Kitchen Planning Guidelines used:
 *   Walkway:  36" minimum,  42" recommended
 *   Island:   42" minimum,  48" recommended each side
 *   Range:    6"  minimum clearance to combustible material on each side
 *   Fridge:   36" minimum in front (door swing)
 *   DW:       24" minimum in front (door falls flat)
 *
 * All functions are pure — no React, no Zustand, no side effects.
 */

import { getItemAABB }           from "./collision.js";
import { getItemWallAssignment } from "./roomEngine.js";

// ─── NKBA Clearance Constants (feet) ─────────────────────────────────────────

export const CLEARANCES = {
  WALKWAY_MIN_FT:          3.0,   // 36"  NKBA minimum
  WALKWAY_REC_FT:          3.5,   // 42"  NKBA recommended
  ISLAND_CLEARANCE_MIN_FT: 3.5,   // 42"  NKBA minimum each side
  ISLAND_CLEARANCE_REC_FT: 4.0,   // 48"  NKBA recommended
  RANGE_SIDE_MIN_FT:       0.5,   // 6"   minimum to combustible
  FRIDGE_FRONT_MIN_FT:     3.0,   // 36"  door swing
  DW_DOOR_MIN_FT:          2.0,   // 24"  door open flat
};

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ClearanceResult
 * @property {string}  id
 * @property {string}  type              - "walkway" | "island" | "appliance"
 * @property {number}  measuredFt        - actual measured clearance
 * @property {number}  minimumFt         - NKBA minimum
 * @property {number}  recommendedFt     - NKBA recommended
 * @property {boolean} passesMinimum
 * @property {boolean} passesRecommended
 * @property {"ok"|"warning"|"error"} severity
 * @property {string}  message
 * @property {string|null} affectedItemId
 * @property {{ x1: number, z1: number, x2: number, z2: number }|null} zone
 */

// ─── analyzeWalkwayClearances ─────────────────────────────────────────────────

/**
 * Measures walkway widths between opposing cabinet runs.
 *
 * Strategy:
 *  - Group items by wall assignment (north/south or east/west).
 *  - For each pair of items on opposing walls that share a positional range
 *    on the parallel axis, measure the gap between their facing edges.
 *  - Report if the gap is below NKBA minimum or recommended.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {ClearanceResult[]}
 */
export function analyzeWalkwayClearances(items, roomDimensions) {
  const results = [];
  let counter = 0;
  const nextId = () => `walkway-${counter++}`;

  // Split items into wall groups (floor-level only — exclude wall cabinets)
  const floorItems = items.filter((i) => (i.position?.yFt ?? 0) < 4.0);

  const northItems = floorItems.filter((i) => getItemWallAssignment(i, roomDimensions) === "wall-north");
  const southItems = floorItems.filter((i) => getItemWallAssignment(i, roomDimensions) === "wall-south");
  const westItems  = floorItems.filter((i) => getItemWallAssignment(i, roomDimensions) === "wall-west");
  const eastItems  = floorItems.filter((i) => getItemWallAssignment(i, roomDimensions) === "wall-east");

  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  // ── North ↔ South corridor (gap measured along Z) ──────────────────────────
  for (const n of northItems) {
    const naabb = getItemAABB(n);
    for (const s of southItems) {
      const saabb = getItemAABB(s);
      // Check X overlap (do they share a corridor cross-section?)
      if (naabb.maxX <= saabb.minX || naabb.minX >= saabb.maxX) continue;

      const measuredFt = saabb.minZ - naabb.maxZ;
      if (measuredFt < 0) continue; // Overlapping — handled by collision engine

      const result = _makeClearanceResult(nextId(), "walkway", measuredFt,
        CLEARANCES.WALKWAY_MIN_FT, CLEARANCES.WALKWAY_REC_FT, n.id,
        `Walkway between north and south cabinet runs is ${_inchesStr(measuredFt)}.`,
        { x1: Math.max(naabb.minX, saabb.minX), z1: naabb.maxZ,
          x2: Math.min(naabb.maxX, saabb.maxX), z2: saabb.minZ });

      if (result.severity !== "ok") results.push(result);
    }

    // North item vs south wall (no south cabinets)
    if (southItems.length === 0) {
      const measuredFt = L - naabb.maxZ;
      const result = _makeClearanceResult(nextId(), "walkway", measuredFt,
        CLEARANCES.WALKWAY_MIN_FT, CLEARANCES.WALKWAY_REC_FT, n.id,
        `Walkway from north cabinets to south wall is ${_inchesStr(measuredFt)}.`,
        { x1: naabb.minX, z1: naabb.maxZ, x2: naabb.maxX, z2: L });
      if (result.severity !== "ok") results.push(result);
    }
  }

  // ── West ↔ East corridor (gap measured along X) ───────────────────────────
  for (const w of westItems) {
    const waabb = getItemAABB(w);
    for (const e of eastItems) {
      const eaabb = getItemAABB(e);
      if (waabb.maxZ <= eaabb.minZ || waabb.minZ >= eaabb.maxZ) continue;

      const measuredFt = eaabb.minX - waabb.maxX;
      if (measuredFt < 0) continue;

      const result = _makeClearanceResult(nextId(), "walkway", measuredFt,
        CLEARANCES.WALKWAY_MIN_FT, CLEARANCES.WALKWAY_REC_FT, w.id,
        `Walkway between west and east cabinet runs is ${_inchesStr(measuredFt)}.`,
        { x1: waabb.maxX, z1: Math.max(waabb.minZ, eaabb.minZ),
          x2: eaabb.minX, z2: Math.min(waabb.maxZ, eaabb.maxZ) });

      if (result.severity !== "ok") results.push(result);
    }

    // West item vs east wall
    if (eastItems.length === 0) {
      const measuredFt = W - waabb.maxX;
      const result = _makeClearanceResult(nextId(), "walkway", measuredFt,
        CLEARANCES.WALKWAY_MIN_FT, CLEARANCES.WALKWAY_REC_FT, w.id,
        `Walkway from west cabinets to east wall is ${_inchesStr(measuredFt)}.`,
        { x1: waabb.maxX, z1: waabb.minZ, x2: W, z2: waabb.maxZ });
      if (result.severity !== "ok") results.push(result);
    }
  }

  return results;
}

// ─── analyzeIslandClearances ──────────────────────────────────────────────────

/**
 * Measures clearances around floating (island/peninsula) items.
 * An island is any item whose wall assignment is null.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {ClearanceResult[]}
 */
export function analyzeIslandClearances(items, roomDimensions) {
  const results = [];
  let counter = 0;
  const nextId = () => `island-${counter++}`;

  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  const islands = items.filter(
    (i) => getItemWallAssignment(i, roomDimensions) === null &&
           (i.position?.yFt ?? 0) < 4.0,
  );

  for (const island of islands) {
    const iaabb = getItemAABB(island);

    // For each of 4 sides, find the nearest obstacle (item or room wall)
    const sides = [
      { label: "north", measuredFt: _nearestObstacleN(iaabb, items, island.id, roomDimensions) },
      { label: "south", measuredFt: _nearestObstacleS(iaabb, items, island.id, roomDimensions) },
      { label: "west",  measuredFt: _nearestObstacleW(iaabb, items, island.id, roomDimensions) },
      { label: "east",  measuredFt: _nearestObstacleE(iaabb, items, island.id, roomDimensions) },
    ];

    for (const side of sides) {
      const result = _makeClearanceResult(
        nextId(), "island", side.measuredFt,
        CLEARANCES.ISLAND_CLEARANCE_MIN_FT, CLEARANCES.ISLAND_CLEARANCE_REC_FT,
        island.id,
        `Island clearance on ${side.label} side is ${_inchesStr(side.measuredFt)} ` +
        `(NKBA recommends ${_inchesStr(CLEARANCES.ISLAND_CLEARANCE_REC_FT)}).`,
        null,
      );
      if (result.severity !== "ok") results.push(result);
    }
  }

  return results;
}

// ─── analyzeApplianceClearances ───────────────────────────────────────────────

/**
 * Checks appliance-specific clearance requirements:
 *   - Range: 6" minimum on each side to combustible material
 *   - (Fridge/DW swings are handled by doorSwingEngine)
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {ClearanceResult[]}
 */
export function analyzeApplianceClearances(items, roomDimensions) {
  const results = [];
  let counter = 0;
  const nextId = () => `appliance-${counter++}`;

  const ranges = items.filter((i) => i.category === "Range" ||
    (i.name ?? "").toLowerCase().includes("cooktop"));

  for (const range of ranges) {
    const raabb = getItemAABB(range);
    const wallId = getItemWallAssignment(range, roomDimensions);
    const isNS = wallId === "wall-west" || wallId === "wall-east";

    // Items on the same wall that are beside the range
    const floorNeighbors = items.filter((i) => {
      if (i.id === range.id) return false;
      if ((i.position?.yFt ?? 0) >= 4.0) return false; // skip wall cabinets
      const iaabb = getItemAABB(i);

      if (isNS) {
        // NS-oriented range: check items along Z axis that share X band
        const inX = iaabb.maxX > raabb.minX && iaabb.minX < raabb.maxX;
        return inX;
      } else {
        // EW-oriented range: check items along X axis that share Z band
        const inZ = iaabb.maxZ > raabb.minZ && iaabb.minZ < raabb.maxZ;
        return inZ;
      }
    });

    for (const neighbor of floorNeighbors) {
      const naabb = getItemAABB(neighbor);
      let gap = Infinity;
      let sideLabel = "";

      if (isNS) {
        if (naabb.maxZ <= raabb.minZ) { gap = raabb.minZ - naabb.maxZ; sideLabel = "above"; }
        else if (naabb.minZ >= raabb.maxZ) { gap = naabb.minZ - raabb.maxZ; sideLabel = "below"; }
      } else {
        if (naabb.maxX <= raabb.minX) { gap = raabb.minX - naabb.maxX; sideLabel = "left"; }
        else if (naabb.minX >= raabb.maxX) { gap = naabb.minX - raabb.maxX; sideLabel = "right"; }
      }

      if (gap !== Infinity && gap < CLEARANCES.RANGE_SIDE_MIN_FT) {
        const result = _makeClearanceResult(
          nextId(), "appliance", gap,
          CLEARANCES.RANGE_SIDE_MIN_FT, CLEARANCES.RANGE_SIDE_MIN_FT,
          range.id,
          `Range/cooktop has only ${_inchesStr(gap)} clearance on the ${sideLabel} side ` +
          `(${_inchesStr(CLEARANCES.RANGE_SIDE_MIN_FT)} minimum required for safety).`,
          null,
        );
        results.push(result);
      }
    }
  }

  return results;
}

// ─── analyzeClearances (master) ───────────────────────────────────────────────

/**
 * Runs all clearance sub-analyzers and returns merged results.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number, height?: number }} roomDimensions
 * @returns {ClearanceResult[]}
 */
export function analyzeClearances(items, roomDimensions) {
  return [
    ...analyzeWalkwayClearances(items, roomDimensions),
    ...analyzeIslandClearances(items, roomDimensions),
    ...analyzeApplianceClearances(items, roomDimensions),
  ];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _makeClearanceResult(id, type, measuredFt, minimumFt, recommendedFt, affectedItemId, message, zone) {
  const passesMinimum     = measuredFt >= minimumFt;
  const passesRecommended = measuredFt >= recommendedFt;
  const severity = !passesMinimum ? "error" : !passesRecommended ? "warning" : "ok";
  return { id, type, measuredFt, minimumFt, recommendedFt, passesMinimum, passesRecommended, severity, message, affectedItemId, zone };
}

function _inchesStr(ft) {
  const totalIn = Math.round(ft * 12);
  if (totalIn % 12 === 0) return `${totalIn / 12}'`;
  return `${totalIn}"`;
}

// Island side clearance helpers — find nearest obstacle distance in each direction
function _nearestObstacleN(iaabb, items, excludeId, rd) {
  let minDist = iaabb.minZ; // distance to north wall
  for (const item of items) {
    if (item.id === excludeId || (item.position?.yFt ?? 0) >= 4.0) continue;
    const b = getItemAABB(item);
    if (b.maxZ <= iaabb.minZ && b.maxX > iaabb.minX && b.minX < iaabb.maxX) {
      minDist = Math.min(minDist, iaabb.minZ - b.maxZ);
    }
  }
  return Math.max(0, minDist);
}

function _nearestObstacleS(iaabb, items, excludeId, rd) {
  const L = rd?.length ?? 10;
  let minDist = L - iaabb.maxZ; // distance to south wall
  for (const item of items) {
    if (item.id === excludeId || (item.position?.yFt ?? 0) >= 4.0) continue;
    const b = getItemAABB(item);
    if (b.minZ >= iaabb.maxZ && b.maxX > iaabb.minX && b.minX < iaabb.maxX) {
      minDist = Math.min(minDist, b.minZ - iaabb.maxZ);
    }
  }
  return Math.max(0, minDist);
}

function _nearestObstacleW(iaabb, items, excludeId, rd) {
  let minDist = iaabb.minX; // distance to west wall
  for (const item of items) {
    if (item.id === excludeId || (item.position?.yFt ?? 0) >= 4.0) continue;
    const b = getItemAABB(item);
    if (b.maxX <= iaabb.minX && b.maxZ > iaabb.minZ && b.minZ < iaabb.maxZ) {
      minDist = Math.min(minDist, iaabb.minX - b.maxX);
    }
  }
  return Math.max(0, minDist);
}

function _nearestObstacleE(iaabb, items, excludeId, rd) {
  const W = rd?.width ?? 10;
  let minDist = W - iaabb.maxX; // distance to east wall
  for (const item of items) {
    if (item.id === excludeId || (item.position?.yFt ?? 0) >= 4.0) continue;
    const b = getItemAABB(item);
    if (b.minX >= iaabb.maxX && b.maxZ > iaabb.minZ && b.minZ < iaabb.maxZ) {
      minDist = Math.min(minDist, b.minX - iaabb.maxX);
    }
  }
  return Math.max(0, minDist);
}
