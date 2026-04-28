"use client";

import { useState, useEffect, useCallback } from "react";

export default function ColorGallery({ countertop, floor }) {
  const [selected, setSelected] = useState(null);

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

  return (
    <>
      <div className="space-y-14">
        {countertop.length > 0 && (
          <ColorSection title="Countertop" items={countertop} onSelect={setSelected} />
        )}
        {floor.length > 0 && (
          <ColorSection title="Floor" items={floor} onSelect={setSelected} />
        )}
      </div>

      {/* Lightbox */}
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
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/30 hover:bg-black/55 rounded-full flex items-center justify-center text-white transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="aspect-square w-full overflow-hidden bg-stone-100">
              {selected.image?.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.image.public_url}
                  alt={selected.image.alt_text || selected.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3
                  className="text-xl font-bold text-stone-900 leading-tight"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {selected.name}
                </h3>
                <span className="shrink-0 px-3 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 capitalize mt-1">
                  {selected.color_type}
                </span>
              </div>

              {selected.description && (
                <p className="text-stone-600 text-sm leading-relaxed mt-3">
                  {selected.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ColorSection({ title, items, onSelect }) {
  return (
    <div>
      <h2
        className="text-xl font-bold text-stone-900 mb-6"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((color) => (
          <button
            key={color.id}
            onClick={() => onSelect(color)}
            className="group text-left rounded-xl overflow-hidden border border-stone-100 bg-white hover:shadow-md hover:border-stone-300 transition-all duration-200 cursor-pointer"
          >
            <div className="aspect-square bg-stone-100 overflow-hidden relative">
              {color.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={color.image.public_url}
                  alt={color.image.alt_text || color.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
            </div>
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium text-stone-900 truncate">{color.name}</p>
              {color.description && (
                <p className="text-xs text-stone-400 mt-0.5 truncate">{color.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
