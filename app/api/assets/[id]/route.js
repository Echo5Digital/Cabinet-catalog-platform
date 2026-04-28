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
      "parsed_finish_code", "parsed_color_code", "parsed_structure_code",
      "parsed_variant", "parsed_sequence",
      "catalog_line_id", "finish_id", "color_id", "structure_id",
      "alt_text", "ai_description",
    ];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Convert empty strings to null for UUID fields to avoid postgres type errors
    for (const field of ["catalog_line_id", "finish_id", "color_id", "structure_id"]) {
      if (field in updates && updates[field] === "") updates[field] = null;
    }

    // Auto-update confidence when FK relationships are manually resolved
    const resolvedType = updates.asset_type;
    const resolvedFinishId = updates.finish_id;
    const resolvedLineId = updates.catalog_line_id;
    if (resolvedType === "finish_swatch" && resolvedFinishId) {
      updates.confidence = "matched";
    } else if (resolvedType === "lifestyle" && resolvedLineId) {
      updates.confidence = "matched";
    } else if (resolvedType === "color_swatch" && updates.color_id) {
      updates.confidence = "matched";
    } else if (resolvedType === "structure_image" && updates.structure_id) {
      updates.confidence = "matched";
    } else if (resolvedType === "product_diagram" && updates.parsed_sku) {
      updates.confidence = "partial";
    }

    // Mark as manually corrected (server-set, not from client body)
    updates.is_corrected = true;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assets")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, asset_type, confidence, status, is_corrected, parsed_sku, parsed_finish_code, parsed_color_code, parsed_structure_code, catalog_line_id, finish_id, color_id, structure_id")
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
