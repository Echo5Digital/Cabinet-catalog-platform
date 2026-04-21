import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Builds a complete frozen catalog snapshot for a given line.
 * Used by both the publish route (hard checklist) and draft route (soft checklist).
 *
 * Snapshot schema:
 *   line:              { id, name, slug }
 *   products[]:        { id, sku, name, description, width_in, height_in, depth_in,
 *                        door_count, drawer_count, notes,
 *                        category_id, category_name, category_slug,
 *                        finish_ids[], default_finish_id,
 *                        incompatible_finish_ids[], dimension_notes[],
 *                        images[{ url, alt, is_primary, sort_order }] }
 *   finishes[]:        { id, code, name, finish_family, swatch_url }
 *   lifestyle_images[]:{ url, alt }
 *
 * @param {string} lineId
 * @param {string} tenantId
 * @returns {{ line, snapshot, blockers, counts } | { error: string }}
 */
export async function buildCatalogSnapshot(lineId, tenantId) {
  const admin = createAdminClient();

  const { data: line } = await admin
    .from("catalog_lines")
    .select("id, name, slug, tenant_id")
    .eq("id", lineId)
    .eq("tenant_id", tenantId)
    .single();

  if (!line) return { error: "Catalog line not found." };

  // Parallel: products + finishes
  const [{ data: products }, { data: finishes }] = await Promise.all([
    admin
      .from("products")
      .select(`
        id, sku, name, description,
        width_in, height_in, depth_in,
        door_count, drawer_count, notes,
        category:categories!category_id(id, name, slug)
      `)
      .eq("catalog_line_id", lineId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("finishes")
      .select("id, code, name, finish_family")
      .eq("catalog_line_id", lineId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  // Checklist (individual async checks — needed one-by-one to collect all blockers)
  const blockers = [];

  for (const product of products ?? []) {
    const { count } = await admin
      .from("product_assets")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);
    if (!count || count === 0) {
      blockers.push({ type: "missing_product_image", sku: product.sku });
    }
  }

  for (const finish of finishes ?? []) {
    const { count } = await admin
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("finish_id", finish.id)
      .eq("asset_type", "finish_swatch")
      .eq("status", "confirmed");
    if (!count || count === 0) {
      blockers.push({ type: "missing_finish_swatch", finish_code: finish.code });
    }
  }

  const { count: pendingCount } = await admin
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("catalog_line_id", lineId)
    .in("status", ["pending_review", "flagged"]);

  if (pendingCount > 0) {
    blockers.push({ type: "pending_assets", count: pendingCount });
  }

  const productIds = (products ?? []).map((p) => p.id);
  const finishIds = (finishes ?? []).map((f) => f.id);

  // Parallel: join tables
  const [
    { data: productAssets },
    { data: finishAssets },
    { data: lifestyleAssets },
    { data: productFinishMap },
    { data: productRules },
  ] = await Promise.all([
    productIds.length > 0
      ? admin
          .from("product_assets")
          .select("product_id, asset:assets!asset_id(public_url, alt_text), is_primary, sort_order")
          .in("product_id", productIds)
      : { data: [] },
    finishIds.length > 0
      ? admin
          .from("assets")
          .select("finish_id, public_url, alt_text")
          .in("finish_id", finishIds)
          .eq("asset_type", "finish_swatch")
          .eq("status", "confirmed")
      : { data: [] },
    admin
      .from("assets")
      .select("public_url, alt_text, parsed_sequence")
      .eq("catalog_line_id", lineId)
      .eq("asset_type", "lifestyle")
      .eq("status", "confirmed")
      .order("parsed_sequence", { ascending: true }),
    productIds.length > 0
      ? admin
          .from("product_finish_map")
          .select("product_id, finish_id, is_default, is_available, sort_order")
          .in("product_id", productIds)
      : { data: [] },
    productIds.length > 0
      ? admin
          .from("product_rules")
          .select("product_id, rule_type, rule_value, label")
          .in("product_id", productIds)
          .eq("is_active", true)
      : { data: [] },
  ]);

  // Build lookup maps
  const paByProduct = {};
  for (const pa of productAssets ?? []) {
    if (!paByProduct[pa.product_id]) paByProduct[pa.product_id] = [];
    paByProduct[pa.product_id].push(pa);
  }

  const faByFinish = {};
  for (const fa of finishAssets ?? []) {
    if (!faByFinish[fa.finish_id]) faByFinish[fa.finish_id] = fa.public_url;
  }

  const pfByProduct = {};
  for (const pf of productFinishMap ?? []) {
    if (!pfByProduct[pf.product_id]) pfByProduct[pf.product_id] = [];
    pfByProduct[pf.product_id].push(pf);
  }

  const incompatibleByProduct = {};
  const dimensionNotesByProduct = {};
  for (const rule of productRules ?? []) {
    if (rule.rule_type === "finish_incompatible") {
      if (!incompatibleByProduct[rule.product_id]) incompatibleByProduct[rule.product_id] = [];
      incompatibleByProduct[rule.product_id].push(...(rule.rule_value?.finish_ids || []));
    }
    if (rule.rule_type === "dimension_note") {
      if (!dimensionNotesByProduct[rule.product_id]) dimensionNotesByProduct[rule.product_id] = [];
      dimensionNotesByProduct[rule.product_id].push(rule.rule_value?.message || rule.label);
    }
  }

  const snapshot = {
    line: { id: line.id, name: line.name, slug: line.slug },
    products: (products ?? []).map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description ?? null,
      width_in: p.width_in,
      height_in: p.height_in,
      depth_in: p.depth_in,
      door_count: p.door_count ?? null,
      drawer_count: p.drawer_count ?? null,
      notes: p.notes ?? null,
      category_id: p.category?.id ?? null,
      category_name: p.category?.name ?? null,
      category_slug: p.category?.slug ?? null,
      finish_ids: (pfByProduct[p.id] ?? [])
        .filter((pf) => pf.is_available)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((pf) => pf.finish_id),
      default_finish_id: (pfByProduct[p.id] ?? []).find((pf) => pf.is_default)?.finish_id ?? null,
      incompatible_finish_ids: incompatibleByProduct[p.id] ?? [],
      dimension_notes: dimensionNotesByProduct[p.id] ?? [],
      images: (paByProduct[p.id] ?? [])
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order)
        .map((pa) => ({
          url: pa.asset?.public_url,
          alt: pa.asset?.alt_text || null,
          is_primary: pa.is_primary,
          sort_order: pa.sort_order,
        }))
        .filter((img) => img.url),
    })),
    finishes: (finishes ?? []).map((f) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      finish_family: f.finish_family ?? null,
      swatch_url: faByFinish[f.id] ?? null,
    })),
    lifestyle_images: (lifestyleAssets ?? [])
      .map((a) => ({ url: a.public_url, alt: a.alt_text || null }))
      .filter((a) => a.url),
  };

  const assetCount =
    (productAssets?.length ?? 0) +
    (finishAssets?.length ?? 0) +
    (lifestyleAssets?.length ?? 0);

  return {
    line,
    snapshot,
    blockers,
    counts: {
      products: (products ?? []).length,
      finishes: (finishes ?? []).length,
      assets: assetCount,
    },
  };
}
