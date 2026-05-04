"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuoteProvider, useQuote } from "@/lib/context/quote";
import QuotePanel from "./QuotePanel";
import QuoteModal from "./QuoteModal";
import ChatWidget from "./ChatWidget";

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
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-stone-200 shadow-sm">
      {/* Navbar */}
      <div className="max-w-7xl mx-auto h-[76px] sm:h-[88px] px-5 sm:px-6 flex items-center justify-between gap-4">
        {/* Logo / Name */}
        <Link href="/" className="flex items-center shrink-0">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={name} className="h-12 sm:h-14 w-auto max-w-[150px] sm:max-w-[230px] object-contain" />
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
            href="/catalog/design"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Design AI
          </Link>

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
          <QuoteButton />

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
        <div className="md:hidden border-t border-stone-100 bg-white shadow-md">
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

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ tenant, lines }) {
  const name = tenant.name || "Cabinet Catalog";
  const primaryColor = tenant.primary_color || "#1C1917";

  return (
    <footer
      className="border-t"
      style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={name} className="h-24 sm:h-32 w-auto max-w-[220px] sm:max-w-[300px] object-contain mb-5 brightness-0 invert" />
            ) : (
              <p
                className="text-white font-bold text-lg mb-4"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {name}
              </p>
            )}
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              Quality cabinetry crafted for every space — from kitchens to bathrooms and beyond.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors duration-150 border-b border-white/20 hover:border-white/50 pb-0.5"
            >
              Browse Collections
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">Navigate</p>
            <ul className="space-y-3">
              {[
                { href: "/", label: "Home" },
                { href: "/catalog", label: "All Collections" },
                { href: "/catalog/design", label: "Design with AI" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-white/55 hover:text-white text-sm transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections */}
          {lines.length > 0 && (
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">Collections</p>
              <ul className="space-y-3">
                {lines.slice(0, 6).map((line) => (
                  <li key={line.id}>
                    <Link
                      href={`/catalog/${line.slug}`}
                      className="text-white/55 hover:text-white text-sm transition-colors duration-150"
                    >
                      {line.name}
                    </Link>
                  </li>
                ))}
                {lines.length > 6 && (
                  <li>
                    <Link href="/catalog" className="text-white/30 hover:text-white/55 text-xs transition-colors duration-150">
                      + {lines.length - 6} more
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">Get in Touch</p>
            <ul className="space-y-4">
              {tenant.contact_email && (
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-white/25 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <a href={`mailto:${tenant.contact_email}`} className="text-white/55 hover:text-white text-sm transition-colors duration-150 break-all">
                    {tenant.contact_email}
                  </a>
                </li>
              )}
              {tenant.contact_phone && (
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-white/25 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <a href={`tel:${tenant.contact_phone}`} className="text-white/55 hover:text-white text-sm transition-colors duration-150">
                    {tenant.contact_phone}
                  </a>
                </li>
              )}
              {tenant.website_url && (
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-white/25 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <a href={tenant.website_url} target="_blank" rel="noopener noreferrer" className="text-white/55 hover:text-white text-sm transition-colors duration-150">
                    {tenant.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <Link href="/admin" className="text-white/15 hover:text-white/35 text-xs transition-colors duration-150">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Shell (wraps everything in QuoteProvider) ────────────────────────────────
export default function CatalogShell({ tenant, lines, children }) {
  return (
    <QuoteProvider>
      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
        <Header tenant={tenant} lines={lines} />
        <main className="flex-1 pt-[76px] sm:pt-[88px]">{children}</main>
        <Footer tenant={tenant} lines={lines} />
        <QuotePanel />
        <QuoteModal />
        <ChatWidget tenant={tenant} />
      </div>
    </QuoteProvider>
  );
}
