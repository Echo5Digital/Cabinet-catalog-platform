import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

export async function DELETE(request, { params }) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "owner")) return forbidden();

    const admin = createAdminClient();
    const { data: asset } = await admin
      .from("assets")
      .select("storage_bucket, storage_path")
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId)
      .not("gallery_category", "is", null)
      .single();

    if (!asset) return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });

    await admin.storage.from(asset.storage_bucket).remove([asset.storage_path]);

    const { error } = await admin
      .from("assets")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
