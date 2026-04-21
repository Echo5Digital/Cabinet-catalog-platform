import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

/**
 * POST /api/catalog/[id]/versions/[vid]/rollback
 *
 * Restores an archived version's snapshot as the current live catalog.
 * Creates a NEW version record (history is never rewritten).
 * Does not modify the live products table — only the published snapshot changes.
 */
export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();

    const { data: target } = await admin
      .from("catalog_versions")
      .select("id, version_number, status, label, snapshot, product_count, finish_count, asset_count")
      .eq("id", params.vid)
      .eq("catalog_line_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!target) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    if (target.status === "draft") {
      return NextResponse.json({ error: "Cannot roll back to a draft version." }, { status: 422 });
    }
    if (target.status === "published") {
      return NextResponse.json({ error: "This version is already live." }, { status: 422 });
    }

    const { data: actor } = await admin
      .from("tenant_users")
      .select("id")
      .eq("auth_user_id", ctx.user.id)
      .single();

    const { data: lastVersion } = await admin
      .from("catalog_versions")
      .select("version_number")
      .eq("catalog_line_id", params.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_number ?? 0) + 1;
    const now = new Date().toISOString();
    const restoredLabel = `${target.label || `v${target.version_number}`} (restored)`;

    const { data: newVersion, error } = await admin
      .from("catalog_versions")
      .insert({
        tenant_id: ctx.tenantId,
        catalog_line_id: params.id,
        version_number: nextVersion,
        status: "published",
        label: restoredLabel,
        notes: `Rolled back from v${target.version_number}`,
        snapshot: target.snapshot,
        product_count: target.product_count,
        finish_count: target.finish_count,
        asset_count: target.asset_count,
        published_by: actor?.id ?? null,
        published_at: now,
      })
      .select("id, version_number")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Archive previous published + discard any draft
    await Promise.all([
      admin
        .from("catalog_versions")
        .update({ status: "archived", archived_at: now })
        .eq("catalog_line_id", params.id)
        .eq("status", "published")
        .neq("id", newVersion.id),
      admin
        .from("catalog_versions")
        .delete()
        .eq("catalog_line_id", params.id)
        .eq("status", "draft"),
    ]);

    // Keep line published with updated timestamp
    await admin
      .from("catalog_lines")
      .update({ published_at: now, published_by: actor?.id ?? null })
      .eq("id", params.id);

    await admin.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      performed_by: actor?.id ?? null,
      action: "version_rollback",
      table_name: "catalog_lines",
      record_id: params.id,
      old_values: { restored_from_version: target.version_number },
      new_values: { new_version_number: nextVersion },
    });

    return NextResponse.json({
      rolled_back: true,
      restored_from_version: target.version_number,
      new_version_number: nextVersion,
      new_version_id: newVersion.id,
    });
  } catch (err) {
    console.error("[rollback]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
