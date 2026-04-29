"use client";
import { useState, useEffect, useCallback } from "react";

export default function LifestyleBanner({ images, lineName }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = images.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1 || paused) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [total, paused, next]);

  if (total === 0) {
    return <div className="h-20 bg-stone-100 border-b border-stone-200" />;
  }

  if (total === 1) {
    return (
      <div className="relative w-full h-[380px] sm:h-[520px] lg:h-[75vh] overflow-hidden bg-stone-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0].url}
          alt={images[0].alt || lineName}
          className="w-full h-full object-cover"
        />
        {/* Bottom gradient + line name */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        {lineName && (
          <div className="absolute bottom-0 inset-x-0 px-6 sm:px-10 pb-8 sm:pb-12">
            <p className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-widest mb-1">
              Collection
            </p>
            <h2
              className="text-white text-3xl sm:text-5xl font-bold leading-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {lineName}
            </h2>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[380px] sm:h-[520px] lg:h-[75vh] overflow-hidden bg-stone-900 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {images.map((img, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.alt || lineName}
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 via-black/25 to-transparent z-20 pointer-events-none" />

      {/* Line name overlay */}
      {lineName && (
        <div className="absolute bottom-0 inset-x-0 z-20 px-6 sm:px-10 pb-10 sm:pb-14 pointer-events-none">
          <p className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-widest mb-1">
            Collection
          </p>
          <h2
            className="text-white text-3xl sm:text-5xl font-bold leading-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {lineName}
          </h2>
        </div>
      )}

      {/* Prev arrow — offset down slightly to account for navbar overlay at top */}
      <button
        onClick={prev}
        className="absolute left-4 top-[calc(50%+34px)] -translate-y-1/2 z-30 bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all duration-150 focus:outline-none border border-white/20"
        aria-label="Previous image"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next arrow */}
      <button
        onClick={next}
        className="absolute right-4 top-[calc(50%+34px)] -translate-y-1/2 z-30 bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all duration-150 focus:outline-none border border-white/20"
        aria-label="Next image"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators — bottom center, above the text */}
      <div className="absolute bottom-4 right-6 sm:right-10 z-30 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 focus:outline-none ${
              i === current
                ? "bg-white w-5 h-2"
                : "bg-white/45 hover:bg-white/70 w-2 h-2"
            }`}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
