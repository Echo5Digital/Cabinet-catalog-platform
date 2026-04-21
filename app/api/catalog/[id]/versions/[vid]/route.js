import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(_request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_versions")
      .select("*")
      .eq("id", params.vid)
      .eq("catalog_line_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    return NextResponse.json({ version: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/catalog/[id]/versions/[vid]
 * Discards a draft version. Only works on status=draft.
 */
export async function DELETE(_request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();

    const { data: version } = await admin
      .from("catalog_versions")
      .select("id, status")
      .eq("id", params.vid)
      .eq("catalog_line_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    if (version.status !== "draft") {
      return NextResponse.json({ error: "Only draft versions can be discarded." }, { status: 422 });
    }

    await admin.from("catalog_versions").delete().eq("id", params.vid);

    return NextResponse.json({ discarded: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
