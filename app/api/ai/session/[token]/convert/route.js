import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export async function POST(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const { name, email, items = [] } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: session } = await admin
      .from("ai_sessions")
      .select("id")
      .eq("session_token", params.token)
      .eq("tenant_id", tenantId)
      .single();

    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    // Create lead
    const { data: lead, error: leadError } = await admin
      .from("lead_requests")
      .insert({
        tenant_id: tenantId,
        source: "ai_chat",
        ai_session_id: session.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        status: "new",
      })
      .select("id")
      .single();

    if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });

    // Resolve and insert items
    const resolvedItems = [];
    for (const item of items) {
      const { sku, finish_code, quantity = 1 } = item;
      if (!sku) continue;

      const { data: product } = await admin
        .from("products")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("sku", sku.toUpperCase())
        .single();

      const { data: finish } = finish_code
        ? await admin.from("finishes").select("id, name").eq("tenant_id", tenantId).eq("code", finish_code).single()
        : { data: null };

      resolvedItems.push({
        lead_request_id: lead.id,
        product_id: product?.id ?? null,
        product_sku: sku.toUpperCase(),
        product_name: product?.name ?? sku,
        finish_id: finish?.id ?? null,
        finish_name: finish?.name ?? null,
        quantity,
        sort_order: resolvedItems.length,
      });
    }

    if (resolvedItems.length > 0) {
      await admin.from("lead_request_items").insert(resolvedItems);
    }

    // Link session to lead + capture contact info
    await admin
      .from("ai_sessions")
      .update({ lead_request_id: lead.id, customer_name: name, customer_email: email })
      .eq("id", session.id);

    return NextResponse.json({ lead_id: lead.id, message: "Quote request submitted successfully." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
