import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const admin = createAdminClient();
    const { data: line, error } = await admin
      .from("catalog_lines")
      .select("id, name, slug, description, published_at")
      .eq("tenant_id", tenantId)
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (error || !line) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });

    const { data: lifestyleAssets } = await admin
      .from("assets")
      .select("public_url, alt_text, parsed_sequence")
      .eq("catalog_line_id", line.id)
      .eq("asset_type", "lifestyle")
      .eq("status", "confirmed")
      .order("parsed_sequence", { ascending: true });

    return NextResponse.json({
      line: {
        ...line,
        lifestyle_images: (lifestyleAssets ?? []).map((a) => ({ url: a.public_url, alt_text: a.alt_text })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
