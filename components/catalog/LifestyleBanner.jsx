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
      <div className="relative w-full h-[300px] sm:h-[420px] lg:h-[65vh] overflow-hidden bg-stone-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0].url}
          alt={images[0].alt || lineName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[300px] sm:h-[420px] lg:h-[65vh] overflow-hidden bg-stone-50 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides — pure image, no color overlay on the images themselves */}
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

      {/* Very light gradient only for dot readability — kept minimal to preserve image quality */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none" />

      {/* Prev arrow */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/85 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all duration-150 focus:outline-none"
        aria-label="Previous image"
      >
        <svg className="w-5 h-5 text-stone-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Next arrow */}
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/85 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-all duration-150 focus:outline-none"
        aria-label="Next image"
      >
        <svg className="w-5 h-5 text-stone-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 focus:outline-none ${
              i === current
                ? "bg-white w-6 h-2.5"
                : "bg-white/60 hover:bg-white/85 w-2.5 h-2.5"
            }`}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>

      {/* Slide counter — minimal, unobtrusive */}
      <div className="absolute top-4 right-4 z-20 bg-black/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
        {current + 1} / {total}
      </div>
    </div>
  );
}
