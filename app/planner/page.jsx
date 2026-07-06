import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import { inToFt } from "@/lib/planner/dimensionConverter";
import PlannerShell from "@/components/planner/PlannerShell";

export const dynamic = "force-dynamic";

/**
 * Fetch tenant branding data for the planner header.
 */
async function getTenant(tenantId, admin) {
  try {
    const { data } = await admin
      .from("tenants")
      .select("name, logo_url, primary_color, contact_email")
      .eq("id", tenantId)
      .single();
    return data || {};
  } catch {
    return {};
  }
}

/**
 * Fetch active products for the planner sidebar.
 * Converts inch dimensions to feet for display.
 * Does NOT modify existing product data.
 */
async function getPlannerProducts(tenantId, admin) {
  try {
    const { data: products } = await admin
      .from("products")
      .select("id, sku, name, width_in, depth_in, door_count, drawer_count, sort_order, categories(id, name, sort_order), catalog_line:catalog_lines!catalog_line_id(id, name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(200);

    if (!products || products.length === 0) return [];

    // Fetch primary confirmed images
    const productIds = products.map((p) => p.id);

    const { data: primaryAssets } = await admin
      .from("product_assets")
      .select("product_id, asset:assets!asset_id(public_url, status)")
      .in("product_id", productIds)
      .eq("is_primary", true);

    const imageMap = {};
    for (const row of primaryAssets || []) {
      if (!imageMap[row.product_id] && row.asset?.status === "confirmed" && row.asset?.public_url) {
        imageMap[row.product_id] = row.asset.public_url;
      }
    }

    // Fallback images for products without a primary asset
    const uncoveredIds = productIds.filter((id) => !imageMap[id]);
    if (uncoveredIds.length > 0) {
      const { data: fallbackAssets } = await admin
        .from("product_assets")
        .select("product_id, asset:assets!asset_id(public_url, status)")
        .in("product_id", uncoveredIds)
        .order("sort_order", { ascending: true })
        .limit(uncoveredIds.length * 3);

      for (const row of fallbackAssets || []) {
        if (!imageMap[row.product_id] && row.asset?.status === "confirmed" && row.asset?.public_url) {
          imageMap[row.product_id] = row.asset.public_url;
        }
      }
    }

    return products.map((p) => ({
      id:       p.id,
      sku:      p.sku,
      name:     p.name,
      category: p.categories?.name || "Cabinets",
      lineName: p.catalog_line?.name || "",
      widthFt:  inToFt(p.width_in),
      depthFt:  inToFt(p.depth_in),
      imageUrl:    imageMap[p.id] || null,
      doorCount:   p.door_count   ?? null,
      drawerCount: p.drawer_count ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch active finishes grouped by catalog line so the planner sidebar can
 * show the correct finish options based on the selected cabinet style.
 */
async function getPlannerFinishes(tenantId, admin) {
  try {
    const { data: lines } = await admin
      .from("catalog_lines")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });

    if (!lines || lines.length === 0) return [];

    const { data: finishes } = await admin
      .from("finishes")
      .select("id, name, code, description, finish_family, catalog_line_id, sort_order")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!finishes || finishes.length === 0) return [];

    const finishIds = finishes.map((f) => f.id);
    const { data: swatches } = await admin
      .from("assets")
      .select("finish_id, public_url")
      .in("finish_id", finishIds)
      .eq("asset_type", "finish_swatch")
      .eq("status", "confirmed");

    const swatchMap = {};
    for (const s of swatches || []) swatchMap[s.finish_id] = s.public_url;

    const lineMap = {};
    for (const line of lines) {
      lineMap[line.id] = { lineId: line.id, lineName: line.name, finishes: [] };
    }
    for (const f of finishes) {
      if (f.catalog_line_id && lineMap[f.catalog_line_id]) {
        lineMap[f.catalog_line_id].finishes.push({
          id:           f.id,
          name:         f.name,
          code:         f.code,
          description:  f.description  || null,
          finishFamily: f.finish_family,
          swatchUrl:    swatchMap[f.id] || null,
        });
      }
    }

    return Object.values(lineMap).filter((g) => g.finishes.length > 0);
  } catch {
    return [];
  }
}

/**
 * Fetch active layout structures with their swatch image URLs.
 * Uses two separate queries (same pattern as /app/catalog/structures/page.jsx)
 * to avoid Supabase join tenant-filter limitations.
 */
async function getLayoutStructures(tenantId, admin) {
  try {
    // Step 1: fetch structures filtered by tenant
    const { data: structures } = await admin
      .from("structures")
      .select("id, name, code, sort_order")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!structures || structures.length === 0) return [];

    // Step 2: fetch assets by structure_id membership — avoids any tenant_id
    // mismatch on the assets table (implicit tenant safety via FK relationship)
    const structureIds = structures.map((s) => s.id);
    const { data: assets } = await admin
      .from("assets")
      .select("structure_id, public_url, asset_type")
      .in("structure_id", structureIds)
      .in("asset_type", ["structure_image", "structure_reference"])
      .eq("status", "confirmed");

    // Map structure_id → URL; prefer structure_image over structure_reference
    const imageMap = {};
    for (const a of assets || []) {
      const existing = imageMap[a.structure_id];
      if (!existing || (existing.type !== "structure_image" && a.asset_type === "structure_image")) {
        imageMap[a.structure_id] = { url: a.public_url, type: a.asset_type };
      }
    }

    return structures.map((s) => ({
      ...s,
      imageUrl: imageMap[s.id]?.url ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function PlannerPage() {
  let tenant             = {};
  let initialProducts    = [];
  let initialStructures  = [];
  let initialFinishes    = [];

  try {
    const tenantId = await resolveTenantId();
    if (tenantId) {
      const admin = createAdminClient();
      [tenant, initialProducts, initialStructures, initialFinishes] = await Promise.all([
        getTenant(tenantId, admin),
        getPlannerProducts(tenantId, admin),
        getLayoutStructures(tenantId, admin),
        getPlannerFinishes(tenantId, admin),
      ]);
    }
  } catch {
    // Planner still renders without data — sidebar shows empty state
  }

  return (
    <PlannerShell
      tenant={tenant}
      initialProducts={initialProducts}
      initialStructures={initialStructures}
      initialFinishes={initialFinishes}
    />
  );
}
