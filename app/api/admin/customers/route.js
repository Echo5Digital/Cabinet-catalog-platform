import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx.user) return unauthorized();
  if (!hasRole(ctx, "admin")) return forbidden();

  const admin = createAdminClient();

  // Fetch all customers for this tenant
  const { data: customers, error } = await admin
    .from("customers")
    .select("id, name, email, phone, address, email_verified_at, created_at")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails that have submitted a quote request
  const emails = (customers || []).map((c) => c.email);
  let quotedEmails = new Set();
  if (emails.length > 0) {
    const { data: leads } = await admin
      .from("lead_requests")
      .select("email")
      .eq("tenant_id", ctx.tenantId)
      .eq("source", "design_ai")
      .in("email", emails);
    for (const l of leads || []) quotedEmails.add(l.email.toLowerCase());
  }

  const result = (customers || []).map((c) => ({
    ...c,
    has_quoted: quotedEmails.has(c.email.toLowerCase()),
  }));

  return NextResponse.json({ customers: result });
}
