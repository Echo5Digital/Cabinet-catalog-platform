import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";
import StructureGallery from "@/components/catalog/StructureGallery";

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
      <div className="page-header-warm border-b border-stone-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <nav className="text-xs text-stone-400 mb-4 flex items-center gap-1.5">
            <Link href="/catalog" className="hover:text-stone-200 transition font-medium">
              Collections
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-stone-200 font-medium">Structures</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3 anim-fade-in-up"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Structures
          </h1>
          <p className="text-stone-300/90 max-w-2xl leading-relaxed">
            Browse our available structural options and configurations for your cabinet project.
          </p>
          {structures.length > 0 && (
            <p className="text-stone-400/80 text-sm mt-3">
              {structures.length} option{structures.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 bg-[#F8F6F3] min-h-[60vh]">
        {structures.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 mb-4">No structures available yet.</p>
            <Link href="/catalog" className="text-sm text-stone-600 underline">
              Browse Collections
            </Link>
          </div>
        ) : (
          <StructureGallery structures={structures} />
        )}

        {structures.length > 0 && (
          <div className="mt-16 pt-10 border-t border-stone-100 text-center">
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
