import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, canManageUsers, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!canManageUsers(ctx)) return forbidden();

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("tenant_users")
      .select("role")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();
    if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const { role, is_active } = await request.json();

    // A restricted Admin can neither touch an existing Super Admin's row nor
    // promote anyone to Super Admin — that tier is owner-only to grant or modify.
    if (ctx.role !== "owner" && (existing.role === "owner" || role === "owner")) {
      return forbidden();
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const { data, error } = await admin
      .from("tenant_users")
      .update(updates)
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .select("id, email, full_name, role, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!canManageUsers(ctx)) return forbidden();

    const admin = createAdminClient();
    const { data: target } = await admin
      .from("tenant_users")
      .select("auth_user_id, role")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.auth_user_id === ctx.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself." }, { status: 400 });
    }
    if (ctx.role !== "owner" && target.role === "owner") {
      return forbidden();
    }

    const { error } = await admin
      .from("tenant_users")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Full deprovision — also remove the underlying Supabase Auth account so
    // this person can no longer log in at all, not just lose tenant access.
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(target.auth_user_id);
    if (authDeleteError) {
      console.error("[tenant/users DELETE] tenant_users row removed but auth user delete failed:", authDeleteError);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
