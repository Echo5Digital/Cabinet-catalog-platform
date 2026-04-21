import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { buildCatalogSnapshot } from "@/lib/catalog/buildSnapshot";

/**
 * POST /api/catalog/[id]/versions/draft
 *
 * Creates a draft snapshot of the current catalog state without publishing.
 * Only one draft can exist per line. Blockers are returned as warnings, not errors,
 * so admins can stage and review before everything is ready.
 */
export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();
    const lineId = params.id;
    const { label, notes } = await request.json().catch(() => ({}));

    // Only one draft at a time
    const { data: existingDraft } = await admin
      .from("catalog_versions")
      .select("id, version_number, published_at")
      .eq("catalog_line_id", lineId)
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "draft")
      .single();

    if (existingDraft) {
      return NextResponse.json(
        {
          error: "A draft already exists. Discard it before creating a new one.",
          existing_draft: {
            id: existingDraft.id,
            version_number: existingDraft.version_number,
            created_at: existingDraft.published_at,
          },
        },
        { status: 409 }
      );
    }

    const result = await buildCatalogSnapshot(lineId, ctx.tenantId);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });

    const { snapshot, counts, blockers } = result;

    const { data: lastVersion } = await admin
      .from("catalog_versions")
      .select("version_number")
      .eq("catalog_line_id", lineId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (lastVersion?.version_number ?? 0) + 1;

    const { data: actor } = await admin
      .from("tenant_users")
      .select("id")
      .eq("auth_user_id", ctx.user.id)
      .single();

    const { data: version, error } = await admin
      .from("catalog_versions")
      .insert({
        tenant_id: ctx.tenantId,
        catalog_line_id: lineId,
        version_number: nextVersion,
        status: "draft",
        label: label || "Draft",
        notes: notes ?? null,
        snapshot,
        product_count: counts.products,
        finish_count: counts.finishes,
        asset_count: counts.assets,
        published_by: actor?.id ?? null,
      })
      .select("id, version_number")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      performed_by: actor?.id ?? null,
      action: "create",
      table_name: "catalog_versions",
      record_id: version.id,
      new_values: { version_number: nextVersion, status: "draft", product_count: counts.products },
    });

    return NextResponse.json(
      {
        draft_created: true,
        version_id: version.id,
        version_number: nextVersion,
        product_count: counts.products,
        finish_count: counts.finishes,
        blockers, // warnings — draft can still be reviewed
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[draft snapshot]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
