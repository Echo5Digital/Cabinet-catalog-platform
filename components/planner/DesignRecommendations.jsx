"use client";

import { useMemo } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Recommendation engine ────────────────────────────────────────────────────

const RULE_PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Pure function — computes contextual design recommendations from store state.
 * Returns sorted array of { id, priority, category, title, body, icon }.
 */
function generateRecommendations({
  items, layout, validationResults,
  selectedCountertop, selectedFlooring, selectedDoorStyle,
  selectedHardware, upperCabinetColor, lowerCabinetColor,
  roomDimensions,
}) {
  const recs = [];

  const hasSink     = items.some((i) => i.category === "Sink");
  const hasRange    = items.some((i) => i.category === "Range");
  const hasFridge   = items.some((i) => (i.name || "").toLowerCase().includes("refrigerator") || (i.name || "").toLowerCase().includes("fridge"));
  const hasUpper    = items.some((i) => (i.name || "").toLowerCase().includes("upper") || (i.name || "").toLowerCase().includes("wall"));
  const hasPantry   = items.some((i) => (i.name || "").toLowerCase().includes("pantry") || (i.name || "").toLowerCase().includes("tall"));
  const hasIsland   = items.some((i) => (i.name || "").toLowerCase().includes("island"));
  const hasDishwasher = items.some((i) => (i.name || "").toLowerCase().includes("dishwasher"));

  const islandLayout = (layout || "").toLowerCase().includes("island");
  const errors   = (validationResults || []).filter((r) => r.severity === "error").length;
  const warnings = (validationResults || []).filter((r) => r.severity === "warning").length;
  const count    = items.length;
  const roomArea = (roomDimensions?.width ?? 12) * (roomDimensions?.length ?? 10);

  // ── Work triangle ──────────────────────────────────────────────────────────
  if (count > 0 && !hasSink) {
    recs.push({
      id: "missing-sink", priority: "critical", category: "Work Triangle",
      title: "Add a sink",
      body: "A sink is one of the three vertices of the kitchen work triangle and is essential for any kitchen layout.",
      icon: "drop",
    });
  }
  if (count > 1 && !hasRange) {
    recs.push({
      id: "missing-range", priority: "critical", category: "Work Triangle",
      title: "Add a range or cooktop",
      body: "The cooking center completes the work triangle alongside the sink and refrigerator.",
      icon: "fire",
    });
  }
  if (count > 1 && !hasFridge) {
    recs.push({
      id: "missing-fridge", priority: "high", category: "Work Triangle",
      title: "Add a refrigerator",
      body: "The refrigerator forms the third vertex of the work triangle. Place it within 7 ft of the sink.",
      icon: "fridge",
    });
  }

  // ── Storage ────────────────────────────────────────────────────────────────
  if (count > 2 && !hasUpper) {
    recs.push({
      id: "no-upper", priority: "high", category: "Storage",
      title: "Add upper wall cabinets",
      body: "Upper cabinets significantly increase storage and balance the visual weight of the kitchen.",
      icon: "layers",
    });
  }
  if (count > 4 && !hasPantry) {
    recs.push({
      id: "no-pantry", priority: "medium", category: "Storage",
      title: "Consider a tall pantry cabinet",
      body: "A pantry adds up to 20 cu ft of organized storage for dry goods and appliances.",
      icon: "cabinet",
    });
  }

  // ── Dishwasher proximity ───────────────────────────────────────────────────
  if (hasSink && !hasDishwasher && count > 3) {
    recs.push({
      id: "no-dishwasher", priority: "low", category: "Convenience",
      title: "Add a dishwasher",
      body: "A dishwasher placed adjacent to the sink reduces cleanup effort and keeps the workflow contained.",
      icon: "sparkle",
    });
  }

  // ── Island ────────────────────────────────────────────────────────────────
  if (islandLayout && !hasIsland && count > 3 && roomArea >= 140) {
    recs.push({
      id: "missing-island", priority: "medium", category: "Layout",
      title: "Place your island cabinet",
      body: "Your layout includes an island — add it to the canvas to unlock extra prep surface and seating.",
      icon: "island",
    });
  }

  // ── Design selections ──────────────────────────────────────────────────────
  if (!selectedCountertop && count > 0) {
    recs.push({
      id: "no-countertop", priority: "medium", category: "Materials",
      title: "Choose a countertop material",
      body: "Select a countertop in the sidebar to update the 3D preview and AI visualization with your material choice.",
      icon: "slab",
    });
  }
  if (!selectedFlooring && count > 0) {
    recs.push({
      id: "no-flooring", priority: "low", category: "Materials",
      title: "Choose a flooring material",
      body: "Flooring color affects the overall feel of the space and is visible in the 3D scene.",
      icon: "floor",
    });
  }
  if (!selectedDoorStyle && count > 0) {
    recs.push({
      id: "no-door-style", priority: "low", category: "Style",
      title: "Select a door style",
      body: "Shaker, slab, raised panel, or glass-front doors dramatically affect kitchen character.",
      icon: "door",
    });
  }

  // ── Validation issues ──────────────────────────────────────────────────────
  if (errors > 0) {
    recs.push({
      id: "has-errors", priority: "critical", category: "Layout Issues",
      title: `${errors} design error${errors > 1 ? "s" : ""} need attention`,
      body: "Open the design alerts in the toolbar to review and resolve placement conflicts.",
      icon: "alert",
    });
  } else if (warnings > 0) {
    recs.push({
      id: "has-warnings", priority: "high", category: "Layout Issues",
      title: `${warnings} design warning${warnings > 1 ? "s" : ""}`,
      body: "Check the toolbar alerts for advisory design rule violations.",
      icon: "warning",
    });
  }

  // ── Cabinet color ──────────────────────────────────────────────────────────
  if (count > 0 && !upperCabinetColor && !lowerCabinetColor) {
    recs.push({
      id: "no-color", priority: "low", category: "Style",
      title: "Choose cabinet colors",
      body: "Two-tone upper/lower cabinet colors are trending. Pick complementary finishes in the sidebar.",
      icon: "palette",
    });
  }

  // Sort
  recs.sort((a, b) => (RULE_PRIORITY[a.priority] ?? 99) - (RULE_PRIORITY[b.priority] ?? 99));
  return recs.slice(0, 8); // cap at 8 recommendations
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

function RecIcon({ type, priorityColor }) {
  const base = `w-4 h-4 ${priorityColor}`;
  const icons = {
    drop:    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-6.75 8.25-6.75 12a6.75 6.75 0 0013.5 0c0-3.75-6.75-12-6.75-12z" />,
    fire:    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />,
    fridge:  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 6h18" />,
    layers:  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12M6 10h12M6 14h12M6 18h12" />,
    cabinet: <path strokeLinecap="round" strokeLinejoin="round" d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm7 5v8" />,
    sparkle: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
    island:  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6zm4.5 6h7.5" />,
    slab:    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 18h16.5M9 3.75v16.5m6-16.5v16.5" />,
    floor:   <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M4 4l8 16 8-16" />,
    door:    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h10l4 4v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 0v13" />,
    alert:   <><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" /></>,
    warning: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />,
    palette: <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88" />,
  };

  return (
    <svg className={base} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {icons[type] || icons.sparkle}
    </svg>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  critical: { dot: "bg-red-500",    text: "text-red-500",    badge: "bg-red-50 text-red-600 border-red-200" },
  high:     { dot: "bg-amber-500",  text: "text-amber-500",  badge: "bg-amber-50 text-amber-600 border-amber-200" },
  medium:   { dot: "bg-blue-400",   text: "text-blue-500",   badge: "bg-blue-50 text-blue-600 border-blue-200" },
  low:      { dot: "bg-stone-300",  text: "text-stone-400",  badge: "bg-stone-50 text-stone-500 border-stone-200" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function DesignRecommendations() {
  const items              = usePlannerStore((s) => s.scene.items);
  const layout             = usePlannerStore((s) => s.layout);
  const validationResults  = usePlannerStore((s) => s.validationResults);
  const selectedCountertop = usePlannerStore((s) => s.selectedCountertop);
  const selectedFlooring   = usePlannerStore((s) => s.selectedFlooring);
  const selectedDoorStyle  = usePlannerStore((s) => s.selectedDoorStyle);
  const selectedHardware   = usePlannerStore((s) => s.selectedHardware);
  const upperCabinetColor  = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor  = usePlannerStore((s) => s.lowerCabinetColor);
  const roomDimensions     = usePlannerStore((s) => s.roomDimensions);

  const recs = useMemo(
    () => generateRecommendations({
      items, layout, validationResults, selectedCountertop, selectedFlooring,
      selectedDoorStyle, selectedHardware, upperCabinetColor, lowerCabinetColor,
      roomDimensions,
    }),
    [items, layout, validationResults, selectedCountertop, selectedFlooring,
     selectedDoorStyle, selectedHardware, upperCabinetColor, lowerCabinetColor, roomDimensions]
  );

  if (recs.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 shrink-0">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Looking great!</p>
          <p className="text-xs text-emerald-600 mt-0.5">No design recommendations at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Design Tips</p>
        <span className="text-[10px] text-stone-400">{recs.length} suggestion{recs.length !== 1 ? "s" : ""}</span>
      </div>

      {recs.map((rec) => {
        const st = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.low;
        return (
          <div
            key={rec.id}
            className="rounded-xl border border-stone-200 bg-white px-3.5 py-3 flex gap-3 shadow-sm"
          >
            {/* Icon */}
            <div className={`mt-0.5 shrink-0 ${st.text}`}>
              <RecIcon type={rec.icon} priorityColor={st.text} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-stone-800 leading-snug">{rec.title}</p>
                <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${st.badge}`}>
                  {rec.category}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{rec.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
