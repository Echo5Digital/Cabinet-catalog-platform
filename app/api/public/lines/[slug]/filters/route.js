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

    const [{ data: products }, { data: finishes }] = await Promise.all([
      admin.from("products")
        .select("width_in, category:categories!category_id(id, name, slug)")
        .eq("catalog_line_id", line.id)
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true),
      admin.from("finishes")
        .select("id, name, code, sort_order")
        .eq("catalog_line_id", line.id)
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    // Categories with product counts
    const catCounts = {};
    const catMeta = {};
    for (const p of products ?? []) {
      const cat = p.category;
      if (cat) {
        catCounts[cat.slug] = (catCounts[cat.slug] ?? 0) + 1;
        catMeta[cat.slug] = { slug: cat.slug, name: cat.name, id: cat.id };
      }
    }
    const categories = Object.values(catMeta).map((c) => ({ ...c, count: catCounts[c.slug] }));

    // Dimension ranges
    const widths = [...new Set((products ?? []).map((p) => p.width_in).filter(Boolean))].sort((a, b) => a - b);

    // Swatch URLs
    const finishIds = (finishes ?? []).map((f) => f.id);
    const { data: swatches } = await admin
      .from("assets")
      .select("finish_id, public_url")
      .in("finish_id", finishIds)
      .eq("asset_type", "finish_swatch")
      .eq("status", "confirmed");

    const swatchByFinish = {};
    for (const s of swatches ?? []) swatchByFinish[s.finish_id] = s.public_url;

    return NextResponse.json({
      categories,
      finishes: (finishes ?? []).map((f) => ({ ...f, swatch_url: swatchByFinish[f.id] ?? null })),
      dimensions: {
        widths,
        min_width: widths[0] ?? null,
        max_width: widths[widths.length - 1] ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
