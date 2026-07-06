/**
 * cabinetSnap.js — Smart cabinet-to-cabinet edge snapping.
 *
 * When dragging a cabinet near another cabinet, this module adjusts
 * the proposed position so edges align cleanly — forming flush runs.
 *
 * Supported alignments:
 *  - Left edge of moving → right edge of neighbor  (end-to-end X)
 *  - Right edge of moving → left edge of neighbor  (end-to-end X)
 *  - Left edge of moving → left edge of neighbor   (same-wall X)
 *  - Top edge of moving → bottom edge of neighbor  (end-to-end Z)
 *  - Bottom edge of moving → top edge of neighbor  (end-to-end Z)
 *  - Top edge of moving → top edge of neighbor     (same-wall Z)
 *
 * Snap threshold: CABINET_SNAP_THRESHOLD_FT (3 inches = 0.25 ft).
 *
 * Pure function — no React, no store imports.
 */

/** Snap threshold in feet (3 inches). */
export const CABINET_SNAP_THRESHOLD_FT = 0.25;

/**
 * Return the AABB of a scene item (accounts for 90°/270° rotation).
 * Mirrors the logic in collision.js (duplicated here to avoid circular deps).
 *
 * @param {Object} item - SceneItem
 * @returns {{ minX, maxX, minZ, maxZ, w, d }}
 */
function getAABB(item) {
  const xFt = item.position?.xFt ?? 0;
  const zFt = item.position?.zFt ?? 0;
  const { widthFt = 2, depthFt = 2 } = item.dimensions ?? {};
  const rot = ((item.rotation?.yDeg ?? 0) % 360 + 360) % 360;
  const [w, d] = (rot === 90 || rot === 270) ? [depthFt, widthFt] : [widthFt, depthFt];
  return { minX: xFt, maxX: xFt + w, minZ: zFt, maxZ: zFt + d, w, d };
}

/**
 * Snap the proposed position of a moving item to the nearest neighbor edge.
 *
 * @param {{ xFt: number, zFt: number }} position   - Proposed post-grid-snap position
 * @param {Object}   movingItem  - The SceneItem being moved (with .id, .dimensions, .rotation)
 * @param {Object[]} items       - All current scene items
 * @param {number}   threshold   - Snap distance in feet
 * @returns {{ xFt: number, zFt: number }}  - Adjusted position (may be unchanged)
 */
export function snapToNearestCabinet(
  position,
  movingItem,
  items,
  threshold = CABINET_SNAP_THRESHOLD_FT,
) {
  const rot = ((movingItem.rotation?.yDeg ?? 0) % 360 + 360) % 360;
  const { widthFt = 2, depthFt = 2 } = movingItem.dimensions ?? {};
  const [w, d] = (rot === 90 || rot === 270) ? [depthFt, widthFt] : [widthFt, depthFt];

  let { xFt, zFt } = position;

  // ── Snap X axis ──────────────────────────────────────────────────────────────
  let bestXDist = threshold;
  let snapX = xFt; // no snap by default

  for (const item of items) {
    if (item.id === movingItem.id) continue;
    const ni = getAABB(item);

    const checks = [
      // left edge of moving aligns to right edge of neighbor (butts up against it)
      { snap: ni.maxX,     dist: Math.abs(xFt - ni.maxX) },
      // right edge of moving aligns to left edge of neighbor
      { snap: ni.minX - w, dist: Math.abs(xFt + w - ni.minX) },
      // left edges align (same-wall alignment)
      { snap: ni.minX,     dist: Math.abs(xFt - ni.minX) },
    ];

    for (const { snap, dist } of checks) {
      if (dist < bestXDist) {
        bestXDist = dist;
        snapX = snap;
      }
    }
  }

  xFt = snapX;

  // ── Snap Z axis ──────────────────────────────────────────────────────────────
  let bestZDist = threshold;
  let snapZ = zFt;

  for (const item of items) {
    if (item.id === movingItem.id) continue;
    const ni = getAABB(item);

    const checks = [
      // top edge of moving aligns to bottom edge of neighbor
      { snap: ni.maxZ,     dist: Math.abs(zFt - ni.maxZ) },
      // bottom edge of moving aligns to top edge of neighbor
      { snap: ni.minZ - d, dist: Math.abs(zFt + d - ni.minZ) },
      // top edges align (same-wall alignment)
      { snap: ni.minZ,     dist: Math.abs(zFt - ni.minZ) },
    ];

    for (const { snap, dist } of checks) {
      if (dist < bestZDist) {
        bestZDist = dist;
        snapZ = snap;
      }
    }
  }

  zFt = snapZ;

  return { xFt, zFt };
}
