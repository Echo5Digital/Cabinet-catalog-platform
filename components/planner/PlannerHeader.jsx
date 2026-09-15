"use client";

import Link from "next/link";
import Image from "next/image";
import usePlannerStore from "@/store/plannerStore";

const STEPS = [
  { num: 1, label: "Layout" },
  { num: 2, label: "Dimensions" },
  { num: 3, label: "Design" },
];

/**
 * PlannerHeader — fixed top bar for the /planner route.
 *
 * Upgrade: adds a step progress indicator (pills) in the center,
 * modern frosted glass look, and a cleaner brand area.
 */
export default function PlannerHeader({ tenant = {} }) {
  const name         = tenant.name || "Cabinet Catalog";
  const primaryColor = tenant.primary_color || "#1C1917";
  const step         = usePlannerStore((s) => s.step);
  const setStep      = usePlannerStore((s) => s.setStep);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 shadow-[0_1px_8px_rgba(0,0,0,0.06)] isolate">
      <div className="h-[60px] sm:h-[68px] px-4 sm:px-6 flex items-center justify-between gap-3 max-w-screen-2xl mx-auto">

        {/* ── Left: Logo / Name ─────────────────────────────────────────── */}
        <Link href="/" className="shrink-0 flex items-center gap-2.5 group">
          {tenant.logo_url ? (
            <Image
              src={tenant.logo_url}
              alt={name}
              width={176}
              height={44}
              className="h-[38px] sm:h-[44px] w-auto mix-blend-multiply"
            />
          ) : (
            <>
              {/* Icon mark */}
              <span
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span className="text-stone-900 font-semibold text-sm tracking-tight leading-none hidden sm:block">
                {name}
                <span className="block text-[10px] font-normal text-stone-400 tracking-wide mt-0.5">Kitchen Planner</span>
              </span>
            </>
          )}
        </Link>

        {/* ── Center: Step progress indicator ───────────────────────────── */}
        <nav className="flex items-center gap-1 sm:gap-0" aria-label="Planner steps">
          {STEPS.map((s, idx) => {
            const isDone    = step > s.num;
            const isActive  = step === s.num;
            const isEnabled = s.num < step; // can click back to completed steps

            return (
              <div key={s.num} className="flex items-center">
                {/* Step pill */}
                <button
                  onClick={() => isEnabled && setStep(s.num)}
                  disabled={!isEnabled && !isActive}
                  title={isDone ? `Back to ${s.label}` : s.label}
                  className={[
                    "group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0",
                    isActive
                      ? "text-white shadow-sm"
                      : isDone
                        ? "text-stone-600 hover:bg-stone-100 hover:text-stone-900 cursor-pointer"
                        : "text-stone-400 cursor-default",
                  ].join(" ")}
                  style={isActive ? { backgroundColor: primaryColor } : {}}
                  aria-current={isActive ? "step" : undefined}
                >
                  {/* Step number / check mark */}
                  <span
                    className={[
                      "flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 transition-colors",
                      isActive  ? "bg-white/25 text-white"
                        : isDone  ? "bg-emerald-100 text-emerald-700 group-hover:bg-stone-200 group-hover:text-stone-600"
                        : "bg-stone-200 text-stone-400",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <>
                        {/* Default: green check. On hover: back arrow */}
                        <svg className="w-2.5 h-2.5 group-hover:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <svg className="w-2.5 h-2.5 hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                        </svg>
                      </>
                    ) : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={[
                      "w-5 sm:w-7 h-px mx-0.5 shrink-0 transition-colors duration-300",
                      step > s.num ? "bg-emerald-300" : "bg-stone-200",
                    ].join(" ")}
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Right: back link ────────────────────────────────────────────── */}
        <Link
          href="/catalog"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100/80 border border-transparent hover:border-stone-200 transition-all duration-150 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Catalog</span>
        </Link>
      </div>
    </header>
  );
}
