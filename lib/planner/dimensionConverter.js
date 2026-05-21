/**
 * Dimension conversion utilities for the Kitchen Planner.
 * All conversions are for rendering only — DB values are never mutated.
 *
 * DB stores dimensions in inches.
 * Planner state stores positions/dimensions in feet.
 * Canvas renders in pixels (feet × FT_TO_PX × zoomLevel).
 */

/** Pixels per foot at zoom level 1.0 */
export const FT_TO_PX = 60;

/** Convert inches (DB value) to feet */
export function inToFt(inches) {
  if (inches == null || isNaN(inches)) return 0;
  return Math.round((inches / 12) * 100) / 100;
}

/** Convert feet to canvas pixels, factoring in zoom */
export function ftToPx(feet, zoom = 1) {
  return feet * FT_TO_PX * zoom;
}

/** Convert canvas pixels back to feet, factoring in zoom */
export function pxToFt(px, zoom = 1) {
  return px / (FT_TO_PX * zoom);
}

/**
 * Given a canvas pixel offset and stage transform, return the room-space
 * position in feet. Used to convert a pointer drop position to a room coordinate.
 *
 * @param {number} pointerX - pointer X relative to canvas container
 * @param {number} pointerY - pointer Y relative to canvas container
 * @param {number} offsetX  - Konva stage offsetX (pan)
 * @param {number} offsetY  - Konva stage offsetY (pan)
 * @param {number} zoom     - current zoom level
 */
export function canvasPxToFt(pointerX, pointerY, offsetX = 0, offsetY = 0, zoom = 1) {
  const canvasX = (pointerX - offsetX) / zoom;
  const canvasY = (pointerY - offsetY) / zoom;
  return {
    x: pxToFt(canvasX),
    y: pxToFt(canvasY),
  };
}
