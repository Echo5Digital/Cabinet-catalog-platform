/**
 * cornerEngine.js — Corner occupancy analysis for the kitchen planner.
 *
 * Classifies the four interior room corners by how cabinet runs meet (or
 * don't meet) at each corner. Used to detect blind corners, recommend
 * corner-cabinet solutions, and report available space.
 *
 * Existing corner placements continue working — this engine only analyses
 * the current layout and never modifies it.
 *
 * All functions are pure — no React, no Zustand, no side effects.
 */

import { getCorners, getItemWallAssignment, _getFloorFootprint } from "./roomEngine.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Distance from corner point to consider an item "adjacent" to that corner. */
const CORNER_PROXIMITY_FT = 1.5;

/** A gap smaller than this (0.75 ft = 9") between two runs meeting at a corner
 *  is classified as "blind" — inaccessible without a specialty corner solution. */
const BLIND_THRESHOLD_FT = 0.75;

// ─── getCornerAnalysis ────────────────────────────────────────────────────────

/**
 * @typedef {Object} CornerAnalysis
 * @property {string}   cornerId          - "corner-NW" | "corner-NE" | "corner-SE" | "corner-SW"
 * @property {number}   xFt               - corner X position in feet
 * @property {number}   zFt               - corner Z position in feet
 * @property {"empty"|"single-wall"|"inside"|"blind"|"open"} cornerType
 * @property {string[]} adjacentItemIds   - IDs of items within CORNER_PROXIMITY_FT of this corner
 * @property {number}   availableSpaceX   - usable horizontal space (ft) in the X direction at corner
 * @property {number}   availableSpaceZ   - usable vertical space (ft) in the Z direction at corner
 * @property {boolean}  needsBlindFiller  - true when two runs meet but leave an inaccessible blind gap
 * @property {string[]} recommendations  - human-readable advisory strings
 */

/**
 * Analyses all four room corners and returns their occupancy status.
 * Always returns exactly 4 entries, one per corner.
 *
 * @param {Object[]} items                         - scene.items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {CornerAnalysis[]}
 */
export function getCornerAnalysis(items, roomDimensions) {
  const corners = getCorners(roomDimensions);
  return corners.map((corner) => _analyzeCorner(corner, items, roomDimensions));
}

// ─── Convenience filters ──────────────────────────────────────────────────────

/**
 * Filters the analysis results to corners where two cabinet runs meet
 * but leave a blind (inaccessible) gap.
 *
 * @param {CornerAnalysis[]} analysis
 * @returns {CornerAnalysis[]}
 */
export function getBlindCorners(analysis) {
  return analysis.filter((c) => c.cornerType === "blind");
}

/**
 * Filters the analysis results to corners where no items are present.
 *
 * @param {CornerAnalysis[]} analysis
 * @returns {CornerAnalysis[]}
 */
export function getEmptyCorners(analysis) {
  return analysis.filter((c) => c.cornerType === "empty");
}

/**
 * Filters the analysis results to corners where both meeting walls have cabinets.
 *
 * @param {CornerAnalysis[]} analysis
 * @returns {CornerAnalysis[]}
 */
export function getFilledCorners(analysis) {
  return analysis.filter((c) => c.cornerType === "inside" || c.cornerType === "blind");
}

// ─── Internal: single-corner analysis ────────────────────────────────────────

function _analyzeCorner(corner, items, roomDimensions) {
  const { id: cornerId, xFt, zFt, walls: [wallA, wallB] } = corner;

  // ── 1. Find items assigned to each wall at this corner ──────────────────────
  const wallAItems = items.filter((item) => getItemWallAssignment(item, roomDimensions) === wallA);
  const wallBItems = items.filter((item) => getItemWallAssignment(item, roomDimensions) === wallB);

  // ── 2. Find items physically adjacent to this corner point ──────────────────
  const adjacentItemIds = items
    .filter((item) => _isAdjacentToCorner(item, xFt, zFt))
    .map((item) => item.id);

  // ── 3. Compute available space at corner on each axis ───────────────────────
  const { availableSpaceX, availableSpaceZ } = _computeAvailableSpace(
    cornerId, xFt, zFt, wallAItems, wallBItems, roomDimensions,
  );

  // ── 4. Classify corner type ─────────────────────────────────────────────────
  const hasWallA = wallAItems.some((item) => _isAdjacentToCorner(item, xFt, zFt));
  const hasWallB = wallBItems.some((item) => _isAdjacentToCorner(item, xFt, zFt));

  let cornerType;
  if (!hasWallA && !hasWallB) {
    cornerType = "empty";
  } else if (hasWallA !== hasWallB) {
    cornerType = "single-wall";
  } else {
    // Both walls have items at this corner
    const gapTooSmall = availableSpaceX < BLIND_THRESHOLD_FT || availableSpaceZ < BLIND_THRESHOLD_FT;
    cornerType = gapTooSmall ? "blind" : "inside";
  }

  // ── 5. Determine if a filler is needed ──────────────────────────────────────
  const needsBlindFiller = (
    (cornerType === "blind" || cornerType === "inside") &&
    (availableSpaceX < BLIND_THRESHOLD_FT || availableSpaceZ < BLIND_THRESHOLD_FT)
  );

  // ── 6. Generate recommendations ─────────────────────────────────────────────
  const recommendations = _buildRecommendations(
    cornerId, cornerType, availableSpaceX, availableSpaceZ, needsBlindFiller,
  );

  return {
    cornerId,
    xFt,
    zFt,
    cornerType,
    adjacentItemIds,
    availableSpaceX,
    availableSpaceZ,
    needsBlindFiller,
    recommendations,
  };
}

