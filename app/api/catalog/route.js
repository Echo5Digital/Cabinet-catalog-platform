import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_lines")
      .select(`
        id, name, slug, description, status, sort_order, published_at, created_at,
        manufacturer:manufacturers(id, name, slug)
      `)
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lines: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const { name, slug, description, manufacturer_id, sort_order = 0 } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_lines")
      .insert({
        tenant_id: ctx.tenantId,
        manufacturer_id: manufacturer_id ?? null,
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        description: description ?? null,
        sort_order,
        status: "draft",
      })
      .select("id, name, slug, status, sort_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `Slug "${slug}" already exists.` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ line: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
