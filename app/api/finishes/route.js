import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const line = searchParams.get("line"); // catalog_line_id or slug

    const admin = createAdminClient();
    let query = admin
      .from("finishes")
      .select(`
        id, name, code, finish_family, description, is_active, sort_order, catalog_line_id,
        catalog_line:catalog_lines(id, name, slug)
      `)
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true });

    if (line) query = query.eq("catalog_line_id", line);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ finishes: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { name, code, catalog_line_id, description, finish_family, sort_order = 0 } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("finishes")
      .insert({
        tenant_id: ctx.tenantId,
        catalog_line_id: catalog_line_id ?? null,
        name: name.trim(),
        code: code.toLowerCase().trim(),
        description: description ?? null,
        finish_family: finish_family ?? null,
        sort_order,
        is_active: true,
      })
      .select("id, name, code, finish_family, sort_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `Finish code "${code}" already exists.` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ finish: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
