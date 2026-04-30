import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildKitchenDesignPrompt } from "@/lib/ai/kitchen-design-prompt";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

// Per-layout DALL-E visual blocks.
// structure = concise 1-2 sentence cabinet/wall geometry description
// camera    = camera angle that inherently shows this layout's defining shape
// spatial   = positive description of the open/empty space in this layout
// negative  = positive description of what the absent elements look like (avoids "NO"/"FORBIDDEN" language which introduces unwanted concepts)
const LAYOUT_VISUAL = {

  "L-shaped": {
    structure: "Two cabinet walls meeting at one corner, forming an L shape. Cabinets on the back wall and one side wall only. The other two sides of the room are completely open floor.",
    camera:    "Camera angled diagonally into the corner where the two cabinet walls meet. Both walls visible receding into the corner. Large open floor fills the foreground.",
    spatial:   "Two walls have cabinets. Two sides are completely open. More than half the floor is clear empty space.",
    negative:  "Only two walls have cabinets — the other two walls are bare drywall with no cabinetry. The open sides and center floor are clear empty space with no obstructions.",
  },

  "U-shaped": {
    structure: "Three walls of cabinets forming a closed horseshoe — left wall, back wall, and right wall all have full cabinet runs. Front of the kitchen is completely open.",
    camera:    "Camera at the open front, facing directly toward the back wall. Left cabinet wall extends to the left, right cabinet wall extends to the right, back wall closes ahead.",
    spatial:   "Three enclosed walls with cabinets. Center floor between the three walls is open clear space.",
    negative:  "Three walls with cabinets and one fully open front entrance. Center floor is completely clear with no island or peninsula.",
  },

  "Galley": {
    structure: "Two parallel rows of cabinets on opposite walls, directly facing each other, with a narrow corridor between them.",
    camera:    "Camera at one end of the corridor, looking straight down its full length. Both cabinet rows converge symmetrically toward a single vanishing point ahead.",
    spatial:   "Narrow straight corridor between the two parallel rows. Both ends are open passageways. No corners, no turns.",
    negative:  "Two parallel rows only, running the full length of the room. The corridor between them is the only floor space. The corridor runs straight from end to end with no junctions.",
  },

  "Island": {
    structure: "Wall cabinets on the back wall and side walls. One large freestanding rectangular island in the center of the room, completely detached from all walls.",
    camera:    "Three-quarter view. Freestanding island prominent in the foreground center. Wall cabinets visible in the background.",
    spatial:   "Clear open walking space of 3-4 feet on all four sides of the island. Island is the visual centerpiece with open floor surrounding it.",
    negative:  "The island is freestanding — clear open floor completely surrounds all four sides of the island with no connection to any wall.",
  },

  "Single Wall": {
    structure: "All cabinets, appliances, sink, and range in one straight continuous line on the back wall only. No cabinetry on any other wall.",
    camera:    "Straight-on view facing the single cabinet wall. Camera pulled far back. Full cabinet wall visible from edge to edge.",
    spatial:   "Large open floor fills most of the foreground. The left wall, right wall, and ceiling are bare with no cabinets.",
    negative:  "One wall only has cabinets. The other three walls are completely bare painted drywall. The floor in front of the cabinet wall is wide open empty space.",
  },

  "G-shaped": {
    structure: "Three walls of cabinets — back wall, left wall, and right wall — plus one shorter peninsula counter attached to and extending inward from one wall. The peninsula projects into the room without reaching the opposite wall.",
    camera:    "Angled three-quarter view showing all three cabinet walls and the peninsula clearly projecting inward from one side.",
    spatial:   "Semi-enclosed kitchen. The peninsula creates a partial barrier that leaves the kitchen entrance open.",
    negative:  "The peninsula is shorter than the full room width, leaving a clear open entrance gap. No freestanding island occupies the center floor.",
  },
};

