import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tenants")
      .select("id, name, slug, logo_url, primary_color, accent_color, contact_email, contact_phone, website_url, status, settings")
      .eq("id", ctx.tenantId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tenant: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "owner")) return forbidden();

    const body = await request.json();
    const allowed = ["name", "logo_url", "primary_color", "accent_color", "contact_email", "contact_phone", "website_url", "settings"];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tenants")
      .update(updates)
      .eq("id", ctx.tenantId)
      .select("id, name, slug, primary_color, accent_color, contact_email, settings")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tenant: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
