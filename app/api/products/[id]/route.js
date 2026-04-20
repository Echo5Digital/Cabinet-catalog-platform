import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .select(`
        id, sku, name, description, width_in, height_in, depth_in,
        box_width_in, box_height_in, box_depth_in, door_count, drawer_count,
        notes, is_active, sort_order, created_at, updated_at,
        catalog_line:catalog_lines!catalog_line_id(id, name, slug),
        category:categories!category_id(id, name, slug),
        variants:product_variants(id, variant_key, label, sku_suffix, is_default, sort_order),
        finishes:product_finish_map(
          is_default, is_available, sort_order,
          finish:finishes(id, name, code, finish_family)
        ),
        assets:product_assets(
          id, is_primary, sort_order,
          asset:assets(id, public_url, alt_text, asset_type),
          variant:product_variants(variant_key)
        )
      `)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const body = await request.json();
    const allowed = [
      "name", "description", "width_in", "height_in", "depth_in",
      "box_width_in", "box_height_in", "box_depth_in",
      "door_count", "drawer_count", "notes", "sort_order", "is_active",
    ];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, sku, name, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();
    const { error } = await admin
      .from("products")
      .update({ is_active: false })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
