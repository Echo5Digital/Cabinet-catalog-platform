import { createAdminClient } from "@/lib/supabase/admin";
import CatalogShell from "@/components/catalog/CatalogShell";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

async function getTenantAndLines() {
  try {
    const admin = createAdminClient();
    const [{ data: tenant }, { data: lines }] = await Promise.all([
      admin.from("tenants").select("name, logo_url, primary_color, accent_color, contact_email, contact_phone, website_url").eq("id", TENANT_ID).single(),
      admin.from("catalog_lines").select("id, name, slug").eq("tenant_id", TENANT_ID).eq("status", "published").order("sort_order", { ascending: true }),
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
