import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    let query = admin
      .from("lead_requests")
      .select(
        `id, name, email, phone, company, status, source, project_description, notes,
         internal_notes, created_at, followed_up_at,
         assigned_to:tenant_users!assigned_to(id, email, full_name)`,
        { count: "exact" }
      )
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ leads: data, total: count, page, limit });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
