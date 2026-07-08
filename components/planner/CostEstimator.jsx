"use client";

import { useMemo, useState } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Pricing model ────────────────────────────────────────────────────────────
// Tier-based estimate ranges per item category.
// If a real `price` field exists on the product, it takes precedence.
// These are illustrative rough ranges for advisory display only.

const CATEGORY_PRICE_RANGES = {
  // Base cabinets
  "Base":          { lo: 280, hi: 620 },
  "Base Cabinet":  { lo: 280, hi: 620 },
  "Sink Base":     { lo: 320, hi: 700 },

  // Upper / wall
  "Upper":         { lo: 180, hi: 420 },
  "Wall Cabinet":  { lo: 180, hi: 420 },
  "Wall":          { lo: 180, hi: 420 },

  // Tall / pantry
  "Tall":          { lo: 480, hi: 1100 },
  "Pantry":        { lo: 480, hi: 1100 },
  "Oven Cabinet":  { lo: 520, hi: 1200 },

  // Appliances / fixtures
  "Sink":          { lo: 180, hi: 900 },
  "Range":         { lo: 600, hi: 4000 },
  "Refrigerator":  { lo: 800, hi: 4500 },
  "Dishwasher":    { lo: 450, hi: 1400 },

  // Island
  "Island":        { lo: 900, hi: 3500 },

  // Default
  "_default":      { lo: 250, hi: 600 },
};

// Additional material cost factors (multiplied vs base cabinet estimate)
const COUNTERTOP_MULTIPLIERS = {
  "quartz":     0.18,   // per ft of linear counter
  "granite":    0.15,
  "marble":     0.22,
  "butcher":    0.10,
  "laminate":   0.06,
  "_default":   0.14,
};

function categoryRange(item) {
  const cat = item.category || "";
  const name = (item.name || "").toLowerCase();

  // Try exact match
  if (CATEGORY_PRICE_RANGES[cat]) return CATEGORY_PRICE_RANGES[cat];

  // Try name-based fallback
  if (name.includes("refrigerator") || name.includes("fridge")) return CATEGORY_PRICE_RANGES["Refrigerator"];
  if (name.includes("dishwasher"))  return CATEGORY_PRICE_RANGES["Dishwasher"];
  if (name.includes("range") || name.includes("cooktop")) return CATEGORY_PRICE_RANGES["Range"];
  if (name.includes("island"))      return CATEGORY_PRICE_RANGES["Island"];
  if (name.includes("pantry"))      return CATEGORY_PRICE_RANGES["Pantry"];
  if (name.includes("upper") || name.includes("wall")) return CATEGORY_PRICE_RANGES["Upper"];
  if (name.includes("tall"))        return CATEGORY_PRICE_RANGES["Tall"];

  return CATEGORY_PRICE_RANGES["_default"];
}

/**
 * Compute cost estimate bands from scene items + material selections.
 * Returns { totalLo, totalHi, lineItems[], laborLo, laborHi, counterLo, counterHi }
 */
