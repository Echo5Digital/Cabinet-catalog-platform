import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export const metadata = {
  title: "Collections — Cabinet & Remodeling Depot",
  description: "Browse our full range of cabinet collections",
};

async function getLines() {
  try {
    const admin = createAdminClient();
    const { data: lines } = await admin
      .from("catalog_lines")
      .select(`
        id, name, slug, description, published_at,
        lifestyle_images:assets!catalog_line_id(public_url, alt_text, parsed_sequence)
      `)
      .eq("tenant_id", TENANT_ID)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    return (lines || []).map((line) => {
      const sorted = (line.lifestyle_images || [])
        .filter((a) => a.public_url)
        .sort((a, b) => (a.parsed_sequence || 99) - (b.parsed_sequence || 99));
      return { ...line, images: sorted };
    });
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const lines = await getLines();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">Our Collections</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {lines.map((line, index) => {
            const hero = line.images[0];
            const isLarge = index === 0 && lines.length > 2;

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
                <div className={`p-6 ${isLarge ? "sm:flex sm:items-center sm:justify-between sm:gap-8" : ""}`}>
                  <div>
                    <h2
                      className="font-bold text-stone-900 text-xl sm:text-2xl mb-2"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {line.name}
                    </h2>
                    {line.description && (
                      <p className="text-stone-500 text-sm leading-relaxed max-w-lg">{line.description}</p>
                    )}
                  </div>
                  <div className={`${isLarge ? "shrink-0 sm:mt-0" : "mt-4"}`}>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 border border-stone-200 rounded-full px-4 py-2 group-hover:bg-stone-900 group-hover:text-white group-hover:border-stone-900 transition-all duration-200">
                      Browse products
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
