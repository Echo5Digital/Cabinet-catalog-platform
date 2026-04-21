import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/catalog/ProductCard";
import CategoryPills from "@/components/catalog/CategoryPills";
import { getPublishedVersion } from "@/lib/catalog/getPublishedVersion";

export async function generateMetadata({ params }) {
  return { title: `${params.line} — Cabinet Collections` };
}

export default async function CatalogLinePage({ params, searchParams }) {
  const result = await getPublishedVersion(params.line);
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

  return (
    <div>
      {/* Lifestyle hero strip */}
      {lifestyleImages.length > 0 ? (
        <div
          className={`grid gap-px overflow-hidden ${
            lifestyleImages.length >= 3
              ? "grid-cols-3"
              : lifestyleImages.length === 2
              ? "grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {lifestyleImages.slice(0, 3).map((img, i) => (
            <div key={i} className="overflow-hidden bg-stone-200 h-[300px] sm:h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt || line.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="h-20 bg-stone-100 border-b border-stone-200" />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb + heading */}
        <div className="mb-8">
          <nav className="text-xs text-stone-400 mb-3 flex items-center gap-1.5">
            <Link href="/catalog" className="hover:text-stone-600 transition">
              Collections
            </Link>
            <span>/</span>
            <span className="text-stone-600">{line.name}</span>
          </nav>
          <h1
            className="text-3xl sm:text-4xl font-bold text-stone-900"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {line.name}
          </h1>
          {line.description && (
            <p className="text-stone-500 mt-2 max-w-2xl leading-relaxed">{line.description}</p>
          )}
        </div>

        {/* Category + width pills */}
        <div className="mb-6">
          <CategoryPills
            categories={categories}
            activeCategory={activeCategory}
            activeWidth={activeWidth ? String(activeWidth) : null}
            lineSlug={line.slug}
            widths={activeCategory ? widths : []}
          />
        </div>

        {/* Count + clear */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-stone-400">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {activeCategory &&
              ` · ${categories.find((c) => c.slug === activeCategory)?.name || activeCategory}`}
            {activeWidth && ` · ${activeWidth}"`}
          </p>
          {(activeCategory || activeWidth) && (
            <Link
              href={`/catalog/${line.slug}`}
              className="text-xs text-stone-400 hover:text-stone-700 transition"
            >
              Clear filters ×
            </Link>
          )}
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 mb-4">No products match the selected filters.</p>
            <Link href={`/catalog/${line.slug}`} className="text-sm text-stone-600 underline">
              View all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {productsForCard.map((product) => (
              <ProductCard key={product.id} product={product} lineSlug={line.slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
