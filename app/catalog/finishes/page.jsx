import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finish Selections — Cabinet Catalog",
};

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

async function getData() {
  try {
    const admin = createAdminClient();
    const [{ data: finishes }, { data: lines }] = await Promise.all([
      admin
        .from("finishes")
        .select("id, name, code, description, finish_family, catalog_line_id, sort_order")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("catalog_lines")
        .select("id, name, slug")
        .eq("tenant_id", TENANT_ID)
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
    ]);

    const finishIds = (finishes || []).map((f) => f.id);
    let swatches = [];
    if (finishIds.length > 0) {
      const { data } = await admin
        .from("assets")
        .select("finish_id, public_url, alt_text")
        .in("finish_id", finishIds)
        .eq("asset_type", "finish_swatch")
        .eq("status", "confirmed");
      swatches = data || [];
    }

    // Map first swatch per finish
    const swatchMap = {};
    for (const s of swatches) {
      if (s.finish_id && !swatchMap[s.finish_id]) {
        swatchMap[s.finish_id] = s;
      }
    }

    const finishesWithSwatches = (finishes || []).map((f) => ({
      ...f,
      swatch: swatchMap[f.id] || null,
    }));

    return { finishes: finishesWithSwatches, lines: lines || [] };
  } catch {
    return { finishes: [], lines: [] };
  }
}

// Hardcoded fallback colors for finishes without swatch images
const FALLBACK_COLORS = [
  "#F0EDE8", "#2C1A0E", "#C8A96E", "#1C1917",
  "#E8E0D8", "#4A3728", "#8B6914", "#3D3835",
  "#F5F0EB", "#6B4C3B", "#D4A853", "#2A2520",
];

export default async function FinishesPage() {
  const { finishes, lines } = await getData();

  // Group by finish_family
  const familyGroups = {};
  for (const finish of finishes) {
    const family = finish.finish_family || "Other";
    if (!familyGroups[family]) familyGroups[family] = [];
    familyGroups[family].push(finish);
  }
  const families = Object.keys(familyGroups).sort();

  // Map line id → name for display
  const lineMap = {};
  for (const l of lines) lineMap[l.id] = l;

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-stone-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <nav className="text-xs text-stone-500 mb-4 flex items-center gap-1.5">
            <Link href="/catalog" className="hover:text-stone-800 transition font-medium">
              Collections
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-stone-700 font-medium">Finish Selections</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Finish Selections
          </h1>
          <p className="text-stone-500 max-w-2xl leading-relaxed">
            Browse our complete finish palette. Each finish is available across one or more of our cabinet
            collections — visit a collection page to see which finishes apply to specific products.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

        {finishes.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 mb-4">No finishes have been published yet.</p>
            <Link href="/catalog" className="text-sm text-stone-600 underline">
              Browse Collections
            </Link>
          </div>
        ) : families.length > 1 ? (
          // Grouped by family
          <div className="space-y-14">
            {families.map((family) => (
              <div key={family}>
                <h2
                  className="text-xl font-bold text-stone-900 mb-6 capitalize"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {family}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {familyGroups[family].map((finish, idx) => (
                    <FinishCard
                      key={finish.id}
                      finish={finish}
                      line={finish.catalog_line_id ? lineMap[finish.catalog_line_id] : null}
                      fallbackColor={FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No grouping — single flat grid
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {finishes.map((finish, idx) => (
              <FinishCard
                key={finish.id}
                finish={finish}
                line={finish.catalog_line_id ? lineMap[finish.catalog_line_id] : null}
                fallbackColor={FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
              />
            ))}
          </div>
        )}

        {/* Link back to collections */}
        {lines.length > 0 && (
          <div className="mt-16 pt-10 border-t border-stone-100">
            <p className="text-stone-500 text-sm mb-5">
              Ready to explore products in a specific finish? Browse by collection:
            </p>
            <div className="flex flex-wrap gap-3">
              {lines.map((line) => (
                <Link
                  key={line.id}
                  href={`/catalog/${line.slug}`}
                  className="px-5 py-2 rounded-full text-sm font-medium border border-stone-300 text-stone-700 hover:border-stone-500 hover:text-stone-900 transition"
                >
                  {line.name} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FinishCard({ finish, line, fallbackColor }) {
  return (
    <div className="group rounded-xl overflow-hidden border border-stone-200 bg-white hover:shadow-md hover:border-stone-300 transition-all duration-200">
      {/* Swatch */}
      <div className="aspect-square overflow-hidden">
        {finish.swatch?.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={finish.swatch.public_url}
            alt={finish.swatch.alt_text || finish.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
            style={{ backgroundColor: fallbackColor }}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-stone-800 text-sm leading-snug">{finish.name}</p>
        {finish.description && (
          <p className="text-stone-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">{finish.description}</p>
        )}
        {line && (
          <p className="text-stone-400 text-[10px] mt-1 uppercase tracking-wide font-medium">{line.name}</p>
        )}
      </div>
    </div>
  );
}
