"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function HomeHeader({ tenant, primaryColor, name }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-sm isolate">
      <div className="max-w-7xl mx-auto h-[76px] sm:h-[88px] px-5 sm:px-6 flex items-center justify-between gap-3">

        {/* Logo / Name */}
        <Link href="/" className="shrink-0 flex items-center">
          {tenant.logo_url ? (
            <Image
              src={tenant.logo_url}
              alt={name}
              width={264}
              height={66}
              className="h-[54px] sm:h-[66px] w-auto mix-blend-multiply"
            />
          ) : (
            <span className="text-stone-900 font-semibold text-base tracking-tight">{name}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/catalog"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition uppercase tracking-wide"
          >
            Catalog
          </Link>
          <Link
            href="/catalog/gallery"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition uppercase tracking-wide"
          >
            Gallery
          </Link>
          <a
            href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition uppercase tracking-wide"
          >
            Contact
          </a>
        </nav>

        {/* Right: AI Designer + Kitchen Planner + hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI Designer
              <svg className="w-3.5 h-3.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
              <Link href="/catalog/design" className="block px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition">
                Kitchen Designer
              </Link>
              <Link href="/catalog/bathroom-design" className="block px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition">
                Bathroom Designer
              </Link>
            </div>
          </div>
          <Link
            href="/planner"
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition hover:bg-stone-50 shadow-sm"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
            </svg>
            Kitchen Planner
          </Link>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full transition"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/40 bg-white/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-5 py-3 space-y-1">
            <Link
              href="/catalog"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full transition uppercase tracking-wide"
            >
              Catalog
            </Link>
            <Link
              href="/catalog/gallery"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full transition uppercase tracking-wide"
            >
              Gallery
            </Link>
            <a
              href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full transition uppercase tracking-wide"
            >
              Contact
            </a>
            <p className="px-4 pt-2 pb-1 text-xs text-stone-400 uppercase tracking-widest font-medium">AI Designer</p>
            <Link
              href="/catalog/design"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-full transition hover:opacity-90 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Kitchen Designer
            </Link>
            <Link
              href="/catalog/bathroom-design"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-full transition hover:opacity-90 shadow-sm mt-1"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Bathroom Designer
            </Link>
            <Link
              href="/planner"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border rounded-full transition hover:bg-stone-50 shadow-sm"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
              </svg>
              Kitchen Planner
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
