import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const finish = searchParams.get("finish");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "48", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    // Resolve line
    const { data: line } = await admin
      .from("catalog_lines")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (!line) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });

    let query = admin
      .from("products")
      .select(
        `id, sku, name, width_in, height_in, depth_in, door_count, drawer_count,
         category:categories!category_id(id, name, slug)`,
        { count: "exact" }
      )
      .eq("catalog_line_id", line.id)
      .eq("tenant_id", TENANT_ID)
      .eq("is_active", true)
      .order("sku", { ascending: true })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq("categories.slug", category);

    const { data: products, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch primary images for all products
    const productIds = (products ?? []).map((p) => p.id);
    const { data: primaryAssets } = await admin
      .from("product_assets")
      .select("product_id, asset:assets!asset_id(public_url, alt_text)")
      .in("product_id", productIds)
      .eq("is_primary", true);

    const imageByProduct = {};
    for (const pa of primaryAssets ?? []) {
      imageByProduct[pa.product_id] = pa.asset?.public_url ?? null;
    }

    const enriched = (products ?? []).map((p) => ({
      ...p,
      primary_image_url: imageByProduct[p.id] ?? null,
    }));

    return NextResponse.json({ products: enriched, total: count, page, limit });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
