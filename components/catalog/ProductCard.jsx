import Link from "next/link";

export default function ProductCard({ product, lineSlug }) {
  const primaryImage = product.asset_mappings?.find((a) => a.is_primary) || product.asset_mappings?.[0];

  return (
    <Link
      href={`/catalog/${lineSlug}/${product.sku.toLowerCase()}`}
      className="group block border border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {primaryImage?.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage.public_url}
            alt={`${product.sku} cabinet`}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="text-gray-300 text-xs">No image</div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 border-t border-gray-100">
        <p className="font-mono text-xs text-gray-400">{product.sku}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{product.name}</p>
        {product.category && (
          <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
        )}
        {product.width_in && (
          <p className="text-xs text-gray-400">
            {product.width_in}&quot;W
            {product.height_in ? ` \u00d7 ${product.height_in}"H` : ""}
            {product.depth_in ? ` \u00d7 ${product.depth_in}"D` : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