// ─── Internal: is item adjacent to corner? ────────────────────────────────────

/**
 * Returns true if any part of the item's floor footprint is within
 * CORNER_PROXIMITY_FT of the corner point.
 */
function _isAdjacentToCorner(item, cx, cz) {
  const fp = _getFloorFootprint(item);
  // Clamp corner point to item footprint and compute distance
  const nearestX = Math.max(fp.minX, Math.min(cx, fp.maxX));
  const nearestZ = Math.max(fp.minZ, Math.min(cz, fp.maxZ));
  const dist = Math.sqrt((nearestX - cx) ** 2 + (nearestZ - cz) ** 2);
  return dist < CORNER_PROXIMITY_FT;
}

// ─── Internal: available space computation ────────────────────────────────────

/**
 * Computes how much usable space exists at the corner along each axis.
 * "Available space" = distance from corner to the nearest cabinet edge
 * running toward the interior (i.e. how deep the gap is).
 */
function _computeAvailableSpace(cornerId, cx, cz, wallAItems, wallBItems, roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  // Which direction does X increase from this corner?
  const xInward = (cornerId === "corner-NW" || cornerId === "corner-SW") ? 1 : -1;
  const zInward = (cornerId === "corner-NW" || cornerId === "corner-NE") ? 1 : -1;

  // Default: full wall length (no item present)
  let availableSpaceX = xInward > 0 ? W - cx : cx;
  let availableSpaceZ = zInward > 0 ? L - cz : cz;

  // Find the nearest item edge from the corner along X axis (items on Z-axis walls)
  for (const item of [...wallAItems, ...wallBItems]) {
    const fp = _getFloorFootprint(item);
    if (xInward > 0) {
      // Corner is on the west side, items extend to the right
      if (fp.minX >= cx && fp.minX < availableSpaceX + cx) {
        availableSpaceX = fp.minX - cx;
      }
    } else {
      // Corner is on the east side, items extend to the left
      if (fp.maxX <= cx && cx - fp.maxX < availableSpaceX) {
        availableSpaceX = cx - fp.maxX;
      }
    }
    if (zInward > 0) {
      if (fp.minZ >= cz && fp.minZ - cz < availableSpaceZ) {
        availableSpaceZ = fp.minZ - cz;
      }
    } else {
      if (fp.maxZ <= cz && cz - fp.maxZ < availableSpaceZ) {
        availableSpaceZ = cz - fp.maxZ;
      }
    }
  }

  return {
    availableSpaceX: Math.max(0, availableSpaceX),
    availableSpaceZ: Math.max(0, availableSpaceZ),
  };
}

// ─── Internal: recommendations ───────────────────────────────────────────────

function _buildRecommendations(cornerId, cornerType, spaceX, spaceZ, needsFiller) {
  const recs = [];
  const label = cornerId.replace("corner-", "").toUpperCase();  // "NW", "NE", etc.

  if (cornerType === "blind") {
    recs.push(
      `${label} corner has a blind gap (${(Math.min(spaceX, spaceZ) * 12).toFixed(0)}"). ` +
      `Consider a lazy-susan, diagonal corner, or pie-cut corner cabinet.`,
    );
  }

  if (cornerType === "inside" && (spaceX < 0.5 || spaceZ < 0.5)) {
    recs.push(
      `${label} corner cabinet run is very tight. A blind-corner or filler panel may improve access.`,
    );
  }

  if (cornerType === "empty") {
    recs.push(
      `${label} corner is unused. Adding a corner pantry or diagonal cabinet could improve storage.`,
    );
  }

  if (cornerType === "single-wall") {
    recs.push(
      `Only one wall has cabinets at the ${label} corner. ` +
      `Extending the run or adding a corner cabinet could fill the remaining space.`,
    );
  }

  return recs;
}
