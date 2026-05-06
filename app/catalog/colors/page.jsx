import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";
import ColorGallery from "@/components/catalog/ColorGallery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Colors & Tiles — Cabinet Catalog",
};

async function getData() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();

    const [{ data: colors }, { data: assets }] = await Promise.all([
      admin
        .from("colors")
        .select("id, name, code, color_type, description")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("assets")
        .select("color_id, public_url, alt_text")
        .eq("tenant_id", tenantId)
        .eq("asset_type", "color_swatch")
        .eq("status", "confirmed")
        .not("color_id", "is", null),
    ]);

    // Map color_id → first confirmed image
    const imageMap = {};
    for (const a of assets || []) {
      if (!imageMap[a.color_id]) imageMap[a.color_id] = a;
    }

    const allColors = (colors || []).map((c) => ({
      ...c,
      image: imageMap[c.id] ?? null,
    }));

    const countertop = allColors.filter((c) => c.color_type === "countertop");
    const floor = allColors.filter((c) => c.color_type === "floor");

    return { countertop, floor };
  } catch {
    return { countertop: [], floor: [] };
  }
}

export default async function ColorsPage() {
  const { countertop, floor } = await getData();
  const total = countertop.length + floor.length;

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
            <span className="text-stone-200 font-medium">Colors &amp; Tiles</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3 anim-fade-in-up"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Colors &amp; Tiles
          </h1>
          <p className="text-stone-300/90 max-w-2xl leading-relaxed">
            Explore our countertop and floor tile color options to complement your cabinet selections.
          </p>
          {total > 0 && (
            <p className="text-stone-400/80 text-sm mt-3">
              {total} option{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14 bg-[#F8F6F3] min-h-[60vh]">
        {total === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 mb-4">No colors available yet.</p>
            <Link href="/catalog" className="text-sm text-stone-600 underline">
              Browse Collections
            </Link>
          </div>
        ) : (
          <ColorGallery countertop={countertop} floor={floor} />
        )}

        {total > 0 && (
          <div className="pt-10 border-t border-stone-100 text-center">
            <p className="text-stone-500 text-sm mb-5">
              Ready to build your quote? Browse our cabinet collections.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white btn-glow-amber"
            >
              Browse Collections →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
