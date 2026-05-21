import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string")
      return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const raw    = file.name || "photo";
    const ext    = raw.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const safe   = raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
    const path   = `${ctx.tenantId}/customer-photos/${Date.now()}-${safe}.${ext}`;

    const admin = createAdminClient();
    const { error: upErr } = await admin.storage
      .from("design-renders")
      .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });

    if (upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data } = admin.storage.from("design-renders").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[admin/upload-photo]", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
