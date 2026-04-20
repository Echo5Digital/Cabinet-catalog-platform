import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .select("id, variant_key, label, sku_suffix, is_default, sort_order")
      .eq("product_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ variants: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { variant_key, label, sku_suffix, is_default = false, sort_order = 0 } = await request.json();
    if (!variant_key || !label) {
      return NextResponse.json({ error: "variant_key and label are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .insert({
        tenant_id: ctx.tenantId,
        product_id: params.id,
        variant_key,
        label,
        sku_suffix: sku_suffix ?? null,
        is_default,
        sort_order,
      })
      .select("id, variant_key, label, sku_suffix, is_default, sort_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `Variant key "${variant_key}" already exists for this product.` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ variant: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
