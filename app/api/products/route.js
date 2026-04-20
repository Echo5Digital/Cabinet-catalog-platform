import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const line = searchParams.get("line");
    const category = searchParams.get("category");
    const active = searchParams.get("active");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    let query = admin
      .from("products")
      .select(
        `id, sku, name, description, width_in, height_in, depth_in, door_count, drawer_count, is_active, sort_order,
         catalog_line:catalog_lines!catalog_line_id(id, name, slug),
         category:categories!category_id(id, name, slug)`,
        { count: "exact" }
      )
      .eq("tenant_id", ctx.tenantId)
      .order("sku", { ascending: true })
      .range(offset, offset + limit - 1);

    if (line) query = query.eq("catalog_lines.slug", line);
    if (category) query = query.eq("categories.slug", category);
    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);
    if (search) query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data, total: count, page, limit });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const {
      catalog_line_id, category_id, sku, name, description,
      width_in, height_in, depth_in, box_width_in, box_height_in, box_depth_in,
      door_count, drawer_count, notes, sort_order = 0,
    } = await request.json();

    if (!catalog_line_id || !category_id || !sku || !name) {
      return NextResponse.json(
        { error: "catalog_line_id, category_id, sku, and name are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .insert({
        tenant_id: ctx.tenantId,
        catalog_line_id,
        category_id,
        sku: sku.toUpperCase().trim(),
        name: name.trim(),
        description: description ?? null,
        width_in: width_in ?? null,
        height_in: height_in ?? null,
        depth_in: depth_in ?? null,
        box_width_in: box_width_in ?? null,
        box_height_in: box_height_in ?? null,
        box_depth_in: box_depth_in ?? null,
        door_count: door_count ?? null,
        drawer_count: drawer_count ?? null,
        notes: notes ?? null,
        sort_order,
      })
      .select("id, sku, name, catalog_line_id, category_id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `SKU "${sku.toUpperCase()}" already exists in this catalog line.` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
