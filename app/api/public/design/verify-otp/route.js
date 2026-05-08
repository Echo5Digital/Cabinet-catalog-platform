import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";
import crypto from "crypto";

function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const { email, otp, name, phone, address } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    const otp_hash = hashOTP(String(otp).trim());
    const now = new Date().toISOString();
    const admin = createAdminClient();

    // Find a valid, unexpired, unverified OTP
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
      return NextResponse.json({ ok: false, error: "Invalid or expired code." }, { status: 400 });
    }

    // Mark OTP as verified
    await admin.from("email_otps").update({ verified_at: now }).eq("id", record.id);

    // Upsert customer record
    await admin.from("customers").upsert(
      {
        tenant_id:         tenantId,
        email:             email.toLowerCase(),
        name:              name || email,
        phone:             phone || null,
        address:           address || null,
        email_verified_at: now,
      },
      { onConflict: "tenant_id,email" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
