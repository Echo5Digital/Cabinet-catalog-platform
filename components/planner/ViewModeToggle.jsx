"use client";

import usePlannerStore from "@/store/plannerStore";

/**
 * ViewModeToggle — pill-style "2D / 3D" switch rendered inside PlannerToolbar.
 * Switches between the Konva 2D canvas and the React Three Fiber 3D scene.
 */
export default function ViewModeToggle({ primaryColor = "#1C1917" }) {
  const viewMode    = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-stone-100 border border-stone-200">
      {["2D", "3D"].map((mode) => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={[
              "relative px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 select-none",
              active
                ? "text-white shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            ].join(" ")}
            style={active ? { backgroundColor: primaryColor } : {}}
            aria-pressed={active}
          >
            {mode === "3D" && (
              <span className="mr-1 opacity-80">
                ◈
              </span>
            )}
            {mode}
          </button>
        );
      })}
    </div>
  );
}
