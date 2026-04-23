import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, project_description, notes, source = "catalog", items = [] } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Validate items and check finish compatibility rules
    const violations = [];
    const resolvedItems = [];

    for (const item of items) {
      const { sku, finish_code, variant_key, quantity = 1, notes: itemNotes } = item;

      if (!sku) continue;

      // Fetch product
      const { data: product } = await admin
        .from("products")
        .select("id, name, catalog_line_id")
        .eq("tenant_id", TENANT_ID)
        .eq("sku", sku.toUpperCase())
        .eq("is_active", true)
        .single();

      if (!product) {
        violations.push({ sku, message: `Product ${sku} not found or unavailable.` });
        continue;
      }

      let finishId = null;
      let finishName = null;

      if (finish_code) {
        const { data: finish } = await admin
          .from("finishes")
          .select("id, name")
          .eq("tenant_id", TENANT_ID)
          .eq("code", finish_code)
          .eq("is_active", true)
          .single();

        if (!finish) {
          violations.push({ sku, finish_code, message: `Finish "${finish_code}" not found.` });
          continue;
        }

        // Check finish is available for this product.
        // Empty product_finish_map = all finishes implicitly available (not a violation).
        // Only violate if explicit mappings exist AND this finish is not marked is_available.
        const { data: allMappings } = await admin
          .from("product_finish_map")
          .select("finish_id, is_available")
          .eq("product_id", product.id);

        if ((allMappings ?? []).length > 0) {
          const pfm = allMappings.find((m) => m.finish_id === finish.id);
          if (!pfm || !pfm.is_available) {
            violations.push({ sku, finish_code, message: `${finish.name} is not available for ${sku}.` });
            continue;
          }
        }

        // Check incompatibility rules
        const { data: incompatibleRules } = await admin
          .from("product_rules")
          .select("rule_value, label")
          .eq("product_id", product.id)
          .eq("rule_type", "finish_incompatible")
          .eq("is_active", true);

        for (const rule of incompatibleRules ?? []) {
          if ((rule.rule_value?.finish_ids ?? []).includes(finish.id)) {
            violations.push({ sku, finish_code, message: rule.label });
          }
        }

        finishId = finish.id;
        finishName = finish.name;
      }

      let variantId = null;
      if (variant_key) {
        const { data: variant } = await admin
          .from("product_variants")
          .select("id")
          .eq("product_id", product.id)
          .eq("variant_key", variant_key)
          .single();
        variantId = variant?.id ?? null;
      }

      resolvedItems.push({
        product_id: product.id,
        product_sku: sku.toUpperCase(),
        product_name: product.name,
        finish_id: finishId,
        finish_name: finishName,
        variant_id: variantId,
        quantity,
        notes: itemNotes ?? null,
        sort_order: resolvedItems.length,
      });
    }

    if (violations.length > 0) {
      return NextResponse.json({ error: "Compatibility violations found.", violations }, { status: 422 });
    }

    // Insert lead_request
    const { data: lead, error: leadError } = await admin
      .from("lead_requests")
      .insert({
        tenant_id: TENANT_ID,
        source,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() ?? null,
        company: company?.trim() ?? null,
        project_description: project_description?.trim() ?? null,
        notes: notes?.trim() ?? null,
        status: "new",
      })
      .select("id")
      .single();

    if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });

    // Insert lead_request_items
    if (resolvedItems.length > 0) {
      await admin.from("lead_request_items").insert(
        resolvedItems.map((item) => ({ ...item, lead_request_id: lead.id }))
      );
    }

    return NextResponse.json(
      { lead_id: lead.id, message: "Your quote request has been received. We will contact you within 1 business day." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
