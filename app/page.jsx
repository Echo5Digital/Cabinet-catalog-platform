import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import SiteFooter from "@/components/SiteFooter";
import HomeSlideshow from "@/components/HomeSlideshow";

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

    const slideshowImages = lifestyleAssets
      .filter((a) => a.public_url)
      .slice(0, 16)
      .map((a) => ({ url: a.public_url, alt: a.alt_text || "" }));

    return { tenant: tenant || {}, lines: linesWithImages, slideshowImages };
  } catch {
    return { tenant: {}, lines: [], slideshowImages: [] };
  }
}

function getLineSubtitle(name) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("american")) return "American Cabinets";
  if (lower.includes("euro")) return "Euro Base";
  return null;
}

export default async function HomePage() {
  const { tenant, lines, slideshowImages } = await getData();

  const name = tenant.name || "Cabinet & Remodeling Depot";
  const primaryColor = tenant.primary_color || "#1C1917";
  const accentColor = tenant.accent_color || "#3B82F6";

  const card1Image = lines[0]?.hero_image || null;
  const card3Image = lines[1]?.hero_image || lines[0]?.hero_image || null;

  return (
    <div className="bg-white overflow-x-hidden">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <HomeHeader tenant={tenant} primaryColor={primaryColor} name={name} />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-end overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
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
          <div className="max-w-2xl anim-fade-in-up">
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white btn-glow-stone shadow-sm"
                style={{ backgroundColor: primaryColor }}
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-stretch">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
                <svg className="w-3.5 h-3.5 text-amber-400 icon-float" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

              <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
                Describe your style, choose your colors, and start generating professional kitchen renders — complete with matching products from our catalog.
              </p>

              <ul className="space-y-3 mb-10">
                {[
                  "Personalized Design & Recommendations",
                  "Instant product matches for your design",
                  "Instant quote summary with AI pricing",
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
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white btn-glow-amber shadow-lg shadow-amber-500/25"
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

            {/* Right — Gallery slideshow */}
            <div className="relative mt-6 md:mt-0 flex flex-col">
              {/* Glow */}
              <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-10 bg-white/20" />
              <HomeSlideshow images={slideshowImages} />
            </div>

          </div>
        </div>
      </section>

      {/* ── THREE FEATURE CARDS ─────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-20 bg-white"
        style={{ borderTop: `1px solid ${primaryColor}28` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-10 anim-fade-in-up">
          <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Discover</p>
          <h2
            className="text-2xl sm:text-3xl font-bold text-stone-900"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Everything You Need
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          {/* Card 1 — Browse Collections */}
          <Link
            href="/catalog"
            className="group bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shimmer-card gradient-border-card anim-stagger-1"
          >
            <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative img-hover-burn">
              {card1Image?.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card1Image.public_url}
                  alt="Browse Collections"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: primaryColor }} />
              )}
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Explore</p>
              <h3
                className="text-stone-900 font-bold text-lg mb-2 leading-snug"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Browse Collections
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                Explore our wide range of cabinets crafted for style, quality, and function.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-stone-200 rounded-full px-4 py-1.5 text-stone-700 group-hover:border-stone-400 group-hover:text-stone-900 transition">
                View All Collections →
              </span>
            </div>
          </Link>

          {/* Card 2 — Finish Selections */}
          <Link
            href="/catalog/finishes"
            className="group bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shimmer-card gradient-border-card anim-stagger-2"
          >
            <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div style={{ backgroundColor: "#F0EDE8" }} />
                <div style={{ backgroundColor: "#2C1A0E" }} />
                <div style={{ backgroundColor: "#C8A96E" }} />
                <div style={{ backgroundColor: "#1C1917" }} />
              </div>
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Materials</p>
              <h3
                className="text-stone-900 font-bold text-lg mb-2 leading-snug"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Finish Selections
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                Browse our complete finish palette — from painted classics to natural wood.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-stone-200 rounded-full px-4 py-1.5 text-stone-700 group-hover:border-stone-400 group-hover:text-stone-900 transition">
                Explore Finishes →
              </span>
            </div>
          </Link>

          {/* Card 3 — Design Gallery */}
          <Link
            href="/catalog/gallery"
            className="group bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 shimmer-card gradient-border-card anim-stagger-3"
          >
            <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative img-hover-burn">
              {card3Image?.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card3Image.public_url}
                  alt="Design Gallery"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: primaryColor }} />
              )}
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Gallery</p>
              <h3
                className="text-stone-900 font-bold text-lg mb-2 leading-snug"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Design Gallery
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                Get inspired by real kitchen transformations and custom design ideas.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-stone-200 rounded-full px-4 py-1.5 text-stone-700 group-hover:border-stone-400 group-hover:text-stone-900 transition">
                View Gallery →
              </span>
            </div>
          </Link>

        </div>
        </div>
      </section>

      {/* ── FEATURED COLLECTIONS ────────────────────────────────────────── */}
      {lines.length > 0 && (
        <section
          className="border-t"
          style={{
            borderColor: `${primaryColor}22`,
            background: `linear-gradient(180deg, ${primaryColor}18 0%, ${primaryColor}08 40%, #F8F6F3 100%)`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex items-baseline justify-between mb-10 anim-fade-in-up">
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Collections</p>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-stone-900"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Featured Collections
                </h2>
              </div>
              <Link href="/catalog" className="text-sm text-stone-500 hover:text-stone-800 transition hidden sm:flex items-center gap-1">
                View all collections →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {lines.slice(0, 4).map((line, index) => {
                const subtitle = getLineSubtitle(line.name);
                return (
                  <Link
                    key={line.id}
                    href={`/catalog/${line.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shimmer-card"
                    style={{ animationName: 'fade-in-up-sm', animationDuration: '0.5s', animationFillMode: 'both', animationTimingFunction: 'ease', animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="aspect-[16/7] overflow-hidden bg-stone-100 relative img-hover-burn">
                      {line.hero_image?.public_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.hero_image.public_url}
                          alt={line.hero_image.alt_text || line.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span className="text-white/30 text-sm">{line.name}</span>
                        </div>
                      )}
                      {/* overlay handled by img-hover-burn */}
                    </div>
                    <div className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3
                          className="font-semibold text-stone-900 text-lg leading-snug"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                        >
                          {line.name}
                        </h3>
                        {subtitle && (
                          <p className="text-sm mt-0.5" style={{ color: primaryColor }}>
                            {subtitle}
                          </p>
                        )}
                      </div>
                      <span
                        className="shrink-0 inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium border hover:opacity-80 transition whitespace-nowrap"
                        style={{ color: primaryColor, borderColor: primaryColor }}
                      >
                        View Details →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <Link href="/catalog" className="text-sm text-stone-500 hover:text-stone-800 transition">
                View all collections →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section
        className="border-t"
        style={{
          borderColor: `${primaryColor}18`,
          backgroundColor: "#F8F6F3",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Fast &amp; Easy</p>
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
                desc: "Explore our collections. Filter by category and color. Click any product to see details and specifications.",
              },
              {
                step: "02",
                title: "Build Your List",
                desc: "Add products to your quote or to a collection. Adjust quantities as per your need. It's that simple.",
              },
              {
                step: "03",
                title: "Request a Quote",
                desc: "Submit your list and get a fast, transparent quote with pricing within 1 business day.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 shimmer-card rounded-2xl p-4 bg-white/60 border border-stone-200/70 hover:shadow-md hover:border-stone-300 transition-all duration-300">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5 icon-float"
                  style={{ backgroundColor: primaryColor, fontFamily: "Georgia, serif", animationDelay: item.step === "01" ? "0s" : item.step === "02" ? "0.4s" : "0.8s" }}
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white btn-glow-stone"
              style={{ backgroundColor: primaryColor }}
            >
              Start Your Quote
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <SiteFooter tenant={tenant} lines={lines} />
    </div>
  );
}
