"use client";
import { useState, useCallback, useRef, useEffect } from "react";

export default function ZoomPanel({ children, label, onRegenerate, loading }) {
  const [scale, setScale] = useState(1.0);
  const scrollRef  = useRef(null);
  const fittedRef  = useRef(false);
  const clamp = (v) => Math.min(3.0, Math.max(0.5, v));

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((s) => clamp(s - e.deltaY * 0.001));
  }, []);

  // Reset fit flag when a regeneration starts so we re-fit when new content arrives
  useEffect(() => {
    if (loading) {
      fittedRef.current = false;
      setScale(1.0);
    }
  }, [loading]);

  // Auto-fit: after content renders, shrink scale so SVG fits the panel width on small screens
  useEffect(() => {
    if (loading || fittedRef.current || !scrollRef.current) return;
    const id = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const cW    = scrollRef.current.clientWidth;
      const inner = scrollRef.current.firstElementChild;
      if (!inner || cW <= 0) return;
      const iW = inner.scrollWidth;
      if (iW > cW) {
        setScale(Math.max(0.5, parseFloat((cW / iW).toFixed(3))));
      }
      fittedRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [loading, children]);

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50 shrink-0">
        <span className="text-[10px] font-semibold text-[#3D0810] uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-0 bg-white border border-stone-200 rounded-full overflow-hidden shadow-sm">
            <button
              onClick={() => setScale((s) => clamp(s - 0.25))}
              disabled={scale <= 0.5}
              className="px-3 py-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30 transition text-sm font-medium min-h-[36px]"
              title="Zoom out"
            >
              −
            </button>
            <span className="px-2 text-xs text-stone-400 tabular-nums select-none min-w-[40px] text-center border-x border-stone-100">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => clamp(s + 0.25))}
              disabled={scale >= 3.0}
              className="px-3 py-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30 transition text-sm font-medium min-h-[36px]"
              title="Zoom in"
            >
              +
            </button>
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
      </div>

      {/* Scrollable zoom area */}
      <div
        ref={scrollRef}
        className="overflow-auto flex-1 min-h-0"
        style={{ minHeight: 260 }}
        onWheel={handleWheel}
      >
        {loading ? (
          <div className="w-full h-64 bg-stone-100 animate-pulse" />
        ) : (
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              transition: "transform 0.15s ease",
              display: "inline-block",
              minWidth: "100%",
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
