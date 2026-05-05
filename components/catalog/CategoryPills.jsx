"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function CategoryPills({ categories, activeCategory, activeWidth, lineSlug, widths }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Clearing category also clears width
    if (key === "category") params.delete("width");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      {/* Category row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setParam("category", "")}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
            !activeCategory
              ? "bg-stone-900 text-white border-stone-900 shadow-sm"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900 hover:shadow-sm"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setParam("category", cat.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
              activeCategory === cat.slug
                ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900 hover:shadow-sm"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Width row — only visible after category is selected */}
      {activeCategory && widths.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1 border-t border-stone-100">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest mr-2">Width</span>
          {widths.map((w) => (
            <button
              key={w}
              onClick={() => setParam("width", activeWidth === String(w) ? "" : String(w))}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                activeWidth === String(w)
                  ? "bg-stone-800 text-white border-stone-800 shadow-sm"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-700"
              }`}
            >
              {w}&quot;
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
