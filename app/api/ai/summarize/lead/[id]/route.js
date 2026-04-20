import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { summarizeLead } from "@/lib/ai/chat";

/**
 * POST /api/ai/summarize/lead/[id]
 *
 * Generates a 3–5 sentence AI summary of a lead for the sales rep.
 * Fetches full lead + items from DB, passes to Claude, returns summary text.
 */
export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const admin = createAdminClient();

    // Fetch full lead
    const { data: lead, error } = await admin
      .from("lead_requests")
      .select(`
        id, name, email, phone, company, status, source,
        project_description, notes, created_at,
        assigned_to:tenant_users!assigned_to(full_name, email)
      `)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // Fetch line items
    const { data: items } = await admin
      .from("lead_request_items")
      .select("product_sku, product_name, finish_name, quantity, notes")
      .eq("lead_request_id", params.id)
      .order("sort_order", { ascending: true });

    const leadData = { ...lead, items: items ?? [] };

    const summary = await summarizeLead(leadData);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[ai/summarize/lead]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
