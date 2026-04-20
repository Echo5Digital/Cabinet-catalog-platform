import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();
    const statuses = ["new", "contacted", "quoted", "closed", "lost"];

    const counts = await Promise.all(
      statuses.map(async (s) => {
        const { count } = await admin
          .from("lead_requests")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", ctx.tenantId)
          .eq("status", s);
        return { status: s, count: count ?? 0 };
      })
    );

    return NextResponse.json({
      by_status: Object.fromEntries(counts.map((c) => [c.status, c.count])),
      total: counts.reduce((sum, c) => sum + c.count, 0),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
