import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();

    const statuses = ["pending_review", "confirmed", "flagged", "rejected"];
    const types = ["product_diagram", "finish_swatch", "lifestyle"];
    const confidences = ["matched", "partial", "unmatched"];

    const [byStatus, byType, byConfidence] = await Promise.all([
      Promise.all(
        statuses.map(async (s) => {
          const { count } = await admin
            .from("assets")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", ctx.tenantId)
            .eq("status", s);
          return { status: s, count: count ?? 0 };
        })
      ),
      Promise.all(
        types.map(async (t) => {
          const { count } = await admin
            .from("assets")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", ctx.tenantId)
            .eq("asset_type", t);
          return { type: t, count: count ?? 0 };
        })
      ),
      Promise.all(
        confidences.map(async (c) => {
          const { count } = await admin
            .from("assets")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", ctx.tenantId)
            .eq("confidence", c)
            .eq("status", "pending_review");
          return { confidence: c, count: count ?? 0 };
        })
      ),
    ]);

    return NextResponse.json({
      by_status: Object.fromEntries(byStatus.map((s) => [s.status, s.count])),
      by_type: Object.fromEntries(byType.map((t) => [t.type, t.count])),
      pending_by_confidence: Object.fromEntries(byConfidence.map((c) => [c.confidence, c.count])),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
