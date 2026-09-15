import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasSectionAccess, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasSectionAccess(ctx, "design", "editor")) return forbidden();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("design_quotes")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ quote: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasSectionAccess(ctx, "design", "editor")) return forbidden();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Allowlist client-editable fields only — everything else (tenant_id,
    // created_by, created_at, id, ...) is ignored rather than blocklisted so
    // new/unlisted columns can never be mass-assigned via this endpoint.
    const EDITABLE_FIELDS = [
      "customer_name", "customer_email",
      "room_width", "room_depth", "room_height",
      "style_notes", "svg_floor_plan", "design_image_url",
      "quote_items", "quote_notes", "tax_rate",
      "status", "pdf_url", "design_params",
    ];
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("design_quotes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id")
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: error ? 500 : 404 });
    return NextResponse.json({ quote: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasSectionAccess(ctx, "design", "editor")) return forbidden();

    const admin = createAdminClient();
    const { error } = await admin
      .from("design_quotes")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
