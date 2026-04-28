import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const colorType = searchParams.get("color_type"); // 'countertop' | 'floor'

    const admin = createAdminClient();
    let query = admin
      .from("colors")
      .select(`
        id, name, code, color_type, description, is_active, sort_order,
        assets!assets_color_id_fkey(id, public_url, status, asset_type)
      `)
      .eq("tenant_id", ctx.tenantId)
      .order("sort_order", { ascending: true });

    if (colorType) query = query.eq("color_type", colorType);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const colors = data.map(({ assets, ...c }) => ({
      ...c,
      swatch_asset:
        (assets || []).find(
          (a) => a.status === "confirmed" && a.asset_type === "color_swatch"
        ) ?? null,
    }));

    return NextResponse.json({ colors });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { name, code, color_type = "countertop", description, sort_order = 0 } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required." }, { status: 400 });
    }
    if (!["countertop", "floor"].includes(color_type)) {
      return NextResponse.json({ error: "color_type must be 'countertop' or 'floor'." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("colors")
      .insert({
        tenant_id: ctx.tenantId,
        name: name.trim(),
        code: code.toLowerCase().trim(),
        color_type,
        description: description ?? null,
        sort_order,
        is_active: true,
      })
      .select("id, name, code, color_type, sort_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Color code "${code}" already exists.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ color: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
