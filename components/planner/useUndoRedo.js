"use client";

import { useEffect } from "react";
import usePlannerStore from "@/store/plannerStore";

/**
 * useUndoRedo — keyboard shortcut hook for Undo / Redo.
 *
 * Ctrl+Z / Cmd+Z       → undo
 * Ctrl+Shift+Z / Cmd+Shift+Z → redo
 * Ctrl+Y / Cmd+Y       → redo
 *
 * Mount this hook once in PlannerShell (the root canvas keyboard event hub).
 * It co-exists with the existing Delete/R keyboard handler in PlannerCanvas.
 */
export function useUndoRedo() {
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const isMac = typeof navigator !== "undefined" &&
        /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.key === "z" && e.shiftKey) || e.key === "y" || e.key === "Y") {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);
}
