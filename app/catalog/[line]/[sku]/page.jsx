import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import QuoteRequestForm from "@/components/catalog/QuoteRequestForm";

export async function generateMetadata({ params }) {
  return {
    title: `${params.sku.toUpperCase()} — Cabinet Detail`,
  };
}

export default async function ProductDetailPage({ params }) {
  const supabase = createClient();

  // Fetch catalog line
  const { data: line } = await supabase
    .from("catalog_lines")
    .select("id, name, slug")
    .eq("slug", params.line)
    .eq("status", "published")
    .single();

  if (!line) notFound();

  // Fetch product
  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      catalog_line:catalog_lines(id, name, slug),
      category:categories(id, name, slug),
      product_finishes(finish:finishes(id, name, code))
    `)
    .eq("catalog_line_id", line.id)
    .eq("sku", params.sku.toUpperCase())
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  // Fetch product images (mapped, confirmed assets)
  const { data: images } = await supabase
    .from("asset_mappings")
    .select("id, public_url, variant, is_primary, sort_order")
    .eq("product_id", product.id)
    .eq("asset_type", "product")
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  // Fetch finish swatch images
  const finishIds = (product.product_finishes || []).map((pf) => pf.finish?.id).filter(Boolean);
  let finishImages = [];
  if (finishIds.length > 0) {
    const { data } = await supabase
      .from("asset_mappings")
      .select("id, finish_id, public_url, sort_order")
      .in("finish_id", finishIds)
      .eq("asset_type", "finish");
    finishImages = data || [];
  }

  const primaryImage = images?.find((i) => i.is_primary) || images?.[0];

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-4 text-sm text-gray-400">
        <a href="/catalog" className="hover:underline">Catalog</a>
        {" / "}
        <a href={`/catalog/${line.slug}`} className="hover:underline">{line.name}</a>
        {" / "}
        <span className="text-gray-600">{product.sku}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: images */}
        <div>
          {/* Primary image */}
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3">
            {primaryImage?.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage.public_url}
                alt={`${product.sku} cabinet`}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                No image
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images && images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                >
                  {img.public_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.public_url}
                      alt={img.variant || product.sku}
                      className="w-full h-full object-contain p-1"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: product info */}
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">
            {product.catalog_line?.name} · {product.category?.name}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
          <p className="font-mono text-gray-500 text-sm mb-4">SKU: {product.sku}</p>

          {product.description && (
            <p className="text-gray-600 mb-6">{product.description}</p>
          )}

          {/* Dimensions */}
          {(product.width_in || product.height_in || product.depth_in) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Dimensions</h3>
              <div className="flex gap-4 text-sm text-gray-600">
                {product.width_in && <span>W: {product.width_in}&quot;</span>}
                {product.height_in && <span>H: {product.height_in}&quot;</span>}
                {product.depth_in && <span>D: {product.depth_in}&quot;</span>}
              </div>
            </div>
          )}

          {/* Finishes */}
          {product.product_finishes && product.product_finishes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Finishes</h3>
              <div className="flex flex-wrap gap-3">
                {product.product_finishes.map(({ finish }) => {
                  if (!finish) return null;
                  const swatchImg = finishImages.find((fi) => fi.finish_id === finish.id);
                  return (
                    <div
                      key={finish.id}
                      className="flex flex-col items-center gap-1"
                      title={finish.name}
                    >
                      <div className="w-10 h-10 rounded-full border border-gray-200 overflow-hidden bg-gray-100">
                        {swatchImg?.public_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={swatchImg.public_url}
                            alt={finish.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                            ?
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 text-center max-w-[60px] truncate">
                        {finish.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quote form */}
          <QuoteRequestForm
            productId={product.id}
            productName={product.name}
            productSku={product.sku}
            finishes={(product.product_finishes || [])
              .map((pf) => pf.finish)
              .filter(Boolean)}
          />
        </div>
      </div>
    </main>
  );
}
