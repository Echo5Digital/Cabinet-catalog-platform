import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const body = await request.json();
    const allowed = ["is_default", "is_available", "sort_order"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    const admin = createAdminClient();
    const { error } = await admin
      .from("product_finish_map")
      .update(updates)
      .eq("product_id", params.id)
      .eq("finish_id", params.fid);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
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
      .from("product_finish_map")
      .delete()
      .eq("product_id", params.id)
      .eq("finish_id", params.fid);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
