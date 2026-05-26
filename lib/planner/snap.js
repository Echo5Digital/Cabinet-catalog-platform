/**
 * Grid snapping utilities for the Kitchen Planner canvas.
 * All values are in feet.
 */

/**
 * Kitchen cabinet snap grid.
 * Set to 0 for free placement (items land exactly where dropped/dragged,
 * only clamped to room boundaries).
 */
export const SNAP_GRID_FT = 0;

/** Snap a single value to the nearest grid increment (default 1 ft).
 *  Returns value unchanged when gridFt is 0 (free placement). */
export function snapToGrid(value, gridFt = 1) {
  if (gridFt <= 0) return value;
  return Math.round(value / gridFt) * gridFt;
}

/**
 * Snap an item's top-left position to the cabinet grid and clamp within the room.
 *
 * @param {number} x       - proposed x position in feet (left edge of item)
 * @param {number} y       - proposed y position in feet (top edge of item)
 * @param {number} widthFt - item width in feet
 * @param {number} depthFt - item depth (height on canvas) in feet
 * @param {number} roomW   - room width in feet
 * @param {number} roomL   - room length in feet
 * @param {number} gridFt  - grid snap increment (default SNAP_GRID_FT = 0.25 ft)
 * @returns {{ x: number, y: number }}
 */
export function snapItem(x, y, widthFt, depthFt, roomW, roomL, gridFt = SNAP_GRID_FT) {
  let snappedX = snapToGrid(x, gridFt);
  let snappedY = snapToGrid(y, gridFt);

  // Clamp within room boundaries
  snappedX = Math.max(0, Math.min(snappedX, roomW - widthFt));
  snappedY = Math.max(0, Math.min(snappedY, roomL - depthFt));

  return { x: snappedX, y: snappedY };
}

/**
 * Given a drop pointer position relative to the canvas container, calculate
 * the snapped room-space position for a new item.
 *
 * @param {number} pointerX  - pointer X in canvas container px (from left of container)
 * @param {number} pointerY  - pointer Y in canvas container px (from top of container)
 * @param {number} widthFt   - item width in feet
 * @param {number} depthFt   - item depth in feet
 * @param {number} roomW     - room width in feet
 * @param {number} roomL     - room length in feet
 * @param {number} zoom      - current zoom level
 * @param {number} [FT_TO_PX=60] - pixels per foot at zoom 1.0
 * @returns {{ x: number, y: number }}
 */
export function dropPositionToRoomFt(pointerX, pointerY, widthFt, depthFt, roomW, roomL, zoom, FT_TO_PX = 60) {
  const scale = FT_TO_PX * zoom;
  // Convert pointer px → room feet (center item on pointer)
  const rawX = pointerX / scale - widthFt / 2;
  const rawY = pointerY / scale - depthFt / 2;
  return snapItem(rawX, rawY, widthFt, depthFt, roomW, roomL);
}
