/**
 * AI Tool Executor
 *
 * All tools query the DB directly — the AI never invents data.
 * Called by the chat engine when Claude emits a tool_use block.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Tool definitions (sent to Claude in the API call) ───────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: "search_products",
    description:
      "Search for cabinet products by category, width, or catalog line. " +
      "ALWAYS call this before recommending any SKU. Never invent product data.",
    input_schema: {
      type: "object",
      properties: {
        catalog_line_slug: {
          type: "string",
          description: "Filter by catalog line slug, e.g. 'american'",
        },
        category_slug: {
          type: "string",
          enum: ["base", "wall", "tall", "vanity", "specialty"],
          description: "Cabinet category",
        },
        width_in: {
          type: "number",
          description: "Exact width in inches",
        },
        width_min: { type: "number" },
        width_max: { type: "number" },
        limit: {
          type: "integer",
          description: "Max results. Keep ≤6 to avoid overwhelming the user.",
          default: 6,
        },
      },
    },
  },
  {
    name: "get_product_detail",
    description:
      "Get full details for a specific SKU including finishes, images, and specs. " +
      "Call this when discussing a specific product.",
    input_schema: {
      type: "object",
      required: ["sku"],
      properties: {
        sku: { type: "string" },
      },
    },
  },
  {
    name: "get_finishes",
    description: "Get available finishes for a catalog line or all lines.",
    input_schema: {
      type: "object",
      properties: {
        catalog_line_slug: { type: "string" },
      },
    },
  },
  {
    name: "add_to_quote",
    description:
      "Add a validated product + finish to the customer's quote. " +
      "Only call after confirming the SKU and finish are compatible via get_product_detail. " +
      "The server will reject incompatible combinations.",
    input_schema: {
      type: "object",
      required: ["sku", "quantity"],
      properties: {
        sku: { type: "string" },
        finish_code: {
          type: "string",
          description: "Finish code from get_product_detail results",
        },
        quantity: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "get_quote_summary",
    description:
      "Get the current items in the customer's quote. " +
      "Call before summarizing or before suggesting submission.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Flag this session for human follow-up. Use when: customer has complex requirements, " +
      "explicitly asks for a person, 3+ searches returned nothing, or custom sizing is needed.",
    input_schema: {
      type: "object",
      required: ["reason"],
      properties: {
        reason: {
          type: "string",
          enum: [
            "complex_requirement",
            "customer_request",
            "no_matching_products",
            "incompatible_rules",
            "custom_sizing",
          ],
        },
        notes: {
          type: "string",
          description: "Brief summary of what couldn't be handled",
        },
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

export async function executeTool(name, input, context) {
  const { sessionId, tenantId, quoteItems } = context;
  const admin = createAdminClient();

  switch (name) {
    case "search_products":
      return searchProducts(admin, tenantId, input);

    case "get_product_detail":
      return getProductDetail(admin, tenantId, input.sku);

    case "get_finishes":
      return getFinishes(admin, tenantId, input.catalog_line_slug);

    case "add_to_quote":
      return addToQuote(admin, tenantId, sessionId, input);

    case "get_quote_summary":
      return { items: quoteItems || [], total_items: (quoteItems || []).reduce((s, i) => s + i.quantity, 0) };

    case "escalate_to_human":
      return escalateToHuman(admin, sessionId, tenantId, input);

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Individual tool implementations ─────────────────────────────────────────

async function searchProducts(admin, tenantId, input) {
  const { catalog_line_slug, category_slug, width_in, width_min, width_max, limit = 6 } = input;

  let query = admin
    .from("products")
    .select(`
      id, sku, name, width_in, height_in, depth_in, door_count, drawer_count,
      catalog_line:catalog_lines!catalog_line_id(name, slug),
      category:categories!category_id(name, slug)
    `)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(Math.min(limit, 8)); // Hard cap — never more than 8

  if (catalog_line_slug) {
    const { data: line } = await admin
      .from("catalog_lines")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", catalog_line_slug)
      .single();
    if (line) query = query.eq("catalog_line_id", line.id);
  }

  if (category_slug) {
    const { data: cat } = await admin
      .from("categories")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", category_slug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (width_in) query = query.eq("width_in", width_in);
  if (width_min) query = query.gte("width_in", width_min);
  if (width_max) query = query.lte("width_in", width_max);

  query = query.order("sort_order", { ascending: true });

  const { data: products, error } = await query;
  if (error) return { error: error.message, products: [] };
  if (!products?.length) return { products: [], message: "No products found with these filters." };

  // Fetch primary images for results
  const productIds = products.map((p) => p.id);
  const { data: paRows } = await admin
    .from("product_assets")
    .select("product_id, asset:assets!asset_id(public_url)")
    .in("product_id", productIds)
    .eq("is_primary", true);

  const imageMap = {};
  for (const row of paRows || []) {
    if (row.asset?.public_url) imageMap[row.product_id] = row.asset.public_url;
  }

  return {
    products: products.map((p) => ({
      sku: p.sku,
      name: p.name,
      width_in: p.width_in,
      height_in: p.height_in,
      depth_in: p.depth_in,
      door_count: p.door_count,
      drawer_count: p.drawer_count,
      catalog_line: p.catalog_line?.name,
      category: p.category?.name,
      primary_image_url: imageMap[p.id] || null,
    })),
  };
}

async function getProductDetail(admin, tenantId, skuRaw) {
  const sku = skuRaw?.toUpperCase();

  const { data: product, error } = await admin
    .from("products")
    .select(`
      id, sku, name, description, width_in, height_in, depth_in,
      box_width_in, box_height_in, box_depth_in,
      door_count, drawer_count,
      catalog_line:catalog_lines!catalog_line_id(name, slug),
      category:categories!category_id(name, slug)
    `)
    .eq("tenant_id", tenantId)
    .eq("sku", sku)
    .eq("is_active", true)
    .single();

  if (error || !product) return { error: `Product "${sku}" not found.` };

  // Finishes via product_finish_map
  const { data: pfmRows } = await admin
    .from("product_finish_map")
    .select("is_default, is_available, finish:finishes!finish_id(id, name, code, finish_family)")
    .eq("product_id", product.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  // Incompatible finish IDs from rules
  const { data: rules } = await admin
    .from("product_rules")
    .select("rule_type, rule_value")
    .eq("product_id", product.id)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("rule_type", "finish_incompatible");

  const incompatibleIds = new Set(
    (rules || []).flatMap((r) => r.rule_value?.finish_ids || [])
  );

  const finishes = (pfmRows || [])
    .filter((r) => r.finish)
    .map((r) => ({
      name: r.finish.name,
      code: r.finish.code,
      family: r.finish.finish_family,
      is_default: r.is_default,
      incompatible: incompatibleIds.has(r.finish.id),
    }));

  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    width_in: product.width_in,
    height_in: product.height_in,
    depth_in: product.depth_in,
    door_count: product.door_count,
    drawer_count: product.drawer_count,
    catalog_line: product.catalog_line?.name,
    category: product.category?.name,
    finishes,
  };
}

async function getFinishes(admin, tenantId, catalogLineSlug) {
  let query = admin
    .from("finishes")
    .select("name, code, finish_family, catalog_line:catalog_lines!catalog_line_id(name, slug)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (catalogLineSlug) {
    const { data: line } = await admin
      .from("catalog_lines")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", catalogLineSlug)
      .single();
    if (line) query = query.eq("catalog_line_id", line.id);
  }

  const { data: finishes } = await query;
  return {
    finishes: (finishes || []).map((f) => ({
      name: f.name,
      code: f.code,
      family: f.finish_family,
      line: f.catalog_line?.name,
    })),
  };
}

async function addToQuote(admin, tenantId, sessionId, input) {
  const { sku: skuRaw, finish_code, quantity } = input;
  const sku = skuRaw?.toUpperCase();

  // 1. Verify product exists
  const { data: product } = await admin
    .from("products")
    .select("id, name, sku")
    .eq("tenant_id", tenantId)
    .eq("sku", sku)
    .eq("is_active", true)
    .single();

  if (!product) {
    return { ok: false, reason: `Product "${sku}" does not exist in this catalog.` };
  }

  let finishId = null;
  let finishName = null;

  if (finish_code) {
    // 2. Verify finish exists
    const { data: finish } = await admin
      .from("finishes")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("code", finish_code)
      .single();

    if (!finish) {
      return { ok: false, reason: `Finish "${finish_code}" does not exist.` };
    }

    // 3. Verify finish is available for this product
    const { data: pfm } = await admin
      .from("product_finish_map")
      .select("is_available")
      .eq("product_id", product.id)
      .eq("finish_id", finish.id)
      .single();

    if (!pfm?.is_available) {
      return {
        ok: false,
        reason: `Finish "${finish.name}" is not available for ${sku}. Please choose a different finish.`,
      };
    }

    // 4. Check incompatibility rules
    const { data: rules } = await admin
      .from("product_rules")
      .select("rule_value")
      .eq("product_id", product.id)
      .eq("tenant_id", tenantId)
      .eq("rule_type", "finish_incompatible")
      .eq("is_active", true);

    const incompatibleIds = (rules || []).flatMap((r) => r.rule_value?.finish_ids || []);
    if (incompatibleIds.includes(finish.id)) {
      return {
        ok: false,
        reason: `Finish "${finish.name}" is incompatible with ${sku} due to a product rule. Please choose a different finish.`,
      };
    }

    finishId = finish.id;
    finishName = finish.name;
  }

  // 5. Store recommendation in ai_recommendations
  const { error: recError } = await admin.from("ai_recommendations").insert({
    session_id: sessionId,
    tenant_id: tenantId,
    product_id: product.id,
    product_sku: sku,
    finish_id: finishId,
    action: "add_to_quote",
    quantity,
  });

  if (recError) {
    return { ok: false, reason: "I wasn't able to save that to your quote. Please try again." };
  }

  return {
    ok: true,
    sku,
    name: product.name,
    finish_name: finishName,
    finish_code,
    quantity,
    message: `Added ${quantity}× ${sku}${finishName ? ` (${finishName})` : ""} to your quote.`,
  };
}

async function escalateToHuman(admin, sessionId, tenantId, input) {
  const { reason, notes } = input;

  await admin
    .from("ai_sessions")
    .update({
      escalated: true,
      escalation_reason: reason,
      escalation_notes: notes,
    })
    .eq("id", sessionId);

  // Fetch contact info for the response
  const { data: tenant } = await admin
    .from("tenants")
    .select("contact_email, contact_phone")
    .eq("id", tenantId)
    .single();

  return {
    escalated: true,
    reason,
    contact_email: tenant?.contact_email || null,
    contact_phone: tenant?.contact_phone || null,
  };
}
