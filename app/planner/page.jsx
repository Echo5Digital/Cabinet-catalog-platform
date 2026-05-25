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

export default async function PlannerPage() {
  let tenant          = {};
  let initialProducts = [];

  try {
    const tenantId = await resolveTenantId();
    if (tenantId) {
      const admin = createAdminClient();
      [tenant, initialProducts] = await Promise.all([
        getTenant(tenantId, admin),
        getPlannerProducts(tenantId, admin),
      ]);
    }
  } catch {
    // Planner still renders without data — sidebar shows empty state
  }

  return <PlannerShell tenant={tenant} initialProducts={initialProducts} />;
}
