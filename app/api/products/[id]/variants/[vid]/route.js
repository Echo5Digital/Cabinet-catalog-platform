import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const body = await request.json();
    const allowed = ["label", "sku_suffix", "is_default", "sort_order"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .update(updates)
      .eq("id", params.vid)
      .eq("product_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, variant_key, label, is_default, sort_order")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    return NextResponse.json({ variant: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();
    const { error } = await admin
      .from("product_variants")
      .delete()
      .eq("id", params.vid)
      .eq("product_id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
