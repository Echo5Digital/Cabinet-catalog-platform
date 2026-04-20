"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function CatalogFilters({ categories, activeCategory, lineSlug }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Category
      </h3>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => setFilter("category", "")}
            className={`text-sm w-full text-left px-2 py-1 rounded transition ${
              !activeCategory ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            All
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => setFilter("category", cat.slug)}
              className={`text-sm w-full text-left px-2 py-1 rounded transition ${
                activeCategory === cat.slug
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
