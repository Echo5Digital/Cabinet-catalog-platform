import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole } from "@/lib/utils/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/planner-leads
 *
 * Lists all planner leads for the authenticated admin's tenant.
 * Supports ?page=1&limit=50&status=new|contacted|closed&q=search
 *
 * PATCH /api/admin/planner-leads
 * Body: { id, status }   — update a lead's status
 */
export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user)           return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(ctx, "editor")) return NextResponse.json({ error: "Forbidden" },    { status: 403 });

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit  = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const status = searchParams.get("status") || null;
    const q      = searchParams.get("q")      || null;
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    let query = admin
      .from("planner_leads")
      .select("*", { count: "exact" })
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (q) {
      // Search name, email, phone
      query = query.or(
        `customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%,project_name.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      leads:      data ?? [],
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    console.error("[admin/planner-leads GET]", err);
    return NextResponse.json({ error: "Failed to load planner leads." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user)           return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(ctx, "editor")) return NextResponse.json({ error: "Forbidden" },    { status: 403 });

    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: "id and status are required." }, { status: 400 });

    const VALID_STATUSES = ["new", "contacted", "closed"];
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("planner_leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/planner-leads PATCH]", err);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }
}
