import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { draftProductDescription } from "@/lib/ai/chat";

/**
 * POST /api/ai/draft/product/[id]
 *
 * Generates a 1–2 sentence product description for a cabinet SKU.
 * Uses only the product's actual specs — never invents features.
 * Saves the draft to products.description if save=true in body.
 */
export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { save = false } = await request.json().catch(() => ({}));

    const admin = createAdminClient();

    const { data: product, error } = await admin
      .from("products")
      .select(`
        id, sku, name, width_in, height_in, depth_in,
        door_count, drawer_count,
        catalog_line:catalog_lines!catalog_line_id(name),
        category:categories!category_id(name)
      `)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Fetch available finishes for context
    const { data: pfmRows } = await admin
      .from("product_finish_map")
      .select("finish:finishes!finish_id(name)")
      .eq("product_id", params.id)
      .eq("is_available", true);

    const finishes = (pfmRows || []).map((r) => r.finish?.name).filter(Boolean);

    const productData = {
      sku: product.sku,
      name: product.name,
      category: product.category?.name,
      catalog_line: product.catalog_line?.name,
      width_in: product.width_in,
      height_in: product.height_in,
      depth_in: product.depth_in,
      door_count: product.door_count,
      drawer_count: product.drawer_count,
      available_finishes: finishes,
    };

    const description = await draftProductDescription(productData);

    // Optionally save back to DB
    if (save && description) {
      await admin
        .from("products")
        .update({ description, updated_at: new Date().toISOString() })
        .eq("id", params.id)
        .eq("tenant_id", ctx.tenantId);
    }

    return NextResponse.json({ description, saved: save && !!description });
  } catch (err) {
    console.error("[ai/draft/product]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
