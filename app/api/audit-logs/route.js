import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, unauthorized } from "@/lib/utils/api-auth";

/**
 * GET /api/audit-logs?table_name=&record_id=&action=&limit=
 *
 * Returns recent audit log entries for the authenticated tenant.
 * All params are optional filters.
 */
export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table_name");
    const recordId = searchParams.get("record_id");
    const action = searchParams.get("action");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const admin = createAdminClient();

    let query = admin
      .from("audit_logs")
      .select(`
        id, action, table_name, record_id,
        old_values, new_values, metadata, created_at,
        performed_by:tenant_users!performed_by(id, full_name, email)
      `)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tableName) query = query.eq("table_name", tableName);
    if (recordId) query = query.eq("record_id", recordId);
    if (action) query = query.eq("action", action);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ logs: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
