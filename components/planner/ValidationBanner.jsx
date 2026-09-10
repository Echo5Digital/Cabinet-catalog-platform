"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";

/**
 * ValidationBanner — advisory design rule results display.
 *
 * Shows a compact pill in the toolbar with error/warning counts.
 * Clicking it expands a dropdown list of all current violations.
 * Rules are advisory only — nothing is blocked.
 */
export default function ValidationBanner() {
  const results = usePlannerStore((s) => s.validationResults);
  const [expanded, setExpanded] = useState(false);

  if (!results || results.length === 0) return null;

  const errors   = results.filter((r) => r.severity === "error");
  const warnings = results.filter((r) => r.severity === "warning");

  return (
    <div className="relative shrink-0">
      {/* Compact trigger pill */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={[
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition",
          errors.length > 0
            ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        ].join(" ")}
        aria-expanded={expanded}
        aria-label="Design rule alerts"
      >
        {/* Icon */}
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>

        {/* Counts */}
        <span className="hidden sm:inline">
          {errors.length > 0 && `${errors.length} error${errors.length > 1 ? "s" : ""}`}
          {errors.length > 0 && warnings.length > 0 && " · "}
          {warnings.length > 0 && `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`}
        </span>
        <span className="sm:hidden font-bold">{results.length}</span>

        {/* Chevron */}
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded dropdown */}
      {expanded && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setExpanded(false)}
            aria-hidden="true"
          />

          <div className="absolute bottom-full mb-2 left-0 z-20 w-72 sm:w-80 bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">Design Rule Alerts</span>
              <span className="text-[10px] text-stone-400">Advisory only — no actions blocked</span>
            </div>

            {/* Rule list */}
            <ul className="max-h-64 overflow-y-auto divide-y divide-stone-100">
              {results.map((rule) => (
                <li key={rule.id} className="flex gap-2.5 px-3 py-2.5">
                  {/* Severity dot */}
                  <span
                    className={[
                      "mt-0.5 w-2 h-2 rounded-full shrink-0",
                      rule.severity === "error" ? "bg-red-500" : "bg-amber-400",
                    ].join(" ")}
                  />
                  <span className="text-xs text-stone-700 leading-relaxed">{rule.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
