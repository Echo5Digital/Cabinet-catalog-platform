import { createAdminClient } from "@/lib/supabase/admin";
import KitchenDesignForm from "@/components/catalog/KitchenDesignForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kitchen Design AI — Cabinet Catalog",
  description: "Get personalized kitchen design concepts based on your style and preferences.",
};

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

async function getCatalogData() {
  try {
    if (!TENANT_ID) return { countertopColors: [], floorColors: [], finishes: [] };
    const admin = createAdminClient();

    const [
      { data: colors },
      { data: finishes },
      { data: finishSwatches },
      { data: colorSwatches },
    ] = await Promise.all([
      admin.from("colors")
        .select("id, name, color_type")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .order("sort_order"),
      admin.from("finishes")
        .select("id, name, code")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .order("sort_order"),
      admin.from("assets")
        .select("finish_id, public_url")
        .eq("tenant_id", TENANT_ID)
        .eq("asset_type", "finish_swatch")
        .eq("status", "confirmed")
        .not("finish_id", "is", null),
      admin.from("assets")
        .select("color_id, public_url")
        .eq("tenant_id", TENANT_ID)
        .eq("asset_type", "color_swatch")
        .eq("status", "confirmed")
        .not("color_id", "is", null),
    ]);

    // Build lookup maps: id → first confirmed public_url
    const finishImageMap = {};
    for (const s of finishSwatches || []) {
      if (s.finish_id && !finishImageMap[s.finish_id]) {
        finishImageMap[s.finish_id] = s.public_url;
      }
    }
    const colorImageMap = {};
    for (const s of colorSwatches || []) {
      if (s.color_id && !colorImageMap[s.color_id]) {
        colorImageMap[s.color_id] = s.public_url;
      }
    }

    const allColors = (colors || []).map((c) => ({
      ...c,
      image_url: colorImageMap[c.id] ?? null,
    }));

    return {
      countertopColors: allColors.filter((c) => c.color_type === "countertop"),
      floorColors: allColors.filter((c) => c.color_type === "floor"),
      finishes: (finishes || []).map((f) => ({
        ...f,
        image_url: finishImageMap[f.id] ?? null,
      })),
    };
  } catch {
    return { countertopColors: [], floorColors: [], finishes: [] };
  }
}

export default async function KitchenDesignPage() {
  const { countertopColors, floorColors, finishes } = await getCatalogData();

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-stone-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-xs text-stone-500 mb-4 flex items-center gap-1.5">
            <Link href="/catalog" className="hover:text-stone-800 transition font-medium">
              Collections
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-stone-700 font-medium">Design AI</span>
          </nav>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-1">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h1
                className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Kitchen Design AI
              </h1>
              <p className="text-stone-500 max-w-2xl leading-relaxed">
                Tell us about your dream kitchen and we&apos;ll generate personalized design concepts,
                cabinet recommendations, and a sales-ready summary — instantly.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Fill in your details", desc: "Layout, style, colors, and what you need" },
              { step: "2", title: "AI generates concepts", desc: "2–3 realistic designs matched to your inputs" },
              { step: "3", title: "Request your quote", desc: "Browse the catalog and start building your order" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <KitchenDesignForm
          countertopColors={countertopColors}
          floorColors={floorColors}
          finishes={finishes}
        />
      </div>
    </div>
  );
}
