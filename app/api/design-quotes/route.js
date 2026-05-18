import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("design_quotes")
      .select("id, customer_name, customer_email, room_width, room_depth, room_height, status, created_at, sent_at, pdf_url")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quotes: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      customer_name,
      customer_email,
      room_width,
      room_depth,
      room_height,
      style_notes,
      svg_floor_plan,
      design_image_url,
      quote_items,
      quote_notes,
      tax_rate,
      design_params,
    } = body;

    if (!customer_name || !customer_email || !room_width || !room_depth || !room_height) {
      return NextResponse.json({ error: "customer_name, customer_email, room_width, room_depth, and room_height are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("design_quotes")
      .insert({
        tenant_id:        ctx.tenantId,
        created_by:       ctx.user.id,
        customer_name,
        customer_email,
        room_width:       parseFloat(room_width),
        room_depth:       parseFloat(room_depth),
        room_height:      parseFloat(room_height),
        style_notes:      style_notes || null,
        svg_floor_plan:   svg_floor_plan || null,
        design_image_url: design_image_url || null,
        quote_items:      quote_items || [],
        quote_notes:      quote_notes || null,
        tax_rate:         tax_rate != null ? parseFloat(tax_rate) : 8,
        design_params:    design_params || {},
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
