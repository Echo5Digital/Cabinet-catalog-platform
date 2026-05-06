"use client";

import { useEffect, useState, useCallback } from "react";

export default function HomeSlideshow({ images = [] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(
    () => setCurrent((p) => (p + 1) % images.length),
    [images.length]
  );

  const prev = useCallback(
    () => setCurrent((p) => (p - 1 + images.length) % images.length),
    [images.length]
  );

  // Auto-advance every 3.8 s
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(next, 3800);
    return () => clearInterval(t);
  }, [images.length, next]);

  // Empty / no-image fallback
  if (!images.length) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl flex-1 flex items-center justify-center min-h-[280px] sm:min-h-[360px]"
        style={{ border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.32)" }}
      >
        <div className="text-center px-4">
          <svg className="w-10 h-10 text-white/20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p className="text-white/30 text-xs">Gallery images loading</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl group/slide flex-1 flex flex-col"
      style={{ border: "1px solid rgba(255,255,255,0.15)" }}
    >
      {/* Images — all stacked, crossfade via opacity */}
      <div className="relative bg-stone-900 flex-1 min-h-[280px] sm:min-h-[360px]">
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={img.url}
            alt={img.alt || "Kitchen design"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Prev / Next arrows
            — always visible on mobile (touch devices have no hover)
            — fade in on hover on desktop */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); prev(); }}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/65 text-white border border-white/20 transition-all duration-200 focus:outline-none opacity-100 sm:opacity-0 sm:group-hover/slide:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.preventDefault(); next(); }}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/65 text-white border border-white/20 transition-all duration-200 focus:outline-none opacity-100 sm:opacity-0 sm:group-hover/slide:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

      </div>
    </div>
  );
}
