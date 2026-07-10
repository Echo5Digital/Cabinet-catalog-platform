"use client";

/**
 * usePlannerMeasurements.js
 *
 * React hook that derives all dimensional measurements from the current
 * store state without writing anything back to the store.
 *
 * Returns:
 *   wallRuns         — linear ft of cabinets per wall + fill %
 *   cabinetRuns      — individual contiguous runs with start/end/total ft
 *   gaps             — gap segments between runs needing fillers
 *   islandClearances — clearance distances on all 4 sides of floating islands
 *
 * Memoized via useMemo — only recomputes when scene.items or roomDimensions
 * reference changes (i.e. when the scene is actually mutated).
 *
 * @returns {import("../engine/measurementEngine").MeasurementResult}
 */

import { useMemo } from "react";
import usePlannerStore from "@/store/plannerStore";
import { measureAll } from "@/lib/planner/engine/measurementEngine";

export function usePlannerMeasurements() {
  const items          = usePlannerStore((s) => s.scene.items);
  const roomDimensions = usePlannerStore((s) => s.roomDimensions);

  return useMemo(
    () => measureAll(items, roomDimensions),
    [items, roomDimensions],
  );
}
