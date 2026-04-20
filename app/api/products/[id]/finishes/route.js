import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_finish_map")
      .select(`
        is_default, is_available, sort_order,
        finish:finishes(id, name, code, finish_family, is_active)
      `)
      .eq("product_id", params.id)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ finishes: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { finish_id, is_default = false, sort_order = 0 } = await request.json();
    if (!finish_id) return NextResponse.json({ error: "finish_id is required." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("product_finish_map")
      .insert({ product_id: params.id, finish_id, is_default, sort_order });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Finish already linked to this product." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
