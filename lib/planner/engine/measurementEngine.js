/**
 * measurementEngine.js — Linear dimension measurements for the kitchen planner.
 *
 * Derives human-readable measurements from the scene: wall run fill percentages,
 * individual cabinet run lengths, gap segments needing fillers, and island
 * side clearances as labeled dimensions.
 *
 * Consumed by:
 *   - usePlannerMeasurements hook
 *   - validationEngine (gap warnings)
 *   - KitchenInsightsPanel (wall coverage display)
 *
 * All functions are pure — no React, no Zustand, no side effects.
 */

import { getItemAABB }                    from "./collision.js";
import { getWalls, getItemWallAssignment, _getFloorFootprint } from "./roomEngine.js";
import { buildAdjacencyGraph, extractCabinetRuns } from "./spatialGraph.js";

// ─── measureWallRuns ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} WallRunMeasurement
 * @property {string}  wallId
 * @property {number}  wallLengthFt   - total interior wall length
 * @property {number}  cabinetFt      - total linear feet occupied by base/tall cabinets
 * @property {number}  gapFt          - wallLengthFt - cabinetFt
 * @property {number}  fillPct        - percentage of wall covered (0–100)
 * @property {Array<{ startFt: number, endFt: number }>} gaps  - individual gap segments
 */

/**
 * Measures linear feet of base/tall cabinets and remaining gaps per wall.
 * Wall cabinets (yFt ≥ 4) are counted separately but not included in the
 * base fill calculation (they cover different vertical space).
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {WallRunMeasurement[]}   - one entry per wall (always 4 walls)
 */
export function measureWallRuns(items, roomDimensions) {
  const walls = getWalls(roomDimensions);
  // Only floor-level items for base coverage measurement
  const floorItems = items.filter((i) => (i.position?.yFt ?? 0) < 4.0);

  return walls.map((wall) => {
    const wallItems = floorItems.filter(
      (i) => getItemWallAssignment(i, roomDimensions) === wall.id,
    );

    const intervals = _itemsToIntervals(wallItems, wall);
    const merged    = _mergeIntervals(intervals);
    const cabinetFt = merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
    const gaps      = _extractGaps(merged, 0, wall.lengthFt);

    return {
      wallId:       wall.id,
      wallLengthFt: wall.lengthFt,
      cabinetFt:    Math.min(cabinetFt, wall.lengthFt),
      gapFt:        Math.max(0, wall.lengthFt - cabinetFt),
      fillPct:      wall.lengthFt > 0 ? Math.min(100, (cabinetFt / wall.lengthFt) * 100) : 0,
      gaps,
    };
  });
}

// ─── measureCabinetRuns ───────────────────────────────────────────────────────

/**
 * Measures each contiguous cabinet run detected by the spatial graph.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {Array<{
 *   runId:    string,
 *   wallId:   string|null,
 *   itemIds:  string[],
 *   totalFt:  number,
 *   startFt:  number,
 *   endFt:    number
 * }>}
 */
export function measureCabinetRuns(items, roomDimensions) {
  const graph = buildAdjacencyGraph(items, roomDimensions);
  const runs  = extractCabinetRuns(graph);
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

  return runs.map((runIds, idx) => {
    const runItems = runIds.map((id) => itemMap[id]).filter(Boolean);
    const wallId   = runItems.length > 0
      ? getItemWallAssignment(runItems[0], roomDimensions)
      : null;
    const wall = getWalls(roomDimensions).find((w) => w.id === wallId);

    // Compute start/end along the wall axis
    let startFt = Infinity;
    let endFt   = -Infinity;

    for (const item of runItems) {
      const fp  = _getFloorFootprint(item);
      const [s, e] = wall?.axis === "Z"
        ? [fp.minZ, fp.maxZ]    // NS wall: measure along Z
        : [fp.minX, fp.maxX];   // EW wall or unknown: measure along X
      if (s < startFt) startFt = s;
      if (e > endFt)   endFt   = e;
    }

    return {
      runId:   `run-${idx}`,
      wallId,
      itemIds: runIds,
      totalFt: runItems.length > 0 ? Math.max(0, endFt - startFt) : 0,
      startFt: runItems.length > 0 ? startFt : 0,
      endFt:   runItems.length > 0 ? endFt   : 0,
    };
  });
}

// ─── calculateRemainingGaps ───────────────────────────────────────────────────

/**
 * @typedef {Object} GapSegment
 * @property {string}  wallId
 * @property {number}  startFt
 * @property {number}  endFt
 * @property {number}  gapFt
 * @property {boolean} canFitFiller  - true if gap is 0.25" to 3" (standard filler range)
 * @property {boolean} needsFiller   - true if gap is between two runs (not end-of-run)
 */

/**
 * Identifies individual gap segments between cabinet runs on each wall.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {GapSegment[]}
 */
