import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildKitchenDesignPrompt } from "@/lib/ai/kitchen-design-prompt";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

// Maps customer layout names to explicit spatial descriptions DALL-E can render accurately.
const LAYOUT_VISUAL = {
  "L-shaped":    "kitchen with two runs of cabinets: one along the back wall and one along the left side wall, meeting at a right-angle corner — viewed from a wide-angle perspective showing both runs clearly",
  "U-shaped":    "kitchen with three runs of cabinets forming a U-shape: cabinets along the back wall, left side wall, and right side wall, with open space in the center — wide-angle view showing all three walls",
  "Galley":      "narrow galley kitchen with two parallel rows of cabinets facing each other on opposite walls, with a walkway between them — straight-on perspective showing both sides",
  "Island":      "kitchen with an L-shaped or straight cabinet run against the walls plus a large freestanding island in the center of the floor — wide-angle view showing both the perimeter cabinets and island",
  "Single Wall": "kitchen with a single straight row of all cabinets and appliances lined up along one wall only — wide open floor plan visible, straight-on view",
  "G-shaped":    "kitchen with cabinets on three full walls plus a partial peninsula extension on one end, forming a G-shape — wide-angle corner view showing the peninsula and three cabinet walls",
};

// Normalise a string for fuzzy matching (strip spaces, hyphens, lowercase)
function normalise(s) {
  return (s || "").toLowerCase().replace(/[-\s]/g, "");
}

/**
 * Fetch reference images for the selected layout + material swatches.
 * Returns an object with keys: layout, upper_color, lower_color, countertop, flooring.
 * Any key may be null if no confirmed asset was found.
 */
