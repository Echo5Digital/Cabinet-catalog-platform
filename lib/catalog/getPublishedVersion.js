import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the latest published version snapshot for a catalog line.
 * Public catalog pages use this instead of querying live tables —
 * customers always see exactly what was approved at publish time.
 *
 * @param {string} lineSlug
 * @param {string} tenantId
 * @returns {{ line, snapshot, versionNumber } | null}
 */
export async function getPublishedVersion(lineSlug, tenantId) {
  const admin = createAdminClient();

  const { data: line } = await admin
    .from("catalog_lines")
    .select("id, name, slug, description")
    .eq("tenant_id", tenantId)
    .eq("slug", lineSlug)
    .eq("status", "published")
    .single();

  if (!line) return null;

  const { data: version } = await admin
    .from("catalog_versions")
    .select("id, version_number, snapshot, published_at")
    .eq("catalog_line_id", line.id)
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  if (!version?.snapshot) return null;

  return {
    line: {
      id: line.id,
      name: line.name,
      slug: line.slug,
      description: line.description,
    },
    snapshot: version.snapshot,
    versionNumber: version.version_number,
  };
}
