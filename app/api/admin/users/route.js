import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, canManageUsers, isTrustedService, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { depotRoleToPlatformRole, platformRoleToDepotRole } from "@/lib/utils/depot-role-map";
import { notifyDepot } from "@/lib/webhooks/notifyDepot";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * POST /api/admin/users
 *
 * Service-to-service counterpart of /api/tenant/users, for the Cabinets &
 * Remodeling Depot's admin Users page to keep both systems' user lists in
 * sync. Accepts X-Service-Key auth (see lib/utils/api-auth.js) in addition
 * to the normal owner/admin cookie session this platform's own admin UI
 * uses. Roles in request/response bodies are the Depot's own values
 * (SUPER_ADMIN/ADMIN/STAFF) — translated to/from this platform's
 * owner/admin/staff at the boundary (see depot-role-map.js) so neither side
 * needs to know the other's role vocabulary.
 */
export async function GET(request) {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx.user) return unauthorized();
    if (!isTrustedService(ctx) && !canManageUsers(ctx)) return forbidden();

    const admin = createAdminClient();
    let query = admin
      .from("tenant_users")
      .select("id, auth_user_id, email, full_name, role, is_active, created_at")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: true });

    // A restricted Admin caller (human or the Depot acting on an Admin's
    // behalf) never sees Super Admin rows. A trusted service-key caller and
    // an Owner caller both see everything.
    if (!isTrustedService(ctx) && ctx.role !== "owner") query = query.neq("role", "owner");

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const users = (data ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.full_name,
      role: platformRoleToDepotRole(u.role),
      isActive: u.is_active,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx.user) return unauthorized();
    if (!isTrustedService(ctx) && !canManageUsers(ctx)) return forbidden();

    const { email, password, name, role } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password is required and must be at least 8 characters." }, { status: 400 });
    }

    const platformRole = depotRoleToPlatformRole(role) || "staff";
    if (platformRole === "owner" && !isTrustedService(ctx) && ctx.role !== "owner") {
      return NextResponse.json({ error: "Only a Super Admin can create another Super Admin." }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { tenant_id: ctx.tenantId, role: platformRole },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { data, error } = await admin
      .from("tenant_users")
      .insert({
        tenant_id: ctx.tenantId,
        auth_user_id: created.user.id,
        email: email.toLowerCase().trim(),
        full_name: name?.trim() ?? null,
        role: platformRole,
      })
      .select("id, email, full_name, role, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Best-effort — a webhook failure must not fail the create itself. Skipped
    // when this request IS a sync call from the Depot, to avoid a ping-pong loop.
    if (request.headers.get("x-sync-source") !== "depot") {
      notifyDepot("user.created", {
        catalogPlatformUserId: data.id,
        email: data.email,
        name: data.full_name,
        role: platformRoleToDepotRole(data.role),
        isActive: data.is_active,
      });
    }

    return NextResponse.json(
      {
        user: {
          id: data.id,
          email: data.email,
          name: data.full_name,
          role: platformRoleToDepotRole(data.role),
          isActive: data.is_active,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[admin/users POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
