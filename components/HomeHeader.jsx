"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomeHeader({ tenant, primaryColor, name }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-sm isolate">
      <div className="max-w-7xl mx-auto h-[76px] sm:h-[88px] px-5 sm:px-6 flex items-center justify-between gap-3">

        {/* Logo / Name */}
        <Link href="/" className="shrink-0 flex items-center">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={name}
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
            href="/catalog"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition uppercase tracking-wide"
          >
            About Us
          </Link>
          <a
            href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition uppercase tracking-wide"
          >
            Contact
          </a>
        </nav>

        {/* Right: Design AI + hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/catalog/design"
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Design AI
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
              href="/catalog"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full transition uppercase tracking-wide"
            >
              About Us
            </Link>
            <a
              href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-full transition uppercase tracking-wide"
            >
              Contact
            </a>
            <Link
              href="/catalog/design"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-full transition hover:opacity-90 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Design AI
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
