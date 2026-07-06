"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";
import ViewModeToggle from "./ViewModeToggle";
import ValidationBanner from "./ValidationBanner";

export default function PlannerToolbar({ onGenerateAI, onSave, primaryColor = "#1C1917" }) {
  const count       = usePlannerStore((s) => s.scene.items.length);
  const clearCanvas  = usePlannerStore((s) => s.clearCanvas);
  const aiLoading   = usePlannerStore((s) => s.aiLoading);
  const showAiPanel = usePlannerStore((s) => s.showAiPanel);
  const undo        = usePlannerStore((s) => s.undo);
  const redo        = usePlannerStore((s) => s.redo);
  const canUndo     = usePlannerStore((s) => s.undoStack.length > 0);
  const canRedo     = usePlannerStore((s) => s.redoStack.length > 0);

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
    <div className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-4 gap-2 bg-white border-t border-stone-200 shadow-[0_-1px_4px_rgba(0,0,0,0.04)]">
      {/* Left: item count */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {count > 99 ? "99+" : count}
        </span>
        <span className="text-xs text-stone-500 hidden sm:inline">
          {count === 0 ? "No items placed" : count === 1 ? "1 item placed" : `${count} items placed`}
        </span>
      </div>

      {/* Center: undo/redo, view toggle, clear, validation */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center min-w-0">
        {/* Undo button */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={[
            "flex items-center justify-center w-8 h-8 rounded-lg transition shrink-0",
            canUndo
              ? "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
              : "text-stone-300 cursor-not-allowed",
          ].join(" ")}
          aria-label="Undo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>

        {/* Redo button */}
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className={[
            "flex items-center justify-center w-8 h-8 rounded-lg transition shrink-0",
            canRedo
              ? "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
              : "text-stone-300 cursor-not-allowed",
          ].join(" ")}
          aria-label="Redo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
        </button>

        <div className="w-px h-5 bg-stone-200 shrink-0" />

        <ViewModeToggle primaryColor={primaryColor} />

        <div className="w-px h-5 bg-stone-200 hidden sm:block shrink-0" />

        <button
          onClick={handleClearClick}
          disabled={count === 0}
          className={[
            "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0",
            count === 0
              ? "text-stone-300 cursor-not-allowed"
              : confirmClear
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-100 border border-transparent",
          ].join(" ")}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {confirmClear ? "Confirm clear?" : "Clear"}
        </button>

        {/* Validation banner (only shown when there are results) */}
        <ValidationBanner />
      </div>

      {/* Right: Save + Generate AI */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Save button */}
        {onSave && (
          <button
            onClick={onSave}
            disabled={count === 0}
            title="Save project"
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition shrink-0",
              count === 0
                ? "text-stone-300 border-stone-200 cursor-not-allowed"
                : "text-stone-600 border-stone-300 hover:bg-stone-50 hover:text-stone-800",
            ].join(" ")}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 21V13h8v8M8 5v4h6" />
            </svg>
            <span className="hidden sm:inline">Save</span>
          </button>
        )}

        {/* Generate AI button */}
        <button
          onClick={onGenerateAI}
          disabled={aiLoading || count === 0}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white transition-all duration-150 shadow-sm shrink-0",
            aiLoading || count === 0 ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 cursor-pointer",
            showAiPanel ? "ring-2 ring-offset-1" : "",
          ].join(" ")}
          style={{ backgroundColor: primaryColor }}
        >
          {aiLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="hidden sm:inline">Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="hidden sm:inline">Generate My Kitchen</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
