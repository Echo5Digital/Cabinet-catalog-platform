import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { getAIConfig } from "@/lib/ai/config";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export async function POST(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });

    const { image_url } = await request.json();
    if (!image_url) return NextResponse.json({ error: "image_url is required." }, { status: 400 });

    const { apiKey } = await getAIConfig(tenantId);
    const client = new OpenAI({ apiKey });

    // Fetch the 2D source image
    const imgRes = await fetch(image_url);
    if (!imgRes.ok) throw new Error("Could not fetch source image.");
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const imgFile = await toFile(imgBuffer, "kitchen.png", { type: "image/png" });

    const prompt = `Recreate this kitchen as a wide-angle photorealistic first-person interior photograph. Camera at standing eye height facing the main cabinet wall. Capture a wide panoramic field of view showing the full width of the kitchen — left wall to right wall visible, ceiling overhead, floor in foreground. Preserve all cabinet colors, countertop material, flooring, appliances, hood style, and layout exactly. Realistic depth perspective with countertop in near foreground. Warm natural lighting. Residential kitchen photography — no fantasy elements.`;

    const response = await client.images.edit({
      model: "gpt-image-1",
      image: imgFile,
      prompt,
      size: "1536x1024",
      quality: "medium",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned from AI.");

    // Return base64 directly — NEVER save to storage or DB
    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error("[public/design/3d-view]", err);
    return NextResponse.json({ error: err.message || "3D generation failed." }, { status: 500 });
  }
}
