import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/catalog/ProductCard";
import CategoryPills from "@/components/catalog/CategoryPills";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function generateMetadata({ params }) {
  return { title: `${params.line} — Cabinet Collections` };
}

async function getData(lineSlug, categorySlug, widthFilter) {
  const admin = createAdminClient();

  const { data: line } = await admin
    .from("catalog_lines")
    .select("id, name, slug, description")
    .eq("tenant_id", TENANT_ID)
    .eq("slug", lineSlug)
    .eq("status", "published")
    .single();

  if (!line) return null;

  // Lifestyle images (v2 assets table)
  const { data: lifestyleRaw } = await admin
    .from("assets")
    .select("public_url, alt_text, parsed_sequence")
    .eq("tenant_id", TENANT_ID)
    .eq("catalog_line_id", line.id)
    .eq("asset_type", "lifestyle")
    .eq("status", "confirmed")
    .order("parsed_sequence", { ascending: true })
    .limit(3);

  const lifestyleImages = (lifestyleRaw || []).filter((a) => a.public_url);

  // Categories
  const { data: categories } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("tenant_id", TENANT_ID)
    .order("sort_order", { ascending: true });

  // Products with optional filters
  let productQuery = admin
    .from("products")
    .select("id, sku, name, width_in, height_in, depth_in, category:categories(id, name, slug)")
    .eq("catalog_line_id", line.id)
    .eq("tenant_id", TENANT_ID)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categorySlug) {
    const cat = (categories || []).find((c) => c.slug === categorySlug);
    if (cat) productQuery = productQuery.eq("category_id", cat.id);
  }
  if (widthFilter) {
    productQuery = productQuery.eq("width_in", Number(widthFilter));
  }

  const { data: products } = await productQuery;
  const productIds = (products || []).map((p) => p.id);

  // Primary images via product_assets join (v2)
  let primaryImages = {};
  if (productIds.length > 0) {
    const { data: paRows } = await admin
      .from("product_assets")
      .select("product_id, is_primary, sort_order, asset:assets!asset_id(public_url)")
      .in("product_id", productIds)
      .eq("is_primary", true);

    for (const row of paRows || []) {
      if (row.asset?.public_url && !primaryImages[row.product_id]) {
        primaryImages[row.product_id] = row.asset.public_url;
      }
    }

    // Fallback: any image if no primary
    const missing = productIds.filter((id) => !primaryImages[id]);
    if (missing.length > 0) {
      const { data: fallback } = await admin
        .from("product_assets")
        .select("product_id, asset:assets!asset_id(public_url)")
        .in("product_id", missing)
        .order("sort_order", { ascending: true });

      for (const row of fallback || []) {
        if (row.asset?.public_url && !primaryImages[row.product_id]) {
          primaryImages[row.product_id] = row.asset.public_url;
        }
      }
    }
  }

  // Distinct widths for the filter row (only when a category is active)
  const allWidths = [...new Set(
    (products || []).map((p) => p.width_in).filter(Boolean)
  )].sort((a, b) => a - b);

  const productsWithImages = (products || []).map((p) => ({
    ...p,
    primary_image_url: primaryImages[p.id] || null,
  }));

  return { line, lifestyleImages, categories: categories || [], products: productsWithImages, widths: allWidths };
}

export default async function CatalogLinePage({ params, searchParams }) {
  const data = await getData(params.line, searchParams.category, searchParams.width);
  if (!data) notFound();

  const { line, lifestyleImages, categories, products, widths } = data;
  const activeCategory = searchParams.category || null;
  const activeWidth = searchParams.width || null;

  return (
    <div>
      {/* Lifestyle hero strip */}
      {lifestyleImages.length > 0 ? (
        <div className={`grid gap-px overflow-hidden ${lifestyleImages.length >= 3 ? "grid-cols-3" : lifestyleImages.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {lifestyleImages.map((img, i) => (
            <div key={i} className="overflow-hidden bg-stone-200 h-[300px] sm:h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.public_url} alt={img.alt_text || line.name} className="w-full h-full object-cover" />
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
            <Link href="/catalog" className="hover:text-stone-600 transition">Collections</Link>
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
            activeWidth={activeWidth}
            lineSlug={line.slug}
            widths={activeCategory ? widths : []}
          />
        </div>

        {/* Count + clear */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-stone-400">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {activeCategory && ` · ${categories.find((c) => c.slug === activeCategory)?.name || activeCategory}`}
            {activeWidth && ` · ${activeWidth}"`}
          </p>
          {(activeCategory || activeWidth) && (
            <Link href={`/catalog/${line.slug}`} className="text-xs text-stone-400 hover:text-stone-700 transition">
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
            {products.map((product) => (
              <ProductCard key={product.id} product={product} lineSlug={line.slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
