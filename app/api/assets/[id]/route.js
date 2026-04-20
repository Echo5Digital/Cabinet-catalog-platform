import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assets")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    return NextResponse.json({ asset: data });
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
    // Admin can correct parsed metadata and resolved FKs before confirming
    const allowed = [
      "asset_type",
      "parsed_line_slug", "parsed_category_slug", "parsed_sku",
      "parsed_finish_code", "parsed_variant", "parsed_sequence",
      "catalog_line_id", "finish_id",
      "alt_text", "ai_description",
    ];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assets")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, asset_type, confidence, status, parsed_sku, catalog_line_id, finish_id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    return NextResponse.json({ asset: data });
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
    // Fetch first to get storage_path for cleanup
    const { data: asset } = await admin
      .from("assets")
      .select("storage_bucket, storage_path")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });

    // Delete from storage
    await admin.storage.from(asset.storage_bucket).remove([asset.storage_path]);

    // Hard delete from DB
    const { error } = await admin
      .from("assets")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
