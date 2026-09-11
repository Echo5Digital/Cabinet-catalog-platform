import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, canManageUsers, isTrustedService, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { depotRoleToPlatformRole, platformRoleToDepotRole } from "@/lib/utils/depot-role-map";
import { notifyDepot } from "@/lib/webhooks/notifyDepot";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/:id  — :id is tenant_users.id
 * DELETE /api/admin/users/:id
 *
 * Service-to-service counterpart of /api/tenant/users/[id]. See
 * app/api/admin/users/route.js for the shared auth/role-mapping notes.
 */
export async function PATCH(request, { params }) {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx.user) return unauthorized();
    if (!isTrustedService(ctx) && !canManageUsers(ctx)) return forbidden();

    const { name, password, role, isActive } = await request.json();
    const updates = {};
    if (name !== undefined) updates.full_name = name;
    if (role !== undefined) updates.role = depotRoleToPlatformRole(role) || "staff";
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length === 0 && !password) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("tenant_users")
      .select("auth_user_id, role")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // A restricted Admin caller can neither touch an existing Super Admin's
    // row nor promote anyone to Super Admin — owner-only to grant or modify.
    // A trusted service-key caller (the Depot syncing on behalf of one of
    // its own admins) is allowed through; the Depot enforces this same rule
    // on its own side before ever making the call.
    if (!isTrustedService(ctx) && ctx.role !== "owner" && (existing.role === "owner" || updates.role === "owner")) {
      return forbidden();
    }

    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      const { error: pwError } = await admin.auth.admin.updateUserById(existing.auth_user_id, { password });
      if (pwError) return NextResponse.json({ error: pwError.message }, { status: 500 });
    }

    let data = null;
    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await admin
        .from("tenant_users")
        .update(updates)
        .eq("id", params.id)
        .eq("tenant_id", ctx.tenantId)
        .select("id, email, full_name, role, is_active")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      data = updated;
    } else {
      const { data: current } = await admin
        .from("tenant_users")
        .select("id, email, full_name, role, is_active")
        .eq("id", params.id)
        .single();
      data = current;
    }

    if (request.headers.get("x-sync-source") !== "depot") {
      notifyDepot("user.updated", {
        catalogPlatformUserId: data.id,
        email: data.email,
        name: data.full_name,
        role: platformRoleToDepotRole(data.role),
        isActive: data.is_active,
      });
    }

    return NextResponse.json({
      user: {
        id: data.id,
        email: data.email,
        name: data.full_name,
        role: platformRoleToDepotRole(data.role),
        isActive: data.is_active,
      },
    });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx.user) return unauthorized();
    if (!isTrustedService(ctx) && !canManageUsers(ctx)) return forbidden();

    const admin = createAdminClient();
    const { data: target } = await admin
      .from("tenant_users")
      .select("auth_user_id, email, role")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (!isTrustedService(ctx) && target.auth_user_id === ctx.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself." }, { status: 400 });
    }
    if (!isTrustedService(ctx) && ctx.role !== "owner" && target.role === "owner") {
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
      console.error("[admin/users DELETE] tenant_users row removed but auth user delete failed:", authDeleteError);
    }

    if (request.headers.get("x-sync-source") !== "depot") {
      notifyDepot("user.deleted", {
        catalogPlatformUserId: params.id,
        email: target.email,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
