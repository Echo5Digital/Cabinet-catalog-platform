import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
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
    structure: "Wall cabinets on the back wall and side wall. One large freestanding rectangular island in the center of the room, completely detached from all walls.",
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

// Per-layout functional zone placement — ensures sink and cooking area appear in correct positions.
// Used in image generation prompts for all paths so mandatory kitchen elements are always visible.
const LAYOUT_WORKFLOW = {
  "L-shaped":    "SINK: On the back wall cabinet run, visible above the countertop. RANGE/COOKTOP: On the side wall cabinet run with visible burners and a hood or over-range microwave above.",
  "U-shaped":    "SINK: Centered on the back wall, clearly visible above the countertop. RANGE/COOKTOP: On one of the side wall runs with a hood above.",
  "Galley":      "SINK: On one parallel wall run. RANGE/COOKTOP: On the opposite parallel wall run with a hood or over-range microwave above.",
  "Island":      "SINK: On the back wall run or integrated into the island top. RANGE/COOKTOP: On the back wall run with a hood above.",
  "Single Wall": "SINK: Centered in the single cabinet wall run, visible above the countertop. RANGE/COOKTOP: On the same single wall adjacent to the sink, with a hood or over-range microwave above.",
  "G-shaped":    "SINK: On the back wall run, visible above the countertop. RANGE/COOKTOP: On one of the side wall runs with a hood above.",
};

// Budget-appropriate realism descriptions for image generation.
// These differentiate visual output (appliances, hardware, lighting, staging) without affecting layout or geometry.
const BUDGET_REALISM = {
  "Budget-friendly": "Standard practical residential kitchen. Simple painted or thermofoil cabinet finish. Basic chrome or satin nickel knob hardware. Freestanding electric range with basic overhead hood or over-range microwave. Recessed can lighting or overhead fluorescent fixture. Minimal accessories — clean, uncluttered, functional.",
  "Modern Euro":     "Mid-range contemporary residential kitchen. Clean flat-panel or shaker cabinet doors. Brushed nickel or matte black bar pull hardware. Slide-in gas or electric range with a standard stainless-steel hood. Recessed LED lighting with under-cabinet light strips. Tasteful minimal staging — a coffee maker, a small plant, a clean countertop.",
  "Premium Luxury":  "High-end realistic residential kitchen. Refined inset or full-overlay cabinet doors. Premium solid-metal or unlacquered brass bar pull hardware. Professional-grade range with a statement metal or plaster range hood. Warm directional LED under-cabinet lighting. Elegant natural-material staging — cookbooks, fresh herbs, quality small appliances. Believable refined luxury — never fantasy-scale or exaggerated.",
};

// Project types that edit an existing customer photo (require photo upload)
// These use gpt-image-1 images.edit — targeted image editing, not text-to-image.
const REDESIGN_TYPES = new Set([
  "Remodel Existing Kitchen",
  "Replace Cabinets Only",
  "Countertop Only",
]);

/**
 * Convert a customer kitchen photo (HTTP URL or base64 data URL) to a Buffer.
 * Used to feed the image into the gpt-image-1 edit endpoint.
 */
