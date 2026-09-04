"use client";

import { useState, useEffect, useCallback } from "react";

export default function GalleryGrid({ images }) {
  const [openIndex, setOpenIndex] = useState(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const showPrev = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  }, [images.length]);
  const showNext = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
  }, [images.length]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    },
    [close, showPrev, showNext]
  );

  useEffect(() => {
    if (openIndex !== null) {
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
  }, [openIndex, handleKey]);

  if (!images || images.length === 0) return null;

  const current = openIndex !== null ? images[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {images.map((img, idx) => (
          <button
            key={img.id || idx}
            type="button"
            onClick={() => setOpenIndex(idx)}
            aria-label="View full-size photo"
            className={`group relative overflow-hidden rounded-xl bg-stone-100 shimmer-card text-left cursor-zoom-in ${
              idx === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
            }`}
            style={{ animationName: 'fade-in-up-sm', animationDuration: '0.45s', animationFillMode: 'both', animationTimingFunction: 'ease', animationDelay: `${idx * 0.05}s` }}
          >
            <div className={`${idx === 0 ? "aspect-square" : "aspect-[4/3]"} overflow-hidden`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.public_url}
                alt={img.alt_text || "Kitchen design inspiration"}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                loading={idx < 4 ? "eager" : "lazy"}
              />
            </div>
            {img.alt_text && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end">
                <p className="text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed">
                  {img.alt_text}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-8"
          onClick={close}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev/Next — hidden on very small screens' thumb reach is fine at edges */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showPrev(); }}
                aria-label="Previous photo"
                className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showNext(); }}
                aria-label="Next photo"
                className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Full-size image */}
          <div
            className="relative max-w-full max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.public_url}
              alt={current.alt_text || "Kitchen design inspiration"}
              className="max-w-full max-h-[85vh] sm:max-h-[88vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
            {current.alt_text && (
              <p className="text-white/90 text-sm text-center mt-3 px-4 max-w-2xl leading-relaxed">
                {current.alt_text}
              </p>
            )}
            {images.length > 1 && (
              <p className="text-white/50 text-xs mt-2">
                {openIndex + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
