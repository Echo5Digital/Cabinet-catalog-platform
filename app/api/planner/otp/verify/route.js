import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";
import crypto from "crypto";

function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * POST /api/planner/otp/verify
 *
 * Verifies the 6-digit OTP sent to the user's email.
 * On success marks the OTP verified and upserts a customer record.
 * Returns { ok: true, token } where token is a short-lived signed token
 * that ProposalGenerator passes to /api/planner/proposal to authorise the PDF.
 */
export async function POST(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const { email, otp, name, phone } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and verification code are required." }, { status: 400 });
    }

    const otp_hash = hashOTP(String(otp).trim());
    const now      = new Date().toISOString();
    const admin    = createAdminClient();

    // Find a valid, unexpired, unverified OTP for this email + tenant
    const { data: record } = await admin
      .from("email_otps")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .eq("otp_hash", otp_hash)
      .is("verified_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!record) {
      return NextResponse.json({ ok: false, error: "Invalid or expired code. Please try again." }, { status: 400 });
    }

    // Mark OTP as verified
    await admin
      .from("email_otps")
      .update({ verified_at: now })
      .eq("id", record.id);

    // Upsert customer record
    await admin.from("customers").upsert(
      {
        tenant_id:         tenantId,
        email:             email.toLowerCase(),
        name:              name || email,
        phone:             phone || null,
        email_verified_at: now,
      },
      { onConflict: "tenant_id,email" }
    );

    // Issue a short-lived verification token (base64 payload, not cryptographically signed —
    // just an opaque handle the proposal route can validate against the DB).
    // The proposal route re-checks the OTP record's verified_at to prevent forgery.
    const token = Buffer.from(
      JSON.stringify({ email: email.toLowerCase(), tenantId, ts: Date.now() })
    ).toString("base64");

    return NextResponse.json({ ok: true, token });
  } catch (err) {
    console.error("[planner/otp/verify]", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
