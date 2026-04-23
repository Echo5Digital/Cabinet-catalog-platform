/**
 * Auto-backfill finish_id for confirmed finish_swatch assets where finish_id is NULL.
 *
 * Matches by priority:
 *   1. parsed_finish_code vs finish.code
 *   2. normalized filename vs finish.code
 *   3. normalized filename vs normalized finish.name
 *
 * Scoped to the given catalog line's finishes.
 * Called before blocker checks in both publish and checklist routes.
 *
 * @param {string} lineId
 * @param {string} tenantId
 * @param {object} adminClient - Supabase admin client
 */
export async function backfillFinishIds(lineId, tenantId, adminClient) {
  // Fetch unlinked confirmed finish_swatch assets for this line (or any line when lineId is null)
  let assetQuery = adminClient
    .from("assets")
    .select("id, original_filename, parsed_finish_code, catalog_line_id")
    .eq("tenant_id", tenantId)
    .eq("asset_type", "finish_swatch")
    .eq("status", "confirmed")
    .is("finish_id", null);

  if (lineId) assetQuery = assetQuery.eq("catalog_line_id", lineId);

  const { data: unlinked } = await assetQuery;
  if (!unlinked?.length) return;

  // Fetch all active finishes for this line
  let finishQuery = adminClient
    .from("finishes")
    .select("id, code, name, catalog_line_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (lineId) finishQuery = finishQuery.eq("catalog_line_id", lineId);

  const { data: finishes } = await finishQuery;
  if (!finishes?.length) return;

  // Match and update each unlinked asset
  const updates = [];
  for (const asset of unlinked) {
    const normalizedFilename = asset.original_filename
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .trim();

    // Scope to the asset's catalog line if known
    const candidates = asset.catalog_line_id
      ? finishes.filter((f) => f.catalog_line_id === asset.catalog_line_id)
      : finishes;

    const matched = candidates.find(
      (f) =>
        (asset.parsed_finish_code && asset.parsed_finish_code === f.code) ||
        normalizedFilename === f.code ||
        normalizedFilename === f.name.toLowerCase().replace(/\s+/g, "-")
    );

    if (matched) {
      updates.push(
        adminClient
          .from("assets")
          .update({
            finish_id: matched.id,
            catalog_line_id: asset.catalog_line_id ?? matched.catalog_line_id,
          })
          .eq("id", asset.id)
      );
    }
  }

  if (updates.length) await Promise.all(updates);
}
