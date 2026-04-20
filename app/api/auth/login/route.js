import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });

    // Fetch tenant membership
    const admin = createAdminClient();
    const { data: tenantUser } = await admin
      .from("tenant_users")
      .select("tenant_id, role, full_name")
      .eq("auth_user_id", data.user.id)
      .eq("is_active", true)
      .single();

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: tenantUser?.full_name ?? null,
        role: tenantUser?.role ?? null,
        tenant_id: tenantUser?.tenant_id ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
