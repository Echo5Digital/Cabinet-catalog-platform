import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

const CATEGORIES = ["american", "euro", "general"];

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assets")
      .select("id, public_url, alt_text, gallery_category, parsed_sequence, ingested_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("asset_type", "lifestyle")
      .eq("status", "confirmed")
      .not("gallery_category", "is", null)
      .order("gallery_category", { ascending: true })
      .order("ingested_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ images: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "editor")) return forbidden();

    const formData = await request.formData();
    const files = formData.getAll("files");
    const category = formData.get("category");
    const altText = formData.get("alt_text");

    if (!files || files.length === 0 || !files.some((f) => f instanceof File)) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const admin = createAdminClient();
    const results = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const storagePath = `${ctx.tenantId}/gallery/${Date.now()}-${file.name}`;

      const { error: uploadError } = await admin.storage
        .from("assets")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        results.push({ filename: file.name, error: uploadError.message });
        continue;
      }

      const { data: publicUrlData } = admin.storage.from("assets").getPublicUrl(storagePath);

      const { data: inserted, error: insertError } = await admin
        .from("assets")
        .insert({
          tenant_id: ctx.tenantId,
          asset_type: "lifestyle",
          original_filename: file.name,
          storage_bucket: "assets",
          storage_path: storagePath,
          public_url: publicUrlData.publicUrl,
          file_size_bytes: buffer.length,
          mime_type: file.type || null,
          gallery_category: category,
          alt_text: altText || null,
          confidence: "matched",
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .select("id, public_url, alt_text, gallery_category")
        .single();

      if (insertError) {
        await admin.storage.from("assets").remove([storagePath]);
        results.push({ filename: file.name, error: insertError.message });
        continue;
      }

      results.push({ filename: file.name, image: inserted });
    }

    const succeeded = results.filter((r) => r.image).map((r) => r.image);
    const failed = results.filter((r) => r.error);

    if (failed.length > 0 && succeeded.length === 0) {
      return NextResponse.json({ error: "All uploads failed.", failed }, { status: 400 });
    }

    if (failed.length > 0) {
      return NextResponse.json({ images: succeeded, failed, partial: true }, { status: 207 });
    }

    return NextResponse.json({ images: succeeded }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
