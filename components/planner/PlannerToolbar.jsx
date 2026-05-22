"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";
import ViewModeToggle from "./ViewModeToggle";

export default function PlannerToolbar({ onGenerateAI, primaryColor = "#1C1917" }) {
  const count       = usePlannerStore((s) => s.scene.items.length);
  const clearCanvas  = usePlannerStore((s) => s.clearCanvas);
  const aiLoading   = usePlannerStore((s) => s.aiLoading);
  const showAiPanel = usePlannerStore((s) => s.showAiPanel);

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
    <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-white border-t border-stone-200 shadow-[0_-1px_4px_rgba(0,0,0,0.04)]">
      {/* Left: item count */}
      <div className="flex items-center gap-2">
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

      {/* Center: 2D / 3D toggle + clear button */}
      <div className="flex items-center gap-2">
        <ViewModeToggle primaryColor={primaryColor} />
        <div className="w-px h-5 bg-stone-200 hidden sm:block" />
        <button
        onClick={handleClearClick}
        disabled={count === 0}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition",
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
        {confirmClear ? "Confirm clear?" : "Clear Canvas"}
      </button>
      </div>

      {/* Right: Generate AI button */}
      <button
        onClick={onGenerateAI}
        disabled={aiLoading || count === 0}
        className={[
          "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white transition-all duration-150 shadow-sm",
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
            <span>Generate My Kitchen</span>
          </>
        )}
      </button>
    </div>
  );
}
