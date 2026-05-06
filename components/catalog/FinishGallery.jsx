"use client";

import { useState, useEffect, useCallback } from "react";

export default function FinishGallery({ finishes, lineMap }) {
  const [selected, setSelected] = useState(null);

  // Close on ESC
  const handleKey = useCallback((e) => {
    if (e.key === "Escape") setSelected(null);
  }, []);

  useEffect(() => {
    if (selected) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [selected, handleKey]);

  // Group by family
  const familyGroups = {};
  for (const finish of finishes) {
    const family = finish.finish_family || "Other";
    if (!familyGroups[family]) familyGroups[family] = [];
    familyGroups[family].push(finish);
  }
  const families = Object.keys(familyGroups).sort();

  return (
    <>
      {finishes.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-stone-400">No finishes have been published yet.</p>
        </div>
      ) : families.length > 1 ? (
        <div className="space-y-14">
          {families.map((family) => (
            <div key={family}>
              <div className="section-band mb-6 inline-flex">
                <h2
                  className="text-xl font-bold text-stone-900 capitalize"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {family}
                </h2>
              </div>
              <FinishGrid
                finishes={familyGroups[family]}
                lineMap={lineMap}
                onSelect={setSelected}
              />
            </div>
          ))}
        </div>
      ) : (
        <FinishGrid finishes={finishes} lineMap={lineMap} onSelect={setSelected} />
      )}

      {/* Lightbox modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ backgroundColor: "rgba(0,0,0,0.82)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/30 hover:bg-black/55 rounded-full flex items-center justify-center text-white transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Enlarged swatch image */}
            <div className="aspect-square w-full overflow-hidden">
              {selected.swatch?.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.swatch.public_url}
                  alt={selected.swatch.alt_text || selected.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: selected.fallbackColor || "#E5E2DE" }}
                />
              )}
            </div>

            {/* Finish info */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3
                  className="text-xl font-bold text-stone-900 leading-tight"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {selected.name}
                </h3>
                {selected.finish_family && (
                  <span className="shrink-0 px-3 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 capitalize mt-1">
                    {selected.finish_family}
                  </span>
                )}
              </div>

              {selected.code && (
                <p className="text-xs font-mono text-stone-400 mb-3 uppercase tracking-wide">
                  {selected.code}
                </p>
              )}

              {selected.description && (
                <p className="text-stone-600 text-sm leading-relaxed mb-4">
                  {selected.description}
                </p>
              )}

              {selected.catalog_line_id && lineMap[selected.catalog_line_id] && (
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-xs text-stone-400">Available in</p>
                  <a
                    href={`/catalog/${lineMap[selected.catalog_line_id].slug}`}
                    className="text-sm font-medium text-stone-700 hover:text-stone-900 transition"
                  >
                    {lineMap[selected.catalog_line_id].name} →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FinishGrid({ finishes, lineMap, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {finishes.map((finish) => (
        <button
          key={finish.id}
          onClick={() => onSelect(finish)}
          className="group text-left rounded-xl overflow-hidden border border-stone-200 bg-white hover:shadow-lg hover:border-amber-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shimmer-card"
        >
          {/* Swatch */}
          <div className="aspect-square overflow-hidden relative">
            {finish.swatch?.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={finish.swatch.public_url}
                alt={finish.swatch.alt_text || finish.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div
                className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                style={{ backgroundColor: finish.fallbackColor || "#E5E2DE" }}
              />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="font-semibold text-stone-800 text-sm leading-snug">{finish.name}</p>
            {finish.description && (
              <p className="text-stone-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                {finish.description}
              </p>
            )}
            {finish.catalog_line_id && lineMap[finish.catalog_line_id] && (
              <p className="text-stone-400 text-[10px] mt-1 uppercase tracking-wide font-medium">
                {lineMap[finish.catalog_line_id].name}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
