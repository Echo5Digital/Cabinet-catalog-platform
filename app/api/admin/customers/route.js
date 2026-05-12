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

  // Fetch quote requests submitted for these customers
  const emails = (customers || []).map((c) => c.email.toLowerCase());
  // email → latest lead_request created_at for source=design_ai
  const latestQuoteAt = {};
  if (emails.length > 0) {
    const { data: leads } = await admin
      .from("lead_requests")
      .select("email, created_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("source", "design_ai")
      .in("email", emails);
    for (const l of leads || []) {
      const e = l.email.toLowerCase();
      if (!latestQuoteAt[e] || l.created_at > latestQuoteAt[e]) {
        latestQuoteAt[e] = l.created_at;
      }
    }
  }

  const result = (customers || []).map((c) => {
    const e = c.email.toLowerCase();
    const latestQuote = latestQuoteAt[e];
    // "Quoted" only when a quote was submitted at or after the customer's latest OTP verification.
    // If the customer re-verifies for a new session, email_verified_at advances past old quotes,
    // resetting the status to "Not Quoted" until they click Confirm again.
    const has_quoted = !!(
      latestQuote &&
      (!c.email_verified_at || latestQuote >= c.email_verified_at)
    );
    return { ...c, has_quoted };
  });

  return NextResponse.json({ customers: result });
}
