import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { parseAssetFilename, scoreAssetConfidence } from "@/lib/utils/asset-parser";

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const formData = await request.formData();
    const files = formData.getAll("files");
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Load DB context for confidence scoring
    const [linesRes, categoriesRes, skusRes, finishesRes] = await Promise.all([
      admin.from("catalog_lines").select("id, slug").eq("tenant_id", ctx.tenantId),
      admin.from("categories").select("id, slug").eq("tenant_id", ctx.tenantId),
      admin.from("products").select("id, sku, catalog_line_id").eq("tenant_id", ctx.tenantId),
      admin.from("finishes").select("id, code, name, catalog_line_id").eq("tenant_id", ctx.tenantId),
    ]);

    const lines = (linesRes.data || []).map((l) => ({ id: l.id, slug: l.slug }));
    const categories = (categoriesRes.data || []).map((c) => ({ id: c.id, slug: c.slug }));
    const skus = (skusRes.data || []).map((s) => ({
      id: s.id,
      sku: s.sku,
      catalogLineId: s.catalog_line_id,
      lineSlug: lines.find((l) => l.id === s.catalog_line_id)?.slug ?? null,
    }));
    const finishes = (finishesRes.data || []).map((f) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      catalogLineId: f.catalog_line_id,
      lineSlug: lines.find((l) => l.id === f.catalog_line_id)?.slug ?? null,
    }));

    const dbContext = { lines, categories, skus, finishes };
    const results = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const filename = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 1. Upload to Supabase Storage (staging bucket)
      const storagePath = `${ctx.tenantId}/${Date.now()}-${filename}`;
      const { error: uploadError } = await admin.storage
        .from("assets-staging")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("[ingest] storage upload error:", filename, uploadError);
        results.push({ filename, error: uploadError.message });
        continue;
      }

      // 2. Parse filename — pass live line slugs so new lines are recognized
      const parsed = parseAssetFilename(filename, lines.map((l) => l.slug));

      // 3. Score confidence against DB
      const scored = scoreAssetConfidence(parsed, dbContext);

      // 4. Resolve FKs — prefer IDs resolved by the scorer, fall back to slug lookup
      const resolvedLineId =
        scored.resolvedLineId ??
        lines.find((l) => l.slug === scored.lineSlug)?.id ??
        null;
      const resolvedFinishId =
        scored.resolvedFinishId ??
        finishes.find((f) => f.code === scored.finishCode && f.lineSlug === scored.lineSlug)?.id ??
        null;

      // 5. Insert into assets table
      const { data: inserted, error: insertError } = await admin
        .from("assets")
        .insert({
          tenant_id: ctx.tenantId,
          asset_type: scored.assetType ?? "lifestyle",
          original_filename: filename,
          storage_bucket: "assets-staging",
          storage_path: storagePath,
          file_size_bytes: buffer.length,
          mime_type: file.type || null,

          parsed_line_slug: scored.lineSlug ?? null,
          parsed_category_slug: scored.categorySlug ?? null,
          parsed_sku: scored.sku ?? null,
          parsed_finish_code: scored.finishCode ?? null,
          parsed_variant: scored.variant ?? null,
          parsed_sequence: scored.sequence ?? null,
          parse_notes: scored.parseNotes.length > 0 ? scored.parseNotes : null,

          confidence: scored.confidence,
          status: "pending_review",

          // Pre-resolve FKs — set for all asset types where we have a match
          catalog_line_id: resolvedLineId,
          finish_id: scored.assetType === "finish_swatch" ? resolvedFinishId : null,
        })
        .select("id, original_filename, asset_type, confidence, status, parsed_sku, parsed_line_slug, parse_notes")
        .single();

      if (insertError) {
        console.error("[ingest] db insert error:", filename, insertError);
        results.push({ filename, error: insertError.message });
        continue;
      }

      results.push({ filename, asset: inserted });
    }

    const succeeded = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);

    if (failed.length > 0 && succeeded.length === 0) {
      return NextResponse.json({ error: "All files failed to ingest.", failed }, { status: 400 });
    }

    if (failed.length > 0) {
      return NextResponse.json({ ingested: succeeded, failed, partial: true }, { status: 207 });
    }

    return NextResponse.json({ ingested: succeeded });
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
