import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ROLE_LEVELS = { viewer: 0, editor: 1, admin: 2, owner: 3 };

/**
 * Reads the session cookie and returns { user, tenantId, role }.
 * Returns { user: null } if unauthenticated or user has no active tenant membership.
 */
export async function getAuthContext() {
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

/** Returns true if context.role meets or exceeds minRole. */
export function hasRole(context, minRole) {
  if (!context.role) return false;
  return (ROLE_LEVELS[context.role] ?? -1) >= (ROLE_LEVELS[minRole] ?? 999);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
