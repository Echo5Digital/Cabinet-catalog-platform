import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

async function getData() {
  try {
    const admin = createAdminClient();
    const [{ data: tenant }, { data: lines }] = await Promise.all([
      admin
        .from("tenants")
        .select("name, logo_url, primary_color, accent_color, contact_email, contact_phone")
        .eq("id", TENANT_ID)
        .single(),
      admin
        .from("catalog_lines")
        .select("id, name, slug, description")
        .eq("tenant_id", TENANT_ID)
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
      <header className="sticky top-0 z-30 border-b border-white/10" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo / Name */}
          <Link href="/" className="shrink-0 flex items-center">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={name} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-white font-semibold text-base tracking-tight">{name}</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <div className="relative group">
              <button className="flex items-center gap-1 px-4 py-1.5 rounded-full text-sm text-white/80 hover:text-white hover:bg-white/10 transition">
                Catalogs
                <svg className="w-3.5 h-3.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                {lines.map((line) => (
                  <Link
                    key={line.id}
                    href={`/catalog/${line.slug}`}
                    className="block px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition"
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

          {/* Request a Quote CTA */}
          <Link
            href="/catalog"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition shrink-0"
          >
            Request a Quote
          </Link>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[85vh] flex items-end overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {heroImage?.public_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage.public_url}
              alt={heroImage.alt_text || name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 14px)",
            }}
          />
        )}

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

      {/* ── FILTER BAR (below hero) ──────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-stone-400 font-medium mr-1 shrink-0">
              Filter:
            </span>
            {["Style", "Cabinet Type", "Width", "Height", "Finish"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-full border border-stone-200 text-stone-600 text-sm cursor-default select-none hover:border-stone-300 transition"
              >
                <span>{label}</span>
                <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            ))}
            <Link
              href="/catalog"
              className="ml-auto px-6 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition shrink-0"
            >
              Search
            </Link>
          </div>
        </div>
      </div>

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

      {/* ── CONTACT STRIP ───────────────────────────────────────────────── */}
      {(tenant.contact_email || tenant.contact_phone) && (
        <section
          className="border-t"
          style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.1)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-sm">Have questions? We&apos;re here to help.</p>
            <div className="flex flex-wrap gap-4 items-center">
              {tenant.contact_email && (
                <a
                  href={`mailto:${tenant.contact_email}`}
                  className="text-white text-sm font-medium hover:text-white/70 transition"
                >
                  {tenant.contact_email}
                </a>
              )}
              {tenant.contact_phone && (
                <a
                  href={`tel:${tenant.contact_phone}`}
                  className="text-white text-sm font-medium hover:text-white/70 transition"
                >
                  {tenant.contact_phone}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        className="border-t"
        style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <p className="text-white/25 text-xs">© {new Date().getFullYear()} {name}</p>
          <Link href="/admin" className="text-white/15 hover:text-white/40 text-xs transition">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
