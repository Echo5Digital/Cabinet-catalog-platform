import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/catalog/ProductCard";
import CategoryPills from "@/components/catalog/CategoryPills";
import LifestyleBanner from "@/components/catalog/LifestyleBanner";
import { getPublishedVersion } from "@/lib/catalog/getPublishedVersion";
import { resolveTenantId } from "@/lib/utils/tenant-context";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  return { title: `${params.line} — Cabinet Collections` };
}

export default async function CatalogLinePage({ params, searchParams }) {
  const tenantId = await resolveTenantId();
  const result = await getPublishedVersion(params.line, tenantId);
  if (!result) notFound();

  const { line, snapshot } = result;
  const { products: allProducts, lifestyle_images } = snapshot;

  // Derive categories from snapshot (only categories that have products in this line)
  const categoryMap = new Map();
  for (const p of allProducts) {
    if (p.category_id && !categoryMap.has(p.category_id)) {
      categoryMap.set(p.category_id, {
        id: p.category_id,
        name: p.category_name,
        slug: p.category_slug,
      });
    }
  }
  const categories = [...categoryMap.values()];

  // Apply URL filters
  const activeCategory = searchParams.category || null;
  const activeWidth = searchParams.width ? Number(searchParams.width) : null;

  let products = allProducts;
  if (activeCategory) {
    products = products.filter((p) => p.category_slug === activeCategory);
  }
  if (activeWidth) {
    products = products.filter((p) => p.width_in === activeWidth);
  }

  // Distinct widths for the width filter row
  const widthSource = activeCategory
    ? allProducts.filter((p) => p.category_slug === activeCategory)
    : allProducts;
  const widths = [...new Set(widthSource.map((p) => p.width_in).filter(Boolean))].sort(
    (a, b) => a - b
  );

  // Shape for ProductCard (expects primary_image_url)
  const productsForCard = products.map((p) => ({
    ...p,
    primary_image_url: p.images?.[0]?.url || null,
    category: p.category_id ? { name: p.category_name, slug: p.category_slug } : null,
  }));

  const lifestyleImages = (lifestyle_images || []).filter((img) => img.url);

  const activeCategoryLabel = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name || activeCategory
    : null;

  return (
    <div>
      {/* Pull the banner up by the sticky header height so it fills behind the pill navbar */}
      <div className="-mt-[68px]">
        <LifestyleBanner images={lifestyleImages} lineName={line.name} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">

        {/* Breadcrumb + heading */}
        <div className="mb-8 sm:mb-10">
          <nav className="flex items-center gap-1.5 text-xs text-stone-500 mb-4">
            <Link href="/catalog" className="hover:text-stone-800 transition font-medium">
              Collections
            </Link>
            <svg className="w-3 h-3 text-stone-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-stone-700 font-semibold">{line.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-1.5">
                Cabinet Collection
              </p>
              <h1
                className="text-3xl sm:text-4xl font-bold text-stone-900"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {line.name}
              </h1>
              {line.description && (
                <p className="text-stone-500 mt-2 max-w-2xl leading-relaxed text-sm sm:text-base">
                  {line.description}
                </p>
              )}
            </div>

            {/* Product count badge */}
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 bg-stone-100 rounded-full px-3 py-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
                {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Sticky filter bar */}
        <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
          <CategoryPills
            categories={categories}
            activeCategory={activeCategory}
            activeWidth={activeWidth ? String(activeWidth) : null}
            lineSlug={line.slug}
            widths={activeCategory ? widths : []}
          />
        </div>

        {/* Active filter summary + clear */}
        {(activeCategory || activeWidth) && (
          <div className="flex items-center justify-between mb-5 py-2 border-b border-stone-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-stone-500">Filtered:</span>
              {activeCategoryLabel && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 bg-stone-900/5 rounded-full px-2.5 py-1">
                  {activeCategoryLabel}
                </span>
              )}
              {activeWidth && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 bg-stone-900/5 rounded-full px-2.5 py-1">
                  {activeWidth}&quot; wide
                </span>
              )}
              <span className="text-xs text-stone-400">
                — {products.length} result{products.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Link
              href={`/catalog/${line.slug}`}
              className="text-xs font-medium text-stone-500 hover:text-stone-900 flex items-center gap-1 transition"
            >
              Clear
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        )}

        {/* Grid or empty state */}
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex w-16 h-16 rounded-full bg-stone-100 items-center justify-center mb-4">
              <svg className="w-7 h-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-stone-500 font-medium mb-1">No products match the selected filters.</p>
            <p className="text-stone-400 text-sm mb-5">Try removing some filters to see more results.</p>
            <Link
              href={`/catalog/${line.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-full px-4 py-2 transition"
            >
              View all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
            {productsForCard.map((product) => (
              <ProductCard key={product.id} product={product} lineSlug={line.slug} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
