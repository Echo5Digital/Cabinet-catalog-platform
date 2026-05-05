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
      className="group block bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-stone-300 hover:-translate-y-0.5 transition-all duration-200 ease-out"
    >
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-stone-50 via-white to-stone-100 flex items-center justify-center overflow-hidden border-b border-stone-100">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-[1.04] transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-300">
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h18M3 7.5V6a1 1 0 011-1h16a1 1 0 011 1v1.5M3 7.5v9A1.5 1.5 0 004.5 18h15a1.5 1.5 0 001.5-1.5v-9M9 11.25h6M9 14.25h4" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        {/* SKU + category row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-[9px] tracking-widest text-stone-500 bg-stone-100 rounded px-1.5 py-0.5 uppercase leading-none shrink-0">
            {product.sku}
          </span>
          {product.category && (
            <span className="text-[10px] font-medium text-stone-400 truncate leading-none text-right">
              {product.category.name}
            </span>
          )}
        </div>

        {/* Name */}
        <p className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">
          {product.name}
        </p>

        {/* Dimensions */}
        {dims && (
          <p className="mt-1.5 text-[11px] font-mono text-stone-400 tracking-tight">{dims}</p>
        )}

        {/* CTA row */}
        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 group-hover:text-stone-900 transition-colors duration-150">
            View Details
          </span>
          <span className="w-5 h-5 rounded-full bg-stone-100 group-hover:bg-stone-900 flex items-center justify-center transition-colors duration-200 shrink-0">
            <svg
              className="w-2.5 h-2.5 text-stone-500 group-hover:text-white transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
