import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIConfig } from "@/lib/ai/config";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export const dynamic = "force-dynamic";
import { buildPlannerPrompt } from "@/lib/planner/promptGenerator";

/**
 * POST /api/planner/generate
 *
 * Generates an AI kitchen visualization from planner state.
 * Completely isolated from the existing /api/ai/kitchen-design endpoint.
 *
 * Body: { layout, roomWidth, roomLength, ceilingHeight, items }
 * Returns: { imageUrl, prompt }
 */
export async function POST(request) {
  let tenantId;
  try {
    tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const body = await request.json();
    const { layout, roomWidth, roomLength, ceilingHeight, items = [] } = body;

    if (!layout) {
      return NextResponse.json({ error: "Layout is required." }, { status: 400 });
    }

    // Build the descriptive image prompt from planner data
    const prompt = buildPlannerPrompt({
      layout,
      roomWidth:     parseFloat(roomWidth) || 14,
      roomLength:    parseFloat(roomLength) || 11,
      ceilingHeight: ceilingHeight ? parseFloat(ceilingHeight) : null,
      items,
    });

    // Load OpenAI credentials (from DB ai_settings or env fallback)
    const { apiKey } = await getAIConfig(tenantId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI is not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    const client = new OpenAI({ apiKey });

    // Generate the kitchen image
    const imageResponse = await client.images.generate({
      model:   "gpt-image-1",
      prompt,
      n:       1,
      size:    "1536x1024",
      quality: "high",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "AI image generation returned no result. Please try again." },
        { status: 500 }
      );
    }

    // Persist to Supabase design-renders bucket (same bucket as kitchen-design AI)
    const imgBuffer  = Buffer.from(b64, "base64");
    const admin      = createAdminClient();
    const storagePath = `${tenantId}/planner-${Date.now()}.png`;

    let imageUrl = null;
    const { error: uploadError } = await admin.storage
      .from("design-renders")
      .upload(storagePath, imgBuffer, { contentType: "image/png", upsert: false });

    if (!uploadError) {
      const { data: urlData } = admin.storage.from("design-renders").getPublicUrl(storagePath);
      imageUrl = urlData?.publicUrl || null;
    } else {
      console.warn("[planner/generate] Storage upload failed (non-fatal):", uploadError.message);
      // Fall back to base64 data URI so the user still sees the image
      imageUrl = `data:image/png;base64,${b64}`;
    }

    return NextResponse.json({ imageUrl, prompt });

  } catch (err) {
    console.error("[planner/generate] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate kitchen visualization." },
      { status: 500 }
    );
  }
}
