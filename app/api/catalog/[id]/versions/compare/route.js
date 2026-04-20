import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, unauthorized } from "@/lib/utils/api-auth";

export async function GET(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const v1Num = parseInt(searchParams.get("v1"), 10);
    const v2Num = parseInt(searchParams.get("v2"), 10);

    if (!v1Num || !v2Num || v1Num === v2Num) {
      return NextResponse.json({ error: "Provide two different version numbers: ?v1=1&v2=2" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: versions, error } = await admin
      .from("catalog_versions")
      .select("id, version_number, label, snapshot, product_count, finish_count, published_at")
      .eq("catalog_line_id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .in("version_number", [v1Num, v2Num]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (versions.length < 2) return NextResponse.json({ error: "One or both versions not found." }, { status: 404 });

    const [older, newer] = versions.sort((a, b) => a.version_number - b.version_number);
    const snapA = older.snapshot ?? {};
    const snapB = newer.snapshot ?? {};

    // Compare products
    const skusA = new Map((snapA.products ?? []).map((p) => [p.sku, p]));
    const skusB = new Map((snapB.products ?? []).map((p) => [p.sku, p]));

    const productsAdded = [...skusB.values()].filter((p) => !skusA.has(p.sku)).map((p) => ({ sku: p.sku, name: p.name }));
    const productsRemoved = [...skusA.values()].filter((p) => !skusB.has(p.sku)).map((p) => ({ sku: p.sku, name: p.name }));
    const productsModified = [];

    for (const [sku, productB] of skusB) {
      const productA = skusA.get(sku);
      if (!productA) continue;
      const changes = {};
      for (const key of ["name", "width_in", "height_in", "depth_in"]) {
        if (productA[key] !== productB[key]) {
          changes[key] = { from: productA[key], to: productB[key] };
        }
      }
      if (Object.keys(changes).length > 0) {
        productsModified.push({ sku, changes });
      }
    }

    // Compare finishes
    const codesA = new Set((snapA.finishes ?? []).map((f) => f.code));
    const codesB = new Set((snapB.finishes ?? []).map((f) => f.code));
    const finishesAdded = (snapB.finishes ?? []).filter((f) => !codesA.has(f.code)).map((f) => ({ code: f.code, name: f.name }));
    const finishesRemoved = (snapA.finishes ?? []).filter((f) => !codesB.has(f.code)).map((f) => ({ code: f.code, name: f.name }));

    return NextResponse.json({
      line: { id: params.id },
      v1: { version_number: older.version_number, label: older.label, published_at: older.published_at, product_count: older.product_count },
      v2: { version_number: newer.version_number, label: newer.label, published_at: newer.published_at, product_count: newer.product_count },
      diff: {
        products: { added: productsAdded, removed: productsRemoved, modified: productsModified },
        finishes: { added: finishesAdded, removed: finishesRemoved },
        lifestyle_images: {
          v1_count: (snapA.lifestyle_images ?? []).length,
          v2_count: (snapB.lifestyle_images ?? []).length,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
