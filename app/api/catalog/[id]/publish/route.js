import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { buildCatalogSnapshot } from "@/lib/catalog/buildSnapshot";

export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();
    const lineId = params.id;
    const { label, notes } = await request.json().catch(() => ({}));

    const result = await buildCatalogSnapshot(lineId, ctx.tenantId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });

    if (result.blockers.length > 0) {
      return NextResponse.json({ published: false, blockers: result.blockers }, { status: 422 });
    }

    const { snapshot, counts } = result;

    const { data: lastVersion } = await admin
      .from("catalog_versions")
      .select("version_number")
      .eq("catalog_line_id", lineId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_number ?? 0) + 1;

    const { data: publisher } = await admin
      .from("tenant_users")
      .select("id")
      .eq("auth_user_id", ctx.user.id)
      .single();

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
        product_count: counts.products,
        finish_count: counts.finishes,
        asset_count: counts.assets,
        published_by: publisher?.id ?? null,
      })
      .select("id, version_number")
      .single();

    if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 });

    // Archive previous published version + discard any pending draft
    await Promise.all([
      admin
        .from("catalog_versions")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("catalog_line_id", lineId)
        .eq("status", "published")
        .neq("id", version.id),
      admin
        .from("catalog_versions")
        .delete()
        .eq("catalog_line_id", lineId)
        .eq("status", "draft"),
    ]);

    await admin
      .from("catalog_lines")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_by: publisher?.id ?? null,
      })
      .eq("id", lineId);

    await admin.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      performed_by: publisher?.id ?? null,
      action: "publish",
      table_name: "catalog_lines",
      record_id: lineId,
      new_values: { version_number: nextVersion, product_count: counts.products },
    });

    return NextResponse.json({
      published: true,
      version_number: nextVersion,
      version_id: version.id,
      product_count: counts.products,
      finish_count: counts.finishes,
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
