"use client";

/**
 * usePlannerCollisions.js
 *
 * React hook that detects all current item collisions in the scene.
 * Returns a structured collision report with per-axis overlap depths.
 *
 * Note: SpatialEngine already blocks most collisions at placement time.
 * This hook is for advisory display purposes only — e.g., highlighting
 * overlapping items in the 2D canvas or 3D scene.
 *
 * Memoized via useMemo — only recomputes when scene.items reference changes.
 *
 * @returns {Array<{
 *   itemAId:  string,
 *   itemBId:  string,
 *   severity: "error",
 *   overlap:  { x: number, y: number, z: number }
 * }>}
 */

import { useMemo } from "react";
import usePlannerStore from "@/store/plannerStore";
import { detectCollisions } from "@/lib/planner/engine/collisionEngine";

export function usePlannerCollisions() {
  const items = usePlannerStore((s) => s.scene.items);

  return useMemo(
    () => detectCollisions(items),
    [items],
  );
}
