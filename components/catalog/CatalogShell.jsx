"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuoteProvider, useQuote } from "@/lib/context/quote";
import QuotePanel from "./QuotePanel";
import QuoteModal from "./QuoteModal";
import ChatWidget from "./ChatWidget";
import SiteFooter from "@/components/SiteFooter";

// ─── Quote badge button (reads from context) ──────────────────────────────────
function QuoteButton() {
  const { totalItems, setPanelOpen } = useQuote();
  return (
    <button
      onClick={() => setPanelOpen(true)}
      className="relative flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50 transition text-sm font-medium"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Quote
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </button>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({ tenant, lines }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const name = tenant.name || "Cabinet Catalog";
  const primaryColor = tenant.primary_color || "#1C1917";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-sm isolate">
      {/* Navbar */}
      <div className="max-w-7xl mx-auto h-[76px] sm:h-[88px] px-5 sm:px-6 flex items-center justify-between gap-3">
        {/* Logo / Name */}
        <Link href="/" className="flex items-center shrink-0">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={name} className="h-[54px] sm:h-[66px] w-auto mix-blend-multiply" />
          ) : (
            <span className="text-stone-900 font-semibold text-base tracking-tight">{name}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Collections dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition uppercase tracking-wide">
              Collections
              <svg className="w-3.5 h-3.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              {lines.map((line) => (
                <Link
                  key={line.id}
                  href={`/catalog/${line.slug}`}
                  className={`block px-4 py-3 text-sm hover:bg-stone-50 transition ${
                    pathname.startsWith(`/catalog/${line.slug}`)
                      ? "text-stone-900 font-medium"
                      : "text-stone-600"
                  }`}
                >
                  {line.name}
                </Link>
              ))}
              <div className="border-t border-stone-100">
                <Link
                  href="/catalog/colors"
                  className={`block px-4 py-3 text-sm hover:bg-stone-50 transition ${
                    pathname.startsWith("/catalog/colors") ? "text-stone-900 font-medium" : "text-stone-600"
                  }`}
                >
                  Colors &amp; Tiles
                </Link>
                <Link
                  href="/catalog/structures"
                  className={`block px-4 py-3 text-sm hover:bg-stone-50 transition ${
                    pathname.startsWith("/catalog/structures") ? "text-stone-900 font-medium" : "text-stone-600"
                  }`}
                >
                  Structures
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/catalog"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition uppercase tracking-wide"
          >
            About Us
          </Link>

          <a
            href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition uppercase tracking-wide"
          >
            Contact
          </a>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
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

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 transition"
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

      {/* Mobile menu — drops below fixed header */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/40 bg-white/90 backdrop-blur-xl shadow-md">
          <div className="max-w-7xl mx-auto px-5 py-3 space-y-1">
            <p className="text-xs text-stone-400 uppercase tracking-widest font-medium px-2 pb-1">Collections</p>
            {lines.map((line) => (
              <Link
                key={line.id}
                href={`/catalog/${line.slug}`}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition"
              >
                {line.name}
              </Link>
            ))}
            <Link
              href="/catalog/colors"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition"
            >
              Colors &amp; Tiles
            </Link>
            <Link
              href="/catalog/structures"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition"
            >
              Structures
            </Link>
            <div className="border-t border-stone-100 pt-2 mt-2 space-y-1">
              <Link
                href="/catalog/design"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-full transition hover:opacity-90 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Design AI
              </Link>
              <Link
                href="/catalog"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition uppercase tracking-wide"
              >
                About Us
              </Link>
              <a
                href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition uppercase tracking-wide"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Shell (wraps everything in QuoteProvider) ────────────────────────────────
export default function CatalogShell({ tenant, lines, children }) {
  return (
    <QuoteProvider>
      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
        <Header tenant={tenant} lines={lines} />
        <main className="flex-1 pt-[76px] sm:pt-[88px]">{children}</main>
        <SiteFooter tenant={tenant} lines={lines} />
        <QuotePanel />
        <QuoteModal />
        {/* <ChatWidget tenant={tenant} /> */}
      </div>
    </QuoteProvider>
  );
}
