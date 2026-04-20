import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("catalog_lines")
      .select(`
        id, name, slug, description, published_at,
        cover:assets!cover_asset_id(public_url, alt_text)
      `)
      .eq("tenant_id", TENANT_ID)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Attach lifestyle images for each line
    const lineIds = (data ?? []).map((l) => l.id);
    const { data: lifestyleAssets } = await admin
      .from("assets")
      .select("catalog_line_id, public_url, alt_text, parsed_sequence")
      .in("catalog_line_id", lineIds)
      .eq("asset_type", "lifestyle")
      .eq("status", "confirmed")
      .order("parsed_sequence", { ascending: true });

    const lifestyleByLine = {};
    for (const a of lifestyleAssets ?? []) {
      if (!lifestyleByLine[a.catalog_line_id]) lifestyleByLine[a.catalog_line_id] = [];
      lifestyleByLine[a.catalog_line_id].push({ url: a.public_url, alt_text: a.alt_text });
    }

    const lines = (data ?? []).map((l) => ({
      ...l,
      lifestyle_images: lifestyleByLine[l.id] ?? [],
    }));

    return NextResponse.json({ lines });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
