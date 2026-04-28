import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const body = await request.json();
    const allowed = ["name", "code", "description", "color_type", "sort_order", "is_active"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (updates.code) updates.code = updates.code.toLowerCase().trim();
    if (updates.color_type && !["countertop", "floor"].includes(updates.color_type)) {
      return NextResponse.json({ error: "color_type must be 'countertop' or 'floor'." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("colors")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, name, code, color_type, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Color not found." }, { status: 404 });
    return NextResponse.json({ color: data });
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
      .from("colors")
      .update({ is_active: false })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
