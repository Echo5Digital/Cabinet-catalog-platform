import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantId } from "@/lib/utils/tenant-context";
import CatalogShell from "@/components/catalog/CatalogShell";

export const dynamic = "force-dynamic";

async function getTenantAndLines() {
  try {
    const tenantId = await resolveTenantId();
    const admin = createAdminClient();
    const [{ data: tenant }, { data: lines }] = await Promise.all([
      admin.from("tenants").select("name, logo_url, primary_color, accent_color, contact_email, contact_phone, website_url").eq("id", tenantId).single(),
      admin.from("catalog_lines").select("id, name, slug").eq("tenant_id", tenantId).eq("status", "published").order("sort_order", { ascending: true }),
    ]);
    return { tenant: tenant || {}, lines: lines || [] };
  } catch {
    return { tenant: {}, lines: [] };
  }
}

export default async function CatalogLayout({ children }) {
  const { tenant, lines } = await getTenantAndLines();
  return <CatalogShell tenant={tenant} lines={lines}>{children}</CatalogShell>;
}
