import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "owner")) return forbidden();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tenant_users")
      .select("id, email, full_name, role, is_active, last_login_at, created_at")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "owner")) return forbidden();

    const { email, full_name, role = "editor", password } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password is required and must be at least 8 characters." }, { status: 400 });
    }

    const validRoles = ["viewer", "editor", "admin", "manager", "owner"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create the account directly with the given password — pre-confirmed, no invite email.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { tenant_id: ctx.tenantId, role },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        return NextResponse.json({ error: "User already exists in this tenant." }, { status: 409 });
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { data, error } = await admin
      .from("tenant_users")
      .insert({
        tenant_id: ctx.tenantId,
        auth_user_id: created.user.id,
        email: email.toLowerCase().trim(),
        full_name: full_name?.trim() ?? null,
        role,
      })
      .select("id, email, full_name, role, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