async function fetchReferenceImages(admin, { layout, upper_color, lower_color, countertop, flooring }) {
  try {
    const finishNames = [upper_color, lower_color].filter(Boolean);
    const colorNames  = [countertop, flooring].filter(Boolean);

    // Round 1: resolve names → IDs + structure images in parallel
    const [finishesData, colorsData, structuresData, structureImgsData] = await Promise.all([
      finishNames.length > 0
        ? admin.from("finishes").select("id, name").eq("tenant_id", TENANT_ID).in("name", finishNames).then((r) => r.data || [])
        : Promise.resolve([]),
      colorNames.length > 0
        ? admin.from("colors").select("id, name").eq("tenant_id", TENANT_ID).in("name", colorNames).then((r) => r.data || [])
        : Promise.resolve([]),
      layout
        ? admin.from("structures").select("id, name").eq("tenant_id", TENANT_ID).eq("is_active", true).then((r) => r.data || [])
        : Promise.resolve([]),
      layout
        ? admin.from("assets").select("structure_id, public_url").eq("tenant_id", TENANT_ID).eq("asset_type", "structure_image").eq("status", "confirmed").not("structure_id", "is", null).then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    const finishIds = finishesData.map((f) => f.id);
    const colorIds  = colorsData.map((c) => c.id);

    // Round 2: fetch swatch assets
    const [finishSwatches, colorSwatches] = await Promise.all([
      finishIds.length > 0
        ? admin.from("assets").select("finish_id, public_url").eq("tenant_id", TENANT_ID).eq("asset_type", "finish_swatch").eq("status", "confirmed").in("finish_id", finishIds).then((r) => r.data || [])
        : Promise.resolve([]),
      colorIds.length > 0
        ? admin.from("assets").select("color_id, public_url").eq("tenant_id", TENANT_ID).eq("asset_type", "color_swatch").eq("status", "confirmed").in("color_id", colorIds).then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const finishNameToId = Object.fromEntries(finishesData.map((f) => [f.name, f.id]));
    const colorNameToId  = Object.fromEntries(colorsData.map((c) => [c.name, c.id]));

    const finishIdToUrl = {};
    for (const a of finishSwatches) {
      if (!finishIdToUrl[a.finish_id]) finishIdToUrl[a.finish_id] = a.public_url;
    }
    const colorIdToUrl = {};
    for (const a of colorSwatches) {
      if (!colorIdToUrl[a.color_id]) colorIdToUrl[a.color_id] = a.public_url;
    }

    // Resolve layout → structure image
    const structureImgMap = {};
    for (const img of structureImgsData) {
      if (!structureImgMap[img.structure_id]) structureImgMap[img.structure_id] = img.public_url;
    }
    const layoutKey = normalise(layout || "");
    const matchedStructure = layoutKey
      ? structuresData.find((s) => normalise(s.name).includes(layoutKey))
      : null;

    return {
      layout:      matchedStructure ? (structureImgMap[matchedStructure.id] || null) : null,
      upper_color: upper_color && finishNameToId[upper_color] ? (finishIdToUrl[finishNameToId[upper_color]] || null) : null,
      lower_color: lower_color && finishNameToId[lower_color] ? (finishIdToUrl[finishNameToId[lower_color]] || null) : null,
      countertop:  countertop  && colorNameToId[countertop]   ? (colorIdToUrl[colorNameToId[countertop]]   || null) : null,
      flooring:    flooring    && colorNameToId[flooring]     ? (colorIdToUrl[colorNameToId[flooring]]     || null) : null,
    };
  } catch (err) {
    console.warn("[kitchen-design] Reference image fetch failed (non-fatal):", err.message);
    return {};
  }
}

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

    // ── Stage 1: Load catalog context + reference images in parallel ──────────
    const admin = createAdminClient();
    const [linesRes, productsRes, colorsRes, finishesRes, refImages] = await Promise.all([
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
      fetchReferenceImages(admin, { layout, upper_color, lower_color, countertop, flooring }),
    ]);

    const lines = (linesRes.data || []).map((l) => l.name);
    const skus  = (productsRes.data || []).map((p) => `${p.sku} (${p.name})`);
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

    // Determine which reference images are available
    const hasReferenceImages = Object.values(refImages).some(Boolean);

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
      includeImageAnalysis,
      hasReferenceImages
    );

    // Build vision content: text prompt + reference images + customer photo (if any)
    const visionParts = [{ type: "text", text: userPrompt }];

    if (refImages.layout) {
      visionParts.push(
        { type: "text", text: `\n[LAYOUT STRUCTURE IMAGE — ${layout || "selected layout"}:]` },
        { type: "image_url", image_url: { url: refImages.layout, detail: "low" } }
      );
    }
    if (refImages.upper_color) {
      visionParts.push(
        { type: "text", text: `\n[UPPER CABINET COLOR SWATCH — ${upper_color}:]` },
        { type: "image_url", image_url: { url: refImages.upper_color, detail: "low" } }
      );
    }
    if (refImages.lower_color) {
      visionParts.push(
        { type: "text", text: `\n[LOWER CABINET COLOR SWATCH — ${lower_color}:]` },
        { type: "image_url", image_url: { url: refImages.lower_color, detail: "low" } }
      );
    }
    if (refImages.countertop) {
      visionParts.push(
        { type: "text", text: `\n[COUNTERTOP COLOR SWATCH — ${countertop}:]` },
        { type: "image_url", image_url: { url: refImages.countertop, detail: "low" } }
      );
    }
    if (refImages.flooring) {
      visionParts.push(
        { type: "text", text: `\n[FLOORING COLOR SWATCH — ${flooring}:]` },
        { type: "image_url", image_url: { url: refImages.flooring, detail: "low" } }
      );
    }
    if (effectiveImageUrl) {
      visionParts.push(
        { type: "text", text: "\n[CUSTOMER'S EXISTING KITCHEN PHOTO — redesign reference:]" },
        { type: "image_url", image_url: { url: effectiveImageUrl, detail: "low" } }
      );
    }

    // Use gpt-4o whenever images are present; gpt-4o-mini for text-only requests
    const hasAnyImages = hasReferenceImages || includeImageAnalysis;
    const model = hasAnyImages ? "gpt-4o" : "gpt-4o-mini";

    const userContent = hasAnyImages ? visionParts : userPrompt;

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userContent },
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
      color_suggestions = [],
    } = gptData;

    if (!concept || !dalle_prompt) {
      return NextResponse.json(
        { error: "AI response was incomplete. Please try again." },
        { status: 500 }
      );
    }

    // Force-override: customer's locked selections always win over AI choices
    if (upper_color) concept.upper_color = upper_color;
    if (lower_color) concept.lower_color = lower_color;
    if (countertop)  concept.countertop  = countertop;
    if (flooring)    concept.flooring    = flooring;

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
            sku:        p.sku,
            name:       p.name,
            type:       p.categories?.name || null,
            dimensions: dims || null,
            image_url:  assetMap[p.id] || null,
          };
        })
        .filter(Boolean);
    }

    // ── Stage 5: Generate DALL-E render + persist to Supabase Storage ─────────
    let dalleImageUrl = null;
    try {
      const layoutVisual = layout ? (LAYOUT_VISUAL[layout] || `${layout} kitchen layout`) : null;
      const layoutSpec   = layoutVisual ? `THIS IS A ${(layout || "").toUpperCase()} KITCHEN: ${layoutVisual}. ` : "";

      const materialParts = [
        upper_color   && `wall-mounted overhead upper cabinets (above the countertop) in ${upper_color} finish`,
        lower_color   && `floor-level base lower cabinets (below the countertop) in ${lower_color} finish`,
        countertop    && `${countertop} countertop surface`,
        flooring      && `${flooring} floor`,
        cabinet_style && `${cabinet_style}-style cabinet doors`,
      ].filter(Boolean);

      const materialSpec = materialParts.length > 0
        ? `Exact finishes and materials: ${materialParts.join("; ")}. `
        : "";

      const finalDallePrompt = effectiveImageUrl
        ? `Photorealistic kitchen REDESIGN. Same room geometry, windows, ceiling height, and floor plan as existing. Only cabinets, countertop, and flooring changed. ${layoutSpec}${materialSpec}${dalle_prompt}`
        : `Photorealistic architectural kitchen photograph, showroom quality. ${layoutSpec}${materialSpec}${dalle_prompt}`;

      const imageResponse = await client.images.generate({
        model:   "dall-e-3",
        prompt:  finalDallePrompt,
        n:       1,
        size:    "1792x1024",
        quality: "standard",
        style:   "vivid",
      });
      const temporaryUrl = imageResponse.data?.[0]?.url || null;

      if (temporaryUrl) {
        try {
          const imgRes    = await fetch(temporaryUrl);
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const storagePath = `${TENANT_ID}/${Date.now()}.png`;

          const { error: uploadError } = await admin.storage
            .from("design-renders")
            .upload(storagePath, imgBuffer, { contentType: "image/png", upsert: false });

          if (!uploadError) {
            const { data: urlData } = admin.storage
              .from("design-renders")
              .getPublicUrl(storagePath);
            dalleImageUrl = urlData.publicUrl;
          } else {
            console.warn("[kitchen-design] Storage upload failed, using temp URL:", uploadError.message);
            dalleImageUrl = temporaryUrl;
          }
        } catch (uploadErr) {
          console.warn("[kitchen-design] Storage fetch/upload error, using temp URL:", uploadErr.message);
          dalleImageUrl = temporaryUrl;
        }
      }
    } catch (dalleErr) {
      console.warn("[kitchen-design] DALL-E failed (non-fatal):", dalleErr.message);
    }

    // ── Stage 6: Return structured response ───────────────────────────────────
    return NextResponse.json({
      concept,
      image_url:         dalleImageUrl,
      products,
      sales_summary,
      next_steps:        Array.isArray(next_steps) ? next_steps : [],
      color_suggestions: Array.isArray(color_suggestions) ? color_suggestions : [],
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
