import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("structures")
      .select(`
        id, name, code, description, is_active, sort_order,
        assets!assets_structure_id_fkey(id, public_url, status, asset_type)
      `)
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const structures = data.map(({ assets, ...s }) => ({
      ...s,
      swatch_asset:
        (assets || []).find(
          (a) => a.status === "confirmed" && a.asset_type === "structure_image"
        ) ?? null,
    }));

    return NextResponse.json({ structures });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { name, code, description, sort_order = 0 } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("structures")
      .insert({
        tenant_id: ctx.tenantId,
        name: name.trim(),
        code: code.toLowerCase().trim(),
        description: description ?? null,
        sort_order,
        is_active: true,
      })
      .select("id, name, code, sort_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Structure code "${code}" already exists.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ structure: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
