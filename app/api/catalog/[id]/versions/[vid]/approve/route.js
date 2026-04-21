import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

/**
 * POST /api/catalog/[id]/versions/[vid]/approve
 *
 * Promotes a draft version to published.
 * Archives the current published version and updates the catalog line status.
 */
export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();

    const { data: version } = await admin
      .from("catalog_versions")
      .select("id, version_number, status, product_count, finish_count")
      .eq("id", params.vid)
      .eq("catalog_line_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    if (version.status !== "draft") {
      return NextResponse.json({ error: "Only draft versions can be approved." }, { status: 422 });
    }

    const { data: actor } = await admin
      .from("tenant_users")
      .select("id")
      .eq("auth_user_id", ctx.user.id)
      .single();

    const now = new Date().toISOString();

    // Promote draft → published
    await admin
      .from("catalog_versions")
      .update({ status: "published", published_by: actor?.id ?? null, published_at: now })
      .eq("id", params.vid);

    // Archive previous published version
    await admin
      .from("catalog_versions")
      .update({ status: "archived", archived_at: now })
      .eq("catalog_line_id", params.id)
      .eq("status", "published")
      .neq("id", params.vid);

    // Update catalog line
    await admin
      .from("catalog_lines")
      .update({ status: "published", published_at: now, published_by: actor?.id ?? null })
      .eq("id", params.id);

    await admin.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      performed_by: actor?.id ?? null,
      action: "publish",
      table_name: "catalog_lines",
      record_id: params.id,
      new_values: {
        version_number: version.version_number,
        product_count: version.product_count,
        approved_from_draft: true,
      },
    });

    return NextResponse.json({
      approved: true,
      version_number: version.version_number,
      product_count: version.product_count,
      finish_count: version.finish_count,
    });
  } catch (err) {
    console.error("[approve]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
