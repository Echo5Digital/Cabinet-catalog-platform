import Link from "next/link";

export default function ProductCard({ product, lineSlug }) {
  const dims = [
    product.width_in ? `${product.width_in}"W` : null,
    product.height_in ? `${product.height_in}"H` : null,
    product.depth_in ? `${product.depth_in}"D` : null,
  ].filter(Boolean).join(" × ");

  return (
    <Link
      href={`/catalog/${lineSlug}/${product.sku.toLowerCase()}`}
      className="group block bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md hover:border-stone-300 transition-all duration-200"
    >
      {/* Image */}
      <div className="aspect-square bg-stone-50 flex items-center justify-center overflow-hidden">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt={`${product.name}`}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-stone-200">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 border-t border-stone-100">
        <p className="font-mono text-[11px] text-stone-500 tracking-wide">{product.sku}</p>
        <p className="text-sm font-semibold text-stone-900 mt-0.5 leading-snug line-clamp-2">{product.name}</p>
        {product.category && (
          <p className="text-xs text-stone-500 mt-0.5 font-medium">{product.category.name}</p>
        )}
        {dims && (
          <p className="text-xs text-stone-500 mt-1 font-mono">{dims}</p>
        )}
        <p className="mt-2 text-xs font-medium text-stone-400 group-hover:text-stone-700 transition">
          View Details →
        </p>
      </div>
    </Link>
  );
}