// Budget-appropriate realism descriptions for DALL-E image generation.
// Kept SHORT intentionally — long budget paragraphs dilute the geometric signal.
// Budget controls ONLY material quality and styling, never layout or geometry.
const BUDGET_REALISM = {
  "Budget-friendly": "Standard residential kitchen. Affordable simple materials. Clean practical styling.",
  "Modern Euro":     "Mid-range residential kitchen. Quality materials. Contemporary tasteful styling.",
  "Premium Luxury":  "High-end residential kitchen. Premium appliances and materials. Elegant realistic proportions.",
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
      design_comments,
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
        design_comments,
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
    // NOTE: DALL-E 3 (images.generate) is text-to-image only — it does NOT accept
    // image inputs. Reference images (layout, swatches) are passed to GPT-4o only
    // (Stage 2 above). A future upgrade to gpt-image-1 or images.edit would allow
    // image-guided generation directly in DALL-E.
    let dalleImageUrl = null;
    try {
      const lv = layout ? LAYOUT_VISUAL[layout] : null;

      // ── Build DALL-E prompt (labeled-section format) ──────────────────────────
      // KEY RULES (from DALL-E 3 behavior research):
      //  1. Layout name FIRST — activates training-data label recognition for that layout type.
      //  2. Positive descriptions only — negative/forbidden language introduces unwanted concepts.
      //  3. Keep prompt concise — DALL-E's spatial attention budget is ~150-200 tokens; longer prompts dilute geometry.
      //  4. Geometry sections come before colors/style — geometry must occupy early token positions.
      //  5. BUDGET REALISM goes last — it's visual styling, not geometry; keep it short.

      // Layout name is the FIRST token cluster — highest-salience position for spatial accuracy.
      const layoutLabel = layout ? `${layout} kitchen.` : "";
      const openingLine = effectiveImageUrl
        ? `${layoutLabel} Photorealistic residential kitchen redesign photograph. Preserve original room dimensions, window positions, and ceiling height.`
        : `${layoutLabel} Photorealistic residential kitchen photograph.`;

      const sections = [openingLine.trim()];

      // Geometry sections first (highest priority — must be in early token positions)
      if (lv) {
        sections.push(`MANDATORY LAYOUT:\n${lv.structure}`);
        sections.push(`MANDATORY CAMERA VIEW:\n${lv.camera}`);
        sections.push(`MANDATORY SPATIAL RULES:\n${lv.spatial}`);
        sections.push(`LAYOUT BOUNDARIES:\n${lv.negative}`);
      }

      // Colors (after geometry)
      if (upper_color) {
        sections.push(`UPPER CABINETS:\nWall-mounted upper cabinets ONLY in ${upper_color}. Upper cabinets above countertop level only.`);
      }
      if (lower_color) {
        sections.push(`LOWER CABINETS:\nFloor-mounted base cabinets ONLY in ${lower_color}. Lower cabinets below countertop level only.`);
      }
      if (upper_color && lower_color) {
        sections.push(`COLOR SEPARATION:\nUpper cabinets are ${upper_color}. Lower cabinets are ${lower_color}. Two distinct colors — do not blend them.`);
      }
      if (countertop)    sections.push(`COUNTERTOP:\n${countertop}`);
      if (flooring)      sections.push(`FLOORING:\n${flooring}`);
      if (cabinet_style) sections.push(`CABINET STYLE:\n${cabinet_style}`);

      // Visual style from GPT (aesthetic only — no layout language)
      sections.push(
        dalle_prompt
          ? `VISUAL STYLE:\n${dalle_prompt}`
          : `VISUAL STYLE:\nClean minimal materials, soft natural lighting, balanced exposure.`
      );

      // Budget realism LAST — short, non-geometric, low-priority visual note
      const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
      sections.push(`BUDGET REALISM:\n${budgetTierDesc}`);

      const finalDallePrompt = sections.join("\n\n");

      const imageResponse = await client.images.generate({
        model:   "dall-e-3",
        prompt:  finalDallePrompt,
        n:       1,
        size:    "1792x1024",
        quality: "hd",      // hd has documented better prompt adherence than standard
        style:   "vivid",
      });
      // Log the revised_prompt to diagnose if DALL-E's rewriter is stripping geometry instructions
      const revisedPrompt = imageResponse.data?.[0]?.revised_prompt;
      if (revisedPrompt) {
        console.log("[kitchen-design] DALL-E revised_prompt:", revisedPrompt);
      }
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
