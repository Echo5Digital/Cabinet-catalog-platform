import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";
import { inToFt } from "@/lib/planner/dimensionConverter";

export const dynamic = "force-dynamic";

/**
 * GET /api/planner/products
 *
 * Returns active products formatted for the Kitchen Planner sidebar.
 * Dimensions are converted from inches (DB) to feet (planner display).
 * Does NOT modify the database schema or existing product data.
 */
export async function GET(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const admin = createAdminClient();

    // Fetch active products with category info
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, sku, name, width_in, depth_in, sort_order, categories(id, name, sort_order)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(200);

    if (productsError) {
      console.error("[planner/products] DB error:", productsError.message);
      return NextResponse.json({ error: "Failed to load products." }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Fetch primary confirmed images for these products
    const productIds = products.map((p) => p.id);
    const { data: primaryAssets } = await admin
      .from("product_assets")
      .select("product_id, asset:assets!asset_id(public_url, status)")
      .in("product_id", productIds)
      .eq("is_primary", true);

    // Build image map: product_id → first confirmed primary image URL
    const imageMap = {};
    for (const row of primaryAssets || []) {
      if (!imageMap[row.product_id] && row.asset?.status === "confirmed" && row.asset?.public_url) {
        imageMap[row.product_id] = row.asset.public_url;
      }
    }

    // Fallback: fetch any confirmed image for products without a primary
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

    // Map to planner format — convert dimensions from inches to feet
    const plannerProducts = products.map((p) => ({
      id:       p.id,
      sku:      p.sku,
      name:     p.name,
      category: p.categories?.name || "Cabinets",
      widthFt:  inToFt(p.width_in),
      depthFt:  inToFt(p.depth_in),
      imageUrl: imageMap[p.id] || null,
    }));

    return NextResponse.json({ products: plannerProducts });
  } catch (err) {
    console.error("[planner/products] error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
