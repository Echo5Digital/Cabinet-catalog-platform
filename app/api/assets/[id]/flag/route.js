import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { reason } = await request.json();
    if (!reason?.trim()) {
      return NextResponse.json({ error: "A flag reason is required." }, { status: 400 });
    }

    const { data: reviewer } = await (await import("@/lib/supabase/admin")).createAdminClient()
      .from("tenant_users").select("id").eq("auth_user_id", ctx.user.id).single();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assets")
      .update({
        status: "flagged",
        flag_reason: reason.trim(),
        reviewed_by: reviewer?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, status, flag_reason")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    return NextResponse.json({ asset: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
