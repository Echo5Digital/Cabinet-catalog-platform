"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export default function ZoomPanel({ children, label, onRegenerate, loading }) {
  const [open,  setOpen]  = useState(false);
  const [scale, setScale] = useState(1);
  const contentRef = useRef(null);

  // Keyboard shortcuts + body scroll lock when lightbox is open
  useEffect(() => {
    if (!open) return;
    setScale(1); // reset zoom on open
    const onKey = (e) => {
      if (e.key === "Escape")          setOpen(false);
      if (e.key === "+" || e.key === "=") setScale((p) => Math.min(4, +(p + 0.25).toFixed(2)));
      if (e.key === "-")               setScale((p) => Math.max(0.5, +(p - 0.25).toFixed(2)));
      if (e.key === "0")               setScale(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Non-passive wheel listener on the scrollable content area (so we can preventDefault)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((prev) =>
      Math.min(4, Math.max(0.5, +(prev + (e.deltaY < 0 ? 0.15 : -0.15)).toFixed(2)))
    );
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [open, handleWheel]);

  return (
    <>
      {/* ── Card ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#111827] uppercase tracking-wide">{label}</span>
            {!loading && (
              <span className="text-[10px] text-stone-400 hidden sm:inline">· click to expand & zoom</span>
            )}
          </div>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-stone-200 bg-white text-[#4F46E5] hover:border-[#4F46E5]/40 hover:bg-[#EEF2FF] disabled:opacity-50 transition min-h-[36px]"
            >
              {loading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Regenerate
            </button>
          )}
        </div>

        {/* Preview — click opens lightbox */}
        <button
          type="button"
          onClick={() => { if (!loading) setOpen(true); }}
          disabled={loading}
          className="relative w-full text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/30 group"
          style={{ minHeight: 400 }}
        >
          {loading ? (
            <div className="w-full h-[400px] bg-stone-100 animate-pulse" />
          ) : (
            <>
              <div className="w-full overflow-hidden [&_svg]:max-w-full [&_svg]:h-auto [&_img]:max-w-full [&_img]:h-auto">
                {children}
              </div>
              {/* Expand hint */}
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors pointer-events-none flex items-end justify-end p-3">
                <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-[10px] font-semibold text-stone-600 px-2.5 py-1.5 rounded-full shadow border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  Expand &amp; Zoom
                </span>
              </div>
            </>
          )}
        </button>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
          onClick={() => setOpen(false)}
        >
          {/* Main card */}
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50 shrink-0">
              <span className="text-sm font-semibold text-[#111827]">{label}</span>

              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div className="flex items-center bg-white border border-stone-200 rounded-full px-1 py-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setScale((p) => Math.max(0.5, +(p - 0.25).toFixed(2)))}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition font-bold text-base leading-none"
                    aria-label="Zoom out"
                  >−</button>
                  <button
                    type="button"
                    onClick={() => setScale(1)}
                    className="min-w-[40px] text-xs font-semibold text-stone-600 hover:text-stone-800 text-center select-none transition"
                    aria-label="Reset zoom"
                    title="Reset to 100%"
                  >
                    {Math.round(scale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale((p) => Math.min(4, +(p + 0.25).toFixed(2)))}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition font-bold text-base leading-none"
                    aria-label="Zoom in"
                  >+</button>
                </div>

                <div className="w-px h-4 bg-stone-200" />

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition px-2 py-1 rounded hover:bg-stone-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>

            {/* Scroll hint bar */}
            <div className="px-5 py-1 bg-stone-50/80 border-b border-stone-100 text-[10px] text-stone-400 shrink-0 select-none">
              Scroll to zoom · <kbd className="font-mono bg-stone-100 px-1 rounded">+</kbd> / <kbd className="font-mono bg-stone-100 px-1 rounded">−</kbd> keys · Click <strong className="text-stone-500">100%</strong> to reset · <kbd className="font-mono bg-stone-100 px-1 rounded">Esc</kbd> to close
            </div>

            {/* Zoomable scrollable content */}
            <div
              ref={contentRef}
              className="overflow-auto flex-1"
              style={{ cursor: scale > 1 ? "zoom-in" : "default" }}
            >
              <div
                style={{
                  width: scale !== 1 ? `${Math.round(scale * 100)}%` : "100%",
                  minWidth: "100%",
                  transition: "width 0.12s ease",
                }}
                className="[&_svg]:w-full [&_svg]:h-auto [&_img]:w-full [&_img]:h-auto p-4"
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
