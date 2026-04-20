import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_rules")
      .select("id, rule_type, rule_value, label, is_active, created_at")
      .eq("product_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rules: data });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const { rule_type, rule_value, label } = await request.json();
    if (!rule_type || !rule_value || !label) {
      return NextResponse.json({ error: "rule_type, rule_value, and label are required." }, { status: 400 });
    }

    const validTypes = ["finish_incompatible", "finish_required", "accessory_required", "dimension_note"];
    if (!validTypes.includes(rule_type)) {
      return NextResponse.json({ error: `Invalid rule_type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("product_rules")
      .insert({
        tenant_id: ctx.tenantId,
        product_id: params.id,
        rule_type,
        rule_value,
        label,
      })
      .select("id, rule_type, label, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rule: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  // DELETE /api/products/[id]/rules?rule_id=xxx
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("rule_id");
    if (!ruleId) return NextResponse.json({ error: "rule_id query param required." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("product_rules")
      .delete()
      .eq("id", ruleId)
      .eq("product_id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
