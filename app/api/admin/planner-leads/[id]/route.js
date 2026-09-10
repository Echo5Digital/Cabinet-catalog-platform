import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole } from "@/lib/utils/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/planner-leads/[id]
 * Returns a single planner lead, including its full design snapshot
 * (scene_json, settings_json, room dimensions, style selections) so the
 * admin can re-open the customer's saved 2D/3D design.
 */
export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx.user)              return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(ctx, "editor")) return NextResponse.json({ error: "Forbidden" },    { status: 403 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("planner_leads")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json({ lead: data });
  } catch (err) {
    console.error("[admin/planner-leads/[id] GET]", err);
    return NextResponse.json({ error: "Failed to load lead." }, { status: 500 });
  }
}
