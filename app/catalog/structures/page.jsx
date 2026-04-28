import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Structures — Cabinet Catalog",
};

async function getData() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();

    const [{ data: structures }, { data: assets }] = await Promise.all([
      admin
        .from("structures")
        .select("id, name, code, description")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("assets")
        .select("structure_id, public_url, alt_text")
        .eq("tenant_id", tenantId)
        .eq("asset_type", "structure_image")
        .eq("status", "confirmed")
        .not("structure_id", "is", null),
    ]);

    // Map structure_id → first confirmed image
    const imageMap = {};
    for (const a of assets || []) {
      if (!imageMap[a.structure_id]) imageMap[a.structure_id] = a;
    }

    return {
      structures: (structures || []).map((s) => ({
        ...s,
        image: imageMap[s.id] ?? null,
      })),
    };
  } catch {
    return { structures: [] };
  }
}

export default async function StructuresPage() {
  const { structures } = await getData();

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
            <span className="text-stone-700 font-medium">Structures</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Structures
          </h1>
          <p className="text-stone-500 max-w-2xl leading-relaxed">
            Browse our available structural options and configurations for your cabinet project.
          </p>
          {structures.length > 0 && (
            <p className="text-stone-400 text-sm mt-3">
              {structures.length} option{structures.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {structures.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 mb-4">No structures available yet.</p>
            <Link href="/catalog" className="text-sm text-stone-600 underline">
              Browse Collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {structures.map((structure) => (
              <div
                key={structure.id}
                className="group rounded-xl overflow-hidden border border-stone-100 bg-white hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-stone-100 overflow-hidden">
                  {structure.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={structure.image.public_url}
                      alt={structure.image.alt_text || structure.name}
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
                  <p className="text-sm font-medium text-stone-900 truncate">{structure.name}</p>
                  {structure.description && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{structure.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {structures.length > 0 && (
          <div className="mt-16 pt-10 border-t border-stone-100 text-center">
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
