import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBathroomDesignPrompt } from "@/lib/ai/bathroom-design-prompt";
import { getAIConfig } from "@/lib/ai/config";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

/** Persist an OpenAI error message to ai_settings for the admin to see. */
async function recordAIError(tenantId, errorMessage) {
  try {
    const adminDb = createAdminClient();
    await adminDb
      .from("ai_settings")
      .update({
        last_error:    errorMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId);
  } catch {
    // Never block the response — this is informational only
  }
}

// Per-bathroom-type visual blocks for image generation.
// boundary = positive description of what must NOT appear, phrased as what the absent
// elements look like (avoids "NO"/"FORBIDDEN" language which can introduce the concept anyway).
const TYPE_VISUAL = {
  "Full Bathroom": {
    structure: "A complete residential bathroom showing the vanity/sink area, toilet, and shower or tub — all visible within a realistic room footprint.",
    camera:    "Three-quarter angled view capturing the vanity wall and the shower/tub area together.",
    spatial:   "Realistic clearances between vanity, toilet, and shower/tub as required by residential building standards.",
    boundary:  "Exactly one vanity, one toilet, and one shower or tub enclosure — a single self-contained residential bathroom, not a suite of multiple rooms or a hallway view into other spaces.",
  },
  "Vanity": {
    structure: "A close, focused view of the vanity wall — cabinet, countertop, sink(s), faucet, and mirror. Other fixtures may be partially visible but are not the focus.",
    camera:    "Straight-on or slightly angled view facing the vanity, filling most of the frame.",
    spatial:   "Vanity is the visual centerpiece with adequate counter and knee clearance visible.",
    boundary:  "The vanity wall fills the frame; any toilet or shower/tub is only partially visible at the frame edge or absent entirely — the composition is about the vanity, not a wide room shot.",
  },
  "Shower Area": {
    structure: "A focused view of the shower or tub enclosure — glass or curtain, tile surround, showerhead and controls. Vanity may be partially visible in the background but is not the focus.",
    camera:    "Angled view into the shower enclosure showing the tile surround and glass/fixture details clearly.",
    spatial:   "Shower/tub enclosure is the visual centerpiece with realistic enclosure dimensions.",
    boundary:  "The shower/tub enclosure fills the frame; the vanity, if visible at all, is only partially visible at the frame edge — the composition is about the enclosure, not a wide room shot.",
  },
};

// Per-style visual blocks for image generation — ensures each style choice (within a
// bathroom type) produces a structurally and aesthetically distinct render, not just a
// recolored version of the same room. Mirrors the Kitchen route's LAYOUT_VISUAL pattern.
const STYLE_VISUAL = {
  // ── Full Bathroom styles ──
  "Modern Minimal": {
    structure: "Clean-lined vanity with integrated sink, a frameless glass shower enclosure, and a wall-hung or low-profile toilet. Minimal visual clutter — no decorative molding, no ornate fixtures.",
    palette:   "Monochrome or two-tone palette (white/gray/black), matte finishes, geometric large-format tile.",
    lighting:  "Cool-to-neutral LED lighting, recessed ceiling cans, no ornate fixtures.",
  },
  "Traditional": {
    structure: "Furniture-style vanity with raised-panel doors and turned or bracket feet, a framed mirror, and a tub/shower with classic subway tile surround.",
    palette:   "Warm neutral palette, painted or stained wood tones, subway tile or small hexagon mosaic flooring.",
    lighting:  "Warm sconces flanking the mirror, traditional brass or oil-rubbed bronze fixtures.",
  },
  "Spa Retreat": {
    structure: "Freestanding soaking tub as a focal point, a separate walk-in shower with rainfall showerhead, natural stone or wood-look accents, and a floating vanity with vessel sink.",
    palette:   "Earthy neutral palette — stone grays, warm taupe, natural wood — with abundant plants or organic textures.",
    lighting:  "Soft warm ambient lighting, dimmable, candle-like accent lighting, no harsh overhead glare.",
  },
  "Compact Efficient": {
    structure: "Space-saving corner or slim-profile vanity, a compact shower-tub combo, and a standard toilet positioned to maximize walking clearance in a small footprint.",
    palette:   "Light, bright palette (whites and light grays) to visually expand the small space, small-format wall tile.",
    lighting:  "Bright even overhead lighting plus a vanity light bar to make the compact room feel open.",
  },
  // ── Vanity styles ──
  "Floating": {
    structure: "Wall-mounted floating vanity cabinet with visible open space beneath it down to the floor, vessel or undermount sink, slim-profile faucet.",
    palette:   "Contemporary two-tone or single flat color, floating shadow gap beneath the cabinet clearly visible.",
    lighting:  "Backlit or under-cabinet LED strip beneath the floating vanity for a glowing-floor effect, plus vanity sconces above the mirror.",
  },
  "Furniture Style": {
    structure: "Freestanding furniture-look vanity with legs or a decorative apron, framed mirror or medicine cabinet, undermount sink set into a substantial countertop.",
    palette:   "Rich wood tones or deep painted colors (navy, forest green, espresso), brass or aged-bronze hardware.",
    lighting:  "Warm symmetrical sconces on either side of the mirror, traditional glass-shade fixtures.",
  },
  "Double Sink": {
    structure: "Wide vanity with two undermount or vessel sinks spaced with a center storage tower or drawer bank between them, two faucets, a wide mirror or two separate framed mirrors.",
    palette:   "Neutral palette with clear symmetry emphasized in the composition — matching hardware and lighting on each side.",
    lighting:  "Two matching sconces or a linear light bar spanning the full width above both sinks.",
  },
  // ── Shower Area styles ──
  "Walk-in Glass": {
    structure: "Curbless or low-curb walk-in shower with a single large frameless glass panel (no door track visible), rainfall or handheld showerhead, built-in niche shelf.",
    palette:   "Large-format porcelain or stone-look tile with minimal grout lines, clear glass with no visible framing.",
    lighting:  "Recessed waterproof shower light, bright even illumination inside the enclosure.",
  },
  "Framed Enclosure": {
    structure: "Traditional framed glass shower door with visible metal frame and hardware, tiled surround with a defined tile pattern, sliding or swing door clearly visible.",
    palette:   "Classic white or neutral subway/mosaic tile with contrasting grout, chrome or nickel door frame.",
    lighting:  "Standard ceiling-mounted or recessed light directly above the enclosure.",
  },
  "Tub & Shower Combo": {
    structure: "Built-in alcove tub with a shower curtain or sliding glass panel above it, tile surround extending to ceiling height, shower/tub diverter valve visible.",
    palette:   "Classic tile palette (white, light gray, or soft blue), tub in white or matching tile-wrapped apron.",
    lighting:  "Single overhead light or small window, straightforward practical illumination.",
  },
};

// Budget-appropriate realism descriptions for image generation.
const BUDGET_REALISM = {
  "Budget-friendly": "Budget-tier residential bathroom. VANITY: Flat thermofoil or laminate cabinet doors, builder-grade appearance. COUNTERTOP: Solid-color laminate or cultured marble with no veining. FAUCET: Basic chrome single-handle faucet. LIGHTING: Single builder-grade vanity light bar. TILE/FLOORING: Plain ceramic tile, minimal pattern. Overall: functional and utilitarian — unmistakably builder-grade low-budget construction quality.",
  "Modern Euro":     "Mid-range contemporary residential bathroom. VANITY: Flat-panel or shaker cabinet doors in matte white or light gray, clean machine-cut edges. COUNTERTOP: Light gray or white quartz with subtle veining. FAUCET: Brushed nickel or matte black single-handle faucet. LIGHTING: Warm LED vanity sconces or a modern light bar with even, flattering illumination. TILE/FLOORING: Large-format porcelain tile in a clean layout. Overall: clean, contemporary, mid-range residential — clearly a step above basic.",
  "Premium Luxury":  "High-end luxury residential bathroom. VANITY: Custom inset cabinet doors with precise shadow-line gaps, furniture-quality finish or rich wood veneer. COUNTERTOP: Thick natural marble or quartzite slab with dramatic veining. FAUCET: Unlacquered brass or matte black designer faucet with premium handle detailing. LIGHTING: Layered warm lighting — statement vanity sconces plus a decorative overhead fixture. TILE/FLOORING: Large-format natural stone or handmade tile with a herringbone or book-matched layout. Overall: unmistakably high-end custom luxury — every surface signals expensive craftsmanship and premium materials.",
};

/** Convert a customer bathroom photo (HTTP URL or base64 data URL) to a Buffer. */
async function getImageBuffer(imageUrlOrBase64) {
  if (imageUrlOrBase64.startsWith("data:")) {
    const base64 = imageUrlOrBase64.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(imageUrlOrBase64);
  return Buffer.from(await res.arrayBuffer());
}

/** Fetch any URL (or pass through an existing data URI) and return a base64 data URI. */
async function fetchAsBase64(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct  = res.headers.get("content-type") || "image/png";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Fetch reference images for vanity finish + material swatches.
 * Returns an object with keys: vanity_finish, countertop, flooring.
 * (Faucet is a hardcoded style name, not a catalog product — no image lookup needed.)
 */
async function fetchReferenceImages(admin, tenantId, { vanity_finish, countertop, flooring }) {
  try {
    const finishNames = [vanity_finish].filter(Boolean);
    const colorNames  = [countertop, flooring].filter(Boolean);

    const [finishesData, colorsData] = await Promise.all([
      finishNames.length > 0
        ? admin.from("finishes").select("id, name").eq("tenant_id", tenantId).in("name", finishNames).then((r) => r.data || [])
        : Promise.resolve([]),
      colorNames.length > 0
        ? admin.from("colors").select("id, name").eq("tenant_id", tenantId).in("name", colorNames).then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    const finishIds = finishesData.map((f) => f.id);
    const colorIds  = colorsData.map((c) => c.id);

    const [finishSwatches, colorSwatches] = await Promise.all([
      finishIds.length > 0
        ? admin.from("assets").select("finish_id, public_url").eq("tenant_id", tenantId).eq("asset_type", "finish_swatch").eq("status", "confirmed").in("finish_id", finishIds).then((r) => r.data || [])
        : Promise.resolve([]),
      colorIds.length > 0
        ? admin.from("assets").select("color_id, public_url").eq("tenant_id", tenantId).eq("asset_type", "color_swatch").eq("status", "confirmed").in("color_id", colorIds).then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

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

    return {
      vanity_finish: vanity_finish && finishNameToId[vanity_finish] ? (finishIdToUrl[finishNameToId[vanity_finish]] || null) : null,
      countertop:    countertop    && colorNameToId[countertop]     ? (colorIdToUrl[colorNameToId[countertop]]     || null) : null,
      flooring:      flooring     && colorNameToId[flooring]        ? (colorIdToUrl[colorNameToId[flooring]]      || null) : null,
    };
  } catch (err) {
    console.warn("[bathroom-design] Reference image fetch failed (non-fatal):", err.message);
    return {};
  }
}

export async function POST(request) {
  let TENANT_ID;
  try {
    TENANT_ID = await getTenantIdFromRequest(request);
    const body = await request.json();
    const {
      name, address, email, phone,
      bathroom_type, style, budget_style,
      vanity_finish, countertop, flooring,
      faucet_style,
      design_comments,
      image_status, image_url,
    } = body;

    if (!TENANT_ID) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const { apiKey: openaiApiKey } = await getAIConfig(TENANT_ID);
    const client = new OpenAI({ apiKey: openaiApiKey });

    // ── Stage 1: Load catalog context (Vanity category only) + reference images ──
    const admin = createAdminClient();
    const [categoriesRes, colorsRes, finishesRes, refImages] = await Promise.all([
      admin.from("categories")
        .select("id, slug")
        .eq("tenant_id", TENANT_ID)
        .eq("slug", "vanity"),
      admin.from("colors")
        .select("name, color_type, description")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true),
      admin.from("finishes")
        .select("name, code, description, finish_family")
        .eq("tenant_id", TENANT_ID)
        .eq("is_active", true),
      fetchReferenceImages(admin, TENANT_ID, { vanity_finish, countertop, flooring }),
    ]);

    const vanityCategoryId = (categoriesRes.data || []).find((c) => c.slug === "vanity")?.id ?? null;

    let vanityProducts = [];
    if (vanityCategoryId) {
      const { data } = await admin
        .from("products")
        .select("sku, name, width_in, height_in, depth_in")
        .eq("tenant_id", TENANT_ID)
        .eq("category_id", vanityCategoryId)
        .eq("is_active", true)
        .limit(40);
      vanityProducts = data || [];
    }

    const skus = vanityProducts.map((p) => {
      const dims = [
        p.width_in  ? `${p.width_in}"W`  : null,
        p.height_in ? `${p.height_in}"H` : null,
        p.depth_in  ? `${p.depth_in}"D`  : null,
      ].filter(Boolean).join("×");
      return dims ? `${p.sku} (${p.name}, ${dims})` : `${p.sku} (${p.name})`;
    });

    const countertopColors = (colorsRes.data || [])
      .filter((c) => c.color_type === "countertop")
      .map((c) => c.name);
    const floorColors = (colorsRes.data || [])
      .filter((c) => c.color_type === "floor")
      .map((c) => c.name);
    const finishes = (finishesRes.data || []).map((f) => `${f.name} (${f.code})`);

    const catalogContext = { skus, countertopColors, floorColors, finishes };

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

    const vanity_finish_desc = vanity_finish ? (finishDescMap[vanity_finish] || "") : "";
    const countertop_desc    = countertop    ? (colorDescMap[countertop]     || "") : "";
    const flooring_desc      = flooring      ? (colorDescMap[flooring]       || "") : "";
    const faucet_desc        = faucet_style  ? `${faucet_style} style faucet` : "";

    const effectiveImageUrl = image_status === "Yes" && image_url ? image_url : "";
    const includeImageAnalysis = !!effectiveImageUrl;
    const hasReferenceImages = Object.values(refImages).some(Boolean);

    // ── Stage 2: Build prompt and call GPT (JSON mode) ────────────────────────
    let { systemPrompt, userPrompt } = buildBathroomDesignPrompt(
      {
        bathroom_type, style, budget_style,
        vanity_finish, countertop, flooring,
        faucet_finish: faucet_style,
        design_comments,
        vanity_finish_desc, countertop_desc, flooring_desc, faucet_desc,
      },
      catalogContext,
      includeImageAnalysis,
      hasReferenceImages
    );

    const [b64Vanity, b64Countertop, b64Flooring, b64Customer] = await Promise.all([
      fetchAsBase64(refImages.vanity_finish),
      fetchAsBase64(refImages.countertop),
      fetchAsBase64(refImages.flooring),
      fetchAsBase64(effectiveImageUrl),
    ]);

    const visionParts = [{ type: "text", text: userPrompt }];

    if (b64Vanity) {
      visionParts.push(
        { type: "text", text: `\n[VANITY FINISH SWATCH — ${vanity_finish}:]` },
        { type: "image_url", image_url: { url: b64Vanity, detail: "low" } }
      );
    }
    if (b64Countertop) {
      visionParts.push(
        { type: "text", text: `\n[COUNTERTOP SWATCH — ${countertop}:]` },
        { type: "image_url", image_url: { url: b64Countertop, detail: "low" } }
      );
    }
    if (b64Flooring) {
      visionParts.push(
        { type: "text", text: `\n[FLOORING SWATCH — ${flooring}:]` },
        { type: "image_url", image_url: { url: b64Flooring, detail: "low" } }
      );
    }
    if (b64Customer) {
      visionParts.push(
        { type: "text", text: "\n[CUSTOMER'S EXISTING BATHROOM PHOTO — redesign reference:]" },
        { type: "image_url", image_url: { url: b64Customer, detail: "low" } }
      );
    }

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
      console.error("[bathroom-design] JSON parse failed:", rawText.slice(0, 300));
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
      material_plan = null,
      fixture_plan = [],
      budget_logic = null,
      product_recommendations = [],
      design_validation = null,
    } = gptData;

    if (!concept || !dalle_prompt) {
      return NextResponse.json(
        { error: "AI response was incomplete. Please try again." },
        { status: 500 }
      );
    }

    // Force-override with customer selections
    if (vanity_finish) concept.vanity_finish = vanity_finish;
    if (countertop)    concept.countertop    = countertop;
    if (flooring)      concept.flooring      = flooring;
    if (faucet_style)  concept.faucet_finish = faucet_style;

    // ── Stage 4: Resolve product images for recommended SKUs (Vanity category) ──
    const skuList = (Array.isArray(recommendedSkus) ? recommendedSkus : [])
      .map((s) => String(s).trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 10);

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
    let dalleImageUrl = null;
    let dalleError    = null;
    try {
      async function persistImage(imgBuffer) {
        const storagePath = `${TENANT_ID}/${Date.now()}.png`;
        const { error: uploadError } = await admin.storage
          .from("design-renders")
          .upload(storagePath, imgBuffer, { contentType: "image/png", upsert: false });
        if (!uploadError) {
          const { data: urlData } = admin.storage.from("design-renders").getPublicUrl(storagePath);
          return urlData.publicUrl;
        }
        console.warn("[bathroom-design] Storage upload failed:", uploadError.message);
        return null;
      }

      async function editAndPersist(sourceImageUrl, editPrompt) {
        const imgBuffer = await getImageBuffer(sourceImageUrl);
        const imgFile   = await toFile(imgBuffer, "bathroom.png", { type: "image/png" });
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

      const PHOTO_LOCKED = [
        `PHOTO-LOCKED — COPY FROM SOURCE EXACTLY. The following elements are FROZEN and must be pixel-for-pixel identical to the customer's uploaded photo:`,
        `STRUCTURE: Every window, door, wall, and ceiling (exact position, size, arrangement).`,
        `SURFACES: Wall paint and tile not being replaced — exact colour, material, and pattern.`,
        `FIXTURES: Toilet, tub/shower (unless the selection targets them), mirror, and light fixtures — exact style, position, and finish (unless customer explicitly selected a change).`,
        `PERSPECTIVE: Identical camera angle, field of view, and room proportions to the source photo.`,
        `DO NOT add, remove, move, recolour, or restyle any of the above. If it is not listed in the CHANGE section below, it must be identical to the source photo.`,
      ].join("\n");

      const sv = style ? STYLE_VISUAL[style] : null;

      if (effectiveImageUrl) {
        console.log(`[bathroom-design] Using gpt-image-1 edit for redesign with type: ${bathroom_type}, style: ${style}`);
        const sections = [
          `Photorealistic residential bathroom photograph. Redesign using the customer's existing room — ONLY the vanity, countertop, flooring, and faucet change. Everything else is copied from the source photo without modification.`,
          PHOTO_LOCKED,
          [
            `CHANGE LIST — the ONLY elements permitted to differ from the source photo:`,
            `• Vanity cabinet: new finish colour, door style, and configuration matching the selected style`,
            `• Countertop: new material`,
            `• Flooring: new material and colour`,
            faucet_style ? `• Faucet: replaced with ${faucet_style} style` : "",
          ].filter(Boolean).join("\n"),
        ];
        if (sv) {
          sections.push(`MANDATORY STYLE CONFIGURATION — "${style}" (apply to the vanity/replaced elements only, do not substitute or omit this fixture configuration): ${sv.structure}`);
          sections.push(`STYLE PALETTE: ${sv.palette}`);
          sections.push(`STYLE LIGHTING (apply only where fixtures are being changed): ${sv.lighting}`);
        }
        if (vanity_finish) {
          const d = vanity_finish_desc ? `\n${vanity_finish_desc}.` : "";
          sections.push(`VANITY CABINET: Replace with ${vanity_finish} finish.${d}`);
        }
        if (countertop) {
          const d = countertop_desc ? ` ${countertop_desc}.` : "";
          sections.push(`COUNTERTOP: Replace with ${countertop}.${d}`);
        }
        if (flooring) {
          const d = flooring_desc ? ` ${flooring_desc}.` : "";
          sections.push(`FLOORING: Replace with ${flooring}.${d}`);
        }
        if (faucet_style) sections.push(`MANDATORY FAUCET: ${faucet_style} style faucet — must be clearly visible on the vanity. Do not substitute or omit.`);
        if (style) sections.push(`STYLE: ${style}`);
        if (design_comments) sections.push(`SPECIAL REQUIREMENTS (apply to changed items only):\n${design_comments}`);
        if (dalle_prompt) sections.push(`VISUAL STYLE (applies ONLY to the replaced vanity, countertop, and flooring):\n${dalle_prompt}`);
        const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
        sections.push(`BUDGET REALISM (applies ONLY to the replaced vanity, countertop, and flooring):\n${budgetTierDesc}`);

        dalleImageUrl = await editAndPersist(effectiveImageUrl, sections.join("\n\n"));

      } else {
        // New build, no reference photo → gpt-image-1 text-to-image
        const tv = bathroom_type ? TYPE_VISUAL[bathroom_type] : null;
        const typeLabel = bathroom_type ? `${bathroom_type} bathroom.` : "";
        const sections = [`${typeLabel} Photorealistic residential bathroom photograph.`.trim()];

        if (tv) {
          sections.push(`MANDATORY LAYOUT:\n${tv.structure}`);
          sections.push(`MANDATORY CAMERA VIEW:\n${tv.camera}`);
          sections.push(`MANDATORY SPATIAL RULES:\n${tv.spatial}`);
          sections.push(`COMPOSITION BOUNDARIES:\n${tv.boundary}`);
        }
        if (sv) {
          sections.push(`MANDATORY STYLE CONFIGURATION — "${style}" (this fixture configuration and silhouette must be clearly visible in the final image; do not substitute a generic or different style's configuration):\n${sv.structure}`);
          sections.push(`STYLE PALETTE:\n${sv.palette}`);
          sections.push(`STYLE LIGHTING:\n${sv.lighting}`);
        }
        if (vanity_finish) {
          const desc = vanity_finish_desc ? `\n${vanity_finish_desc}.` : "";
          sections.push(`VANITY CABINET:\n${vanity_finish} finish.${desc}`);
        }
        if (countertop) {
          const desc = countertop_desc ? ` ${countertop_desc}.` : "";
          sections.push(`COUNTERTOP:\n${countertop}.${desc}`);
        }
        if (flooring) {
          const desc = flooring_desc ? ` ${flooring_desc}.` : "";
          sections.push(`FLOORING:\n${flooring}.${desc}`);
        }
        if (faucet_style) sections.push(`MANDATORY FAUCET:\n${faucet_style} style faucet — must be clearly visible on the vanity. Do not substitute.`);
        if (style) sections.push(`STYLE:\n${style}`);
        if (design_comments) sections.push(`MANDATORY SPECIAL REQUIREMENTS — apply ALL of the following exactly as specified:\n${design_comments}`);
        sections.push(dalle_prompt
          ? `VISUAL STYLE:\n${dalle_prompt}`
          : `VISUAL STYLE:\nClean minimal materials, soft natural lighting, balanced exposure.`
        );
        const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
        sections.push(`BUDGET REALISM:\n${budgetTierDesc}`);

        const finalPrompt = sections.join("\n\n");

        const imageResponse = await client.images.generate({
          model:   "gpt-image-1",
          prompt:  finalPrompt,
          n:       1,
          size:    "1536x1024",
          quality: "high",
        });
        const b64 = imageResponse.data?.[0]?.b64_json;
        if (b64) {
          const imgBuffer = Buffer.from(b64, "base64");
          dalleImageUrl   = await persistImage(imgBuffer) ?? `data:image/png;base64,${b64}`;
        }
      }
    } catch (dalleErr) {
      console.warn("[bathroom-design] Image generation failed (non-fatal):", dalleErr.message);
      dalleError = dalleErr.message;
      await recordAIError(TENANT_ID, dalleErr.message);
    }

    // ── Stage 6: Return structured response ───────────────────────────────────
    return NextResponse.json({
      concept,
      image_url:              dalleImageUrl,
      render_error:           dalleError,
      products,
      sales_summary,
      next_steps:             Array.isArray(next_steps) ? next_steps : [],
      color_suggestions:      Array.isArray(color_suggestions) ? color_suggestions : [],
      bathroom_type,
      style,
      design_concept,
      material_plan,
      fixture_plan:            Array.isArray(fixture_plan) ? fixture_plan : [],
      budget_logic,
      product_recommendations: Array.isArray(product_recommendations) ? product_recommendations : [],
      design_validation,
    });

  } catch (err) {
    console.error("[bathroom-design] error:", err);
    if (err instanceof OpenAI.APIError) {
      await recordAIError(TENANT_ID, err.message);
    }
    return NextResponse.json(
      { error: err.message || "Failed to generate design concepts." },
      { status: 500 }
    );
  }
}
