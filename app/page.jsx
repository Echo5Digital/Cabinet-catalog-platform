import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();
    const [{ data: tenant }, { data: lines }] = await Promise.all([
      admin
        .from("tenants")
        .select("name, logo_url, primary_color, accent_color, contact_email, contact_phone")
        .eq("id", tenantId)
        .single(),
      admin
        .from("catalog_lines")
        .select("id, name, slug, description")
        .eq("tenant_id", tenantId)
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
    ]);

    const lineIds = (lines || []).map((l) => l.id);
    let lifestyleAssets = [];
    if (lineIds.length > 0) {
      const { data } = await admin
        .from("assets")
        .select("catalog_line_id, public_url, alt_text, parsed_sequence")
        .in("catalog_line_id", lineIds)
        .eq("asset_type", "lifestyle")
        .eq("status", "confirmed")
        .order("parsed_sequence", { ascending: true });
      lifestyleAssets = data || [];
    }

    const linesWithImages = (lines || []).map((line) => ({
      ...line,
      hero_image:
        lifestyleAssets
          .filter((a) => a.catalog_line_id === line.id && a.public_url)
          .sort((a, b) => (a.parsed_sequence || 99) - (b.parsed_sequence || 99))[0] || null,
    }));

    return { tenant: tenant || {}, lines: linesWithImages };
  } catch {
    return { tenant: {}, lines: [] };
  }
}

