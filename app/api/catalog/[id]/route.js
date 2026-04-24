import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_lines")
      .select(`
        id, name, slug, description, status, sort_order, published_at, created_at, updated_at,
        manufacturer:manufacturers(id, name, slug)
      `)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });

    // Include last published snapshot's product count so admin UI can detect pending changes
    let lastPublishedProductCount = null;
    if (data.status === "published") {
      const { data: lastVersion } = await admin
        .from("catalog_versions")
        .select("product_count")
        .eq("catalog_line_id", params.id)
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "published")
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      lastPublishedProductCount = lastVersion?.product_count ?? null;
    }

    return NextResponse.json({ line: { ...data, last_published_product_count: lastPublishedProductCount } });
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
    const allowed = ["name", "description", "sort_order", "manufacturer_id"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_lines")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, name, slug, status, sort_order")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });
    return NextResponse.json({ line: data });
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
      .from("catalog_lines")
      .update({ status: "archived" })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
