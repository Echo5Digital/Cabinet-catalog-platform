import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, unauthorized } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_versions")
      .select(`
        id, version_number, label, status, notes,
        product_count, finish_count, asset_count,
        published_at, archived_at,
        published_by:tenant_users(email, full_name)
      `)
      .eq("catalog_line_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .order("version_number", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ versions: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
