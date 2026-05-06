import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

/**
 * Mask a credential for display.
 * Shows the first 7 chars (e.g. "sk-proj") then bullet dots.
 * The real value is NEVER sent to the client.
 */
function maskValue(val) {
  if (!val || val.length === 0) return "";
  const visible = Math.min(7, val.length);
  return val.slice(0, visible) + "•".repeat(Math.max(4, Math.min(24, val.length - visible)));
}

/** GET — returns { exists, maskedKey, maskedModel } — never the raw values */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx.user) return unauthorized();
  if (!hasRole(ctx, "admin")) return forbidden();

  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_settings")
    .select("openai_api_key, openai_model")
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!data) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    maskedKey:   maskValue(data.openai_api_key),
    maskedModel: maskValue(data.openai_model),
  });
}

/** POST — save (upsert) AI config for this tenant */
export async function POST(request) {
  const ctx = await getAuthContext();
  if (!ctx.user) return unauthorized();
  if (!hasRole(ctx, "admin")) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = (body.openai_api_key || "").trim();
  const model  = (body.openai_model  || "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is required" }, { status: 400 });
  }
  if (!model) {
    return NextResponse.json({ error: "OPENAI_MODEL is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("ai_settings")
    .upsert(
      {
        tenant_id:      ctx.tenantId,
        openai_api_key: apiKey,
        openai_model:   model,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save AI configuration" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — remove AI config for this tenant */
export async function DELETE() {
  const ctx = await getAuthContext();
  if (!ctx.user) return unauthorized();
  if (!hasRole(ctx, "admin")) return forbidden();

  const admin = createAdminClient();
  const { error } = await admin
    .from("ai_settings")
    .delete()
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete AI configuration" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
