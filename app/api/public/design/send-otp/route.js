import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";
import { sendOTPEmail } from "@/lib/email";
import crypto from "crypto";

function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otp_hash = hashOTP(otp);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const admin = createAdminClient();

    // Delete any previous unverified OTPs for this email+tenant
    await admin.from("email_otps")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .is("verified_at", null);

    // Insert new OTP
    await admin.from("email_otps").insert({
      tenant_id: tenantId,
      email: email.toLowerCase(),
      otp_hash,
      expires_at,
    });

    // Get tenant name for email subject
    const { data: tenant } = await admin.from("tenants").select("name").eq("id", tenantId).single();
    const tenantName = tenant?.name || "Cabinet Design";

    await sendOTPEmail({ to: email, otp, tenantName });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
  }
}