async function getImageBuffer(imageUrlOrBase64) {
  if (imageUrlOrBase64.startsWith("data:")) {
    const base64 = imageUrlOrBase64.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(imageUrlOrBase64);
  return Buffer.from(await res.arrayBuffer());
}

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
    const [finishesData, colorsData, structuresData, structureImgsData, structureRefImgsData] = await Promise.all([
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
      // Admin-only AI reference images — never shown publicly, used only for GPT layout analysis
      layout
        ? admin.from("assets").select("structure_id, public_url").eq("tenant_id", TENANT_ID).eq("asset_type", "structure_reference").eq("status", "confirmed").not("structure_id", "is", null).then((r) => r.data || [])
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

    // Resolve layout → structure diagram image + admin-only AI reference image
    const structureImgMap = {};
    for (const img of structureImgsData) {
      if (!structureImgMap[img.structure_id]) structureImgMap[img.structure_id] = img.public_url;
    }
    const structureRefMap = {};
    for (const img of structureRefImgsData) {
      if (!structureRefMap[img.structure_id]) structureRefMap[img.structure_id] = img.public_url;
    }
    const layoutKey = normalise(layout || "");
    const matchedStructure = layoutKey
      ? structuresData.find((s) => normalise(s.name).includes(layoutKey))
      : null;

    const layoutRef = matchedStructure ? (structureRefMap[matchedStructure.id] || null) : null;
    console.log(
      `[kitchen-design] layout="${layout}" → structure="${matchedStructure?.name ?? "no match"}"` +
      ` | reference=${layoutRef ? "FOUND" : "not found"}` +
      ` | structuresInDB=${structuresData.map((s) => s.name).join(", ")}`
    );

    return {
      layout:           matchedStructure ? (structureImgMap[matchedStructure.id] || null) : null,
      layout_reference: layoutRef,
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
        .select("name, color_type, description")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true),
      admin.from("finishes")
        .select("name, code, description, finish_family")
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

    // Build description lookup maps for the selected cabinet colors, countertop, and flooring.
    // These come from the admin-entered description field on each finish/color record.
    const finishDescMap = Object.fromEntries(
      (finishesRes.data || []).map((f) => {
        const parts = [f.description, f.finish_family ? `finish family: ${f.finish_family}` : null].filter(Boolean);
        return [f.name, parts.join(". ")];
      }).filter(([, desc]) => desc)
    );
    const colorDescMap = Object.fromEntries(
      (colorsRes.data || [])
        .filter((c) => c.description)
        .map((c) => [c.name, c.description])
    );

    const upper_color_desc = upper_color ? (finishDescMap[upper_color] || "") : "";
    const lower_color_desc = lower_color ? (finishDescMap[lower_color] || "") : "";
    const countertop_desc  = countertop  ? (colorDescMap[countertop]   || "") : "";
    const flooring_desc    = flooring    ? (colorDescMap[flooring]     || "") : "";

    const effectiveImageUrl = image_status === "Yes" && image_url ? image_url : "";
    // includeImageAnalysis only fires for project types that are redesigns of an existing kitchen.
    // "New Kitchen" with an inspiration photo should NOT trigger redesign addendum/mode.
    const isRedesignType     = REDESIGN_TYPES.has(project_type);
    const includeImageAnalysis = !!effectiveImageUrl && isRedesignType;

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
        upper_color_desc, lower_color_desc, countertop_desc, flooring_desc,
      },
      catalogContext,
      includeImageAnalysis,
      hasReferenceImages
    );

    // Build vision content: text prompt + reference images + customer photo (if any)
    const visionParts = [{ type: "text", text: userPrompt }];

    // Admin-only AI layout reference image — sent FIRST so GPT analyzes it before other inputs.
    // This is a real kitchen photo matching the selected layout type, for spatial analysis only.
    if (refImages.layout_reference) {
      visionParts.push(
        { type: "text", text: `\n[AI LAYOUT REFERENCE — ${layout || "selected layout"}. Analyze spatial proportions, cabinet arrangement, and workflow zones ONLY. Do NOT copy or reproduce this image in the generated design.]` },
        { type: "image_url", image_url: { url: refImages.layout_reference, detail: "high" } }
      );
    }
    if (refImages.layout) {
      visionParts.push(
        { type: "text", text: `\n[LAYOUT STRUCTURE DIAGRAM — ${layout || "selected layout"}:]` },
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
      max_tokens: 4000,
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
      design_concept = null,
      layout_plan = null,
      material_plan = null,
      budget_logic = null,
      cabinet_plan = [],
      product_recommendations = [],
      design_validation = null,
    } = gptData;

    if (!concept || !dalle_prompt) {
      return NextResponse.json(
        { error: "AI response was incomplete. Please try again." },
        { status: 500 }
      );
    }

    // Force-override: only apply selections relevant to the project type.
    // For partial-edit types, GPT analyzes the photo for unchanged elements — don't stomp them.
    if (project_type === "Replace Cabinets Only") {
      if (upper_color) concept.upper_color = upper_color;
      if (lower_color) concept.lower_color = lower_color;
      // countertop + flooring stay as GPT observed from the photo
    } else if (project_type === "Countertop Only") {
      if (countertop) concept.countertop = countertop;
      // cabinet colors + flooring stay as GPT observed from the photo
    } else {
      // Remodel, New Kitchen, Full Design: all customer selections override
      if (upper_color) concept.upper_color = upper_color;
      if (lower_color) concept.lower_color = lower_color;
      if (countertop)  concept.countertop  = countertop;
      if (flooring)    concept.flooring    = flooring;
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
            sku:        p.sku,
            name:       p.name,
            type:       p.categories?.name || null,
            dimensions: dims || null,
            image_url:  assetMap[p.id] || null,
          };
        })
        .filter(Boolean);
    }

    // ── Stage 5: Generate image render + persist to Supabase Storage ─────────
    // Three paths based on project type + available images:
    //   A)  Redesign type + customer photo           → gpt-image-1 edit (customer photo)
    //   A2) New build + admin layout reference image → gpt-image-1 edit (reference photo)
    //   B)  New build, no reference image            → DALL-E 3 text-to-image
    let dalleImageUrl = null;
    try {

      // ── Helper: upload an image Buffer to Supabase Storage ───────────────────
      async function persistImage(imgBuffer) {
        const storagePath = `${TENANT_ID}/${Date.now()}.png`;
        const { error: uploadError } = await admin.storage
          .from("design-renders")
          .upload(storagePath, imgBuffer, { contentType: "image/png", upsert: false });
        if (!uploadError) {
          const { data: urlData } = admin.storage.from("design-renders").getPublicUrl(storagePath);
          return urlData.publicUrl;
        }
        console.warn("[kitchen-design] Storage upload failed:", uploadError.message);
        return null;
      }

      // ── Helper: run gpt-image-1 edit and persist the result ─────────────────
      async function editAndPersist(sourceImageUrl, editPrompt) {
        const imgBuffer = await getImageBuffer(sourceImageUrl);
        const imgFile   = await toFile(imgBuffer, "kitchen.png", { type: "image/png" });
        const imageResponse = await client.images.edit({
          model:   "gpt-image-1",
          image:   imgFile,
          prompt:  editPrompt,
          size:    "1536x1024",
          quality: "high",
        });
        const b64 = imageResponse.data?.[0]?.b64_json;
        if (!b64) return null;
        const outBuffer = Buffer.from(b64, "base64");
        return (await persistImage(outBuffer)) ?? `data:image/png;base64,${b64}`;
      }

      // ── PATH A: Redesign type + customer photo → gpt-image-1 edit ────────────
      if (isRedesignType && effectiveImageUrl) {
        console.log(`[kitchen-design] Using gpt-image-1 edit for project type: ${project_type}`);

        let editPrompt;

        if (project_type === "Replace Cabinets Only") {
          // Only cabinet doors, boxes, and hardware change — everything else preserved exactly.
          const upperDesc = upper_color_desc ? ` ${upper_color_desc}.` : "";
          const lowerDesc = lower_color_desc ? ` ${lower_color_desc}.` : "";
          editPrompt = [
            `Photorealistic residential kitchen photograph.`,
            `TASK: Change ONLY the kitchen cabinets. Do not change anything else in this image.`,
            upper_color ? `UPPER CABINETS: Replace wall-mounted upper cabinets with ${upper_color} finish.${upperDesc}` : "",
            lower_color ? `LOWER CABINETS: Replace floor-mounted base cabinets with ${lower_color} finish.${lowerDesc}` : "",
            cabinet_style ? `CABINET STYLE: ${cabinet_style} door style.` : "",
            hardware ? `HARDWARE: ${hardware}.` : "",
            `KEEP EXACTLY AS-IS: countertop, flooring, appliances, backsplash, walls, windows, ceiling, lighting. Do not alter these in any way.`,
            dalle_prompt ? `VISUAL STYLE: ${dalle_prompt}` : "",
          ].filter(Boolean).join("\n\n");

        } else if (project_type === "Countertop Only") {
          // Only the countertop changes — everything else preserved exactly.
          const ctDesc = countertop_desc ? ` ${countertop_desc}.` : "";
          editPrompt = [
            `Photorealistic residential kitchen photograph.`,
            `TASK: Change ONLY the kitchen countertop. Do not change anything else in this image.`,
            countertop ? `COUNTERTOP: Replace the countertop with ${countertop}.${ctDesc}` : "",
            `KEEP EXACTLY AS-IS: all cabinets, cabinet colors, cabinet doors, flooring, appliances, backsplash, walls, windows, ceiling, lighting. Do not alter these in any way.`,
            dalle_prompt ? `VISUAL STYLE: ${dalle_prompt}` : "",
          ].filter(Boolean).join("\n\n");

        } else {
          // Remodel Existing Kitchen — full redesign within the same room geometry.
          const lv = layout ? LAYOUT_VISUAL[layout] : null;
          const sections = [
            `Photorealistic residential kitchen redesign photograph. Preserve exact room geometry: same walls, windows, ceiling height, door positions.`,
          ];
          if (lv) {
            sections.push(`LAYOUT: ${lv.structure}`);
            sections.push(`CAMERA: ${lv.camera}`);
          }
          const remWorkflowNote = layout ? (LAYOUT_WORKFLOW[layout] || null) : null;
          if (remWorkflowNote) {
            sections.push(`FUNCTIONAL ZONES: Preserve the existing sink and cooking range positions from the customer's photo.\n${remWorkflowNote}`);
          }
          if (upper_color) {
            const d = upper_color_desc ? `\n${upper_color_desc}.` : "";
            sections.push(`UPPER CABINETS: Replace upper cabinets with ${upper_color} finish.${d}`);
          }
          if (lower_color) {
            const d = lower_color_desc ? `\n${lower_color_desc}.` : "";
            sections.push(`LOWER CABINETS: Replace lower cabinets with ${lower_color} finish.${d}`);
          }
          if (upper_color && lower_color) {
            sections.push(`COLOR SEPARATION: Upper cabinets are ${upper_color}. Lower cabinets are ${lower_color}. Two distinct colors — do not blend them.`);
          }
          if (countertop) {
            const d = countertop_desc ? ` ${countertop_desc}.` : "";
            sections.push(`COUNTERTOP: Replace countertop with ${countertop}.${d}`);
          }
          if (flooring) {
            const d = flooring_desc ? ` ${flooring_desc}.` : "";
            sections.push(`FLOORING: Replace flooring with ${flooring}.${d}`);
          }
          if (cabinet_style) sections.push(`CABINET STYLE: ${cabinet_style}`);
          if (dalle_prompt)  sections.push(`VISUAL STYLE:\n${dalle_prompt}`);
          const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
          sections.push(`BUDGET REALISM:\n${budgetTierDesc}`);
          editPrompt = sections.join("\n\n");
        }

        // Edit the customer's photo using the constructed prompt
        dalleImageUrl = await editAndPersist(effectiveImageUrl, editPrompt);

      // ── PATH A2: New build + admin layout reference image → gpt-image-1 edit ─
      // The admin has uploaded a real kitchen photo for this layout type.
      // We edit it with the customer's selected materials so the output is
      // guaranteed to match the correct layout geometry — DALL-E 3 cannot do this.
      } else if (refImages.layout_reference) {
        console.log(`[kitchen-design] Using gpt-image-1 edit with admin layout reference for: ${layout}`);

        const sections = [
          `Photorealistic residential kitchen photograph. Using this reference kitchen as the spatial template, redesign it with the following materials and finishes. Keep the exact same layout structure, cabinet count, wall arrangement, and camera angle — only update the colors, materials, and finish style.`,
        ];
        const refWorkflowNote = layout ? (LAYOUT_WORKFLOW[layout] || null) : null;
        if (refWorkflowNote) {
          sections.push(`FUNCTIONAL ZONES: Preserve the sink and cooking range positions from the reference photo.\n${refWorkflowNote}`);
        }
        if (upper_color) {
          const d = upper_color_desc ? `\n${upper_color_desc}.` : "";
          sections.push(`UPPER CABINETS: ${upper_color} finish.${d}`);
        }
        if (lower_color) {
          const d = lower_color_desc ? `\n${lower_color_desc}.` : "";
          sections.push(`LOWER CABINETS: ${lower_color} finish.${d}`);
        }
        if (upper_color && lower_color) {
          sections.push(`COLOR SEPARATION: Upper cabinets are ${upper_color}. Lower cabinets are ${lower_color}. Two distinct colors — do not blend them.`);
        }
        if (countertop) {
          const d = countertop_desc ? ` ${countertop_desc}.` : "";
          sections.push(`COUNTERTOP: ${countertop}.${d}`);
        }
        if (flooring) {
          const d = flooring_desc ? ` ${flooring_desc}.` : "";
          sections.push(`FLOORING: ${flooring}.${d}`);
        }
        if (cabinet_style) sections.push(`CABINET STYLE: ${cabinet_style} door style.`);
        if (hardware)       sections.push(`HARDWARE: ${hardware}.`);
        sections.push(dalle_prompt
          ? `VISUAL STYLE:\n${dalle_prompt}`
          : `VISUAL STYLE:\nClean minimal materials, soft natural lighting, balanced exposure.`
        );
        const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
        sections.push(`BUDGET REALISM:\n${budgetTierDesc}`);

        const refEditPrompt = sections.join("\n\n");
        dalleImageUrl = await editAndPersist(refImages.layout_reference, refEditPrompt);

      // ── PATH B: New build, no reference image → DALL-E 3 text-to-image ───────
      } else {
        const lv = layout ? LAYOUT_VISUAL[layout] : null;

        // DALL-E 3 prompt engineering rules:
        //  1. Layout name FIRST — activates training-data label recognition
        //  2. Positive descriptions only — negative/forbidden introduces unwanted concepts
        //  3. Geometry before colors/style — geometry in early token positions
        //  4. BUDGET REALISM last — short, non-geometric
        const layoutLabel = layout ? `${layout} kitchen.` : "";
        const openingLine = effectiveImageUrl
          ? `${layoutLabel} Photorealistic residential kitchen redesign photograph. Preserve original room dimensions, window positions, and ceiling height.`
          : `${layoutLabel} Photorealistic residential kitchen photograph.`;

        const sections = [openingLine.trim()];

        if (lv) {
          sections.push(`MANDATORY LAYOUT:\n${lv.structure}`);
          sections.push(`MANDATORY CAMERA VIEW:\n${lv.camera}`);
          sections.push(`MANDATORY SPATIAL RULES:\n${lv.spatial}`);
          sections.push(`LAYOUT BOUNDARIES:\n${lv.negative}`);
        }
        const genWorkflowNote = layout ? (LAYOUT_WORKFLOW[layout] || null) : null;
        if (genWorkflowNote) {
          sections.push(`MANDATORY FUNCTIONAL ZONES:\n${genWorkflowNote}`);
        }
        if (upper_color) {
          const desc = upper_color_desc ? `\n${upper_color_desc}.` : "";
          sections.push(`UPPER CABINETS:\nWall-mounted upper cabinets ONLY in ${upper_color}.${desc}\nUpper cabinets above countertop level only.`);
        }
        if (lower_color) {
          const desc = lower_color_desc ? `\n${lower_color_desc}.` : "";
          sections.push(`LOWER CABINETS:\nFloor-mounted base cabinets ONLY in ${lower_color}.${desc}\nLower cabinets below countertop level only.`);
        }
        if (upper_color && lower_color) {
          sections.push(`COLOR SEPARATION:\nUpper cabinets are ${upper_color}. Lower cabinets are ${lower_color}. Two distinct colors — do not blend them.`);
        }
        if (countertop) {
          const desc = countertop_desc ? ` ${countertop_desc}.` : "";
          sections.push(`COUNTERTOP:\n${countertop}.${desc}`);
        }
        if (flooring) {
          const desc = flooring_desc ? ` ${flooring_desc}.` : "";
          sections.push(`FLOORING:\n${flooring}.${desc}`);
        }
        if (cabinet_style) sections.push(`CABINET STYLE:\n${cabinet_style}`);
        sections.push(dalle_prompt
          ? `VISUAL STYLE:\n${dalle_prompt}`
          : `VISUAL STYLE:\nClean minimal materials, soft natural lighting, balanced exposure.`
        );
        const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
        sections.push(`BUDGET REALISM:\n${budgetTierDesc}`);

        const finalDallePrompt = sections.join("\n\n");

        const imageResponse = await client.images.generate({
          model:   "dall-e-3",
          prompt:  finalDallePrompt,
          n:       1,
          size:    "1792x1024",
          quality: "hd",
          style:   "vivid",
        });
        // Log revised_prompt to diagnose if DALL-E's rewriter strips geometry instructions
        const revisedPrompt = imageResponse.data?.[0]?.revised_prompt;
        if (revisedPrompt) {
          console.log("[kitchen-design] DALL-E revised_prompt:", revisedPrompt);
        }
        const temporaryUrl = imageResponse.data?.[0]?.url || null;

        if (temporaryUrl) {
          try {
            const imgRes    = await fetch(temporaryUrl);
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            dalleImageUrl   = await persistImage(imgBuffer) ?? temporaryUrl;
          } catch (uploadErr) {
            console.warn("[kitchen-design] Storage fetch/upload error, using temp URL:", uploadErr.message);
            dalleImageUrl = temporaryUrl;
          }
        }
      }

    } catch (dalleErr) {
      console.warn("[kitchen-design] Image generation failed (non-fatal):", dalleErr.message);
    }

    // ── Stage 6: Return structured response ───────────────────────────────────
    return NextResponse.json({
      concept,
      image_url:              dalleImageUrl,
      products,
      sales_summary,
      next_steps:             Array.isArray(next_steps) ? next_steps : [],
      color_suggestions:      Array.isArray(color_suggestions) ? color_suggestions : [],
      layout,
      // Expert design fields (NKBA schema)
      design_concept,
      layout_plan,
      material_plan,
      budget_logic,
      cabinet_plan:           Array.isArray(cabinet_plan) ? cabinet_plan : [],
      product_recommendations: Array.isArray(product_recommendations) ? product_recommendations : [],
      design_validation,
    });

  } catch (err) {
    console.error("[kitchen-design] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate design concepts." },
      { status: 500 }
    );
  }
}
