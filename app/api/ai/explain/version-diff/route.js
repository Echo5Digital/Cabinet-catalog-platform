import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, unauthorized } from "@/lib/utils/api-auth";
import { explainVersionDiff } from "@/lib/ai/chat";

/**
 * POST /api/ai/explain/version-diff
 *
 * Body: { catalog_line_id, v1, v2 }
 *
 * Fetches the two version snapshots, computes the diff, and uses Claude
 * to explain the changes in plain English for a non-technical user.
 */
export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const { catalog_line_id, v1, v2 } = await request.json();
    if (!catalog_line_id || !v1 || !v2 || v1 === v2) {
      return NextResponse.json({ error: "Provide catalog_line_id, v1, and v2 (different version numbers)." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: versions, error } = await admin
      .from("catalog_versions")
      .select("version_number, label, snapshot, product_count, finish_count, published_at")
      .eq("catalog_line_id", catalog_line_id)
      .eq("tenant_id", ctx.tenantId)
      .in("version_number", [v1, v2]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!versions || versions.length < 2) {
      return NextResponse.json({ error: "One or both versions not found." }, { status: 404 });
    }

    const [older, newer] = versions.sort((a, b) => a.version_number - b.version_number);
    const snapA = older.snapshot ?? {};
    const snapB = newer.snapshot ?? {};

    // Build diff object (same logic as compare route)
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
        if (productA[key] !== productB[key]) changes[key] = { from: productA[key], to: productB[key] };
      }
      if (Object.keys(changes).length > 0) productsModified.push({ sku, changes });
    }

    const codesA = new Set((snapA.finishes ?? []).map((f) => f.code));
    const codesB = new Set((snapB.finishes ?? []).map((f) => f.code));
    const finishesAdded = (snapB.finishes ?? []).filter((f) => !codesA.has(f.code)).map((f) => ({ code: f.code, name: f.name }));
    const finishesRemoved = (snapA.finishes ?? []).filter((f) => !codesB.has(f.code)).map((f) => ({ code: f.code, name: f.name }));

    const diff = {
      v1: { version_number: older.version_number, label: older.label, published_at: older.published_at, product_count: older.product_count },
      v2: { version_number: newer.version_number, label: newer.label, published_at: newer.published_at, product_count: newer.product_count },
      products: { added: productsAdded, removed: productsRemoved, modified: productsModified },
      finishes: { added: finishesAdded, removed: finishesRemoved },
    };

    const explanation = await explainVersionDiff(diff);

    return NextResponse.json({ explanation, diff });
  } catch (err) {
    console.error("[ai/explain/version-diff]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
