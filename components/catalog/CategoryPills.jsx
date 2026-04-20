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
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
            !activeCategory
              ? "bg-stone-900 text-white border-stone-900"
              : "border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setParam("category", cat.slug)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              activeCategory === cat.slug
                ? "bg-stone-900 text-white border-stone-900"
                : "border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Width row — only visible after category is selected */}
      {activeCategory && widths.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs text-stone-400 self-center mr-1">Width:</span>
          {widths.map((w) => (
            <button
              key={w}
              onClick={() => setParam("width", activeWidth === String(w) ? "" : String(w))}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                activeWidth === String(w)
                  ? "bg-stone-700 text-white border-stone-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700"
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
