"use client";

import { useMemo, useState } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Swatch tile ──────────────────────────────────────────────────────────────

function SwatchTile({ label, hex, imageUrl, missing }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          "w-full aspect-square rounded-xl overflow-hidden border-2 shadow-sm",
          missing ? "border-dashed border-stone-200" : "border-stone-200",
        ].join(" ")}
        style={!imageUrl && !missing ? { backgroundColor: hex || "#e5e5e5" } : {}}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
        ) : missing ? (
          <div className="w-full h-full bg-stone-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        ) : null}
      </div>
      <p className={["text-[9px] text-center leading-tight truncate w-full", missing ? "text-stone-300" : "text-stone-500"].join(" ")}>
        {missing ? "Not selected" : label}
      </p>
    </div>
  );
}

// ─── Door style mini-preview SVG ──────────────────────────────────────────────

const DOOR_STYLE_PREVIEWS = {
  Shaker: (
    <svg viewBox="0 0 48 48" className="w-full h-full text-stone-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="40" height="40" rx="1.5" fill="#f5f3f0" />
      <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1} fill="none" />
    </svg>
  ),
  Slab: (
    <svg viewBox="0 0 48 48" className="w-full h-full text-stone-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="40" height="40" rx="1.5" fill="#f5f3f0" />
    </svg>
  ),
  "Raised Panel": (
    <svg viewBox="0 0 48 48" className="w-full h-full text-stone-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="40" height="40" rx="1.5" fill="#f5f3f0" />
      <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1} fill="none" />
      <rect x="15" y="15" width="18" height="18" rx="0.5" fill="#ede8e0" stroke="currentColor" strokeWidth={0.75} />
    </svg>
  ),
  "Glass-Front": (
    <svg viewBox="0 0 48 48" className="w-full h-full text-stone-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="4" width="40" height="40" rx="1.5" fill="#f5f3f0" />
      <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1} fill="#dbeafe" opacity={0.6} />
      <line x1="10" y1="10" x2="38" y2="38" strokeWidth={0.75} opacity={0.3} />
      <line x1="10" y1="38" x2="38" y2="10" strokeWidth={0.75} opacity={0.3} />
    </svg>
  ),
};

// ─── Palette strip ────────────────────────────────────────────────────────────

function PaletteStrip({ colors }) {
  const filled = [...colors, ...Array(5).fill(null)].slice(0, 5);
  return (
    <div className="flex rounded-xl overflow-hidden border border-stone-200 h-8">
      {filled.map((c, i) => (
        <div
          key={i}
          className="flex-1 transition-colors duration-300"
          style={{ backgroundColor: c || "#f3f2f0" }}
          title={c}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoodBoard({ primaryColor = "#1C1917" }) {
  const upperCabinetColor  = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor  = usePlannerStore((s) => s.lowerCabinetColor);
  const selectedCountertop = usePlannerStore((s) => s.selectedCountertop);
  const selectedFlooring   = usePlannerStore((s) => s.selectedFlooring);
  const selectedDoorStyle  = usePlannerStore((s) => s.selectedDoorStyle);
  const selectedHardware   = usePlannerStore((s) => s.selectedHardware);
  const layout             = usePlannerStore((s) => s.layout);
  const lifestyleProfile   = usePlannerStore((s) => s.lifestyleProfile);
  const [expanded, setExpanded] = useState(false);

  // Collect the palette colors for the strip
  const palette = useMemo(() => {
    const colors = [];
    if (upperCabinetColor?.hex)  colors.push(upperCabinetColor.hex);
    if (lowerCabinetColor?.hex && lowerCabinetColor.hex !== upperCabinetColor?.hex)
      colors.push(lowerCabinetColor.hex);
    if (selectedCountertop?.hex) colors.push(selectedCountertop.hex);
    if (selectedFlooring?.hex)   colors.push(selectedFlooring.hex);
    return colors;
  }, [upperCabinetColor, lowerCabinetColor, selectedCountertop, selectedFlooring]);

  const hasSelections = palette.length > 0 || selectedDoorStyle || selectedHardware;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition"
        aria-expanded={expanded}
      >
        {/* Mini palette preview */}
        <div className="w-10 h-10 shrink-0 rounded-lg border border-stone-200 overflow-hidden grid grid-cols-2">
          {(palette.length > 0 ? palette : ["#e5e5e5", "#d4d4d4", "#c5c5c5", "#b8b8b8"]).slice(0, 4).map((c, i) => (
            <div key={i} style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Mood Board</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {hasSelections ? `${palette.length} colors · ${selectedDoorStyle?.name || "no door style"}` : "No selections yet"}
          </p>
        </div>

        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded mood board */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 flex flex-col gap-4">

          {/* Color palette strip */}
          {palette.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Color Palette</p>
              <PaletteStrip colors={palette} />
            </div>
          )}

          {/* 2×2 swatch grid */}
          <div>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Materials</p>
            <div className="grid grid-cols-4 gap-2">
              <SwatchTile
                label={upperCabinetColor?.name || "Upper"}
                hex={upperCabinetColor?.hex}
                imageUrl={upperCabinetColor?.swatchUrl}
                missing={!upperCabinetColor}
              />
              <SwatchTile
                label={lowerCabinetColor?.name || "Lower"}
                hex={lowerCabinetColor?.hex}
                imageUrl={lowerCabinetColor?.swatchUrl}
                missing={!lowerCabinetColor}
              />
              <SwatchTile
                label={selectedCountertop?.name || "Counter"}
                hex={selectedCountertop?.hex}
                imageUrl={selectedCountertop?.swatchUrl}
                missing={!selectedCountertop}
              />
              <SwatchTile
                label={selectedFlooring?.name || "Flooring"}
                hex={selectedFlooring?.hex}
                imageUrl={selectedFlooring?.swatchUrl}
                missing={!selectedFlooring}
              />
            </div>
          </div>

          {/* Door style preview */}
          {selectedDoorStyle && (
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Door Style</p>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-stone-200 bg-white">
                  {DOOR_STYLE_PREVIEWS[selectedDoorStyle.id] || DOOR_STYLE_PREVIEWS["Shaker"]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{selectedDoorStyle.name}</p>
                  {selectedHardware && (
                    <p className="text-xs text-stone-500 mt-0.5">with {selectedHardware.name}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Design summary badge row */}
          {(layout || lifestyleProfile) && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-200">
              {layout && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                  {layout} layout
                </span>
              )}
              {lifestyleProfile && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                  {lifestyleProfile.charAt(0).toUpperCase() + lifestyleProfile.slice(1)} profile
                </span>
              )}
            </div>
          )}

          {!hasSelections && (
            <p className="text-xs text-stone-400 text-center py-2">
              Select materials in the sections above to build your mood board.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
