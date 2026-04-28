import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Simple in-process cache: slug → { tenantId, exp }
const slugCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolves tenant ID from slug with a short in-memory cache.
 * @param {string} slug
 * @returns {Promise<string|null>}
 */
async function slugToTenantId(slug) {
  const cached = slugCache.get(slug);
  if (cached && cached.exp > Date.now()) return cached.tenantId;

  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  const tenantId = data?.id ?? null;
  if (tenantId) {
    slugCache.set(slug, { tenantId, exp: Date.now() + CACHE_TTL_MS });
  }
  return tenantId;
}

/**
 * For Server Components and Server Actions.
 * Reads the x-tenant-slug header injected by middleware, resolves to a tenant ID.
 * Falls back to NEXT_PUBLIC_DEFAULT_TENANT_ID on localhost / when no slug is present.
 *
 * @returns {Promise<string>}
 */
export async function resolveTenantId() {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");

  if (slug) {
    const tenantId = await slugToTenantId(slug);
    if (tenantId) return tenantId;
  }

  // Fallback: single-tenant dev / localhost
  return process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
}

/**
 * For API Route handlers (request object available).
 * Reads the x-tenant-slug header set by middleware on the incoming request.
 * Falls back to NEXT_PUBLIC_DEFAULT_TENANT_ID when no slug is present.
 *
 * @param {Request} request
 * @returns {Promise<string>}
 */
export async function getTenantIdFromRequest(request) {
  const slug = request.headers.get("x-tenant-slug");

  if (slug) {
    const tenantId = await slugToTenantId(slug);
    if (tenantId) return tenantId;
  }

  return process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
}
