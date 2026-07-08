"use client";

import { useMemo, useState } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Storage volume model ─────────────────────────────────────────────────────
// Estimates interior cubic feet of usable storage per cabinet type.
// Based on standard cabinet dimensions minus door/hardware clearance.

const STORAGE_BY_CATEGORY = {
  // Base cabinets — typically 34.5"H × depth-4" usable, with 1-2 shelves
  "Base":           { cuFt: 9.0,  type: "base",  shelves: 1 },
  "Base Cabinet":   { cuFt: 9.0,  type: "base",  shelves: 1 },
  "Sink Base":      { cuFt: 3.5,  type: "base",  shelves: 0 },   // lost to plumbing

  // Upper cabinets
  "Upper":          { cuFt: 7.5,  type: "upper", shelves: 2 },
  "Wall Cabinet":   { cuFt: 7.5,  type: "upper", shelves: 2 },
  "Wall":           { cuFt: 7.5,  type: "upper", shelves: 2 },

  // Tall / pantry
  "Tall":           { cuFt: 18.0, type: "tall",  shelves: 5 },
  "Pantry":         { cuFt: 20.0, type: "tall",  shelves: 6 },
  "Oven Cabinet":   { cuFt: 8.0,  type: "tall",  shelves: 2 },

  // Island — treat as base
  "Island":         { cuFt: 14.0, type: "base",  shelves: 2 },

  // Drawer base — no shelf, but efficiently organized
  "Drawer Base":    { cuFt: 6.0,  type: "drawer", shelves: 0 },

  // Non-storage items
  "Sink":           { cuFt: 0,    type: "fixture", shelves: 0 },
  "Range":          { cuFt: 0,    type: "fixture", shelves: 0 },
  "Dishwasher":     { cuFt: 0,    type: "fixture", shelves: 0 },
  "Refrigerator":   { cuFt: 18.0, type: "appliance", shelves: 3 },

  "_default":       { cuFt: 5.0,  type: "base",  shelves: 1 },
};

function getStorageInfo(item) {
  const cat   = item.category || "";
  const name  = (item.name || "").toLowerCase();

  if (STORAGE_BY_CATEGORY[cat]) return STORAGE_BY_CATEGORY[cat];
  if (name.includes("refrigerator") || name.includes("fridge")) return STORAGE_BY_CATEGORY["Refrigerator"];
  if (name.includes("pantry"))      return STORAGE_BY_CATEGORY["Pantry"];
  if (name.includes("tall"))        return STORAGE_BY_CATEGORY["Tall"];
  if (name.includes("oven"))        return STORAGE_BY_CATEGORY["Oven Cabinet"];
  if (name.includes("island"))      return STORAGE_BY_CATEGORY["Island"];
  if (name.includes("drawer"))      return STORAGE_BY_CATEGORY["Drawer Base"];
  if (name.includes("upper") || name.includes("wall")) return STORAGE_BY_CATEGORY["Upper"];
  if (name.includes("sink"))        return STORAGE_BY_CATEGORY["Sink Base"];
  return STORAGE_BY_CATEGORY["_default"];
}

/**
 * Compute storage breakdown from scene items.
 */
function computeStorageAnalytics(items) {
  const stats = { base: 0, upper: 0, tall: 0, drawer: 0, appliance: 0, fixture: 0 };
  let totalCuFt  = 0;
  let totalShelves = 0;
  let cabinetCount = 0;

  for (const item of items) {
    const info = getStorageInfo(item);
    stats[info.type] = (stats[info.type] || 0) + info.cuFt;
    totalCuFt   += info.cuFt;
    totalShelves += info.shelves;
    if (info.type !== "fixture") cabinetCount++;
  }

  // Segments for donut-style visualization
  const segments = [
    { label: "Base",      cuFt: stats.base,      color: "#78716c" },
    { label: "Upper",     cuFt: stats.upper,     color: "#a8a29e" },
    { label: "Tall",      cuFt: stats.tall,       color: "#57534e" },
    { label: "Drawer",    cuFt: stats.drawer,    color: "#d6d3d1" },
    { label: "Appliance", cuFt: stats.appliance, color: "#10b981" },
  ].filter((s) => s.cuFt > 0);

  // Advisory tips
  const tips = [];
  if (stats.upper === 0 && items.length > 0) {
    tips.push("Add upper/wall cabinets to maximize vertical storage.");
  }
  if (stats.tall === 0 && items.length > 2) {
    tips.push("A pantry or tall cabinet adds up to 20 cu ft of storage.");
  }
  if (stats.drawer === 0 && items.length > 3) {
    tips.push("Drawer bases improve accessibility over shelf-only layouts.");
  }
  if (totalCuFt > 0 && stats.upper / totalCuFt < 0.20) {
    tips.push("Upper cabinets are under-represented — aim for 20–30% of total storage.");
  }

  const coverageGrade =
    totalCuFt >= 80  ? "Excellent"
    : totalCuFt >= 55 ? "Good"
    : totalCuFt >= 35 ? "Fair"
    : totalCuFt > 0  ? "Limited"
    : "None";

  return { totalCuFt, totalShelves, cabinetCount, segments, tips, coverageGrade };
}

// ─── Mini donut ───────────────────────────────────────────────────────────────

function StorageDonut({ segments, total }) {
  const r   = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        </svg>
        <span className="absolute text-[10px] text-stone-400 font-medium">—</span>
      </div>
    );
  }

  return (
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
        {segments.map((seg) => {
          const frac = seg.cuFt / total;
          const dash = circ * frac;
          const elem = (
            <circle
              key={seg.label}
              cx="28" cy="28" r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="7"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return elem;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-stone-900 leading-none">{Math.round(total)}</span>
        <span className="text-[9px] text-stone-400">cu ft</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StorageAnalytics() {
  const items = usePlannerStore((s) => s.scene.items);
  const [expanded, setExpanded] = useState(false);

  const analytics = useMemo(() => computeStorageAnalytics(items), [items]);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition"
        aria-expanded={expanded}
      >
        <StorageDonut segments={analytics.segments} total={analytics.totalCuFt} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Storage Analytics</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {analytics.totalCuFt === 0
              ? "No items placed"
              : <><span className="font-semibold text-stone-700">{Math.round(analytics.totalCuFt)} cu ft</span> total · {analytics.coverageGrade}</>}
          </p>
          {analytics.tips.length > 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5 truncate">{analytics.tips[0]}</p>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 flex flex-col gap-3">

          {/* Legend bars */}
          {analytics.totalCuFt > 0 ? (
            <div className="flex flex-col gap-2">
              {analytics.segments.map((seg) => {
                const pct = Math.round((seg.cuFt / analytics.totalCuFt) * 100);
                return (
                  <div key={seg.label} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs text-stone-600">{seg.label} cabinets</span>
                      </div>
                      <span className="text-xs text-stone-500 font-medium">{Math.round(seg.cuFt)} cu ft ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: seg.color }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 pt-2 mt-1 border-t border-stone-200">
                {[
                  { label: "Total", val: `${Math.round(analytics.totalCuFt)} cu ft` },
                  { label: "Shelves", val: `${analytics.totalShelves}` },
                  { label: "Cabinets", val: `${analytics.cabinetCount}` },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-0.5">
                    <span className="text-sm font-bold text-stone-800">{stat.val}</span>
                    <span className="text-[10px] text-stone-400">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 text-center py-2">Add cabinets to see storage breakdown.</p>
          )}

          {/* Tips */}
          {analytics.tips.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-stone-600">Suggestions</p>
              {analytics.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-stone-500">
                  <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
