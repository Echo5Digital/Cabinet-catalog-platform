import { createAdminClient } from "@/lib/supabase/admin";
import DesignPageShell from "@/components/catalog/DesignPageShell";

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
    <DesignPageShell
      countertopColors={countertopColors}
      floorColors={floorColors}
      finishes={finishes}
      structures={structures}
    />
  );
}
