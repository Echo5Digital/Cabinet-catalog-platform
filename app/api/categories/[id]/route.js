import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const body = await request.json();
    const allowed = ["name", "slug", "description", "sort_order"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (updates.slug) updates.slug = updates.slug.toLowerCase().trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, name, slug, sort_order")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json({ category: data });
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

    // Block if products exist in this category
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} product(s) still use this category.` },
        { status: 409 }
      );
    }

    const { error } = await admin
      .from("categories")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
