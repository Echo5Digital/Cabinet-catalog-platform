import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const admin = createAdminClient();

    // Resolve line
    const { data: line } = await admin
      .from("catalog_lines")
      .select("id, name, slug")
      .eq("tenant_id", tenantId)
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (!line) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });

    // Fetch product
    const { data: product, error } = await admin
      .from("products")
      .select(`
        id, sku, name, description, width_in, height_in, depth_in,
        door_count, drawer_count,
        category:categories!category_id(id, name, slug),
        variants:product_variants(id, variant_key, label, sku_suffix, is_default, sort_order)
      `)
      .eq("catalog_line_id", line.id)
      .eq("tenant_id", tenantId)
      .eq("sku", params.sku.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    // Fetch confirmed images
    const { data: productAssets } = await admin
      .from("product_assets")
      .select(`
        is_primary, sort_order,
        asset:assets!asset_id(public_url, alt_text),
        variant:product_variants!variant_id(variant_key)
      `)
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    // Fetch available finishes (with incompatibility rules applied)
    const { data: finishMap } = await admin
      .from("product_finish_map")
      .select(`
        is_default, sort_order,
        finish:finishes!finish_id(id, name, code, finish_family)
      `)
      .eq("product_id", product.id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true });

    // Fetch finish swatches
    const finishIds = (finishMap ?? []).map((fm) => fm.finish?.id).filter(Boolean);
    const { data: swatches } = await admin
      .from("assets")
      .select("finish_id, public_url, alt_text")
      .in("finish_id", finishIds)
      .eq("asset_type", "finish_swatch")
      .eq("status", "confirmed");

    const swatchByFinish = {};
    for (const s of swatches ?? []) swatchByFinish[s.finish_id] = s.public_url;

    // Fetch active rules
    const { data: rules } = await admin
      .from("product_rules")
      .select("id, rule_type, rule_value, label")
      .eq("product_id", product.id)
      .eq("is_active", true);

    return NextResponse.json({
      product: {
        ...product,
        catalog_line: { name: line.name, slug: line.slug },
        images: (productAssets ?? []).map((pa) => ({
          url: pa.asset?.public_url ?? null,
          alt_text: pa.asset?.alt_text ?? null,
          is_primary: pa.is_primary,
          sort_order: pa.sort_order,
          variant_key: pa.variant?.variant_key ?? null,
        })),
        finishes: (finishMap ?? []).map((fm) => ({
          id: fm.finish?.id,
          name: fm.finish?.name,
          code: fm.finish?.code,
          finish_family: fm.finish?.finish_family,
          is_default: fm.is_default,
          swatch_url: swatchByFinish[fm.finish?.id] ?? null,
        })),
        rules: rules ?? [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
