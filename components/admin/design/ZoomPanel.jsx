"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export default function ZoomPanel({ children, label, onRegenerate, loading }) {
  const [open,     setOpen]     = useState(false);
  const [scale,    setScale]    = useState(1);
  const [panX,     setPanX]     = useState(0);
  const [panY,     setPanY]     = useState(0);
  const [dragging, setDragging] = useState(false);

  const contentRef   = useRef(null);
  const scaleRef     = useRef(1);           /* mirrors scale for use inside event handlers */
  const panRef       = useRef({ x: 0, y: 0 });
  const isDragging   = useRef(false);
  const lastMouse    = useRef({ x: 0, y: 0 });
  const pinchDist0   = useRef(0);
  const pinchScale0  = useRef(1);

  const clampS = (s) => Math.min(4, Math.max(0.5, parseFloat(s.toFixed(2))));

  function resetView() {
    scaleRef.current    = 1;
    panRef.current      = { x: 0, y: 0 };
    setScale(1);
    setPanX(0);
    setPanY(0);
  }

  /* ── Body scroll lock + keyboard shortcuts ──────────────────────────── */
  useEffect(() => {
    if (!open) return;
    resetView();
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "+" || e.key === "=") {
        const next = clampS(scaleRef.current + 0.25);
        scaleRef.current = next;
        setScale(next);
      }
      if (e.key === "-") {
        const next = clampS(scaleRef.current - 0.25);
        scaleRef.current = next;
        if (next <= 1) { panRef.current = { x: 0, y: 0 }; setPanX(0); setPanY(0); }
        setScale(next);
      }
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Scroll wheel: cursor-centred zoom ─────────────────────────────── */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = contentRef.current;
    if (!el) return;
    const rect   = el.getBoundingClientRect();
    const cx     = e.clientX - rect.left;
    const cy     = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nextS  = clampS(scaleRef.current * factor);
    const ratio  = nextS / scaleRef.current;
    const nextPX = cx - (cx - panRef.current.x) * ratio;
    const nextPY = cy - (cy - panRef.current.y) * ratio;
    scaleRef.current   = nextS;
    panRef.current     = { x: nextPX, y: nextPY };
    setScale(nextS);
    setPanX(nextPX);
    setPanY(nextPY);
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [open, handleWheel]);

  /* ── Mouse drag — window-level so cursor leaving the div doesn't drop ─ */
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    setDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      panRef.current.x += dx;
      panRef.current.y += dy;
      setPanX(panRef.current.x);
      setPanY(panRef.current.y);
    };
    const onUp = () => { isDragging.current = false; setDragging(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [dragging]);

  /* ── Touch: single-finger drag + two-finger pinch ──────────────────── */
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastMouse.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      pinchDist0.current  = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchScale0.current = scaleRef.current;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panRef.current.x += dx;
      panRef.current.y += dy;
      setPanX(panRef.current.x);
      setPanY(panRef.current.y);
    } else if (e.touches.length === 2 && pinchDist0.current > 0) {
      const d    = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const next = clampS(pinchScale0.current * (d / pinchDist0.current));
      scaleRef.current = next;
      setScale(next);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    pinchDist0.current = 0;
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    el.addEventListener("touchmove",  handleTouchMove,  { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true  });
    el.addEventListener("touchend",   handleTouchEnd,   { passive: true  });
    return () => {
      el.removeEventListener("touchmove",  handleTouchMove);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend",   handleTouchEnd);
    };
  }, [open, handleTouchMove, handleTouchStart, handleTouchEnd]);

  return (
    <>
      {/* ── Card ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#111827] uppercase tracking-wide">{label}</span>
            {!loading && (
              <span className="text-[10px] text-stone-400 hidden sm:inline">· click to expand &amp; zoom</span>
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

        {/* Preview thumbnail — click opens lightbox */}
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
              {/* Expand hint badge */}
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
                    onClick={() => {
                      const next = clampS(scaleRef.current - 0.25);
                      scaleRef.current = next;
                      if (next <= 1) { panRef.current = { x: 0, y: 0 }; setPanX(0); setPanY(0); }
                      setScale(next);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition font-bold text-base leading-none"
                    aria-label="Zoom out"
                  >−</button>
                  <button
                    type="button"
                    onClick={resetView}
                    className="min-w-[40px] text-xs font-semibold text-stone-600 hover:text-stone-800 text-center select-none transition"
                    aria-label="Reset zoom"
                    title="Reset to 100%"
                  >
                    {Math.round(scale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = clampS(scaleRef.current + 0.25);
                      scaleRef.current = next;
                      setScale(next);
                    }}
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

            {/* Hint bar */}
            <div className="px-5 py-1 bg-stone-50/80 border-b border-stone-100 text-[10px] text-stone-400 shrink-0 select-none">
              Scroll to zoom · Drag to pan · Double-click to reset ·{" "}
              <kbd className="font-mono bg-stone-100 px-1 rounded">+</kbd>{" "}
              <kbd className="font-mono bg-stone-100 px-1 rounded">−</kbd> keys ·{" "}
              <kbd className="font-mono bg-stone-100 px-1 rounded">Esc</kbd> to close
            </div>

            {/* Zoomable content area */}
            <div
              ref={contentRef}
              className="overflow-hidden flex-1 relative select-none"
              style={{ cursor: dragging ? "grabbing" : scale > 1 ? "grab" : "default" }}
              onMouseDown={handleMouseDown}
              onDoubleClick={resetView}
            >
              <div
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transformOrigin: "0 0",
                  willChange: "transform",
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
