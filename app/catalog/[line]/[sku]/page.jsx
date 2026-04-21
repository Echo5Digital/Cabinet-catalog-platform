import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDetailClient from "@/components/catalog/ProductDetailClient";
import { getPublishedVersion } from "@/lib/catalog/getPublishedVersion";

export async function generateMetadata({ params }) {
  return { title: `${params.sku.toUpperCase()} — Cabinet Detail` };
}

export default async function ProductDetailPage({ params }) {
  const result = await getPublishedVersion(params.line);
  if (!result) notFound();

  const { line, snapshot } = result;
  const sku = params.sku.toUpperCase();

  // Find product in snapshot
  const product = (snapshot.products || []).find(
    (p) => p.sku.toUpperCase() === sku
  );
  if (!product) notFound();

  // Build images array from snapshot
  const images = (product.images || []).map((img) => ({
    url: img.url,
    alt: img.alt || product.name,
    is_primary: img.is_primary,
    variant_key: null,
    variant_label: null,
  }));

  // Map finish_ids → full finish objects from snapshot.finishes
  const finishById = Object.fromEntries(
    (snapshot.finishes || []).map((f) => [f.id, f])
  );
  const incompatibleSet = new Set(product.incompatible_finish_ids || []);

  const finishes = (product.finish_ids || [])
    .map((id) => finishById[id])
    .filter(Boolean)
    .map((f) => ({
      ...f,
      is_default: f.id === product.default_finish_id,
      swatch_url: f.swatch_url || null,
      incompatible: incompatibleSet.has(f.id),
    }));

  const dimensionNotes = product.dimension_notes || [];

  // Reshape for ProductDetailClient (expects nested category + catalog_line objects)
  const productForClient = {
    ...product,
    category: product.category_id
      ? { name: product.category_name, slug: product.category_slug }
      : null,
    catalog_line: { name: line.name, slug: line.slug },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-xs text-stone-400 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href="/catalog" className="hover:text-stone-600 transition">
          Collections
        </Link>
        <span>/</span>
        <Link href={`/catalog/${line.slug}`} className="hover:text-stone-600 transition">
          {line.name}
        </Link>
        <span>/</span>
        {product.category_id && (
          <>
            <Link
              href={`/catalog/${line.slug}?category=${product.category_slug}`}
              className="hover:text-stone-600 transition"
            >
              {product.category_name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-stone-600 font-medium">{product.sku}</span>
      </nav>

      <ProductDetailClient
        product={productForClient}
        images={images}
        finishes={finishes}
        dimensionNotes={dimensionNotes}
        lineSlug={line.slug}
      />
    </div>
  );
}