export default async function HomePage() {
  const { tenant, lines } = await getData();

  const name = tenant.name || "Cabinet & Remodeling Depot";
  const primaryColor = tenant.primary_color || "#1C1917";
  const accentColor = tenant.accent_color || "#3B82F6";
  const heroImage = lines[0]?.hero_image || null;

  // Pick distinct images for cards 1 and 3
  const card1Image = lines[0]?.hero_image || null;
  const card3Image = lines[1]?.hero_image || lines[0]?.hero_image || null;

  return (
    <div className="bg-[#FAFAF9]">

      {/* ── HEADER — pill navbar ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 sm:px-6 pt-4 pb-2">
        <div
          className="max-w-7xl mx-auto h-[76px] sm:h-[88px] px-5 sm:px-6 rounded-full flex items-center justify-between gap-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}e8 55%, ${primaryColor}f4 100%)`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          {/* Logo / Name */}
          <Link href="/" className="shrink-0 flex items-center">
            {tenant.logo_url ? (
              <div className="bg-white rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 shadow-md ring-1 ring-black/[0.07] flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tenant.logo_url} alt={name} className="h-12 sm:h-14 w-auto max-w-[150px] sm:max-w-[230px] object-contain" />
              </div>
            ) : (
              <span className="text-white font-semibold text-base tracking-tight">{name}</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/catalog"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition uppercase tracking-wide"
            >
              Catalog
            </Link>

            <Link
              href="/catalog"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition uppercase tracking-wide"
            >
              About Us
            </Link>

            <a
              href={tenant.contact_email ? `mailto:${tenant.contact_email}` : "#"}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition uppercase tracking-wide"
            >
              Contact
            </a>

            <Link
              href="/catalog/design"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-white/15 hover:bg-white/25 transition border border-white/30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Design AI
            </Link>
          </nav>

          {/* Request a Quote CTA */}
          <Link
            href="/catalog"
            className="px-4 sm:px-5 py-2 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition shrink-0 whitespace-nowrap"
          >
            <span className="sm:hidden">Quote</span>
            <span className="hidden sm:inline">Request a Quote</span>
          </Link>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-end overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Video background */}
        <video
          src="/Baner.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pb-16 sm:pb-24">
          <div className="max-w-2xl">
            <p className="text-white/50 text-xs uppercase tracking-[0.2em] font-medium mb-5">{name}</p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Create Your<br />Dream Kitchen.
            </h1>
            <p className="text-white/65 text-lg mb-8 leading-relaxed max-w-md">
              Explore our complete cabinet collections and request a personalized quote — no showroom visit required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition"
              >
                Browse Collections
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              {tenant.contact_email && (
                <a
                  href={`mailto:${tenant.contact_email}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white border border-white/30 hover:border-white/60 hover:bg-white/10 transition"
                >
                  Request Consultation
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── DESIGN AI PROMO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Powered by AI</span>
              </div>

              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] mb-5"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Design Your Kitchen<br />
                <span className="text-amber-400">in Minutes.</span>
              </h2>

              <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md">
                Describe your style, choose your colors, and our AI generates a photorealistic kitchen render — complete with matching products from our catalog.
              </p>

              <ul className="space-y-3 mb-10">
                {[
                  "Photorealistic DALL-E kitchen renders",
                  "Matched products from our live catalog",
                  "Instant sales summary & next steps",
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-white/70 text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href="/catalog/design"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition shadow-lg shadow-amber-500/25"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Try Design AI — It&apos;s Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Right — visual mockup */}
            <div className="relative hidden md:block">
              {/* Outer glow */}
              <div className="absolute -inset-4 bg-amber-500/10 rounded-3xl blur-2xl" />
              {/* Card */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-1">
                {/* Mock header bar */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="ml-3 text-white/30 text-xs font-mono">Design AI — Kitchen Concept</span>
                </div>
                {/* Mock render area */}
                <div className="aspect-video bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <p className="text-white/40 text-sm">AI-generated kitchen render</p>
                    <p className="text-white/20 text-xs mt-1">DALL·E 3 · 1792×1024</p>
                  </div>
                </div>
                {/* Mock product strip */}
                <div className="flex gap-2 p-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex-1 aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-white/20 text-[10px] font-mono">SKU</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── THREE FEATURE CARDS ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Discover</p>
          <h2
            className="text-2xl sm:text-3xl font-bold text-stone-900"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Everything You Need
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1 — Browse Collections */}
          <Link
            href="/catalog"
            className="group relative rounded-2xl overflow-hidden block aspect-[3/4] bg-stone-900"
          >
            {card1Image?.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card1Image.public_url}
                alt={card1Image.alt_text || "Browse Collections"}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: primaryColor }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-2">Explore</p>
              <h3
                className="text-white font-bold text-2xl mb-3 leading-tight"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Browse Collections
              </h3>
              <p className="text-white/65 text-sm mb-4 leading-relaxed">
                Explore our full range of cabinet lines, each crafted for a distinct style and space.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/30 text-white text-sm font-medium group-hover:bg-white/25 transition">
                View All Collections →
              </span>
            </div>
          </Link>

          {/* Card 2 — Finish Selections */}
          <Link
            href="/catalog/finishes"
            className="group relative rounded-2xl overflow-hidden block aspect-[3/4] bg-stone-900"
          >
            {/* Decorative 2×2 swatch grid as background */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div style={{ backgroundColor: "#F0EDE8" }} />
              <div style={{ backgroundColor: "#2C1A0E" }} />
              <div style={{ backgroundColor: "#C8A96E" }} />
              <div style={{ backgroundColor: "#1C1917" }} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-2">Materials</p>
              <h3
                className="text-white font-bold text-2xl mb-3 leading-tight"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Finish Selections
              </h3>
              <p className="text-white/65 text-sm mb-4 leading-relaxed">
                Browse our complete finish palette — from painted shaker to stained wood and beyond.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/30 text-white text-sm font-medium group-hover:bg-white/25 transition">
                Explore Finishes →
              </span>
            </div>
          </Link>

          {/* Card 3 — Design Gallery */}
          <Link
            href="/catalog/gallery"
            className="group relative rounded-2xl overflow-hidden block aspect-[3/4] bg-stone-900"
          >
            {card3Image?.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card3Image.public_url}
                alt={card3Image.alt_text || "Design Gallery"}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: primaryColor }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-2">Gallery</p>
              <h3
                className="text-white font-bold text-2xl mb-3 leading-tight"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Design Gallery
              </h3>
              <p className="text-white/65 text-sm mb-4 leading-relaxed">
                Get inspired by real kitchen installations and design ideas from our collections.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/30 text-white text-sm font-medium group-hover:bg-white/25 transition">
                View Gallery →
              </span>
            </div>
          </Link>

        </div>
      </section>

      {/* ── FEATURED COLLECTIONS ────────────────────────────────────────── */}
      {lines.length > 0 && (
        <section className="border-t border-stone-100 bg-stone-50/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex items-baseline justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Collections</p>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-stone-900"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Featured Collections
                </h2>
              </div>
              <Link href="/catalog" className="text-sm text-stone-500 hover:text-stone-800 transition hidden sm:block">
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
                    {line.hero_image?.public_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={line.hero_image.public_url}
                        alt={line.hero_image.alt_text || line.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span className="text-white/30 text-sm">{line.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                  </div>
                  <div className="p-5">
                    <h3
                      className="font-semibold text-stone-900 text-lg mb-1"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {line.name}
                    </h3>
                    {line.description && (
                      <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 mb-4">
                        {line.description}
                      </p>
                    )}
                    <Link
                      href={`/catalog/${line.slug}`}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium border border-current hover:opacity-80 transition"
                      style={{ color: accentColor }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="border-t border-stone-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Simple Process</p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-stone-900"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              From browse to quote in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: "01",
                title: "Browse & Select",
                desc: "Explore our collections, filter by category and size. Click any product to see finishes and specifications.",
              },
              {
                step: "02",
                title: "Build Your List",
                desc: "Add products to your quote as you browse. Adjust quantities and finishes at any time — your list is saved automatically.",
              },
              {
                step: "03",
                title: "Request a Quote",
                desc: "Submit your list with a brief project note. We'll respond with pricing within 1 business day.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span
                  className="text-2xl font-bold shrink-0 mt-0.5"
                  style={{ color: accentColor, fontFamily: "Georgia, serif" }}
                >
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold text-stone-800 mb-2">{item.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 transition"
              style={{ backgroundColor: primaryColor }}
            >
              Start Browsing
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
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
    </div>
  );
}
