"use client";
import { useState, useEffect } from "react";

export default function ZoomPanel({ children, label, onRegenerate, loading }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#3D0810] uppercase tracking-wide">{label}</span>
            {!loading && (
              <span className="text-[10px] text-stone-400 hidden sm:inline">· click to expand</span>
            )}
          </div>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-stone-200 bg-white text-[#6E1020] hover:border-[#6E1020]/40 hover:bg-[#FDF4F2] disabled:opacity-50 transition min-h-[36px]"
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

        {/* Preview — click to open lightbox */}
        <button
          type="button"
          onClick={() => { if (!loading) setOpen(true); }}
          disabled={loading}
          className="relative w-full text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6E1020]/30 group"
          style={{ minHeight: 240 }}
        >
          {loading ? (
            <div className="w-full h-60 bg-stone-100 animate-pulse" />
          ) : (
            <>
              <div className="w-full overflow-hidden [&_svg]:max-w-full [&_svg]:h-auto [&_img]:max-w-full [&_img]:h-auto">
                {children}
              </div>
              {/* Expand hint */}
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors pointer-events-none flex items-end justify-end p-2.5">
                <span className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-stone-500 px-2 py-1 rounded-full shadow-sm border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand
                </span>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl leading-none flex items-center justify-center transition z-10"
            aria-label="Close"
          >
            ×
          </button>

          {/* Content card — w-full fills the flex container so SVGs expand the same as images */}
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50 shrink-0">
              <span className="text-sm font-semibold text-[#3D0810]">{label}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-stone-400 hover:text-stone-600 transition px-2 py-1"
              >
                Close
              </button>
            </div>
            {/* Scrollable content at full size */}
            <div className="overflow-auto p-4 [&_svg]:w-full [&_svg]:h-auto [&_img]:max-w-full [&_img]:mx-auto">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
