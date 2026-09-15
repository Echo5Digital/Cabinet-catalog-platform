"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

/**
 * BeforeAfterLightbox — fullscreen modal with Before / Side By Side / After
 * tabs and a draggable divider handle in Side By Side mode. Shared by the
 * kitchen and bathroom AI design result boards; only rendered when both an
 * original (customer-uploaded) photo and an AI-generated result exist.
 */
export default function BeforeAfterLightbox({
  open,
  onClose,
  beforeUrl,
  afterUrl,
  title = "Design",
  initialTab = "sideBySide",
}) {
  const [tab, setTab] = useState(initialTab);
  const [dividerPct, setDividerPct] = useState(50); // 0–100, % from left
  const draggingRef = useRef(false);
  const containerRef = useRef(null);

  // Reset to the requested starting tab/divider position each time the
  // modal is (re)opened, so it doesn't reopen mid-drag from a prior view.
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setDividerPct(50);
    }
  }, [open, initialTab]);

  const setDividerFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setDividerPct(Math.min(100, Math.max(0, pct)));
  }, []);

  // Mouse drag — window-level listeners while dragging (mirrors the pan
  // drag pattern already used by the AI-render zoom lightbox elsewhere in
  // this codebase, so the interaction feel is consistent across both).
  useEffect(() => {
    if (tab !== "sideBySide") return;
    function onMove(e) {
      if (!draggingRef.current) return;
      setDividerFromClientX(e.clientX);
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [tab, setDividerFromClientX]);

  // Touch drag — non-passive so the page doesn't scroll while dragging the handle.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || tab !== "sideBySide") return;
    function onTouchMove(e) {
      if (!draggingRef.current) return;
      e.preventDefault();
      setDividerFromClientX(e.touches[0].clientX);
    }
    function onTouchEnd() {
      draggingRef.current = false;
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [tab, setDividerFromClientX]);

  async function handleShare() {
    const shareUrl = tab === "before" ? beforeUrl : afterUrl;
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // User cancelled the share sheet, or clipboard/share API unavailable — no-op.
    }
  }

  if (!open) return null;

  const TABS = [
    { id: "before", label: "Before" },
    { id: "sideBySide", label: "Side By Side" },
    { id: "after", label: "After" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} before and after comparison`}
    >
      {/* Top bar — close, tabs, share. Wraps sanely on narrow screens. */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          aria-label="Close"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 overflow-x-auto max-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                tab === t.id
                  ? "bg-white text-stone-900"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          aria-label="Share"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342a4 4 0 100-2.684m0 2.684a4 4 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a4 4 0 105.367-1.316 4 4 0 00-5.367 1.316zm0 9.316a4 4 0 105.367 1.316 4 4 0 00-5.367-1.316z" />
          </svg>
        </button>
      </div>

      {/* Stage */}
      <div className="flex-1 min-h-0 px-3 sm:px-6 pb-4 sm:pb-8">
        <div className="relative w-full h-full max-w-6xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden bg-stone-900">
          {tab === "before" && beforeUrl && (
            <>
              <Image src={beforeUrl} alt={`${title} — before`} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
                BEFORE
              </span>
            </>
          )}

          {tab === "after" && afterUrl && (
            <>
              <Image src={afterUrl} alt={`${title} — after`} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
                AFTER
              </span>
            </>
          )}

          {tab === "sideBySide" && beforeUrl && afterUrl && (
            <div
              ref={containerRef}
              className="absolute inset-0 select-none"
              style={{ touchAction: "none" }}
            >
              {/* Before — full frame, base layer */}
              <div className="absolute inset-0">
                <Image src={beforeUrl} alt={`${title} — before`} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
                  BEFORE
                </span>
              </div>

              {/* After — clipped to the divider position */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${dividerPct}%)` }}
              >
                <Image src={afterUrl} alt={`${title} — after`} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" />
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-stone-900/70 text-white text-[10px] font-semibold backdrop-blur-sm">
                  AFTER
                </span>
              </div>

              {/* Divider line + draggable handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
                style={{ left: `${dividerPct}%` }}
              />
              <div
                role="slider"
                aria-label="Comparison divider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(dividerPct)}
                tabIndex={0}
                onMouseDown={() => { draggingRef.current = true; }}
                onTouchStart={() => { draggingRef.current = true; }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft")  setDividerPct((p) => Math.max(0, p - 2));
                  if (e.key === "ArrowRight") setDividerPct((p) => Math.min(100, p + 2));
                }}
                className="absolute top-1/2 w-9 h-9 sm:w-10 sm:h-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg flex items-center justify-center cursor-ew-resize touch-none"
                style={{ left: `${dividerPct}%` }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 4 4 4m8-12l4 4-4 4" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
