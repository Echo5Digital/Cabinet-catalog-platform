import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";

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
      <div className="border-b border-stone-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <nav className="text-xs text-stone-500 mb-4 flex items-center gap-1.5">
            <Link href="/catalog" className="hover:text-stone-800 transition font-medium">
              Collections
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-stone-700 font-medium">Colors &amp; Tiles</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Colors &amp; Tiles
          </h1>
          <p className="text-stone-500 max-w-2xl leading-relaxed">
            Explore our countertop and floor tile color options to complement your cabinet selections.
          </p>
          {total > 0 && (
            <p className="text-stone-400 text-sm mt-3">
              {total} option{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        {total === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 mb-4">No colors available yet.</p>
            <Link href="/catalog" className="text-sm text-stone-600 underline">
              Browse Collections
            </Link>
          </div>
        ) : (
          <>
            {countertop.length > 0 && (
              <ColorSection title="Countertop" items={countertop} />
            )}
            {floor.length > 0 && (
              <ColorSection title="Floor" items={floor} />
            )}
          </>
        )}

        {total > 0 && (
          <div className="pt-10 border-t border-stone-100 text-center">
            <p className="text-stone-500 text-sm mb-5">
              Ready to build your quote? Browse our cabinet collections.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition"
            >
              Browse Collections →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorSection({ title, items }) {
  return (
    <div>
      <h2
        className="text-xl font-bold text-stone-900 mb-6"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((color) => (
          <div
            key={color.id}
            className="group rounded-xl overflow-hidden border border-stone-100 bg-white hover:shadow-md transition-shadow"
          >
            <div className="aspect-square bg-stone-100 overflow-hidden">
              {color.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={color.image.public_url}
                  alt={color.image.alt_text || color.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium text-stone-900 truncate">{color.name}</p>
              {color.description && (
                <p className="text-xs text-stone-400 mt-0.5 truncate">{color.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
