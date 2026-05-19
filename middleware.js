import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Extracts the tenant slug from the hostname for multi-tenant routing.
 * Examples:
 *   cabinet-depot.yourdomain.com  → "cabinet-depot"
 *   localhost / 127.0.0.1         → null  (falls back to DEFAULT_TENANT_ID)
 *   yourdomain.com (apex)         → null  (no subdomain)
 */
function extractTenantSlug(hostname) {
  // Strip port if present
  const host = hostname.split(":")[0];

  // Skip localhost and raw IP addresses
  if (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  // Split into parts: ["cabinet-depot", "yourdomain", "com"]
  const parts = host.split(".");

  // Need at least 3 parts for a subdomain (sub.domain.tld)
  if (parts.length < 3) return null;

  const subdomain = parts[0];

  // Ignore common non-tenant subdomains
  if (["www", "app", "api", "admin"].includes(subdomain)) return null;

  return subdomain;
}

export async function middleware(request) {
  // Extract tenant slug from subdomain and forward as a request header
  const slug = extractTenantSlug(request.nextUrl.hostname);
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set("x-tenant-slug", slug);
  } else {
    requestHeaders.delete("x-tenant-slug");
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — also capture error to handle stale tokens
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If the refresh token is invalid/expired, clear all stale sb-* cookies so
  // the browser stops sending them and the error does not repeat on every request.
  if (authError && authError.status === 400) {
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => supabaseResponse.cookies.delete(c.name));
  }

  // Protect /admin routes — redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    // Carry over cookie deletions onto the redirect response
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c.name, c.value, c));
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
