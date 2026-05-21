"use client";

import Link from "next/link";

/**
 * Standalone header for the /planner route.
 * Matches the existing HomeHeader/CatalogShell header styling exactly.
 * Does NOT depend on QuoteContext or any existing catalog state.
 */
export default function PlannerHeader({ tenant = {} }) {
  const name         = tenant.name || "Cabinet Catalog";
  const primaryColor = tenant.primary_color || "#1C1917";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-sm isolate">
      <div className="max-w-7xl mx-auto h-[64px] sm:h-[76px] px-5 sm:px-6 flex items-center justify-between gap-3">

        {/* Logo / Name */}
        <Link href="/" className="shrink-0 flex items-center">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={name}
              className="h-[44px] sm:h-[54px] w-auto mix-blend-multiply"
            />
          ) : (
            <span className="text-stone-900 font-semibold text-base tracking-tight">{name}</span>
          )}
        </Link>

        {/* Center badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
            </svg>
            Kitchen Planner
          </span>
        </div>

        {/* Right: back link */}
        <Link
          href="/catalog"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to Catalog</span>
          <span className="sm:hidden">Catalog</span>
        </Link>
      </div>
    </header>
  );
}
