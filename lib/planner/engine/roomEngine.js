/**
 * roomEngine.js — Room geometry primitives for the kitchen planner.
 *
 * Derives all wall, corner, and bounding-box data from the authoritative
 * roomDimensions object. All downstream engines import from here so they
 * share a single consistent geometric model.
 *
 * Coordinate system (matches Three.js scene and SpatialEngine):
 *   X = east–west  (0 = west interior wall face, increases east)
 *   Y = elevation  (0 = floor, increases up)
 *   Z = north–south (0 = north interior wall face, increases south)
 *
 * All values in feet.
 *
 * Pure functions only — no React, no Zustand, no side effects.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum distance from a wall face for an item to be considered "wall-mounted".
 *  Typical base/tall cabinet depth (2 ft) + 0.1 ft tolerance. */
const WALL_ASSIGNMENT_THRESHOLD_FT = 2.1;

// ─── getWalls ─────────────────────────────────────────────────────────────────

/**
 * Returns the four interior wall segments of the room.
 *
 * Each wall has:
 *  - id:            canonical wall identifier
 *  - startXZ:       [x, z] of the wall segment start (at the corner)
 *  - endXZ:         [x, z] of the wall segment end   (at the other corner)
 *  - lengthFt:      interior length of the wall
 *  - normal:        unit inward-facing normal { x, z } (pointing into the room)
 *  - axis:          "X" for north/south walls (run along X), "Z" for east/west
 *
 * @param {{ width: number, length: number, height?: number }} roomDimensions
 * @returns {Array<{
 *   id: string,
 *   startXZ: [number, number],
 *   endXZ:   [number, number],
 *   lengthFt: number,
 *   normal:  { x: number, z: number },
 *   axis:    "X" | "Z"
 * }>}
 */
export function getWalls(roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  return [
    {
      id:       "wall-north",
      startXZ:  [0, 0],
      endXZ:    [W, 0],
      lengthFt: W,
      normal:   { x: 0, z: 1 },   // faces south (into room)
      axis:     "X",
    },
    {
      id:       "wall-south",
      startXZ:  [0, L],
      endXZ:    [W, L],
      lengthFt: W,
      normal:   { x: 0, z: -1 },  // faces north (into room)
      axis:     "X",
    },
    {
      id:       "wall-west",
      startXZ:  [0, 0],
      endXZ:    [0, L],
      lengthFt: L,
      normal:   { x: 1, z: 0 },   // faces east (into room)
      axis:     "Z",
    },
    {
      id:       "wall-east",
      startXZ:  [W, 0],
      endXZ:    [W, L],
      lengthFt: L,
      normal:   { x: -1, z: 0 },  // faces west (into room)
      axis:     "Z",
    },
  ];
}

// ─── getCorners ───────────────────────────────────────────────────────────────

/**
 * Returns the four interior room corners.
 *
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {Array<{
 *   id:    "corner-NW" | "corner-NE" | "corner-SE" | "corner-SW",
 *   xFt:   number,
 *   zFt:   number,
 *   walls: [string, string]
 * }>}
 */
export function getCorners(roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  return [
    { id: "corner-NW", xFt: 0, zFt: 0, walls: ["wall-north", "wall-west"] },
    { id: "corner-NE", xFt: W, zFt: 0, walls: ["wall-north", "wall-east"] },
    { id: "corner-SE", xFt: W, zFt: L, walls: ["wall-south", "wall-east"] },
    { id: "corner-SW", xFt: 0, zFt: L, walls: ["wall-south", "wall-west"] },
  ];
}

// ─── getRoomPolygon ───────────────────────────────────────────────────────────

/**
 * Returns the room interior as an ordered polygon of [x, z] vertices.
 * Wound counter-clockwise when viewed from above (standard for 2D geometry).
 *
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {Array<[number, number]>}
 */
export function getRoomPolygon(roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;
  return [[0, 0], [W, 0], [W, L], [0, L]];
}

// ─── getRoomBounds ────────────────────────────────────────────────────────────

/**
 * Returns the 3D axis-aligned bounding box of the room interior.
 *
 * @param {{ width: number, length: number, height?: number }} roomDimensions
 * @returns {{ minX: number, maxX: number, minZ: number, maxZ: number, minY: number, maxY: number }}
 */
export function getRoomBounds(roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;
  const H = roomDimensions?.height ?? 8;
  return { minX: 0, maxX: W, minZ: 0, maxZ: L, minY: 0, maxY: H };
}

// ─── getItemWallAssignment ────────────────────────────────────────────────────

/**
 * Determines which room wall an item is assigned to based on its floor footprint.
 *
 * Algorithm:
 *  1. Compute the item's floor footprint AABB (X-Z), accounting for rotation.
 *  2. Compute the distance from each footprint edge to the nearest wall face.
 *  3. Return the wall ID with the smallest edge-to-wall distance if < threshold.
 *  4. Return null if the item is floating (island) — all distances exceed threshold.
 *
 * @param {Object} item               - SceneItem (position, dimensions, rotation)
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {"wall-north"|"wall-south"|"wall-east"|"wall-west"|null}
 */
export function getItemWallAssignment(item, roomDimensions) {
  const W = roomDimensions?.width  ?? 10;
  const L = roomDimensions?.length ?? 10;

  const fp = _getFloorFootprint(item);

  // Distance from each item edge to the corresponding room wall interior face
  const distNorth = fp.minZ;           // distance from item's north edge to north wall (Z=0)
  const distSouth = L - fp.maxZ;       // distance from item's south edge to south wall (Z=L)
  const distWest  = fp.minX;           // distance from item's west  edge to west  wall (X=0)
  const distEast  = W - fp.maxX;       // distance from item's east  edge to east  wall (X=W)

  const dists = [
    { wallId: "wall-north", dist: distNorth },
    { wallId: "wall-south", dist: distSouth },
    { wallId: "wall-west",  dist: distWest  },
    { wallId: "wall-east",  dist: distEast  },
  ];

  // Find minimum distance
  let best = dists[0];
  for (const d of dists) {
    if (d.dist < best.dist) best = d;
  }

  // Only assign to a wall if the item is close enough
  return best.dist < WALL_ASSIGNMENT_THRESHOLD_FT ? best.wallId : null;
}

// ─── getItemsOnWall ───────────────────────────────────────────────────────────

/**
 * Filters scene items to those assigned to a specific wall.
 *
 * @param {Object[]} items
 * @param {string}   wallId
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {Object[]}
 */
export function getItemsOnWall(items, wallId, roomDimensions) {
  return items.filter((item) => getItemWallAssignment(item, roomDimensions) === wallId);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the 2D floor footprint (X-Z AABB) for an item, accounting for rotation.
 * 90°/270° rotations swap width and depth.
 *
 * @param {Object} item - SceneItem
 * @returns {{ minX, maxX, minZ, maxZ }}
 */
export function _getFloorFootprint(item) {
  const xFt = item?.position?.xFt ?? 0;
  const zFt = item?.position?.zFt ?? 0;
  const { widthFt = 2, depthFt = 2 } = item?.dimensions ?? {};
  const rot = ((item?.rotation?.yDeg ?? 0) % 360 + 360) % 360;
  const [w, d] = (rot === 90 || rot === 270) ? [depthFt, widthFt] : [widthFt, depthFt];
  return { minX: xFt, maxX: xFt + w, minZ: zFt, maxZ: zFt + d };
}
