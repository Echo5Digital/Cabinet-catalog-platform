import { createAdminClient } from "@/lib/supabase/admin";
import KitchenDesignForm from "@/components/catalog/KitchenDesignForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kitchen Design AI — Cabinet Catalog",
  description: "Get personalized kitchen design concepts based on your style and preferences.",
};

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

// Derive style_category from catalog line name
function getStyleCategory(lineName) {
  if (!lineName) return null;
  const lower = lineName.toLowerCase();
  if (lower.includes("american")) return "American";
  if (lower.includes("euro")) return "Euro";
  return null;
}

async function getCatalogData() {
  try {
    if (!TENANT_ID) return { countertopColors: [], floorColors: [], finishes: [], structures: [] };
    const admin = createAdminClient();

    const [
      { data: colors },
      { data: finishes },
      { data: finishSwatches },
      { data: colorSwatches },
      { data: structures },
      { data: structureImages },
      { data: catalogLines },
    ] = await Promise.all([
      admin.from("colors")
        .select("id, name, color_type")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .order("sort_order"),
      admin.from("finishes")
        .select("id, name, code, catalog_line_id")
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
      admin.from("structures")
        .select("id, name, code")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .order("sort_order"),
      admin.from("assets")
        .select("structure_id, public_url")
        .eq("tenant_id", TENANT_ID)
        .eq("asset_type", "structure_image")
        .eq("status", "confirmed")
        .not("structure_id", "is", null),
      admin.from("catalog_lines")
        .select("id, name")
        .eq("tenant_id", TENANT_ID)
        .eq("status", "published"),
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
    const structureImgMap = {};
    for (const s of structureImages || []) {
      if (s.structure_id && !structureImgMap[s.structure_id]) {
        structureImgMap[s.structure_id] = s.public_url;
      }
    }

    // catalog_line_id → style category ("American" | "Euro" | null)
    const lineStyleMap = {};
    for (const l of catalogLines || []) {
      lineStyleMap[l.id] = getStyleCategory(l.name);
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
        style_category: f.catalog_line_id ? (lineStyleMap[f.catalog_line_id] ?? null) : null,
      })),
      structures: (structures || []).map((s) => ({
        ...s,
        image_url: structureImgMap[s.id] ?? null,
      })),
    };
  } catch {
    return { countertopColors: [], floorColors: [], finishes: [], structures: [] };
  }
}

export default async function KitchenDesignPage() {
  const { countertopColors, floorColors, finishes, structures } = await getCatalogData();

  return (
    <div className="bg-stone-50">
      {/* Page header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-stone-950 via-stone-900 to-stone-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.10),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-16 relative z-10">
          <nav className="text-xs mb-5 flex items-center gap-1.5">
            <Link href="/catalog" className="text-stone-400 hover:text-stone-200 transition font-medium">
              Collections
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-stone-300 font-medium">Design AI</span>
          </nav>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 mt-1">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h1
                className="text-3xl sm:text-4xl font-bold text-white mb-3"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Kitchen Design AI
              </h1>
              <p className="text-stone-300/90 max-w-2xl leading-relaxed">
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
              <div key={item.step} className="flex items-start gap-3 p-4 bg-white/[0.06] border border-white/[0.08] rounded-xl backdrop-blur-sm">
                <span className="w-7 h-7 rounded-full bg-[#2C3E50] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{item.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.desc}</p>
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
          structures={structures}
        />
      </div>
    </div>
  );
}