function computeEstimate(items, selectedCountertop, selectedFlooring, roomDimensions) {
  const lineItems = items.map((item) => {
    const { lo, hi } = categoryRange(item);
    return {
      name:     item.name || item.sku || "Cabinet",
      category: item.category || "Cabinet",
      lo,
      hi,
    };
  });

  const cabinetLo = lineItems.reduce((s, l) => s + l.lo, 0);
  const cabinetHi = lineItems.reduce((s, l) => s + l.hi, 0);

  // Countertop estimate — based on room width × a rough linear ft factor
  const linearFt = (roomDimensions?.width ?? 12) * 1.4; // rough perimeter factor
  const ctName   = (selectedCountertop?.name || "").toLowerCase();
  const ctKey    = Object.keys(COUNTERTOP_MULTIPLIERS).find((k) => ctName.includes(k)) || "_default";
  const ctMulti  = COUNTERTOP_MULTIPLIERS[ctKey];
  const counterLo = Math.round(linearFt * (ctMulti * 0.8) * 1000);
  const counterHi = Math.round(linearFt * (ctMulti * 1.2) * 1000);

  // Flooring estimate — simple per-sqft range
  const sqFt     = (roomDimensions?.width ?? 12) * (roomDimensions?.length ?? 10);
  const flName   = (selectedFlooring?.name || "").toLowerCase();
  const flPsLo   = flName.includes("tile") ? 4 : flName.includes("vinyl") ? 3 : 5;
  const flPsHi   = flName.includes("tile") ? 9 : flName.includes("vinyl") ? 7 : 12;
  const floorLo  = Math.round(sqFt * flPsLo);
  const floorHi  = Math.round(sqFt * flPsHi);

  // Labor estimate — roughly 35% of cabinet cost
  const laborLo  = Math.round(cabinetLo * 0.30);
  const laborHi  = Math.round(cabinetHi * 0.40);

  const totalLo  = cabinetLo + counterLo + floorLo + laborLo;
  const totalHi  = cabinetHi + counterHi + floorHi + laborHi;

  return { totalLo, totalHi, cabinetLo, cabinetHi, counterLo, counterHi, floorLo, floorHi, laborLo, laborHi, lineItems };
}

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostEstimator({ primaryColor = "#1C1917" }) {
  const items              = usePlannerStore((s) => s.scene.items);
  const selectedCountertop = usePlannerStore((s) => s.selectedCountertop);
  const selectedFlooring   = usePlannerStore((s) => s.selectedFlooring);
  const roomDimensions     = usePlannerStore((s) => s.roomDimensions);
  const [expanded, setExpanded] = useState(false);

  const est = useMemo(
    () => computeEstimate(items, selectedCountertop, selectedFlooring, roomDimensions),
    [items, selectedCountertop, selectedFlooring, roomDimensions]
  );

  const hasItems = items.length > 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition"
        aria-expanded={expanded}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Cost Estimate</p>
          {hasItems ? (
            <p className="text-xs text-stone-500 mt-0.5">
              <span className="font-semibold text-stone-700">{fmt(est.totalLo)}</span>
              <span className="text-stone-400"> – </span>
              <span className="font-semibold text-stone-700">{fmt(est.totalHi)}</span>
            </p>
          ) : (
            <p className="text-xs text-stone-400 mt-0.5">Place items for estimate</p>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50">
          {hasItems ? (
            <>
              {/* Summary rows */}
              <div className="px-4 py-3 flex flex-col gap-2">
                {[
                  { label: "Cabinets & Fixtures",  lo: est.cabinetLo, hi: est.cabinetHi },
                  { label: selectedCountertop?.name ? `Countertops (${selectedCountertop.name})` : "Countertops", lo: est.counterLo, hi: est.counterHi },
                  { label: selectedFlooring?.name ? `Flooring (${selectedFlooring.name})` : "Flooring",      lo: est.floorLo,   hi: est.floorHi   },
                  { label: "Installation & Labor",   lo: est.laborLo,   hi: est.laborHi   },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-stone-600 truncate">{row.label}</span>
                    <span className="text-xs font-medium text-stone-700 shrink-0">
                      {fmt(row.lo)}<span className="text-stone-400">–</span>{fmt(row.hi)}
                    </span>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-stone-200">
                  <span className="text-sm font-semibold text-stone-800">Total (estimated)</span>
                  <span className="text-sm font-bold text-stone-900">
                    {fmt(est.totalLo)}<span className="text-stone-400 font-normal">–</span>{fmt(est.totalHi)}
                  </span>
                </div>
              </div>

              <p className="px-4 pb-3 text-[10px] text-stone-400 leading-relaxed">
                Estimates are advisory ranges based on typical market pricing. Actual costs vary by region, brand, and contractor. Contact your dealer for accurate quotes.
              </p>
            </>
          ) : (
            <p className="px-4 py-4 text-xs text-stone-400 text-center">
              Add cabinets and appliances to see cost ranges.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
