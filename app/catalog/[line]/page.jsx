import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProductCard from "@/components/catalog/ProductCard";
import CatalogFilters from "@/components/catalog/CatalogFilters";

export async function generateMetadata({ params }) {
  return {
    title: `${params.line} — Cabinet Catalog`,
  };
}

export default async function CatalogLinePage({ params, searchParams }) {
  const supabase = createClient();

  // Fetch the catalog line
  const { data: line } = await supabase
    .from("catalog_lines")
    .select("id, name, slug, description")
    .eq("slug", params.line)
    .eq("status", "published")
    .single();

  if (!line) notFound();

  // Fetch categories for this tenant
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });

  // Build product query with filters from searchParams
  let query = supabase
    .from("products")
    .select(`
      id, sku, name, width_in, height_in, depth_in,
      category:categories(id, name, slug),
      asset_mappings!inner(public_url, is_primary, asset_type, sort_order)
    `)
    .eq("catalog_line_id", line.id)
    .eq("is_active", true)
    .eq("asset_mappings.asset_type", "product")
    .order("sort_order", { ascending: true });

  if (searchParams.category) {
    const cat = categories?.find((c) => c.slug === searchParams.category);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (searchParams.minWidth) query = query.gte("width_in", Number(searchParams.minWidth));
  if (searchParams.maxWidth) query = query.lte("width_in", Number(searchParams.maxWidth));

  const { data: products } = await query;

  // Fetch lifestyle images for this catalog line
  const { data: lifestyleImages } = await supabase
    .from("asset_mappings")
    .select("id, public_url, sort_order")
    .eq("catalog_line_id", line.id)
    .eq("asset_type", "lifestyle")
    .order("sort_order", { ascending: true })
    .limit(3);

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      {/* Line header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{line.name}</h1>
        {line.description && (
          <p className="text-gray-500 mt-2 max-w-2xl">{line.description}</p>
        )}
      </div>

      {/* Lifestyle images */}
      {lifestyleImages && lifestyleImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-10">
          {lifestyleImages.map((img) => (
            <div key={img.id} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {img.public_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.public_url}
                  alt={`${line.name} lifestyle`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-8">
        {/* Filters sidebar */}
        <aside className="w-56 flex-shrink-0">
          <CatalogFilters
            categories={categories || []}
            activeCategory={searchParams.category}
            lineSlug={line.slug}
          />
        </aside>

        {/* Product grid */}
        <section className="flex-1">
          {(!products || products.length === 0) && (
            <p className="text-gray-400">No products found with the selected filters.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {(products || []).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lineSlug={line.slug}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
