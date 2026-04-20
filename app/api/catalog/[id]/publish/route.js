import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();
    const lineId = params.id;
    const { label, notes } = await request.json().catch(() => ({}));

    // Load line
    const { data: line } = await admin
      .from("catalog_lines")
      .select("id, name, slug, tenant_id")
      .eq("id", lineId)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!line) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });

    // ── Run pre-publish checklist ─────────────────────────────
    const [{ data: products }, { data: finishes }] = await Promise.all([
      admin.from("products").select("id, sku, name, width_in, height_in, depth_in").eq("catalog_line_id", lineId).eq("is_active", true),
      admin.from("finishes").select("id, code, name").eq("catalog_line_id", lineId).eq("is_active", true),
    ]);

    const blockers = [];

    for (const product of products ?? []) {
      const { count } = await admin
        .from("product_assets")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id);
      if (!count || count === 0) {
        blockers.push({ type: "missing_product_image", sku: product.sku });
      }
    }

    for (const finish of finishes ?? []) {
      const { count } = await admin
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("finish_id", finish.id)
        .eq("asset_type", "finish_swatch")
        .eq("status", "confirmed");
      if (!count || count === 0) {
        blockers.push({ type: "missing_finish_swatch", finish_code: finish.code });
      }
    }

    const { count: pendingCount } = await admin
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("catalog_line_id", lineId)
      .in("status", ["pending_review", "flagged"]);

    if (pendingCount > 0) {
      blockers.push({ type: "pending_assets", count: pendingCount });
    }

    if (blockers.length > 0) {
      return NextResponse.json({ published: false, blockers }, { status: 422 });
    }

    // ── Build snapshot ────────────────────────────────────────
    const productIds = (products ?? []).map((p) => p.id);

    const [{ data: productAssets }, { data: finishAssets }, { data: lifestyleAssets }, { data: productFinishMap }] =
      await Promise.all([
        admin.from("product_assets").select("product_id, asset:assets(public_url, alt_text), is_primary, sort_order").in("product_id", productIds),
        admin.from("assets").select("finish_id, public_url, alt_text").in("finish_id", (finishes ?? []).map((f) => f.id)).eq("asset_type", "finish_swatch").eq("status", "confirmed"),
        admin.from("assets").select("public_url, alt_text").eq("catalog_line_id", lineId).eq("asset_type", "lifestyle").eq("status", "confirmed"),
        admin.from("product_finish_map").select("product_id, finish_id, is_default").in("product_id", productIds),
      ]);

    const paByProduct = {};
    for (const pa of productAssets ?? []) {
      if (!paByProduct[pa.product_id]) paByProduct[pa.product_id] = [];
      paByProduct[pa.product_id].push(pa);
    }

    const faByFinish = {};
    for (const fa of finishAssets ?? []) faByFinish[fa.finish_id] = fa.public_url;

    const pfByProduct = {};
    for (const pf of productFinishMap ?? []) {
      if (!pfByProduct[pf.product_id]) pfByProduct[pf.product_id] = [];
      pfByProduct[pf.product_id].push(pf.finish_id);
    }

    const snapshot = {
      line: { id: line.id, name: line.name, slug: line.slug },
      products: (products ?? []).map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        width_in: p.width_in,
        height_in: p.height_in,
        depth_in: p.depth_in,
        finish_ids: pfByProduct[p.id] ?? [],
        images: (paByProduct[p.id] ?? []).map((pa) => ({
          url: pa.asset?.public_url,
          is_primary: pa.is_primary,
          sort_order: pa.sort_order,
        })),
      })),
      finishes: (finishes ?? []).map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        swatch_url: faByFinish[f.id] ?? null,
      })),
      lifestyle_images: (lifestyleAssets ?? []).map((a) => a.public_url),
    };

    // ── Get next version number ───────────────────────────────
    const { data: lastVersion } = await admin
      .from("catalog_versions")
      .select("version_number")
      .eq("catalog_line_id", lineId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_number ?? 0) + 1;

    // Look up publisher's tenant_user id
    const { data: publisher } = await admin
      .from("tenant_users")
      .select("id")
      .eq("auth_user_id", ctx.user.id)
      .single();

    // ── Write version + update line (in sequence) ─────────────
    const { data: version, error: versionError } = await admin
      .from("catalog_versions")
      .insert({
        tenant_id: ctx.tenantId,
        catalog_line_id: lineId,
        version_number: nextVersion,
        status: "published",
        label: label ?? null,
        notes: notes ?? null,
        snapshot,
        product_count: products?.length ?? 0,
        finish_count: finishes?.length ?? 0,
        asset_count: (productAssets?.length ?? 0) + (finishAssets?.length ?? 0) + (lifestyleAssets?.length ?? 0),
        published_by: publisher?.id ?? null,
      })
      .select("id, version_number")
      .single();

    if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 });

    // Archive previous published version
    await admin
      .from("catalog_versions")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("catalog_line_id", lineId)
      .eq("status", "published")
      .neq("id", version.id);

    // Publish the line
    await admin
      .from("catalog_lines")
      .update({ status: "published", published_at: new Date().toISOString(), published_by: publisher?.id ?? null })
      .eq("id", lineId);

    // Write audit log
    await admin.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      performed_by: publisher?.id ?? null,
      action: "publish",
      table_name: "catalog_lines",
      record_id: lineId,
      new_values: { version_number: nextVersion, product_count: products?.length ?? 0 },
    });

    return NextResponse.json({
      published: true,
      version_number: nextVersion,
      version_id: version.id,
      product_count: products?.length ?? 0,
      finish_count: finishes?.length ?? 0,
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
