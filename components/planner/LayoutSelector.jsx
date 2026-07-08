"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";
import DesignWizard from "./DesignWizard";

const LAYOUTS = [
  {
    id: "Straight",
    label: "Straight",
    description: "Single wall, linear run",
    icon: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "L-Shape",
    label: "L-Shape",
    description: "Two walls at a corner",
    icon: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "U-Shape",
    label: "U-Shape",
    description: "Three walls, horseshoe",
    icon: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6"  y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "Parallel",
    label: "Parallel",
    description: "Galley — two facing walls",
    icon: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6" y="42" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "Island",
    label: "Island",
    description: "Open plan with center island",
    icon: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="22" y="30" width="28" height="12" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "G-Shape",
    label: "G-Shape",
    description: "U-shape with a peninsula",
    icon: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6"  y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="16" y="42" width="28" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

/**
 * Maps each planner layout ID to the possible admin structure names/codes.
 * Matching is case-insensitive; spaces and hyphens are normalised.
 */
const STRUCTURE_KEY_MAP = {
  "Straight": ["straight", "single-wall", "single wall", "single_wall"],
  "L-Shape":  ["l-shape", "l-shaped", "lshape", "lshaped"],
  "U-Shape":  ["u-shape", "u-shaped", "ushape", "ushaped"],
  "Parallel": ["parallel", "galley"],
  "Island":   ["island"],
  "G-Shape":  ["g-shape", "g-shaped", "gshape", "gshaped"],
};

// Normalise a string for matching: lowercase, collapse spaces/hyphens/underscores to "-"
function norm(s) {
  return (s || "").toLowerCase().replace(/[\s_-]+/g, "-").trim();
}

function findStructureImage(layoutId, structures) {
  const keys = (STRUCTURE_KEY_MAP[layoutId] || []).map(norm);

  // Pass 1 — exact normalised match on name or code
  const exact = structures.find((s) => {
    const n = norm(s.name);
    const c = norm(s.code);
    return keys.includes(n) || keys.includes(c);
  });
  if (exact?.imageUrl) return exact.imageUrl;

  // Pass 2 — substring match: handles "L-Shaped Kitchen", "Galley Kitchen", etc.
  const partial = structures.find((s) => {
    const n = norm(s.name);
    const c = norm(s.code);
    return keys.some((k) => n.includes(k) || c.includes(k) || k.includes(n) || k.includes(c));
  });
  return partial?.imageUrl ?? null;
}

export default function LayoutSelector({ primaryColor = "#1C1917", structures = [] }) {
  const layout          = usePlannerStore((s) => s.layout);
  const setLayout       = usePlannerStore((s) => s.setLayout);
  const cabinetStyle    = usePlannerStore((s) => s.cabinetStyle);
  const setCabinetStyle = usePlannerStore((s) => s.setCabinetStyle);
  const setStep         = usePlannerStore((s) => s.setStep);
  const [showWizard, setShowWizard] = useState(false);

  const canContinue = !!layout && !!cabinetStyle;

  function handleContinue() {
    if (canContinue) setStep(2);
  }

  return (
    <div className="min-h-[calc(100vh-60px)] sm:min-h-[calc(100vh-68px)] bg-[#FAFAF9] flex flex-col">
      {/* Design Wizard overlay */}
      {showWizard && (
        <DesignWizard onClose={() => setShowWizard(false)} primaryColor={primaryColor} />
      )}

      {/* Hero section */}
      <div
        className="py-12 sm:py-16 px-4 text-center"
        style={{ background: `linear-gradient(160deg, ${primaryColor} 0%, ${primaryColor}e0 100%)` }}
      >
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-stone-300 bg-white/10 ring-1 ring-white/20 mb-4">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
            </svg>
            Kitchen Planner — Step 1 of 3
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Choose Your Kitchen Layout
          </h1>
          <p className="text-stone-400 text-base max-w-lg mx-auto">
            Select the layout that best matches your kitchen space. You can adjust dimensions in the next step.
          </p>
          {/* Wizard CTA */}
          <button
            onClick={() => setShowWizard(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 transition backdrop-blur-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Not sure? Try the Design Wizard
          </button>
        </div>
      </div>

      {/* Body — centred flex column */}
      <div className="flex-1 w-full px-4 sm:px-6 py-10 flex flex-col items-center">

        {/* Layout section */}
        <div className="w-full max-w-5xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5 text-center"
            style={{ color: primaryColor }}
          >
            Select Layout
          </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {LAYOUTS.map((l, idx) => {
            const isSelected = layout === l.id;
            // Primary: match by name/code. Fallback: nth structure → nth layout card (by sort_order).
            const imgUrl = findStructureImage(l.id, structures) ?? (structures[idx]?.imageUrl ?? null);
            return (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={[
                  "group relative flex flex-col items-center gap-3 p-3 sm:p-5 rounded-2xl border-2 transition-all duration-150 text-left cursor-pointer",
                  isSelected
                    ? "border-stone-800 bg-stone-900 shadow-lg"
                    : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-md",
                ].join(" ")}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : {}}
              >
                {/* Image (from admin) or SVG icon fallback */}
                <div
                  className={[
                    "w-full aspect-[4/3] rounded-xl overflow-hidden flex items-center justify-center transition-colors",
                    imgUrl
                      ? ""
                      : isSelected
                        ? "bg-stone-100/10 p-2 sm:p-3"
                        : "bg-stone-50 group-hover:bg-stone-100 p-2 sm:p-3",
                  ].join(" ")}
                  style={!imgUrl ? (isSelected ? { color: primaryColor } : { color: "#78716c" }) : {}}
                >
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={l.label}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    l.icon
                  )}
                </div>

                {/* Label */}
                <div className="w-full">
                  <p
                    className={[
                      "text-sm font-semibold mb-0.5 transition-colors",
                      isSelected ? "text-stone-900" : "text-stone-700",
                    ].join(" ")}
                    style={isSelected ? { color: primaryColor } : {}}
                  >
                    {l.label}
                  </p>
                  <p className="text-xs text-stone-500">{l.description}</p>
                </div>

                {/* Selected check */}
                {isSelected && (
                  <span
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>{/* /layout section */}

        {/* Cabinet Style section */}
        <div className="mt-8 pt-8 border-t border-stone-200 w-full max-w-5xl flex flex-col items-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5 text-center"
            style={{ color: primaryColor }}
          >
            Select Cabinet Style
          </p>
          <div className="flex gap-4">
            {["American", "Euro"].map((style) => {
              const isSelected = cabinetStyle === style;
              return (
                <button
                  key={style}
                  onClick={() => setCabinetStyle(style)}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl border-2 text-sm font-semibold transition-all duration-150",
                    isSelected
                      ? "text-white shadow-sm"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50",
                  ].join(" ")}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor } : {}}
                >
                  {style}
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>{/* /cabinet style section */}

        {/* Continue button */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={[
              "flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold text-white transition-all duration-150 shadow-sm",
              canContinue ? "hover:opacity-90 cursor-pointer" : "opacity-40 cursor-not-allowed",
            ].join(" ")}
            style={{ backgroundColor: primaryColor }}
          >
            Continue
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {canContinue && (
          <p className="mt-3 text-center text-xs text-stone-400">
            <span className="font-medium text-stone-600">{layout}</span>
            {" · "}
            <span className="font-medium text-stone-600">{cabinetStyle} Style</span>
          </p>
        )}
      </div>
    </div>
  );
}
