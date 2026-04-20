import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

/**
 * POST /api/assets/[id]/confirm
 *
 * Validates FK integrity per asset_type, moves asset to confirmed status,
 * sets ai_eligible=true, generates public_url, and creates product_assets row
 * for product_diagram assets.
 *
 * Optional body for product_diagram: { product_id, variant_id, is_primary, sort_order }
 */
export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const body = await request.json().catch(() => ({}));
    const { product_id, variant_id, is_primary = false, sort_order = 0, alt_text } = body;

    const admin = createAdminClient();

    // Fetch current asset
    const { data: asset, error: fetchError } = await admin
      .from("assets")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (fetchError || !asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    if (asset.status === "confirmed") return NextResponse.json({ error: "Asset is already confirmed." }, { status: 409 });

    // ── Integrity checks per asset_type ──────────────────────
    if (!asset.asset_type) {
      return NextResponse.json({ error: "asset_type must be set before confirming." }, { status: 422 });
    }

    if (asset.asset_type === "finish_swatch" && !asset.finish_id) {
      return NextResponse.json(
        { error: "finish_swatch assets require finish_id to be set before confirming." },
        { status: 422 }
      );
    }

    if (asset.asset_type === "lifestyle" && !asset.catalog_line_id) {
      return NextResponse.json(
        { error: "lifestyle assets require catalog_line_id to be set before confirming." },
        { status: 422 }
      );
    }

    if (asset.asset_type === "product_diagram" && !product_id) {
      return NextResponse.json(
        { error: "product_diagram assets require product_id in the request body." },
        { status: 422 }
      );
    }

    // ── Generate public URL ───────────────────────────────────
    // Move file from assets-staging to assets bucket (confirmed)
    const { data: fileData } = await admin.storage
      .from("assets-staging")
      .download(asset.storage_path);

    let publicUrl = null;
    if (fileData) {
      const destPath = `${ctx.tenantId}/${asset.original_filename}`;
      await admin.storage.from("assets").upload(destPath, fileData, {
        contentType: asset.mime_type || "application/octet-stream",
        upsert: true,
      });
      const { data: urlData } = admin.storage.from("assets").getPublicUrl(destPath);
      publicUrl = urlData?.publicUrl ?? null;
    }

    // Look up confirming user
    const { data: confirmer } = await admin
      .from("tenant_users")
      .select("id")
      .eq("auth_user_id", ctx.user.id)
      .single();

    // ── Update asset to confirmed ─────────────────────────────
    const { data: confirmed, error: updateError } = await admin
      .from("assets")
      .update({
        status: "confirmed",
        ai_eligible: true,
        public_url: publicUrl,
        alt_text: alt_text ?? asset.alt_text,
        confirmed_by: confirmer?.id ?? null,
        confirmed_at: new Date().toISOString(),
        reviewed_by: confirmer?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("id, asset_type, status, ai_eligible, public_url")
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // ── Create product_assets row for product_diagram ─────────
    if (asset.asset_type === "product_diagram" && product_id) {
      await admin.from("product_assets").insert({
        tenant_id: ctx.tenantId,
        product_id,
        asset_id: params.id,
        variant_id: variant_id ?? null,
        is_primary,
        sort_order,
      });
    }

    return NextResponse.json({ asset: confirmed });
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
