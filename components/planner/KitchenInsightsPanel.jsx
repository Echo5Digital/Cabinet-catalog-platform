"use client";

import { useState } from "react";
import { usePlannerValidation } from "@/lib/planner/hooks/usePlannerValidation";
import { CLEARANCES } from "@/lib/planner/engine/clearanceEngine";

/**
 * KitchenInsightsPanel
 *
 * Mobile-responsive collapsible sidebar card that surfaces:
 *   1. Work triangle score + NKBA rating
 *   2. Wall coverage (% of each wall filled with cabinets)
 *   3. Clearance alerts summary
 *   4. Corner insights (blind corners, empty corners)
 *
 * Additive only — rendered inside ProductSidebar as a new section.
 * Never modifies any existing component or store value.
 *
 * Design pattern matches existing KitchenHealthScore.jsx and StorageAnalytics.jsx:
 *   - Rounded card with border
 *   - Collapsible with chevron toggle
 *   - max-h-72 overflow-y-auto expanded body
 *   - Mobile-first (full width, touch-friendly targets)
 */

// ─── Score colour helper ──────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 90) return { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500"  };
  if (score >= 70) return { bg: "bg-sky-50",      text: "text-sky-700",      dot: "bg-sky-500"      };
  if (score >= 50) return { bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-500"    };
  return              { bg: "bg-red-50",       text: "text-red-700",      dot: "bg-red-500"      };
}

// ─── Wall label helper ────────────────────────────────────────────────────────

const WALL_LABELS = {
  "wall-north": "North",
  "wall-south": "South",
  "wall-east":  "East",
  "wall-west":  "West",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function KitchenInsightsPanel({ primaryColor = "#1C1917" }) {
  const [expanded, setExpanded] = useState(false);

  // usePlannerValidation also writes to validationResults — this call is
  // deduplicated with PlannerShell.jsx's call via the module-level cache.
  const report = usePlannerValidation();

  const { workTriangle, measurements, corners } = report;
  const sc = scoreColor(workTriangle.score);

  // Clearance warnings (source = "clearance")
  const clearanceWarnings = report.warnings.filter((w) => w.source === "clearance");
  const clearanceErrors   = report.errors.filter((e) => e.source === "clearance");
  const clearanceCount    = clearanceWarnings.length + clearanceErrors.length;

  // Blind corners
  const blindCorners = corners.filter((c) => c.cornerType === "blind");

  // Gaps needing filler
  const fillerNeeded = (measurements.gaps ?? []).filter(
    (g) => g.needsFiller && !g.canFitFiller && g.gapFt > 0.1,
  );

  // Total insight count for the header badge
  const totalInsights =
    report.errors.length +
    report.warnings.length +
    report.recommendations.length;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">

      {/* ── Header / Toggle ────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
        aria-expanded={expanded}
      >
        {/* Triangle icon */}
        <span className="shrink-0 w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-stone-800 leading-tight">Kitchen Insights</div>
          <div className="text-[11px] text-stone-400 leading-tight mt-0.5">
            {totalInsights > 0
              ? `${totalInsights} insight${totalInsights > 1 ? "s" : ""} · Work triangle: ${workTriangle.rating}`
              : `Work triangle: ${workTriangle.rating}`}
          </div>
        </div>

        {/* Score badge */}
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
          {workTriangle.score}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* ── Expanded body ────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-stone-100 max-h-72 overflow-y-auto">

          {/* ── Work Triangle ─────────────────────────────────────────────── */}
          <section className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Work Triangle</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                {workTriangle.rating} · {workTriangle.score}/100
              </span>
            </div>

            {workTriangle.hasAllVertices ? (
              <div className="flex flex-col gap-1.5">
                {workTriangle.legs.map((leg) => (
                  <div key={`${leg.from}-${leg.to}`} className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${leg.inRange ? "bg-emerald-400" : "bg-amber-400"}`}
                    />
                    <span className="text-xs text-stone-600 flex-1 truncate">
                      {leg.from} → {leg.to}
                    </span>
                    <span className={`text-xs font-semibold ${leg.inRange ? "text-emerald-600" : "text-amber-600"}`}>
                      {leg.distanceFt} ft
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">Total perimeter</span>
                  <span className={`text-xs font-semibold ${workTriangle.perimeterInRange ? "text-emerald-600" : "text-amber-600"}`}>
                    {workTriangle.totalPerimeterFt} ft
                    <span className="text-stone-400 font-normal"> (13–26 ideal)</span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                Place a sink, range, and refrigerator to calculate the work triangle.
              </p>
            )}
          </section>

          {/* ── Wall Coverage ─────────────────────────────────────────────── */}
          {measurements.wallRuns && measurements.wallRuns.length > 0 && (
            <section className="px-4 py-3 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-2">
                Wall Coverage
              </span>
              <div className="flex flex-col gap-2">
                {measurements.wallRuns.map((wr) => (
                  <div key={wr.wallId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-stone-600">
                        {WALL_LABELS[wr.wallId] ?? wr.wallId} wall
                      </span>
                      <span className="text-xs text-stone-500">
                        {wr.cabinetFt.toFixed(1)} / {wr.wallLengthFt.toFixed(1)} ft
                        <span className="ml-1 font-semibold text-stone-700">
                          ({Math.round(wr.fillPct)}%)
                        </span>
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width:           `${Math.min(100, wr.fillPct)}%`,
                          backgroundColor: wr.fillPct >= 70 ? "#10b981" : wr.fillPct >= 40 ? "#f59e0b" : "#d1d5db",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Clearance Alerts ─────────────────────────────────────────── */}
          {clearanceCount > 0 && (
            <section className="px-4 py-3 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-2">
                Clearance Alerts
              </span>
              <div className="flex flex-col gap-1.5">
                {[...clearanceErrors, ...clearanceWarnings].slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                        r.severity === "error" ? "bg-red-500" : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs text-stone-600 leading-relaxed">{r.message}</span>
                  </div>
                ))}
                {clearanceCount > 4 && (
                  <p className="text-[11px] text-stone-400">+{clearanceCount - 4} more in the validation banner.</p>
                )}
              </div>
            </section>
          )}

          {/* ── Corner Insights ───────────────────────────────────────────── */}
          {blindCorners.length > 0 && (
            <section className="px-4 py-3 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-2">
                Corner Opportunities
              </span>
              <div className="flex flex-col gap-1.5">
                {blindCorners.map((c) => (
                  <div key={c.cornerId} className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-stone-600 leading-relaxed">
                      {c.recommendations[0] ?? `${c.cornerId.replace("corner-", "").toUpperCase()} corner needs attention.`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Filler Gaps ───────────────────────────────────────────────── */}
          {fillerNeeded.length > 0 && (
            <section className="px-4 py-3">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-2">
                Filler Gaps
              </span>
              <div className="flex flex-col gap-1.5">
                {fillerNeeded.slice(0, 3).map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="text-xs text-stone-600 leading-relaxed">
                      {(g.gapFt * 12).toFixed(1)}&quot; gap on{" "}
                      {WALL_LABELS[g.wallId] ?? g.wallId} wall &mdash; add a filler panel.
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {workTriangle.hasAllVertices &&
           clearanceCount === 0 &&
           blindCorners.length === 0 &&
           fillerNeeded.length === 0 && (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-emerald-600 font-medium">
                Layout looks great — no issues detected.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
