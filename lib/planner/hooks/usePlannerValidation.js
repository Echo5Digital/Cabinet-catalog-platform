"use client";

/**
 * usePlannerValidation.js
 *
 * React hook that runs the full validation engine on the current store state
 * and returns an enhanced report including work triangle analysis, measurements,
 * and corner data.
 *
 * Side effect: syncs the backward-compatible flat validation results to the
 * plannerStore.validationResults key (debounced 200ms) so that the existing
 * ValidationBanner continues to work with no changes.
 *
 * Memoized via useMemo — only recomputes when scene.items reference or
 * roomDimensions reference changes (both are new references after any
 * SpatialEngine mutation, so this is always correct).
 *
 * @returns {import("../engine/validationEngine").EnhancedValidationReport}
 */

import { useMemo, useEffect } from "react";
import usePlannerStore from "@/store/plannerStore";
import {
  runFullValidation,
  getValidationResults,
} from "@/lib/planner/engine/validationEngine";

export function usePlannerValidation() {
  const items              = usePlannerStore((s) => s.scene.items);
  const roomDimensions     = usePlannerStore((s) => s.roomDimensions);
  const setValidationResults = usePlannerStore((s) => s.setValidationResults);

  // Full enhanced report — memoized on item/dims reference identity
  const report = useMemo(
    () => runFullValidation(items, roomDimensions),
    [items, roomDimensions],
  );

  // Sync flat backward-compatible array to store (debounced 200ms so it
  // doesn't run on every animation frame during drag operations)
  useEffect(() => {
    const timer = setTimeout(() => {
      setValidationResults(getValidationResults(items, roomDimensions));
    }, 200);
    return () => clearTimeout(timer);
  }, [items, roomDimensions, setValidationResults]);

  return report;
}
