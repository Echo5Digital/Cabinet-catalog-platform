import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";
import FinishGallery from "@/components/catalog/FinishGallery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finish Selections — Cabinet Catalog",
};

const FALLBACK_COLORS = [
  "#F0EDE8", "#2C1A0E", "#C8A96E", "#1C1917",
  "#E8E0D8", "#4A3728", "#8B6914", "#3D3835",
  "#F5F0EB", "#6B4C3B", "#D4A853", "#2A2520",
];

async function getData() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();
    const [{ data: finishes }, { data: lines }] = await Promise.all([
      admin
        .from("finishes")
        .select("id, name, code, description, finish_family, catalog_line_id, sort_order")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("catalog_lines")
        .select("id, name, slug")
        .eq("tenant_id", tenantId)
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

    const finishesWithSwatches = (finishes || []).map((f, idx) => ({
      ...f,
      swatch: swatchMap[f.id] || null,
      fallbackColor: FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    }));

    return { finishes: finishesWithSwatches, lines: lines || [] };
  } catch {
    return { finishes: [], lines: [] };
  }
}

export default async function FinishesPage() {
  const { finishes, lines } = await getData();

  // Build lineMap for the client component
  const lineMap = {};
  for (const l of lines) lineMap[l.id] = l;

  return (
    <div>
      {/* Page header */}
      <div className="page-header-warm border-b border-stone-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <nav className="text-xs text-stone-400 mb-4 flex items-center gap-1.5">
            <Link href="/catalog" className="hover:text-stone-200 transition font-medium">
              Collections
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-stone-200 font-medium">Finish Selections</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3 anim-fade-in-up"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Finish Selections
          </h1>
          <p className="text-stone-300/90 max-w-2xl leading-relaxed">
            Browse our complete finish palette. Click any finish to view it up close. Visit a collection
            page to see which finishes apply to specific products.
          </p>
        </div>
      </div>

      {/* Gallery (client component — handles lightbox) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 bg-[#F8F6F3] min-h-[60vh]">
        <FinishGallery finishes={finishes} lineMap={lineMap} />

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
                  className="px-5 py-2 rounded-full text-sm font-medium border border-stone-300 text-stone-700 hover:border-amber-400 hover:text-stone-900 hover:bg-amber-50 transition"
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
