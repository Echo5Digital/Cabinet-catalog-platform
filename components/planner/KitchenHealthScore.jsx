"use client";

import { useMemo, useState } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Score computation ────────────────────────────────────────────────────────

/**
 * Computes a 0–100 kitchen health score from scene items + validation results.
 * Returns { score, grade, breakdown[] }
 */
function computeHealthScore(items, validationResults, layout) {
  const errors   = validationResults.filter((r) => r.severity === "error").length;
  const warnings = validationResults.filter((r) => r.severity === "warning").length;

  const hasItem   = (cat) => items.some((i) => i.category === cat);
  const hasByName = (kw) => items.some((i) => (i.name || "").toLowerCase().includes(kw));

  const hasSink      = hasItem("Sink");
  const hasRange     = hasItem("Range");
  const hasFridge    = hasByName("refrigerator") || hasByName("fridge");
  const hasUpper     = items.some((i) => (i.name || "").toLowerCase().includes("wall") || (i.category || "").toLowerCase().includes("upper"));
  const hasIsland    = (layout || "").toLowerCase().includes("island");
  const itemCount    = items.length;

  const breakdown = [];
  let total = 0;

  // ── 1. Work triangle presence (30 pts) ──────────────────────────────────────
  const triangleComponents = [hasSink, hasRange, hasFridge].filter(Boolean).length;
  const trianglePts = Math.round((triangleComponents / 3) * 30);
  total += trianglePts;
  breakdown.push({
    label: "Work Triangle",
    pts: trianglePts,
    max: 30,
    hint: triangleComponents < 3
      ? `Missing: ${[!hasSink && "Sink", !hasRange && "Range", !hasFridge && "Refrigerator"].filter(Boolean).join(", ")}`
      : "Sink, Range & Refrigerator present",
    icon: "triangle",
  });

  // ── 2. Design rule compliance (25 pts) ──────────────────────────────────────
  const ruleDeductions = errors * 8 + warnings * 3;
  const rulePts = Math.max(0, 25 - ruleDeductions);
  total += rulePts;
  breakdown.push({
    label: "Design Rules",
    pts: rulePts,
    max: 25,
    hint: errors === 0 && warnings === 0
      ? "No design issues found"
      : `${errors} error${errors !== 1 ? "s" : ""}, ${warnings} warning${warnings !== 1 ? "s" : ""}`,
    icon: "check",
  });

  // ── 3. Cabinet coverage (25 pts) ────────────────────────────────────────────
  const coverageFactor = Math.min(1, itemCount / 12);  // 12+ items = full score
  const hasUpperBonus  = hasUpper ? 1.0 : 0.75;
  const coveragePts    = Math.round(coverageFactor * hasUpperBonus * 25);
  total += coveragePts;
  breakdown.push({
    label: "Coverage",
    pts: coveragePts,
    max: 25,
    hint: itemCount === 0
      ? "No items placed yet"
      : !hasUpper
        ? `${itemCount} items — add upper cabinets for storage`
        : `${itemCount} items placed`,
    icon: "grid",
  });

  // ── 4. Layout bonus (20 pts) ─────────────────────────────────────────────────
  // More sophisticated layouts score higher
  const LAYOUT_SCORES = {
    "island":   20,
    "g-shape":  18,
    "u-shape":  16,
    "l-shape":  12,
    "parallel": 10,
    "straight":  8,
  };
  const layoutKey = (layout || "").toLowerCase().replace(/[ -]/g, "-");
  const layoutPts = LAYOUT_SCORES[layoutKey] ?? 8;
  total += layoutPts;
  breakdown.push({
    label: "Layout",
    pts: layoutPts,
    max: 20,
    hint: layout ? `${layout} layout` : "No layout selected",
    icon: "layout",
  });

  const score = Math.min(100, Math.max(0, total));
  const grade =
    score >= 90 ? "A+"
    : score >= 80 ? "A"
    : score >= 70 ? "B+"
    : score >= 60 ? "B"
    : score >= 50 ? "C"
    : "D";

  return { score, grade, breakdown };
}

// ─── Score ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score, grade, color }) {
  const r   = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);

  const ringColor =
    score >= 80 ? "#10b981"
    : score >= 60 ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-[72px] h-[72px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
        {/* Track */}
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        {/* Progress */}
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-stone-900 leading-none">{grade}</span>
        <span className="text-[10px] text-stone-400 mt-0.5">{score}/100</span>
      </div>
    </div>
  );
}

// ─── Icon set ─────────────────────────────────────────────────────────────────

function Icon({ type }) {
  if (type === "triangle") return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 15H3L12 3z" />
    </svg>
  );
  if (type === "check") return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (type === "grid") return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
  if (type === "layout") return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-10a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
    </svg>
  );
  return null;
}

// ─── Bar segment ──────────────────────────────────────────────────────────────

function BreakdownBar({ item }) {
  const pct = item.max > 0 ? Math.round((item.pts / item.max) * 100) : 0;
  const barColor =
    pct >= 80 ? "bg-emerald-400"
    : pct >= 50 ? "bg-amber-400"
    : "bg-red-400";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-stone-600">
          <Icon type={item.icon} />
          <span className="text-xs font-medium">{item.label}</span>
        </div>
        <span className="text-xs font-semibold text-stone-700">{item.pts}<span className="font-normal text-stone-400">/{item.max}</span></span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-stone-400 leading-tight">{item.hint}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KitchenHealthScore({ primaryColor = "#1C1917" }) {
  const items             = usePlannerStore((s) => s.scene.items);
  const validationResults = usePlannerStore((s) => s.validationResults);
  const layout            = usePlannerStore((s) => s.layout);
  const [expanded, setExpanded] = useState(false);

  const { score, grade, breakdown } = useMemo(
    () => computeHealthScore(items, validationResults ?? [], layout),
    [items, validationResults, layout]
  );

  const gradeColor =
    score >= 80 ? "text-emerald-600"
    : score >= 60 ? "text-amber-600"
    : "text-red-500";

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition"
        aria-expanded={expanded}
      >
        {/* Score ring */}
        <ScoreRing score={score} grade={grade} />

        {/* Title + summary */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 leading-tight">Kitchen Health Score</p>
          <p className={`text-xs font-medium mt-0.5 ${gradeColor}`}>
            {score >= 90 ? "Excellent design"
              : score >= 75 ? "Good design"
              : score >= 60 ? "Needs some attention"
              : score >= 40 ? "Several issues found"
              : "Significant improvements needed"}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            {items.length === 0 ? "Place items to get your score" : `${items.length} item${items.length !== 1 ? "s" : ""} · Tap to see breakdown`}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="border-t border-stone-100 px-4 py-3 flex flex-col gap-3 bg-stone-50/50">
          {breakdown.map((item) => (
            <BreakdownBar key={item.label} item={item} />
          ))}
          <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
            Score based on work triangle, design rules, cabinet coverage, and layout type. For advisory use only.
          </p>
        </div>
      )}
    </div>
  );
}
