/**
 * doorSwingEngine.js — Door and appliance swing clearance analysis.
 *
 * Generates clearance zones in front of appliance/cabinet door faces and
 * detects when other items block those zones.
 *
 * The "door face" is the face of the item pointing away from its assigned wall
 * (i.e., into the room). Swing clearance is modelled as a rectangular AABB
 * immediately in front of that face.
 *
 * Result shape matches designRules.js: { id, severity, message, affectedItemId }
 * so results can be aggregated by validationEngine.js without format conversion.
 *
 * All functions are pure — no React, no Zustand, no side effects.
 */

import { getItemAABB }            from "./collision.js";
import { getItemWallAssignment }  from "./roomEngine.js";

// ─── Swing depth constants ────────────────────────────────────────────────────

const SWING = {
  FRIDGE:    3.0,   // 36" — full door swing
  DISHWASHER: 2.0,  // 24" — door falls horizontal
  DEFAULT:   1.5,   // 18" — standard cabinet door swing
};

// ─── buildDoorSwingPolygon ────────────────────────────────────────────────────

/**
 * Builds a rectangular clearance zone (modelled as a floor-level AABB) in
 * front of an item's door face.
 *
 * The "front face" is the face pointing away from the item's assigned wall:
 *   wall-north → front = south → clearance extends in +Z direction
 *   wall-south → front = north → clearance extends in -Z direction
 *   wall-west  → front = east  → clearance extends in +X direction
 *   wall-east  → front = west  → clearance extends in -X direction
 *   null (island) → assume south-facing (Z+)
 *
 * @param {Object} item              - SceneItem
 * @param {{ width: number, length: number }} roomDimensions
 * @param {Object} [options]
 * @param {number} [options.swingDepthFt]  - override clearance depth (ft)
 * @returns {{ minX, maxX, minZ, maxZ }}   - floor-level clearance AABB
 */
export function buildDoorSwingPolygon(item, roomDimensions, options = {}) {
  const aabb = getItemAABB(item);
  const swingDepth = options.swingDepthFt ?? _defaultSwingDepth(item);
  const wallId = getItemWallAssignment(item, roomDimensions);

  switch (wallId) {
    case "wall-north":
      // North-wall item: door opens southward (+Z)
      return {
        minX: aabb.minX, maxX: aabb.maxX,
        minZ: aabb.maxZ, maxZ: aabb.maxZ + swingDepth,
      };

    case "wall-south":
      // South-wall item: door opens northward (-Z)
      return {
        minX: aabb.minX,  maxX: aabb.maxX,
        minZ: aabb.minZ - swingDepth, maxZ: aabb.minZ,
      };

    case "wall-west":
      // West-wall item: door opens eastward (+X)
      return {
        minX: aabb.maxX, maxX: aabb.maxX + swingDepth,
        minZ: aabb.minZ, maxZ: aabb.maxZ,
      };

    case "wall-east":
      // East-wall item: door opens westward (-X)
      return {
        minX: aabb.minX - swingDepth, maxX: aabb.minX,
        minZ: aabb.minZ, maxZ: aabb.maxZ,
      };

    default:
      // Floating island — default to south-facing door
      return {
        minX: aabb.minX, maxX: aabb.maxX,
        minZ: aabb.maxZ, maxZ: aabb.maxZ + swingDepth,
      };
  }
}

// ─── intersectsDoorSwing ──────────────────────────────────────────────────────

/**
 * Returns the IDs of all items (except excludeId) whose floor footprint
 * overlaps the given door-swing clearance zone.
 *
 * @param {{ minX, maxX, minZ, maxZ }} swingZone  - from buildDoorSwingPolygon
 * @param {Object[]} items                          - scene.items
 * @param {string}   excludeId                      - ID of the item whose swing this is
 * @returns {string[]}                              - IDs of blocking items (empty = clear)
 */
export function intersectsDoorSwing(swingZone, items, excludeId) {
  const blockers = [];

  for (const item of items) {
    if (item.id === excludeId) continue;

    const aabb = getItemAABB(item);
    // Floor-level XZ overlap only — ignore Y so wall cabinets don't trigger
    const xOverlap = aabb.minX < swingZone.maxX && aabb.maxX > swingZone.minX;
    const zOverlap = aabb.minZ < swingZone.maxZ && aabb.maxZ > swingZone.minZ;
    // Skip wall cabinets (yFt ≥ 4.0) — they don't interfere with floor-level swings
    const isWallCabinet = (item.position?.yFt ?? 0) >= 4.0;

    if (xOverlap && zOverlap && !isWallCabinet) {
      blockers.push(item.id);
    }
  }

  return blockers;
}

// ─── validateDoorSwings ───────────────────────────────────────────────────────

/**
 * Validates door-swing clearances for all applicable items in the scene.
 *
 * Applicable items:
 *   - Refrigerator category (3 ft clearance)
 *   - Any item whose name includes "dishwasher" (2 ft clearance)
 *
 * Also checks if the swing zone extends beyond the room boundary.
 *
 * @param {Object[]} items
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {Array<{ id: string, severity: "warning", message: string, affectedItemId: string }>}
 */
export function validateDoorSwings(items, roomDimensions) {
  const results = [];
  let counter = 0;
  const nextId = () => `swing-${counter++}`;

  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  for (const item of items) {
    if (!_hasDoorSwing(item)) continue;

    const swingZone  = buildDoorSwingPolygon(item, roomDimensions);
    const label      = _itemLabel(item);
    const swingInches = (_defaultSwingDepth(item) * 12).toFixed(0);

    // ── Check 1: swing zone exceeds room boundary ───────────────────────────
    const exceedsRoom = (
      swingZone.minX < 0     ||
      swingZone.maxX > W     ||
      swingZone.minZ < 0     ||
      swingZone.maxZ > L
    );

    if (exceedsRoom) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: `${label} may have insufficient door-swing clearance (needs ${swingInches}" in front).`,
        affectedItemId: item.id,
      });
    }

    // ── Check 2: another item blocks the swing zone ─────────────────────────
    const blockers = intersectsDoorSwing(swingZone, items, item.id);
    if (blockers.length > 0) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: `An item is blocking the ${label.toLowerCase()} door-swing clearance zone (${swingInches}" needed).`,
        affectedItemId: item.id,
      });
    }
  }

  return results;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** True for items that need a door-swing clearance check. */
function _hasDoorSwing(item) {
  const cat  = (item.category ?? "").toLowerCase();
  const name = (item.name     ?? "").toLowerCase();
  return (
    cat === "refrigerator" ||
    name.includes("refrigerator") ||
    name.includes("fridge") ||
    name.includes("dishwasher")
  );
}

/** Returns the appropriate swing depth in feet for an item. */
function _defaultSwingDepth(item) {
  const cat  = (item.category ?? "").toLowerCase();
  const name = (item.name     ?? "").toLowerCase();

  if (cat === "refrigerator" || name.includes("refrigerator") || name.includes("fridge")) {
    return SWING.FRIDGE;
  }
  if (name.includes("dishwasher")) {
    return SWING.DISHWASHER;
  }
  return SWING.DEFAULT;
}

/** Human-readable item label for validation messages. */
function _itemLabel(item) {
  const name = (item.name ?? "").toLowerCase();
  if (name.includes("refrigerator") || name.includes("fridge")) return "Refrigerator";
  if (name.includes("dishwasher"))                               return "Dishwasher";
  return item.name ?? item.category ?? "Appliance";
}
