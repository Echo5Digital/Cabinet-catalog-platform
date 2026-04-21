import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

const BUCKET = "logos";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

/**
 * POST /api/tenant/logo
 * Uploads a logo file to Supabase Storage and updates tenants.logo_url.
 * Requires admin or owner role.
 * Body: multipart/form-data with field "file"
 */
export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use PNG, JPEG, SVG, or WebP.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 2 MB limit." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const storagePath = `${ctx.tenantId}/logo-${Date.now()}.${ext}`;

    const admin = createAdminClient();

    // Upload to logos bucket (public)
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const logo_url = urlData?.publicUrl;

    if (!logo_url) {
      return NextResponse.json({ error: "Could not retrieve public URL." }, { status: 500 });
    }

    // Update tenant record
    const { error: updateError } = await admin
      .from("tenants")
      .update({ logo_url, updated_at: new Date().toISOString() })
      .eq("id", ctx.tenantId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save logo URL: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ logo_url });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/tenant/logo
 * Clears the tenant logo (sets logo_url to null).
 * Does NOT delete the file from storage (preserves history).
 */
export async function DELETE(_request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const admin = createAdminClient();
    await admin
      .from("tenants")
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq("id", ctx.tenantId);

    return NextResponse.json({ removed: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
