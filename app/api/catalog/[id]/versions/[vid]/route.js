import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
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

// POST /api/catalog/[id]/versions/[vid]/restore is a sub-route — handled separately
