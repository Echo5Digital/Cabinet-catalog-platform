import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import BathroomDesignPageShell from "@/components/catalog/BathroomDesignPageShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bathroom Design AI — Cabinet Catalog",
  description: "Get personalized bathroom design concepts based on your style and preferences.",
};

async function getCatalogData() {
  try {
    const TENANT_ID = await resolveTenantId();
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
    ]);

    const finishImageMap = {};
    for (const s of finishSwatches || []) {
      if (s.finish_id && !finishImageMap[s.finish_id]) finishImageMap[s.finish_id] = s.public_url;
    }
    const colorImageMap = {};
    for (const s of colorSwatches || []) {
      if (s.color_id && !colorImageMap[s.color_id]) colorImageMap[s.color_id] = s.public_url;
    }

    const allColors = (colors || []).map((c) => ({
      ...c,
      image_url: colorImageMap[c.id] ?? null,
    }));

    // Vanity finishes: filter finishes whose catalog line produces vanity products.
    // Since finishes aren't directly tied to a category, surface all active finishes —
    // the AI route itself scopes recommended SKUs to the Vanity category strictly.
    const vanityFinishes = (finishes || []).map((f) => ({
      ...f,
      image_url: finishImageMap[f.id] ?? null,
    }));

    return {
      countertopColors: allColors.filter((c) => c.color_type === "countertop"),
      floorColors: allColors.filter((c) => c.color_type === "floor"),
      finishes: vanityFinishes,
    };
  } catch {
    return { countertopColors: [], floorColors: [], finishes: [] };
  }
}

export default async function BathroomDesignPage() {
  const { countertopColors, floorColors, finishes } = await getCatalogData();

  return (
    <BathroomDesignPageShell
      countertopColors={countertopColors}
      floorColors={floorColors}
      finishes={finishes}
    />
  );
}
