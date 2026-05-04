import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Collections — Cabinet & Remodeling Depot",
  description: "Browse our full range of cabinet collections",
};

async function getLines() {
  const tenantId = await resolveTenantId();
  const admin = createAdminClient();

  const { data: lines, error } = await admin
    .from("catalog_lines")
    .select("id, name, slug, description, published_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[catalog/page] lines query error:", error.message);
    return [];
  }

  const lineIds = (lines || []).map((l) => l.id);
  if (lineIds.length === 0) return [];

  const { data: lifestyleAssets } = await admin
    .from("assets")
    .select("catalog_line_id, public_url, alt_text, parsed_sequence")
    .in("catalog_line_id", lineIds)
    .eq("asset_type", "lifestyle")
    .eq("status", "confirmed")
    .order("parsed_sequence", { ascending: true });

  const lifestyleByLine = {};
  for (const a of lifestyleAssets ?? []) {
    if (!lifestyleByLine[a.catalog_line_id]) lifestyleByLine[a.catalog_line_id] = [];
    lifestyleByLine[a.catalog_line_id].push({ public_url: a.public_url, alt_text: a.alt_text });
  }

  return (lines || []).map((line) => ({ ...line, images: lifestyleByLine[line.id] ?? [] }));
}

async function getPrimaryColor() {
  try {
    const tenantId = await resolveTenantId();
    const { data } = await createAdminClient()
      .from("tenants")
      .select("primary_color")
      .eq("id", tenantId)
      .single();
    return data?.primary_color || "#1C1917";
  } catch {
    return "#1C1917";
  }
}

const FEATURES = [
  {
    title: "Premium Quality",
    desc: "Built with durable materials for long-lasting beauty",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Custom Solutions",
    desc: "Tailored to your space, your style, your needs",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: "Expert Support",
    desc: "Our team is here to help every step of the way",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    title: "Fast & Reliable",
    desc: "On-time delivery and professional service",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
];

export default async function CatalogPage() {
  const [lines, primaryColor] = await Promise.all([getLines(), getPrimaryColor()]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

      {/* Header */}
      <div className="mb-12">
        <p
          className="text-xs uppercase tracking-widest font-semibold mb-2"
          style={{ color: primaryColor }}
        >
          Our Collections
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold text-stone-900"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Cabinet Collections
        </h1>
        <p className="text-stone-500 mt-3 max-w-xl leading-relaxed">
          Each collection is a curated family of cabinets designed to work together — choose the style that fits your project.
        </p>
      </div>

      {lines.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-stone-400">No collections available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {lines.map((line, index) => {
            const hero = line.images[0];
            const isLarge = index === 0 && lines.length > 2;

            // Derive display labels from line name
            const lower = line.name.toLowerCase();
            const badge = lower.includes("american")
              ? { icon: "🇺🇸", text: "AMERICAN MADE" }
              : lower.includes("euro")
              ? { icon: "🌐", text: "EUROPEAN DESIGN" }
              : null;
            const subtitle = lower.includes("american")
              ? "American Cabinets"
              : lower.includes("euro")
              ? "Euro Base"
              : null;

            return (
              <Link
                key={line.id}
                href={`/catalog/${line.slug}`}
                className={`group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-xl transition-all duration-300 ${
                  isLarge ? "sm:col-span-2" : ""
                }`}
              >
                {/* Image */}
                <div className={`overflow-hidden bg-stone-100 relative ${isLarge ? "aspect-[21/9]" : "aspect-[4/3]"}`}>
                  {hero?.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hero.public_url}
                      alt={hero.alt_text || line.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-200 flex items-center justify-center">
                      <span className="text-stone-400 text-sm">{line.name}</span>
                    </div>
                  )}

                  {/* Badge */}
                  {badge && (
                    <div
                      className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>{badge.icon}</span>
                      {badge.text}
                    </div>
                  )}

                  {/* 3-image strip overlay for large card */}
                  {isLarge && line.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 flex gap-1.5">
                      {line.images.slice(1, 3).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img.public_url}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow"
                        />
                      ))}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />
                </div>

                {/* Info */}
                <div className={`p-6 ${isLarge ? "sm:flex sm:items-start sm:justify-between sm:gap-8" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Collection icon */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h18M3 7.5V6a1 1 0 011-1h16a1 1 0 011 1v1.5M3 7.5v9A1.5 1.5 0 004.5 18h15a1.5 1.5 0 001.5-1.5v-9M9 11.25h6M9 14.25h4" />
                        </svg>
                      </div>
                      <div>
                        <h2
                          className="font-bold text-stone-900 text-xl sm:text-2xl leading-snug"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                        >
                          {line.name}
                        </h2>
                        {subtitle && (
                          <p className="text-sm font-medium mt-0.5" style={{ color: primaryColor }}>
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {line.description && (
                      <p className="text-stone-500 text-sm leading-relaxed max-w-lg">{line.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center ${isLarge ? "shrink-0 sm:flex-col sm:items-end sm:justify-center sm:mt-0" : "mt-5"}`}>
                    <span className="text-sm font-medium text-stone-400 group-hover:text-stone-700 transition flex items-center gap-1 whitespace-nowrap">
                      View details
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Features strip */}
      <div className="mt-16 sm:mt-20 pt-10 sm:pt-12 border-t border-stone-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-start gap-3 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
