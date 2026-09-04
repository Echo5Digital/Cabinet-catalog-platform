import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";
import GalleryGrid from "@/components/catalog/GalleryLightbox";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design Gallery — Cabinet Catalog",
};

const CATEGORIES = [
  { id: "american", name: "American" },
  { id: "euro", name: "Euro" },
  { id: "general", name: "General" },
];

async function getData() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();
    const { data: images } = await admin
      .from("assets")
      .select("id, public_url, alt_text, gallery_category, parsed_sequence")
      .eq("tenant_id", tenantId)
      .eq("asset_type", "lifestyle")
      .eq("status", "confirmed")
      .not("public_url", "is", null)
      .not("gallery_category", "is", null)
      .order("gallery_category", { ascending: true })
      .order("parsed_sequence", { ascending: true });

    return { images: images || [] };
  } catch {
    return { images: [] };
  }
}

export default async function GalleryPage() {
  const { images } = await getData();

  // Group images by gallery_category
  const categoryGroups = {};
  for (const img of images) {
    if (!categoryGroups[img.gallery_category]) categoryGroups[img.gallery_category] = [];
    categoryGroups[img.gallery_category].push(img);
  }

  // Ordered by fixed CATEGORIES order, only categories that have photos
  const activeCategories = CATEGORIES.filter((c) => categoryGroups[c.id]?.length > 0);

  const totalImages = images.length;

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
            <span className="text-stone-200 font-medium">Design Gallery</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3 anim-fade-in-up"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Design Gallery
          </h1>
          <p className="text-stone-300/90 max-w-2xl leading-relaxed">
            Browse inspiration from our cabinet collections — real kitchen designs to help you envision
            your perfect space.
          </p>
          {totalImages > 0 && (
            <p className="text-stone-400/80 text-sm mt-3">
              {totalImages} photo{totalImages !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs by category */}
      {activeCategories.length > 1 && (
        <div className="border-b border-stone-200 bg-[#F8F6F3] sticky top-16 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
              <a
                href="#all"
                className="px-4 py-1.5 rounded-full text-sm font-medium border border-stone-200 text-stone-700 hover:border-stone-400 transition whitespace-nowrap shrink-0"
              >
                All Photos
              </a>
              {activeCategories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className="px-4 py-1.5 rounded-full text-sm font-medium border border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 transition whitespace-nowrap shrink-0"
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 bg-[#F8F6F3] min-h-[60vh]" id="all">

        {totalImages === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-stone-400 mb-4">No gallery photos available yet.</p>
            <Link href="/catalog" className="text-sm text-stone-600 underline">
              Browse Collections
            </Link>
          </div>
        ) : (
          <div className="space-y-16">

            {/* Grouped by category */}
            {activeCategories.map((cat) => (
              <div key={cat.id} id={`cat-${cat.id}`}>
                <div className="flex items-center justify-between mb-6 section-band">
                  <div className="flex items-center gap-3">
                    <h2
                      className="text-xl font-bold text-stone-900"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {cat.name}
                    </h2>
                    <span className="count-badge">{categoryGroups[cat.id].length}</span>
                  </div>
                </div>
                <GalleryGrid images={categoryGroups[cat.id]} />
              </div>
            ))}

          </div>
        )}

        {/* CTA */}
        {totalImages > 0 && (
          <div className="mt-16 pt-10 border-t border-stone-200 text-center">
            <p className="text-stone-500 text-sm mb-5">
              Love what you see? Start building your quote today.
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
