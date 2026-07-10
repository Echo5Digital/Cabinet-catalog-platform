/**
 * spatialGraph.js — Cabinet adjacency graph for the kitchen planner.
 *
 * Builds a directional adjacency graph from scene items. Each node records
 * which items are directly left/right (X-axis) and front/rear (Z-axis).
 *
 * Used by:
 *   - measurementEngine.js  — cabinet run lengths, gap analysis
 *   - validationEngine.js   — filler, countertop, crown continuity checks
 *
 * The graph is generated dynamically from scene.items and is NEVER stored
 * in the database or Zustand state — it is always derived on demand.
 *
 * All functions are pure — no React, no Zustand, no side effects.
 */

import { getItemAABB }           from "./collision.js";
import { getItemWallAssignment } from "./roomEngine.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Two items are considered "adjacent" if their facing edges are within this
 *  distance of each other (0.1 ft = 1.2 inches — accounts for filler gaps). */
export const ADJACENCY_THRESHOLD_FT = 0.15;

// ─── buildAdjacencyGraph ──────────────────────────────────────────────────────

/**
 * @typedef {Object} AdjacencyNode
 * @property {string|null} left    - ID of item directly left  (−X direction)
 * @property {string|null} right   - ID of item directly right (+X direction)
 * @property {string|null} front   - ID of item directly front (+Z direction, south)
 * @property {string|null} rear    - ID of item directly rear  (−Z direction, north)
 * @property {string|null} wallId  - assigned wall ("wall-north" etc.) or null
 */

/**
 * Builds an adjacency graph for all items in the scene.
 *
 * Adjacency rules:
 *   RIGHT:  |A.maxX - B.minX| < THRESHOLD  AND  A and B share a Z overlap
 *   FRONT:  |A.maxZ - B.minZ| < THRESHOLD  AND  A and B share an X overlap
 *
 * Items at different vertical elevations (wall vs base) are still connected
 * in the graph when they share the same floor footprint column.
 *
 * @param {Object[]} items              - scene.items (SceneItem[])
 * @param {{ width: number, length: number }} roomDimensions
 * @returns {Object.<string, AdjacencyNode>}  - keyed by item.id
 */
export function buildAdjacencyGraph(items, roomDimensions) {
  // Initialise all nodes
  const graph = {};
  for (const item of items) {
    graph[item.id] = {
      left:   null,
      right:  null,
      front:  null,
      rear:   null,
      wallId: getItemWallAssignment(item, roomDimensions),
    };
  }

  // O(n²) pairwise scan — for 40-item scenes this is ~780 comparisons (< 1ms)
  for (let i = 0; i < items.length; i++) {
    const A = items[i];
    const aabb_A = getItemAABB(A);

    for (let j = i + 1; j < items.length; j++) {
      const B = items[j];
      const aabb_B = getItemAABB(B);

      // ── Check RIGHT adjacency: A is left of B ──────────────────────────────
      if (Math.abs(aabb_A.maxX - aabb_B.minX) < ADJACENCY_THRESHOLD_FT) {
        // They must share a Z overlap (same run, side-by-side)
        if (_zOverlap(aabb_A, aabb_B)) {
          graph[A.id].right = graph[A.id].right ?? B.id;
          graph[B.id].left  = graph[B.id].left  ?? A.id;
        }
      }

      // ── Check RIGHT adjacency: B is left of A ──────────────────────────────
      if (Math.abs(aabb_B.maxX - aabb_A.minX) < ADJACENCY_THRESHOLD_FT) {
        if (_zOverlap(aabb_A, aabb_B)) {
          graph[B.id].right = graph[B.id].right ?? A.id;
          graph[A.id].left  = graph[A.id].left  ?? B.id;
        }
      }

      // ── Check FRONT adjacency: A is north of B (A.maxZ ≈ B.minZ) ──────────
      if (Math.abs(aabb_A.maxZ - aabb_B.minZ) < ADJACENCY_THRESHOLD_FT) {
        if (_xOverlap(aabb_A, aabb_B)) {
          graph[A.id].front = graph[A.id].front ?? B.id;
          graph[B.id].rear  = graph[B.id].rear  ?? A.id;
        }
      }

      // ── Check FRONT adjacency: B is north of A (B.maxZ ≈ A.minZ) ──────────
      if (Math.abs(aabb_B.maxZ - aabb_A.minZ) < ADJACENCY_THRESHOLD_FT) {
        if (_xOverlap(aabb_A, aabb_B)) {
          graph[B.id].front = graph[B.id].front ?? A.id;
          graph[A.id].rear  = graph[A.id].rear  ?? B.id;
        }
      }
    }
  }

  return graph;
}

// ─── extractCabinetRuns ───────────────────────────────────────────────────────

/**
 * Traverses the adjacency graph and extracts all linear cabinet runs.
 * A "run" is a maximal chain of items connected via left/right links.
 *
 * @param {Object.<string, AdjacencyNode>} graph
 * @returns {Array<string[]>}   - each sub-array is an ordered run of item IDs
 *                                (ordered left-to-right, i.e. west-to-east)
 */
export function extractCabinetRuns(graph) {
  const visited = new Set();
  const runs    = [];

  for (const itemId of Object.keys(graph)) {
    if (visited.has(itemId)) continue;

    // Walk left to find the leftmost item in this run
    let leftmost = itemId;
    let cursor   = graph[itemId].left;
    const safety = new Set([itemId]);
    while (cursor && !safety.has(cursor)) {
      safety.add(cursor);
      leftmost = cursor;
      cursor   = graph[cursor]?.left;
    }

    // Walk right from leftmost to build the ordered run
    const run = [];
    cursor = leftmost;
    const seen = new Set();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      visited.add(cursor);
      run.push(cursor);
      cursor = graph[cursor]?.right;
    }

    if (run.length > 0) runs.push(run);
  }

  return runs;
}

// ─── getRunMembers ────────────────────────────────────────────────────────────

/**
 * Returns all item IDs in the same left/right run as `itemId`.
 * Includes the query item itself.
 *
 * @param {string} itemId
 * @param {Object.<string, AdjacencyNode>} graph
 * @returns {string[]}
 */
export function getRunMembers(itemId, graph) {
  if (!graph[itemId]) return [itemId];

  // Walk left
  let leftmost = itemId;
  const leftSeen = new Set([itemId]);
  let cursor = graph[itemId].left;
  while (cursor && !leftSeen.has(cursor)) {
    leftSeen.add(cursor);
    leftmost = cursor;
    cursor = graph[cursor]?.left;
  }

  // Walk right from leftmost
  const members = [];
  const rightSeen = new Set();
  cursor = leftmost;
  while (cursor && !rightSeen.has(cursor)) {
    rightSeen.add(cursor);
    members.push(cursor);
    cursor = graph[cursor]?.right;
  }

  return members;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** True when two AABBs share a non-trivial Z overlap (> 0.05 ft). */
function _zOverlap(a, b) {
  return Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.05;
}

/** True when two AABBs share a non-trivial X overlap (> 0.05 ft). */
function _xOverlap(a, b) {
  return Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.05;
}
