import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { backfillFinishIds } from "@/lib/catalog/backfillFinishIds";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();
    const lineId = params.id;

    // Auto-link any confirmed finish_swatch assets that are missing finish_id
    await backfillFinishIds(lineId, ctx.tenantId, admin);

    // Load all active products for this line
    const { data: products } = await admin
      .from("products")
      .select("id, sku, name")
      .eq("catalog_line_id", lineId)
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true);

    // Load all active finishes for this line
    const { data: finishes } = await admin
      .from("finishes")
      .select("id, code, name")
      .eq("catalog_line_id", lineId)
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true);

    const blockers = [];
    const warnings = [];

    // Check each product has ≥1 confirmed product_diagram in product_assets
    for (const product of products ?? []) {
      const { count } = await admin
        .from("product_assets")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id)
        .eq("tenant_id", ctx.tenantId);

      if (!count || count === 0) {
        blockers.push({
          type: "missing_product_image",
          sku: product.sku,
          product_id: product.id,
          message: `${product.sku} — no confirmed product_diagram asset`,
        });
      }
    }

    // Check each finish has a confirmed finish_swatch
    for (const finish of finishes ?? []) {
      const { count } = await admin
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("finish_id", finish.id)
        .eq("asset_type", "finish_swatch")
        .eq("status", "confirmed")
        .eq("tenant_id", ctx.tenantId);

      if (!count || count === 0) {
        blockers.push({
          type: "missing_finish_swatch",
          finish_code: finish.code,
          finish_id: finish.id,
          message: `${finish.name} — no confirmed finish_swatch asset`,
        });
      }
    }

    // Check products with explicit finish mappings that have none available
    // (empty mappings = all finishes implicitly available — not a blocker)
    if ((products ?? []).length > 0) {
      const productIds = (products ?? []).map((p) => p.id);
      const { data: allMappings } = await admin
        .from("product_finish_map")
        .select("product_id, is_available")
        .in("product_id", productIds);

      const mappingsByProduct = {};
      for (const m of allMappings ?? []) {
        if (!mappingsByProduct[m.product_id]) mappingsByProduct[m.product_id] = [];
        mappingsByProduct[m.product_id].push(m);
      }

      for (const product of products ?? []) {
        const mappings = mappingsByProduct[product.id] ?? [];
        if (mappings.length > 0 && !mappings.some((m) => m.is_available)) {
          blockers.push({
            type: "no_available_finishes",
            sku: product.sku,
            product_id: product.id,
            message: `${product.sku} has explicit finish mappings but none are marked available`,
          });
        }
      }
    }

    // Check for pending or flagged assets linked to this line
    const { count: pendingCount } = await admin
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("catalog_line_id", lineId)
      .in("status", ["pending_review", "flagged"])
      .eq("tenant_id", ctx.tenantId);

    if (pendingCount > 0) {
      blockers.push({
        type: "pending_assets",
        count: pendingCount,
        message: `${pendingCount} asset(s) still pending review or flagged`,
      });
    }

    // Warning: no lifestyle images
    const { count: lifestyleCount } = await admin
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("catalog_line_id", lineId)
      .eq("asset_type", "lifestyle")
      .eq("status", "confirmed")
      .eq("tenant_id", ctx.tenantId);

    if (!lifestyleCount || lifestyleCount === 0) {
      warnings.push({ type: "no_lifestyle_images", message: "No confirmed lifestyle images for this line" });
    }

    return NextResponse.json({
      ready: blockers.length === 0,
      blockers,
      warnings,
      summary: {
        active_products: products?.length ?? 0,
        active_finishes: finishes?.length ?? 0,
        lifestyle_images: lifestyleCount ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
