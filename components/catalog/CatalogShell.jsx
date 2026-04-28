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
      className="relative flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 text-stone-700 hover:border-stone-400 hover:text-stone-900 transition text-sm font-medium"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Quote
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-900 text-white text-xs rounded-full flex items-center justify-center font-semibold">
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
    <header
      className="sticky top-0 z-30 border-b"
      style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo / Name */}
        <Link href="/" className="flex items-center shrink-0">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={name} className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-white font-semibold text-base tracking-tight">{name}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Collections dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-4 py-1.5 rounded-full text-sm text-white/80 hover:text-white hover:bg-white/10 transition">
              Collections
              <svg className="w-3.5 h-3.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
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
                  href="/catalog"
                  className="block px-4 py-3 text-sm text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition"
                >
                  View all collections →
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/catalog/colors"
            className={`px-4 py-1.5 rounded-full text-sm hover:text-white hover:bg-white/10 transition ${
              pathname.startsWith("/catalog/colors") ? "text-white font-medium" : "text-white/80"
            }`}
          >
            Colors &amp; Tiles
          </Link>

          <Link
            href="/catalog/structures"
            className={`px-4 py-1.5 rounded-full text-sm hover:text-white hover:bg-white/10 transition ${
              pathname.startsWith("/catalog/structures") ? "text-white font-medium" : "text-white/80"
            }`}
          >
            Structures
          </Link>

          <Link
            href="/catalog/design"
            className={`px-4 py-1.5 rounded-full text-sm hover:text-white hover:bg-white/10 transition flex items-center gap-1.5 ${
              pathname.startsWith("/catalog/design") ? "text-white font-medium" : "text-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Design AI
          </Link>

          <Link
            href="/catalog"
            className="px-4 py-1.5 rounded-full text-sm text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            About Us
          </Link>

          <a
            href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
            className="px-4 py-1.5 rounded-full text-sm text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            Contact
          </a>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Request a Quote CTA */}
          <Link
            href="/catalog"
            className="hidden sm:inline-flex px-5 py-2 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition"
          >
            Request a Quote
          </Link>

          <QuoteButton />

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/20">
          <div className="px-4 py-3 space-y-1">
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium px-2 pb-1">Collections</p>
            {lines.map((line) => (
              <Link
                key={line.id}
                href={`/catalog/${line.slug}`}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                {line.name}
              </Link>
            ))}
            <Link
              href="/catalog"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-white/50 hover:text-white/80 transition"
            >
              All collections →
            </Link>
            <div className="border-t border-white/10 pt-2 mt-2">
              <p className="text-xs text-white/40 uppercase tracking-widest font-medium px-2 pb-1">More</p>
              <Link
                href="/catalog/colors"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                Colors &amp; Tiles
              </Link>
              <Link
                href="/catalog/structures"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                Structures
              </Link>
              <Link
                href="/catalog/design"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Design AI
              </Link>
            </div>
            <div className="pt-2 pb-1">
              <Link
                href="/catalog"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-semibold text-center bg-amber-500 hover:bg-amber-400 text-white rounded-full transition"
              >
                Request a Quote
              </Link>
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
      style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="sm:col-span-1">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={name} className="h-8 w-auto object-contain mb-3" />
            ) : (
              <p className="text-white font-semibold text-base mb-3">{name}</p>
            )}
            <p className="text-white/40 text-sm leading-relaxed">
              Quality cabinetry for every space.
            </p>
          </div>

          {/* Collections */}
          {lines.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-4">Collections</p>
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li key={line.id}>
                    <Link
                      href={`/catalog/${line.slug}`}
                      className="text-white/70 hover:text-white text-sm transition"
                    >
                      {line.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-4">Contact</p>
            <ul className="space-y-2">
              {tenant.contact_email && (
                <li>
                  <a href={`mailto:${tenant.contact_email}`} className="text-white/70 hover:text-white text-sm transition">
                    {tenant.contact_email}
                  </a>
                </li>
              )}
              {tenant.contact_phone && (
                <li>
                  <a href={`tel:${tenant.contact_phone}`} className="text-white/70 hover:text-white text-sm transition">
                    {tenant.contact_phone}
                  </a>
                </li>
              )}
              {tenant.website_url && (
                <li>
                  <a href={tenant.website_url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white text-sm transition">
                    {tenant.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} {name}
          </p>
          <Link href="/admin" className="text-white/20 hover:text-white/40 text-xs transition">
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
        <main className="flex-1">{children}</main>
        <Footer tenant={tenant} lines={lines} />
        <QuotePanel />
        <QuoteModal />
        <ChatWidget tenant={tenant} />
      </div>
    </QuoteProvider>
  );
}