export function calculateRemainingGaps(items, roomDimensions) {
  const walls = getWalls(roomDimensions);
  const floorItems = items.filter((i) => (i.position?.yFt ?? 0) < 4.0);
  const results = [];

  for (const wall of walls) {
    const wallItems = floorItems.filter(
      (i) => getItemWallAssignment(i, roomDimensions) === wall.id,
    );
    if (wallItems.length === 0) continue;

    const intervals = _itemsToIntervals(wallItems, wall);
    const merged    = _mergeIntervals(intervals);
    const gaps      = _extractGaps(merged, 0, wall.lengthFt);

    for (const gap of gaps) {
      const gapFt = gap.end - gap.start;
      if (gapFt < 0.01) continue; // skip trivial gaps

      const gapIn       = gapFt * 12;
      const canFitFiller = gapIn >= 0.25 && gapIn <= 3.0;

      // A gap "needs a filler" when it sits between two cabinet runs
      // (i.e. it's not at the very start or very end of the wall)
      const needsFiller = gap.start > 0.05 && gap.end < wall.lengthFt - 0.05;

      results.push({
        wallId:       wall.id,
        startFt:      gap.start,
        endFt:        gap.end,
        gapFt,
        canFitFiller,
        needsFiller,
      });
    }
  }

  return results;
}

// ─── calculateIslandClearances ────────────────────────────────────────────────

/**
 * @typedef {Object} IslandClearanceMeasurement
 * @property {string} itemId
 * @property {number} northFt   - clearance to nearest obstacle north of island
 * @property {number} southFt   - clearance to nearest obstacle south of island
 * @property {number} eastFt    - clearance to nearest obstacle east of island
 * @property {number} westFt    - clearance to nearest obstacle west of island
 */

/**
 * Calculates clearance distances on all four sides of each island/peninsula.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {IslandClearanceMeasurement[]}
 */
export function calculateIslandClearances(items, roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  const islands = items.filter(
    (i) => getItemWallAssignment(i, roomDimensions) === null &&
           (i.position?.yFt ?? 0) < 4.0,
  );

  return islands.map((island) => {
    const iaabb = getItemAABB(island);

    let northFt = iaabb.minZ;       // to north wall
    let southFt = L - iaabb.maxZ;   // to south wall
    let westFt  = iaabb.minX;       // to west wall
    let eastFt  = W - iaabb.maxX;   // to east wall

    for (const item of items) {
      if (item.id === island.id || (item.position?.yFt ?? 0) >= 4.0) continue;
      const b = getItemAABB(item);

      // North side: items whose maxZ ≤ island.minZ and X ranges overlap
      if (b.maxZ <= iaabb.minZ && b.maxX > iaabb.minX && b.minX < iaabb.maxX) {
        northFt = Math.min(northFt, iaabb.minZ - b.maxZ);
      }
      // South side: items whose minZ ≥ island.maxZ and X ranges overlap
      if (b.minZ >= iaabb.maxZ && b.maxX > iaabb.minX && b.minX < iaabb.maxX) {
        southFt = Math.min(southFt, b.minZ - iaabb.maxZ);
      }
      // West side: items whose maxX ≤ island.minX and Z ranges overlap
      if (b.maxX <= iaabb.minX && b.maxZ > iaabb.minZ && b.minZ < iaabb.maxZ) {
        westFt = Math.min(westFt, iaabb.minX - b.maxX);
      }
      // East side: items whose minX ≥ island.maxX and Z ranges overlap
      if (b.minX >= iaabb.maxX && b.maxZ > iaabb.minZ && b.minZ < iaabb.maxZ) {
        eastFt = Math.min(eastFt, b.minX - iaabb.maxX);
      }
    }

    return {
      itemId:  island.id,
      northFt: Math.max(0, northFt),
      southFt: Math.max(0, southFt),
      westFt:  Math.max(0, westFt),
      eastFt:  Math.max(0, eastFt),
    };
  });
}

// ─── measureAll (master aggregator) ─────────────────────────────────────────

/**
 * Runs all measurement sub-functions and returns a single combined object.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number, height?: number }} roomDimensions
 * @returns {{
 *   wallRuns:         WallRunMeasurement[],
 *   cabinetRuns:      Array,
 *   gaps:             GapSegment[],
 *   islandClearances: IslandClearanceMeasurement[]
 * }}
 */
export function measureAll(items, roomDimensions) {
  return {
    wallRuns:         measureWallRuns(items, roomDimensions),
    cabinetRuns:      measureCabinetRuns(items, roomDimensions),
    gaps:             calculateRemainingGaps(items, roomDimensions),
    islandClearances: calculateIslandClearances(items, roomDimensions),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Converts items on a wall to [start, end] intervals along the wall's run axis.
 * EW walls (north/south): axis = X, values from fp.minX / fp.maxX
 * NS walls (east/west):   axis = Z, values from fp.minZ / fp.maxZ
 */
function _itemsToIntervals(wallItems, wall) {
  return wallItems.map((item) => {
    const fp = _getFloorFootprint(item);
    if (wall.axis === "Z") return { start: fp.minZ, end: fp.maxZ };
    return { start: fp.minX, end: fp.maxX };
  });
}

/** Merges overlapping intervals. Input need not be sorted. */
function _mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end + 0.01) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/** Returns gap segments between merged cabinet intervals from `axisStart` to `axisEnd`. */
function _extractGaps(mergedIntervals, axisStart, axisEnd) {
  const gaps = [];
  let cursor = axisStart;

  for (const iv of mergedIntervals) {
    if (iv.start > cursor + 0.01) {
      gaps.push({ start: cursor, end: iv.start });
    }
    cursor = Math.max(cursor, iv.end);
  }

  if (cursor < axisEnd - 0.01) {
    gaps.push({ start: cursor, end: axisEnd });
  }

  return gaps;
}
