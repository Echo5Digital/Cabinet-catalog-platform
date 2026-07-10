/**
 * collisionEngine.js — Enhanced collision detection for the kitchen planner.
 *
 * This is an additive layer over the existing collision.js module.
 * It re-exports the core AABB primitives under the collisionEngine namespace
 * and adds richer output types for the new validation pipeline.
 *
 * All functions are pure — no React, no Zustand, no side effects.
 *
 * Import hierarchy:
 *   collisionEngine.js  ←  collision.js (existing, unmodified)
 */

import { getItemAABB, aabbOverlap } from "./collision.js";

// ─── Re-exports (canonical interface) ────────────────────────────────────────

/**
 * Returns the 3D axis-aligned bounding box for a SceneItem.
 * Accounts for 90°/270° rotation (swaps width and depth).
 *
 * @param {Object} item - SceneItem with .position, .dimensions, .rotation
 * @returns {{ minX, maxX, minY, maxY, minZ, maxZ }}
 */
export function getBoundingBox(item) {
  return getItemAABB(item);
}

/**
 * Returns true when two items' 3D bounding boxes overlap.
 *
 * @param {Object} itemA - SceneItem
 * @param {Object} itemB - SceneItem
 * @returns {boolean}
 */
export function intersects(itemA, itemB) {
  return aabbOverlap(getItemAABB(itemA), getItemAABB(itemB));
}

// ─── getFootprint ─────────────────────────────────────────────────────────────

/**
 * Returns the 2D floor footprint (X-Z plane only) for an item.
 * Drops the Y axis — useful for walkway and island clearance calculations
 * that only care about the floor plan projection.
 *
 * @param {Object} item - SceneItem
 * @returns {{ minX: number, maxX: number, minZ: number, maxZ: number }}
 */
export function getFootprint(item) {
  const b = getItemAABB(item);
  return { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
}

// ─── detectCollisions ─────────────────────────────────────────────────────────

/**
 * Detects all pairwise 3D collisions in the scene and returns a structured report.
 *
 * Note: SpatialEngine already prevents most collisions at placement time.
 * This function is for advisory display (highlighting already-overlapping items)
 * and is consumed by the usePlannerCollisions hook.
 *
 * Wall cabinets (yFt=4.5) and base cabinets (yFt=0, height=3ft) do not overlap
 * on the Y axis, so they are correctly reported as non-colliding.
 *
 * @param {Object[]} items - scene.items (SceneItem[])
 * @returns {Array<{
 *   itemAId:  string,
 *   itemBId:  string,
 *   severity: "error",
 *   overlap:  { x: number, y: number, z: number }
 * }>}
 */
export function detectCollisions(items) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const aabbA = getItemAABB(items[i]);

    for (let j = i + 1; j < items.length; j++) {
      const aabbB = getItemAABB(items[j]);

      if (!aabbOverlap(aabbA, aabbB)) continue;

      // Compute per-axis overlap depths (always positive when overlapping)
      const overlapX = Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX);
      const overlapY = Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY);
      const overlapZ = Math.min(aabbA.maxZ, aabbB.maxZ) - Math.max(aabbA.minZ, aabbB.minZ);

      results.push({
        itemAId:  items[i].id,
        itemBId:  items[j].id,
        severity: "error",
        overlap:  {
          x: Math.max(0, overlapX),
          y: Math.max(0, overlapY),
          z: Math.max(0, overlapZ),
        },
      });
    }
  }

  return results;
}

// ─── getItemsInZone ───────────────────────────────────────────────────────────

/**
 * Returns all items whose floor footprint overlaps a given rectangular zone.
 * Used by clearanceEngine to find items inside clearance corridors.
 *
 * @param {Object[]} items           - scene.items
 * @param {{ minX, maxX, minZ, maxZ }} zone - XZ bounding rect of the zone
 * @param {string|null} [excludeId]  - optional item ID to skip
 * @returns {Object[]}               - items that overlap the zone
 */
export function getItemsInZone(items, zone, excludeId = null) {
  return items.filter((item) => {
    if (item.id === excludeId) return false;
    const fp = getFootprint(item);
    return (
      fp.minX < zone.maxX &&
      fp.maxX > zone.minX &&
      fp.minZ < zone.maxZ &&
      fp.maxZ > zone.minZ
    );
  });
}
