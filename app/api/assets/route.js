import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function GET(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const confidence = searchParams.get("confidence");
    const type = searchParams.get("type");
    const line = searchParams.get("line");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    let query = admin
      .from("assets")
      .select(
        `id, original_filename, asset_type, confidence, status, flag_reason, is_corrected,
         parsed_line_slug, parsed_category_slug, parsed_sku, parsed_finish_code, parsed_variant, parsed_sequence,
         parse_notes, storage_path, storage_bucket, public_url, mime_type, file_size_bytes,
         catalog_line_id, finish_id, ai_eligible, ingested_at, updated_at`,
        { count: "exact" }
      )
      .eq("tenant_id", ctx.tenantId)
      .order("ingested_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (confidence) query = query.eq("confidence", confidence);
    if (type) query = query.eq("asset_type", type);
    if (line) query = query.eq("parsed_line_slug", line);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assets: data, total: count, page, limit });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
