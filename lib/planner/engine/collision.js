/**
 * collision.js — AABB collision detection for the kitchen planner.
 *
 * All items use axis-aligned bounding boxes (AABB) derived from their
 * position, dimensions, and rotation (only 0°/90°/180°/270° handled,
 * which covers all cabinet-aligned placements — swaps W/D for 90°/270°).
 *
 * Exported functions are pure — no React, no store imports.
 */

/** Tolerance in feet: items may touch but not overlap by more than this. */
const MARGIN = 0.01;

/**
 * Return the 3D AABB for a SceneItem (X, Y, Z axes).
 * Accounts for 90°/270° rotation by swapping width and depth.
 *
 * @param {Object} item  - SceneItem with .position, .dimensions, .rotation
 * @returns {{ minX, maxX, minY, maxY, minZ, maxZ }}
 */
export function getItemAABB(item) {
  const xFt = item.position?.xFt ?? 0;
  const yFt = item.position?.yFt ?? 0;
  const zFt = item.position?.zFt ?? 0;
  const { widthFt = 2, depthFt = 2, heightFt = 3 } = item.dimensions ?? {};
  const rot = ((item.rotation?.yDeg ?? 0) % 360 + 360) % 360;
  // Swapping W/D at 90°/270° gives the correct footprint after rotation
  const [w, d] = (rot === 90 || rot === 270) ? [depthFt, widthFt] : [widthFt, depthFt];
  return {
    minX: xFt, maxX: xFt + w,
    minY: yFt, maxY: yFt + heightFt,
    minZ: zFt, maxZ: zFt + d,
  };
}

/**
 * Returns true when two 3D AABBs overlap on all three axes (beyond MARGIN).
 * Wall cabinets (yFt=4.5) and base cabinets (yFt=0, height=3ft, top=3ft)
 * do not overlap on the Y axis so they never collide.
 *
 * @param {{ minX, maxX, minY, maxY, minZ, maxZ }} a
 * @param {{ minX, maxX, minY, maxY, minZ, maxZ }} b
 * @returns {boolean}
 */
export function aabbOverlap(a, b) {
  return (
    a.minX < b.maxX - MARGIN &&
    a.maxX > b.minX + MARGIN &&
    a.minY < b.maxY - MARGIN &&
    a.maxY > b.minY + MARGIN &&
    a.minZ < b.maxZ - MARGIN &&
    a.maxZ > b.minZ + MARGIN
  );
}

/**
 * Returns true when `candidate` overlaps any item in `items` in 3D space.
 * Items at different vertical elevations (e.g. wall vs base cabinets) are
 * correctly treated as non-colliding.
 *
 * @param {Object[]} items      - Current scene items (SceneItem[])
 * @param {Object}   candidate  - The item to test (SceneItem-shaped object)
 * @param {string|null} excludeId - Item ID to ignore (the item being moved)
 * @returns {boolean}
 */
export function hasCollision(items, candidate, excludeId = null) {
  const aabb = getItemAABB(candidate);
  for (const item of items) {
    if (item.id === excludeId) continue;
    if (aabbOverlap(aabb, getItemAABB(item))) return true;
  }
  return false;
}
