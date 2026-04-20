import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

async function getData() {
  try {
    const admin = createAdminClient();
    const [{ data: tenant }, { data: lines }] = await Promise.all([
      admin.from("tenants").select("name, logo_url, primary_color, accent_color, contact_email, contact_phone").eq("id", TENANT_ID).single(),
      admin
        .from("catalog_lines")
        .select(`
          id, name, slug, description,
          lifestyle_images:assets!catalog_line_id(public_url, alt_text, parsed_sequence)
        `)
        .eq("tenant_id", TENANT_ID)
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
    ]);
    const linesWithImages = (lines || []).map((line) => ({
      ...line,
      hero_image: (line.lifestyle_images || [])
        .filter((a) => a.public_url)
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
  const heroLine = lines[0] || null;
  const heroImage = heroLine?.hero_image;

  return (
    <div className="bg-[#FAFAF9]">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/10" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-white font-semibold text-base">{name}</span>
          <Link
            href="/catalog"
            className="px-4 py-2 text-sm font-medium text-white border border-white/30 rounded-full hover:bg-white/10 transition"
          >
            Browse Collections →
          </Link>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden" style={{ backgroundColor: primaryColor }}>
        {heroImage?.public_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage.public_url}
              alt={heroImage.alt_text || name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 14px)" }}
          />
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pb-16 sm:pb-24">
          <div className="max-w-2xl">
            <p className="text-white/50 text-xs uppercase tracking-[0.2em] font-medium mb-5">{name}</p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Crafted for the<br />way you live.
            </h1>
            <p className="text-white/65 text-lg mb-8 leading-relaxed max-w-md">
              Browse our complete cabinet collections and request a personalized quote — no showroom visit required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: accentColor }}
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

      {/* ── COLLECTIONS GRID ───────────────────────────────────────────── */}
      {lines.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="flex items-baseline justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Our Collections</p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-stone-900"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Find your perfect style
              </h2>
            </div>
            <Link href="/catalog" className="text-sm text-stone-500 hover:text-stone-800 transition hidden sm:block">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lines.map((line) => (
              <Link
                key={line.id}
                href={`/catalog/${line.slug}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-lg transition-all duration-300"
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
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
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
                    <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 mb-3">{line.description}</p>
                  )}
                  <span className="text-sm font-medium" style={{ color: accentColor }}>
                    Explore collection →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
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
              { step: "01", title: "Browse & Select", desc: "Explore our collections, filter by category and size. Click any product to see finishes and specifications." },
              { step: "02", title: "Build Your List", desc: "Add products to your quote as you browse. Adjust quantities and finishes at any time — your list is saved automatically." },
              { step: "03", title: "Request a Quote", desc: "Submit your list with a brief project note. We'll respond with pricing within 1 business day." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="text-2xl font-bold shrink-0 mt-0.5" style={{ color: accentColor, fontFamily: "Georgia, serif" }}>
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

      {/* ── CONTACT STRIP ──────────────────────────────────────────────── */}
      {(tenant.contact_email || tenant.contact_phone) && (
        <section className="border-t" style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-sm">Have questions? We&apos;re here to help.</p>
            <div className="flex flex-wrap gap-4 items-center">
              {tenant.contact_email && (
                <a href={`mailto:${tenant.contact_email}`} className="text-white text-sm font-medium hover:text-white/70 transition">{tenant.contact_email}</a>
              )}
              {tenant.contact_phone && (
                <a href={`tel:${tenant.contact_phone}`} className="text-white text-sm font-medium hover:text-white/70 transition">{tenant.contact_phone}</a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <p className="text-white/25 text-xs">© {new Date().getFullYear()} {name}</p>
          <Link href="/admin" className="text-white/15 hover:text-white/40 text-xs transition">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
