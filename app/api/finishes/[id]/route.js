import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("finishes")
      .select(`
        id, name, code, finish_family, description, is_active, sort_order,
        catalog_line:catalog_lines(id, name, slug),
        swatch:assets(public_url, alt_text)
      `)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .eq("assets.asset_type", "finish_swatch")
      .eq("assets.status", "confirmed")
      .single();

    if (error || !data) return NextResponse.json({ error: "Finish not found." }, { status: 404 });
    return NextResponse.json({ finish: data });
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
    const allowed = ["name", "code", "description", "finish_family", "sort_order", "is_active", "catalog_line_id"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (updates.code) updates.code = updates.code.toLowerCase().trim();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("finishes")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, name, code, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Finish not found." }, { status: 404 });
    return NextResponse.json({ finish: data });
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
      .from("finishes")
      .update({ is_active: false })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
