import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "Catalog — Cabinet & Remodeling Depot",
  description: "Browse our cabinet collections",
};

export default async function CatalogPage() {
  const supabase = createClient();

  const { data: lines } = await supabase
    .from("catalog_lines")
    .select("id, name, slug, description")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Cabinet Collections</h1>
      <p className="text-gray-500 mb-10">Browse our full range of cabinet lines.</p>

      {(!lines || lines.length === 0) && (
        <p className="text-gray-400">No published catalog lines yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {(lines || []).map((line) => (
          <Link
            key={line.id}
            href={`/catalog/${line.slug}`}
            className="group block border border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">
              {line.name}
            </h2>
            {line.description && (
              <p className="text-sm text-gray-500 mt-2">{line.description}</p>
            )}
            <span className="mt-4 inline-block text-sm text-blue-600 font-medium">
              Browse products →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
