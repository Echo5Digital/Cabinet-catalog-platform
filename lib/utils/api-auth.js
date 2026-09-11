import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Three-tier role model, matching the Cabinets & Remodeling Depot's own:
//   owner — Super Admin, full access to everything.
//   admin — Dashboard/Leads/Design/Planner + Users management. Cannot see
//           or manage the owner (Super Admin) tier, and has no access to
//           Catalog/Assets/Setup (full CMS management is owner-only).
//   staff — Dashboard/Leads/Design/Planner only. No Users.
// `admin` and `staff` are intentionally excluded from this ladder — they are
// restricted roles scoped to specific sections (see RESTRICTED_SECTION_ROLES
// / hasSectionAccess) rather than rungs on a linear "more access" hierarchy.
const ROLE_LEVELS = { owner: 1 };

// Sections the restricted "admin" and "staff" roles are allowed to access.
// Users management is gated separately (hasRole(ctx, "owner") OR role === "admin"
// checked explicitly at each Users route) since it isn't a "section" in this sense.
const RESTRICTED_SECTIONS = new Set(["leads", "design", "planner"]);

/**
 * Trusted server-to-server callers, keyed by caller name.
 * Add one entry per external system that needs API access without a user session.
 */
const SERVICE_KEYS = {
  "cabinets-and-remodeling-depot": {
    key: process.env.SERVICE_API_KEY_CABINETS_DEPOT,
    tenantId: "a0000000-0000-0000-0000-000000000001",
  },
};

/**
 * Reads the session cookie and returns { user, tenantId, role }.
 * Returns { user: null } if unauthenticated or user has no active tenant membership.
 *
 * If `request` is provided and carries a valid `X-Service-Key` header, returns a
 * synthetic admin context scoped to that key's tenant instead of reading cookies —
 * used by trusted server-to-server integrations that have no Supabase session.
 */
export async function getAuthContext(request) {
  const serviceKey = request?.headers?.get?.("x-service-key");
  if (serviceKey) {
    const entry = Object.entries(SERVICE_KEYS).find(([, v]) => v.key && v.key === serviceKey);
    if (entry) {
      const [, { tenantId }] = entry;
      // No ladder role fits a service-to-service caller — routes that trust
      // a service-key caller with elevated actions (e.g. admin/users sync)
      // must check isTrustedService(ctx) explicitly rather than relying on
      // this role string.
      return { user: { id: "service", service: true }, tenantId, role: null };
    }
    return { user: null, tenantId: null, role: null };
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route handlers cannot set cookies — handled by middleware
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, tenantId: null, role: null };

  const admin = createAdminClient();
  const { data: tenantUser } = await admin
    .from("tenant_users")
    .select("tenant_id, role, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!tenantUser) return { user: null, tenantId: null, role: null };

  return { user, tenantId: tenantUser.tenant_id, role: tenantUser.role };
}

/** Returns true if context.role meets or exceeds minRole on the owner-only ladder. Does not grant access to "admin" or "staff" — use hasSectionAccess for Leads/Design/Planner routes, or canManageUsers for Users routes. */
export function hasRole(context, minRole) {
  if (!context.role) return false;
  return (ROLE_LEVELS[context.role] ?? -1) >= (ROLE_LEVELS[minRole] ?? 999);
}

/**
 * Returns true for a trusted server-to-server caller authenticated via
 * X-Service-Key (see SERVICE_KEYS above). This synthetic context has no
 * ladder role, so it never passes hasRole/hasSectionAccess — routes that
 * intentionally trust a service-key caller with elevated actions (e.g. the
 * admin/users sync API) must check this explicitly:
 * `if (!isTrustedService(ctx) && !canManageUsers(ctx)) return forbidden();`
 */
export function isTrustedService(context) {
  return context?.user?.service === true;
}

/** Returns true if context can manage users (list/create/update/delete Admin and Staff accounts). Owner and Admin both qualify; Staff does not. Does not by itself grant visibility into Owner accounts — callers must additionally check role === "owner" before exposing/modifying an owner row. */
export function canManageUsers(context) {
  return context.role === "owner" || context.role === "admin";
}

/**
 * Returns true if context can access a given section's routes.
 * A trusted service-key caller (see isTrustedService) always passes — it's
 * how the Cabinets & Remodeling Depot backend calls the leads/design/planner
 * endpoints today. "owner" always passes. "admin" and "staff" are both
 * scoped to leads/design/planner sections only. minRole is accepted for
 * call-site compatibility but no longer distinguishes access within the
 * restricted roles — there is only one restricted access level now (admin
 * and staff see the same sections; admin additionally gets Users, checked
 * separately via canManageUsers).
 */
export function hasSectionAccess(context, section, minRole) {
  if (isTrustedService(context)) return true;
  if (!context.role) return false;
  if (context.role === "owner") return true;
  if (context.role === "admin" || context.role === "staff") return RESTRICTED_SECTIONS.has(section);
  return hasRole(context, minRole);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
