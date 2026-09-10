"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";
import ViewModeToggle from "./ViewModeToggle";
import ValidationBanner from "./ValidationBanner";

/**
 * PlannerToolbar — bottom action bar for step 3.
 *
 * Upgrade: cleaner visual grouping, pill-grouped spatial actions,
 * stronger visual hierarchy between utility and primary CTA.
 */
export default function PlannerToolbar({ onGenerateAI, onSave, primaryColor = "#1C1917" }) {
  const count       = usePlannerStore((s) => s.scene.items.length);
  const clearCanvas  = usePlannerStore((s) => s.clearCanvas);
  const aiLoading   = usePlannerStore((s) => s.aiLoading);
  const showAiPanel = usePlannerStore((s) => s.showAiPanel);
  const undo        = usePlannerStore((s) => s.undo);
  const redo        = usePlannerStore((s) => s.redo);
  const canUndo     = usePlannerStore((s) => s.undoStack.length > 0);
  const canRedo     = usePlannerStore((s) => s.redoStack.length > 0);
  const setStep     = usePlannerStore((s) => s.setStep);

  const [confirmClear, setConfirmClear] = useState(false);

  function handleClearClick() {
    if (count === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearCanvas();
    setConfirmClear(false);
  }

  return (
    <div
      className="shrink-0 flex items-center gap-2 bg-white/95 backdrop-blur-sm border-t border-stone-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pl-3 pr-3 sm:pl-5 sm:pr-5"
      style={{ height: "calc(3.5rem + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >

      {/* ── Scrollable region: Back, item counter, spatial controls, validation ──
          Scrolls horizontally on narrow screens so it never pushes the primary
          Save/Visualize actions on the right out of view. */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto overflow-y-hidden">

        {/* LEFT: Back + Item counter */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Back to Dimensions button */}
          <button
            onClick={() => setStep(2)}
            title="Back to Dimensions"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-500 bg-white border border-stone-200 hover:border-stone-300 hover:text-stone-800 hover:bg-stone-50 transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Item counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 shrink-0">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: count > 0 ? primaryColor : "#a8a29e" }}
            >
              {count > 99 ? "99+" : count}
            </span>
            <span className="text-xs text-stone-500 hidden sm:inline leading-none">
              {count === 0 ? "Empty" : count === 1 ? "1 item" : `${count} items`}
            </span>
          </div>
        </div>

        {/* CENTER: Spatial controls + validation */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Undo / Redo group */}
          <div className="flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5 border border-stone-200 shrink-0">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className={[
                "flex items-center justify-center w-7 h-7 rounded-md transition",
                canUndo
                  ? "text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm"
                  : "text-stone-300 cursor-not-allowed",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
              className={[
                "flex items-center justify-center w-7 h-7 rounded-md transition",
                canRedo
                  ? "text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm"
                  : "text-stone-300 cursor-not-allowed",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-stone-200 shrink-0" />

          {/* View toggle */}
          <ViewModeToggle primaryColor={primaryColor} />

          {/* Separator + Clear — desktop only */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <div className="w-px h-5 bg-stone-200 shrink-0" />
            <button
              onClick={handleClearClick}
              disabled={count === 0}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition",
                count === 0
                  ? "text-stone-300 cursor-not-allowed"
                  : confirmClear
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-100",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {confirmClear ? "Confirm?" : "Clear"}
            </button>
          </div>

          {/* Validation */}
          <ValidationBanner />
        </div>
      </div>

      {/* ── RIGHT: Save + Generate AI — always visible, never scrolls away ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Save and Get Quote button */}
        {onSave && (
          <button
            onClick={onSave}
            disabled={count === 0}
            title="Save your design and request a quote"
            className={[
              "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition",
              count === 0
                ? "text-stone-300 border-stone-200 cursor-not-allowed"
                : "text-stone-600 border-stone-300 bg-white hover:bg-stone-50 hover:border-stone-400 hover:text-stone-900 shadow-sm",
            ].join(" ")}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 21V13h8v8M8 5v4h6" />
            </svg>
            Save and Get Quote
          </button>
        )}

        {/* Mobile save icon */}
        {onSave && (
          <button
            onClick={onSave}
            disabled={count === 0}
            title="Save your design and request a quote"
            className={[
              "sm:hidden flex items-center justify-center w-8 h-8 rounded-lg border transition",
              count === 0
                ? "text-stone-300 border-stone-200 cursor-not-allowed"
                : "text-stone-600 border-stone-300 bg-white hover:bg-stone-50",
            ].join(" ")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 21V13h8v8M8 5v4h6" />
            </svg>
          </button>
        )}

        {/* Generate AI — primary CTA */}
        <button
          onClick={onGenerateAI}
          disabled={aiLoading || count === 0}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-150 shadow-sm shrink-0",
            aiLoading || count === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:opacity-90 hover:shadow-md active:scale-95 cursor-pointer",
            showAiPanel ? "ring-2 ring-offset-1 ring-offset-white" : "",
          ].join(" ")}
          style={{ backgroundColor: primaryColor, ...(showAiPanel ? { "--tw-ring-color": primaryColor } : {}) }}
        >
          {aiLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="hidden sm:inline">Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="hidden sm:inline">Visualize</span>
              <span className="sm:hidden">AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
