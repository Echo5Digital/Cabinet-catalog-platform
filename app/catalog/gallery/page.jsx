import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design Gallery — Cabinet Catalog",
};

async function getData() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();
    const [{ data: images }, { data: lines }] = await Promise.all([
      admin
        .from("assets")
        .select("id, public_url, alt_text, catalog_line_id, parsed_sequence")
        .eq("tenant_id", tenantId)
        .eq("asset_type", "lifestyle")
        .eq("status", "confirmed")
        .not("public_url", "is", null)
        .order("catalog_line_id", { ascending: true })
        .order("parsed_sequence", { ascending: true }),
      admin
        .from("catalog_lines")
        .select("id, name, slug")
        .eq("tenant_id", tenantId)
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
    ]);

    return { images: images || [], lines: lines || [] };
  } catch {
    return { images: [], lines: [] };
  }
}

export default async function GalleryPage() {
  const { images, lines } = await getData();

  // Map line id → line info
  const lineMap = {};
  for (const l of lines) lineMap[l.id] = l;

  // Group images by catalog_line_id
  const lineGroups = {};
  const ungrouped = [];
  for (const img of images) {
    if (img.catalog_line_id && lineMap[img.catalog_line_id]) {
      if (!lineGroups[img.catalog_line_id]) lineGroups[img.catalog_line_id] = [];
      lineGroups[img.catalog_line_id].push(img);
    } else {
      ungrouped.push(img);
    }
  }

  // Ordered by catalog_lines sort_order
  const orderedLineIds = lines.map((l) => l.id).filter((id) => lineGroups[id]);

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

      {/* Filter tabs by line */}
      {lines.length > 1 && orderedLineIds.length > 0 && (
        <div className="border-b border-stone-200 bg-[#F8F6F3] sticky top-16 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
              <a
                href="#all"
                className="px-4 py-1.5 rounded-full text-sm font-medium border border-stone-200 text-stone-700 hover:border-stone-400 transition whitespace-nowrap shrink-0"
              >
                All Photos
              </a>
              {orderedLineIds.map((lineId) => (
                <a
                  key={lineId}
                  href={`#line-${lineId}`}
                  className="px-4 py-1.5 rounded-full text-sm font-medium border border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 transition whitespace-nowrap shrink-0"
                >
                  {lineMap[lineId].name}
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

            {/* Grouped by line */}
            {orderedLineIds.map((lineId) => (
              <div key={lineId} id={`line-${lineId}`}>
                <div className="flex items-center justify-between mb-6 section-band">
                  <div className="flex items-center gap-3">
                    <h2
                      className="text-xl font-bold text-stone-900"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {lineMap[lineId].name}
                    </h2>
                    <span className="count-badge">{lineGroups[lineId].length}</span>
                  </div>
                  <Link
                    href={`/catalog/${lineMap[lineId].slug}`}
                    className="text-sm text-stone-500 hover:text-stone-800 transition shrink-0"
                  >
                    Browse {lineMap[lineId].name} →
                  </Link>
                </div>
                <GalleryGrid images={lineGroups[lineId]} />
              </div>
            ))}

            {/* Ungrouped images (no line association) */}
            {ungrouped.length > 0 && (
              <div>
                {orderedLineIds.length > 0 && (
                  <h2
                    className="text-xl font-bold text-stone-900 mb-6"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    More Inspiration
                  </h2>
                )}
                <GalleryGrid images={ungrouped} />
              </div>
            )}

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

function GalleryGrid({ images }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {images.map((img, idx) => (
        <div
          key={img.id || idx}
          className={`group relative overflow-hidden rounded-xl bg-stone-100 shimmer-card ${
            idx === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
          }`}
          style={{ animationName: 'fade-in-up-sm', animationDuration: '0.45s', animationFillMode: 'both', animationTimingFunction: 'ease', animationDelay: `${idx * 0.05}s` }}
        >
          <div className={`${idx === 0 ? "aspect-square" : "aspect-[4/3]"} overflow-hidden`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.public_url}
              alt={img.alt_text || "Kitchen design inspiration"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              loading={idx < 4 ? "eager" : "lazy"}
            />
          </div>
          {img.alt_text && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end">
              <p className="text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed">
                {img.alt_text}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
