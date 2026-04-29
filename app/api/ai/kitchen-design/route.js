import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildKitchenDesignPrompt } from "@/lib/ai/kitchen-design-prompt";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, address, email, phone,
      project_type, layout, cabinet_style, budget_style,
      upper_color, lower_color, countertop, flooring,
      hood_style, hardware, appliance_color,
      items_list, design_comments,
      image_status, image_url,
    } = body;

    if (!TENANT_ID) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    // ── Stage 1: Load catalog context ─────────────────────────────────────────
    const admin = createAdminClient();
    const [linesRes, productsRes, colorsRes, finishesRes] = await Promise.all([
      admin.from("catalog_lines")
        .select("name, slug")
        .eq("tenant_id", TENANT_ID)
        .eq("status", "published")
        .order("sort_order"),
      admin.from("products")
        .select("sku, name")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true)
        .limit(60),
      admin.from("colors")
        .select("name, color_type")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true),
      admin.from("finishes")
        .select("name, code")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true),
    ]);

    const lines = (linesRes.data || []).map((l) => l.name);
    const skus = (productsRes.data || []).map((p) => `${p.sku} (${p.name})`);
    const countertopColors = (colorsRes.data || [])
      .filter((c) => c.color_type === "countertop")
      .map((c) => c.name);
    const floorColors = (colorsRes.data || [])
      .filter((c) => c.color_type === "floor")
      .map((c) => c.name);
    const finishes = (finishesRes.data || []).map((f) => `${f.name} (${f.code})`);

    const catalogContext = { lines, skus, countertopColors, floorColors, finishes };
    const effectiveImageUrl = image_status === "Yes" && image_url ? image_url : "";
    const includeImageAnalysis = !!effectiveImageUrl;

    // ── Stage 2: Build prompt and call GPT (JSON mode) ────────────────────────
    const { systemPrompt, userPrompt } = buildKitchenDesignPrompt(
      {
        name, address, email, phone,
        project_type, layout, cabinet_style, budget_style,
        upper_color, lower_color, countertop, flooring,
        hood_style, hardware, appliance_color,
        items_list, design_comments,
      },
      catalogContext,
      includeImageAnalysis
    );

    const model = includeImageAnalysis ? "gpt-4o" : "gpt-4o-mini";

    let userContent;
    if (includeImageAnalysis) {
      userContent = [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: effectiveImageUrl, detail: "low" } },
      ];
    } else {
      userContent = userPrompt;
    }

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    // ── Stage 3: Parse GPT JSON ───────────────────────────────────────────────
    const rawText = completion.choices?.[0]?.message?.content ?? "";
    let gptData;
    try {
      gptData = JSON.parse(rawText);
    } catch {
      console.error("[kitchen-design] JSON parse failed:", rawText.slice(0, 300));
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }

    const {
      concept,
      dalle_prompt,
      skus: recommendedSkus = [],
      sales_summary = "",
      next_steps = [],
    } = gptData;

    if (!concept || !dalle_prompt) {
      return NextResponse.json(
        { error: "AI response was incomplete. Please try again." },
        { status: 500 }
      );
    }

    // ── Stage 4: Resolve product images for recommended SKUs ──────────────────
    const skuList = (Array.isArray(recommendedSkus) ? recommendedSkus : [])
      .map((s) => String(s).trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 12);

    let products = [];
    if (skuList.length > 0) {
      const { data: matchedProducts } = await admin
        .from("products")
        .select("id, sku, name, width_in, height_in, depth_in, categories(name)")
        .eq("tenant_id", TENANT_ID)
        .in("sku", skuList);

      const matchedIds = (matchedProducts || []).map((p) => p.id);

      let assetMap = {};
      if (matchedIds.length > 0) {
        // Step 1: prefer primary assets
        const { data: primaryRows } = await admin
          .from("product_assets")
          .select("product_id, asset:assets!asset_id(public_url, status)")
          .in("product_id", matchedIds)
          .eq("is_primary", true);

        for (const row of primaryRows || []) {
          if (row.asset?.status === "confirmed" && row.asset?.public_url) {
            assetMap[row.product_id] = row.asset.public_url;
          }
        }

        // Step 2: for products with no primary, fall back to any confirmed asset
        const uncoveredIds = matchedIds.filter((id) => !assetMap[id]);
        if (uncoveredIds.length > 0) {
          const { data: fallbackRows } = await admin
            .from("product_assets")
            .select("product_id, asset:assets!asset_id(public_url, status)")
            .in("product_id", uncoveredIds)
            .order("sort_order", { ascending: true })
            .limit(uncoveredIds.length * 3);

          for (const row of fallbackRows || []) {
            if (!assetMap[row.product_id] && row.asset?.status === "confirmed" && row.asset?.public_url) {
              assetMap[row.product_id] = row.asset.public_url;
            }
          }
        }
      }

      // Build product lookup and preserve GPT-recommended SKU order
      const productLookup = {};
      for (const p of matchedProducts || []) {
        productLookup[p.sku.toUpperCase()] = p;
      }

      products = skuList
        .map((sku) => {
          const p = productLookup[sku];
          if (!p) return null;
          const dims = [
            p.width_in  ? `${p.width_in}"W`  : null,
            p.height_in ? `${p.height_in}"H` : null,
            p.depth_in  ? `${p.depth_in}"D`  : null,
          ].filter(Boolean).join(" × ");
          return {
            sku: p.sku,
            name: p.name,
            type: p.categories?.name || null,
            dimensions: dims || null,
            image_url: assetMap[p.id] || null,
          };
        })
        .filter(Boolean);
    }

    // ── Stage 5: Generate DALL-E render (non-fatal) ───────────────────────────
    let dalleImageUrl = null;
    try {
      // When redesigning an existing photo, prepend a strong redesign directive
      const finalDallePrompt = effectiveImageUrl
        ? `Photo-realistic kitchen REDESIGN. Preserve exact room structure: same walls, windows, ceiling height, and floor plan as the existing kitchen. Only change cabinets, finishes, countertop, and flooring. ${dalle_prompt}`
        : dalle_prompt;

      const imageResponse = await client.images.generate({
        model: "dall-e-3",
        prompt: finalDallePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        style: "vivid",
      });
      dalleImageUrl = imageResponse.data?.[0]?.url || null;
    } catch (dalleErr) {
      console.warn("[kitchen-design] DALL-E failed (non-fatal):", dalleErr.message);
    }

    // ── Stage 6: Return structured response ───────────────────────────────────
    return NextResponse.json({
      concept,
      image_url: dalleImageUrl,
      products,
      sales_summary,
      next_steps: Array.isArray(next_steps) ? next_steps : [],
      layout,
    });

  } catch (err) {
    console.error("[kitchen-design] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate design concepts." },
      { status: 500 }
    );
  }
}
