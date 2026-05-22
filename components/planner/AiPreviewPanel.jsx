"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";

export default function AiPreviewPanel({ onRegenerate, onClose }) {
  const aiLoading  = usePlannerStore((s) => s.aiLoading);
  const aiImageUrl = usePlannerStore((s) => s.aiImageUrl);
  const aiError    = usePlannerStore((s) => s.aiError);
  const aiPrompt   = usePlannerStore((s) => s.aiPrompt);

  const [showPrompt, setShowPrompt] = useState(false);
  const [imgLoaded,  setImgLoaded]  = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
    <div className="fixed top-[64px] sm:top-[76px] right-0 bottom-0 z-50 md:relative md:top-auto md:right-auto md:bottom-auto md:z-auto w-[min(320px,92vw)] md:w-80 xl:w-96 shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-stone-900 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-stone-900">AI Visualization</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 transition text-stone-400 hover:text-stone-600"
          aria-label="Close AI panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Loading state */}
        {aiLoading && (
          <div className="space-y-3">
            <div className="w-full aspect-video rounded-xl bg-stone-100 animate-pulse flex flex-col items-center justify-center gap-3">
              <svg className="w-8 h-8 text-stone-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-stone-400 font-medium">Generating your kitchen...</p>
            </div>
            <div className="h-3 bg-stone-100 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-stone-100 rounded animate-pulse w-1/2" />
          </div>
        )}

        {/* Error state */}
        {!aiLoading && aiError && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center space-y-2">
            <svg className="w-8 h-8 text-red-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-600 font-medium">Generation failed</p>
            <p className="text-xs text-red-400">{aiError}</p>
            <button
              onClick={onRegenerate}
              className="mt-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success state */}
        {!aiLoading && !aiError && aiImageUrl && (
          <>
            {/* Image */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aiImageUrl}
                alt="AI-generated kitchen visualization"
                className={[
                  "w-full h-full object-cover transition-opacity duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onLoad={() => setImgLoaded(true)}
              />
            </div>

            {/* Prompt toggle */}
            {aiPrompt && (
              <div>
                <button
                  onClick={() => setShowPrompt((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${showPrompt ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {showPrompt ? "Hide prompt" : "View AI prompt"}
                </button>
                {showPrompt && (
                  <div className="mt-2 p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <p className="text-[10px] text-stone-500 leading-relaxed font-mono">{aiPrompt}</p>
                  </div>
                )}
              </div>
            )}

            {/* Download link */}
            {!aiImageUrl.startsWith("data:") && (
              <a
                href={aiImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Open full size
              </a>
            )}
          </>
        )}

        {/* Empty state (panel open but no image yet) */}
        {!aiLoading && !aiError && !aiImageUrl && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-stone-400">
            <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-xs text-center text-stone-400">Your kitchen visualization will appear here.</p>
          </div>
        )}
      </div>

      {/* Footer: Regenerate */}
      {!aiLoading && (aiImageUrl || aiError) && (
        <div className="px-4 py-3 border-t border-stone-100">
          <button
            onClick={onRegenerate}
            disabled={aiLoading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
        </div>
      )}
    </div>
    </>
  );
}
