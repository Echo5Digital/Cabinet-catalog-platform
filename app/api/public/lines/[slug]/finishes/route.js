import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function GET(request, { params }) {
  try {
    const admin = createAdminClient();

    const { data: line } = await admin
      .from("catalog_lines")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (!line) return NextResponse.json({ error: "Catalog line not found." }, { status: 404 });

    const { data: finishes, error } = await admin
      .from("finishes")
      .select("id, name, code, finish_family, sort_order")
      .eq("catalog_line_id", line.id)
      .eq("tenant_id", TENANT_ID)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Attach swatches
    const finishIds = (finishes ?? []).map((f) => f.id);
    const { data: swatches } = await admin
      .from("assets")
      .select("finish_id, public_url, alt_text")
      .in("finish_id", finishIds)
      .eq("asset_type", "finish_swatch")
      .eq("status", "confirmed");

    const swatchByFinish = {};
    for (const s of swatches ?? []) swatchByFinish[s.finish_id] = s.public_url;

    return NextResponse.json({
      finishes: (finishes ?? []).map((f) => ({ ...f, swatch_url: swatchByFinish[f.id] ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
