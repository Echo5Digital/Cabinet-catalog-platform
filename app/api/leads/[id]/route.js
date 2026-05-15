import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();
    const { data: lead, error } = await admin
      .from("lead_requests")
      .select(`
        id, name, email, phone, company, status, source,
        project_description, notes, internal_notes, before_image_url, followed_up_at, created_at,
        assigned_to:tenant_users!assigned_to(id, email, full_name)
      `)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const { data: items } = await admin
      .from("lead_request_items")
      .select("id, product_sku, product_name, finish_name, quantity, notes, sort_order, variant_id, product_id")
      .eq("lead_request_id", params.id)
      .order("sort_order", { ascending: true });

    // Fetch product images via product_assets join table
    const productIds = (items || []).filter((i) => i.product_id).map((i) => i.product_id);
    let productImageMap = {};
    if (productIds.length > 0) {
      // Prefer primary image
      const { data: primaryRows } = await admin
        .from("product_assets")
        .select("product_id, asset:assets!asset_id(public_url)")
        .in("product_id", productIds)
        .eq("is_primary", true);
      for (const row of primaryRows || []) {
        if (row.asset?.public_url && !productImageMap[row.product_id]) {
          productImageMap[row.product_id] = row.asset.public_url;
        }
      }
      // Fall back to any image for products still missing
      const uncovered = productIds.filter((id) => !productImageMap[id]);
      if (uncovered.length > 0) {
        const { data: fallbackRows } = await admin
          .from("product_assets")
          .select("product_id, asset:assets!asset_id(public_url)")
          .in("product_id", uncovered)
          .order("sort_order", { ascending: true })
          .limit(uncovered.length * 3);
        for (const row of fallbackRows || []) {
          if (row.asset?.public_url && !productImageMap[row.product_id]) {
            productImageMap[row.product_id] = row.asset.public_url;
          }
        }
      }
    }
    const itemsWithImages = (items || []).map((item) => ({
      ...item,
      image_url: item.product_id ? (productImageMap[item.product_id] ?? null) : null,
    }));

    return NextResponse.json({ lead: { ...lead, items: itemsWithImages } });
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
    const allowed = ["status", "assigned_to", "internal_notes"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    // Auto-set followed_up_at on first status change away from 'new'
    if (updates.status && updates.status !== "new") {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("lead_requests")
        .select("status, followed_up_at")
        .eq("id", params.id)
        .single();
      if (existing && existing.status === "new" && !existing.followed_up_at) {
        updates.followed_up_at = new Date().toISOString();
      }
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("lead_requests")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, status, assigned_to, internal_notes, followed_up_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    return NextResponse.json({ lead: data });
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
      .from("lead_requests")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
