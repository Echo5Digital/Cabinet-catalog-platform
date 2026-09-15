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
// Full Bathroom defaults to a SHOWER enclosure, never a bathtub, unless the
// customer explicitly asked for a tub in Special Requests / Notes (see the
// `wantsTub` check where TYPE_VISUAL/STYLE_VISUAL are consumed below). Two
// variants are kept so the wording never mentions "tub" at all when one
// wasn't requested — earlier "shower or tub" phrasing actively invited the
// model to render a tub even when nobody asked for one.
const TYPE_VISUAL = {
  "Full Bathroom": {
    structure: "A complete residential bathroom showing the vanity/sink area, toilet, and a walk-in or framed shower enclosure — all visible within a realistic room footprint.",
    structureWithTub: "A complete residential bathroom showing the vanity/sink area, toilet, and a bathtub (with or without an overhead shower) — all visible within a realistic room footprint.",
    camera:    "Three-quarter angled view capturing the vanity wall and the shower area together.",
    cameraWithTub: "Three-quarter angled view capturing the vanity wall and the tub/shower area together.",
    spatial:   "Realistic clearances between vanity, toilet, and shower enclosure as required by residential building standards.",
    boundary:  "Exactly one vanity, one toilet, and one shower enclosure — NO bathtub anywhere in the room unless explicitly requested in Special Requests — a single self-contained residential bathroom, not a suite of multiple rooms or a hallway view into other spaces.",
    boundaryWithTub: "Exactly one vanity, one toilet, and one bathtub (with or without an overhead shower) — a single self-contained residential bathroom, not a suite of multiple rooms or a hallway view into other spaces.",
  },
  "Vanity": {
    structure: "A close, focused view of ONLY the vanity wall — cabinet, countertop, sink(s), faucet, and mirror above it. This is a single-wall product shot, not a bathroom.",
    camera:    "Straight-on eye-level view facing the vanity dead-center, framed so the cabinet, countertop, sink(s), faucet, and mirror fill the ENTIRE frame edge-to-edge with no blank margin, letterboxing, or empty background visible on any side — this is a full-bleed close product-style shot of the vanity wall alone, not a room-scale shot and not a photo floating in empty space.",
    spatial:   "Vanity is the visual centerpiece with adequate counter and knee clearance visible; ceiling and side walls are cropped out of frame by the tight composition, and the subject extends fully to all four edges of the image.",
    boundary:  "EXACTLY ONE wall is visible: the vanity wall. NO toilet, NO shower, NO tub, and NO bathtub anywhere in the frame, even partially — this is a vanity-only close-up, not a bathroom-type composition. NO blank/white/empty space bordering the subject — the vanity composition must fill the full canvas. If any fixture besides the vanity/mirror/sink/faucet is visible, OR if blank space borders the subject, the render has FAILED this bathroom type.",
  },
  "Shower Area": {
    // Defaults to a SHOWER enclosure, mirroring the Full Bathroom rule — a
    // tub only appears when the customer's selected style is a tub-inclusive
    // one ("Tub & Shower Combo") or a tub was explicitly requested in
    // Special Requests / Notes. "Walk-in Glass" and "Framed Enclosure" are
    // shower-only styles and must never render a tub.
    structure: "A focused view of ONLY the shower enclosure — glass or curtain, tile surround, showerhead and controls. No vanity, no toilet, no tub anywhere in frame.",
    structureWithTub: "A focused view of ONLY the tub/shower enclosure — alcove tub, shower curtain or glass panel above it, tile surround. No vanity, no toilet anywhere in frame.",
    camera:    "Angled three-quarter view standing just outside the enclosure looking in, framed so the glass/curtain, full tile surround, showerhead, and controls fill the ENTIRE frame edge-to-edge with no blank margin, letterboxing, or empty background visible on any side — this is a full-bleed close shot of the enclosure alone, not a room-scale shot and not a photo floating in empty space.",
    spatial:   "Shower enclosure is the visual centerpiece with realistic enclosure dimensions; surrounding walls, ceiling, and any other fixture are cropped out of frame by the tight composition, and the subject extends fully to all four edges of the image.",
    boundary:  "EXACTLY ONE fixture is visible: the shower enclosure. NO vanity, NO toilet, and NO bathtub anywhere in the frame, even partially — this is an enclosure-only close-up, not a bathroom-type composition, UNLESS a tub-inclusive style was selected or a tub was explicitly requested, in which case the tub replaces the shower as the single visible fixture. NO blank/white/empty space bordering the subject — the enclosure composition must fill the full canvas. If any fixture besides the selected enclosure type is visible, OR if blank space borders the subject, the render has FAILED this bathroom type.",
    boundaryWithTub: "EXACTLY ONE fixture is visible: the tub/shower enclosure. NO vanity and NO toilet anywhere in the frame, even partially — this is an enclosure-only close-up, not a bathroom-type composition. NO blank/white/empty space bordering the subject. If any fixture besides the tub/shower enclosure is visible, OR if blank space borders the subject, the render has FAILED this bathroom type.",
  },
};

// Per-style visual blocks for image generation — ensures each style choice (within a
// bathroom type) produces a structurally and aesthetically distinct render, not just a
// recolored version of the same room. Mirrors the Kitchen route's LAYOUT_VISUAL pattern.
const STYLE_VISUAL = {
  // ── Full Bathroom layouts (room-shape configurations) ──
  // Each entry's `camera` REPLACES the generic TYPE_VISUAL["Full Bathroom"]
  // camera/structure once a layout is selected (see the `tv`/`sv` merge below)
  // — a fixed "three-quarter view" camera cannot show an L-turn, a facing-wall
  // corridor, a single run, or a three-wall wrap equally well, so the camera
  // must be chosen to fit the shape being rendered, or the layout reads as
  // generic regardless of what the structure text says.
  "L-Shaped": {
    structure: "Vanity and toilet run along one wall, with the shower enclosure turning the corner onto an adjoining perpendicular wall — a classic two-wall L-shaped footprint. No bathtub.",
    structureWithTub: "Vanity and toilet run along one wall, with the bathtub turning the corner onto an adjoining perpendicular wall — a classic two-wall L-shaped footprint.",
    camera:    "Elevated three-quarter corner view shot from the open side of the room, positioned so BOTH walls of the L are visible in the same frame and the 90-degree corner junction between them is clearly readable — never a straight-on view of only one wall.",
    boundary:  "Exactly TWO fixture-lined walls meeting at a 90-degree corner — not one wall (that is Single Wall), not two PARALLEL walls facing each other (that is Galley), and not three walls (that is U-Shaped). If the corner junction is not visible in frame, the render has FAILED this layout. NO bathtub anywhere unless explicitly requested — the corner enclosure is a shower only.",
    palette:   "Balanced neutral palette that reads consistently across both connected walls, large-format tile carrying around the corner.",
    lighting:  "Vanity sconces or a light bar above the mirror, plus a separate recessed light over the shower leg of the L.",
  },
  "Galley": {
    structure: "Fixtures split across two parallel walls facing each other — vanity on one wall, shower and toilet on the opposite wall — with a walkway corridor between them. No bathtub.",
    structureWithTub: "Fixtures split across two parallel walls facing each other — vanity on one wall, bathtub and toilet on the opposite wall — with a walkway corridor between them.",
    camera:    "Camera positioned at one end of the corridor, looking straight down its length, so both parallel walls are visible on the left and right sides of the frame simultaneously with the walkway between them — never a view showing only one wall.",
    boundary:  "Exactly TWO fixture-lined walls that are PARALLEL and face each other across a corridor — not walls meeting at a corner (that is L-Shaped), not a single wall (that is Single Wall), and not three walls (that is U-Shaped). If both parallel walls are not simultaneously visible with a walkway between them, the render has FAILED this layout. NO bathtub anywhere unless explicitly requested — the opposite wall holds a shower only.",
    palette:   "Cohesive palette carried on both facing walls so the corridor reads as one unified room, not two mismatched sides.",
    lighting:  "Symmetrical lighting on both parallel walls — vanity light bar facing a recessed or surface light on the opposite wall.",
  },
  "Single Wall": {
    structure: "All fixtures — vanity, toilet, and shower — aligned along a single wall in a compact linear run, typical of a narrow bathroom footprint. No bathtub.",
    structureWithTub: "All fixtures — vanity, toilet, and bathtub — aligned along a single wall in a compact linear run, typical of a narrow bathroom footprint.",
    camera:    "Straight-on wide view facing the single fixture wall head-on from across the room, framed so the full linear run — vanity, toilet, and shower in sequence — is visible in one continuous line with no fixtures on the side or back walls.",
    boundary:  "Exactly ONE fixture-lined wall — no fixture may appear on any side wall, back wall, or corner. If a second wall carries any fixture (vanity, toilet, or shower), the render has FAILED this layout — that describes L-Shaped, Galley, or U-Shaped instead. NO bathtub anywhere unless explicitly requested — the run ends in a shower only.",
    palette:   "Light, unified palette along the single run to keep the narrow linear space feeling open rather than cramped.",
    lighting:  "One continuous light source (light bar or run of recessed cans) along the full length of the wall.",
  },
  "U-Shaped": {
    structure: "Fixtures wrap three walls — vanity on the back wall, with the toilet and shower occupying the two side walls — forming a U-shaped enclosure around a central floor area. No bathtub.",
    structureWithTub: "Fixtures wrap three walls — vanity on the back wall, with the toilet and bathtub occupying the two side walls — forming a U-shaped enclosure around a central floor area.",
    camera:    "Wide-angle view shot from the open (fourth) side of the room facing inward, positioned so all three fixture-lined walls — both side walls and the back wall between them — are simultaneously visible, clearly reading as a three-wall wrap around open floor space.",
    boundary:  "Exactly THREE fixture-lined walls (back wall plus both side walls) wrapping around open floor space, with the fourth wall open/omitted for the camera — not two walls (that is L-Shaped or Galley) and not one wall (that is Single Wall). If fewer than three fixture-lined walls are visible, the render has FAILED this layout. NO bathtub anywhere unless explicitly requested — the side wall enclosure is a shower only.",
    palette:   "Consistent palette wrapping all three walls so the U reads as one enclosed room rather than three separate zones.",
    lighting:  "Central ceiling fixture or recessed cans overhead plus a vanity light bar on the back wall, evenly lighting all three sides.",
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

// Per-faucet-style silhouette descriptions — the faucet NAME alone ("Waterfall",
// "Gooseneck") is not a guaranteed visual anchor for an image model; without an
// explicit shape description every style tends to render as the same generic
// single-handle faucet regardless of which one was actually selected.
const FAUCET_VISUAL = {
  // ── Vanity faucet styles ──
  "Waterfall": "a single tall rectangular spout rising straight up from the deck with a flat wide slot opening at the top, water sheeting down in a flat plane rather than a rounded stream — no separate handle visible above deck, controls integrated into the base.",
  "Wide Waterfall": "a wide, low rectangular spout with a broad flat slot opening spanning roughly double the width of a standard waterfall faucet, water sheeting down as one continuous wide plane — no separate handle visible above deck.",
  "Gooseneck": "a tall, slender cylindrical spout that curves in a smooth high arc like a gooseneck, rising well above the deck before curving down toward the basin — distinctly taller and more arched than a standard faucet, with a compact rectangular base.",
  "Single-Lever": "a slim vertical spout with ONE single lever handle mounted on top that swings side-to-side and front-to-back to control temperature and flow — only one control, no separate hot/cold handles.",
  "Widespread": "THREE separate deck-mounted pieces spaced apart: a central spout flanked by two independent handles (one on each side, several inches from the spout) — never a single unified fixture, the handles and spout must be visibly separate pieces.",
  "Vessel-Height": "a very tall, elevated spout (noticeably taller than a standard faucet) designed to arc down into a vessel/counter-top sink that sits above the counter surface rather than being recessed into it — the extra height is the defining trait.",
  // ── Shower faucet/fixture styles ──
  "Round Rain Shower": "a large circular/round overhead rain shower head mounted on a slim wall or ceiling arm, plus a separate round temperature/pressure control valve lower on the wall — the shower head is distinctly ROUND, not square.",
  "Square Rain Shower": "a large square/rectangular flat-panel overhead rain shower head mounted on a slim wall or ceiling arm, plus a separate round control valve lower on the wall — the shower head is distinctly SQUARE/rectangular, not round.",
  "Round Arm Shower": "a standard-size ROUND showerhead mounted on a visible round/cylindrical wall arm extending out from the wall (not a large rain-style panel) — compact traditional showerhead silhouette, round throughout.",
  "Square Arm Shower": "a standard-size SQUARE/rectangular showerhead mounted on a visible wall arm extending out from the wall (not a large rain-style panel) — compact traditional showerhead silhouette, square throughout.",
  "Exposed Valve + Handheld": "an exposed (surface-mounted, not recessed) square control valve on the wall with visible piping connecting to a handheld shower wand on a wall-mounted hook/bracket and a flexible hose — the handheld wand and its hose must be clearly visible, not just an overhead fixture.",
  "Concealed Valve + Overhead": "a minimal round concealed (flush, recessed) control valve/trim on the wall with NO visible exposed piping, paired with a wide rectangular overhead rain shower head on a slim arm — the wall valve reads as a clean flush disc, not a projecting fixture.",
};

// Budget-appropriate realism descriptions for image generation.
// FAUCET is deliberately excluded from these descriptions — the customer's
// own vanity/shower faucet style + color selections are mandatory and must
// never be overridden or contradicted by the budget tier (e.g. a "Gold"
// selection must render as gold even at the Budget-friendly tier).
const BUDGET_REALISM = {
  "Budget-friendly": "Budget-tier residential bathroom. VANITY: Flat thermofoil or laminate cabinet doors, builder-grade appearance. COUNTERTOP: Solid-color laminate or cultured marble with no veining. LIGHTING: Single builder-grade vanity light bar. TILE/FLOORING: Plain ceramic tile, minimal pattern. Overall: functional and utilitarian — unmistakably builder-grade low-budget construction quality.",
  "Modern Euro":     "Mid-range contemporary residential bathroom. VANITY: Flat-panel or shaker cabinet doors in matte white or light gray, clean machine-cut edges. COUNTERTOP: Light gray or white quartz with subtle veining. LIGHTING: Warm LED vanity sconces or a modern light bar with even, flattering illumination. TILE/FLOORING: Large-format porcelain tile in a clean layout. Overall: clean, contemporary, mid-range residential — clearly a step above basic.",
  "Premium Luxury":  "High-end luxury residential bathroom. VANITY: Custom inset cabinet doors with precise shadow-line gaps, furniture-quality finish or rich wood veneer. COUNTERTOP: Thick natural marble or quartzite slab with dramatic veining. LIGHTING: Layered warm lighting — statement vanity sconces plus a decorative overhead fixture. TILE/FLOORING: Large-format natural stone or handmade tile with a herringbone or book-matched layout. Overall: unmistakably high-end custom luxury — every surface signals expensive craftsmanship and premium materials.",
};

// Full Bathroom defaults to a shower enclosure, never a bathtub — a tub is
// only generated if the customer explicitly asked for one in Special
// Requests / Notes (which already carries any selected enhancement
// keywords, folded in by BathroomDesignForm.jsx before this route is called).
function wantsTub(designComments) {
  if (!designComments) return false;
  return /\b(tub|bathtub|soaking tub|freestanding tub)\b/i.test(designComments);
}

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
      faucet_style, shower_faucet_style, faucet_color,
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
    const faucet_desc        = faucet_style
      ? `${faucet_style} style faucet${faucet_color ? ` in ${faucet_color} finish` : ""}${FAUCET_VISUAL[faucet_style] ? ` — ${FAUCET_VISUAL[faucet_style]}` : ""}`
      : "";
    const shower_faucet_desc = shower_faucet_style
      ? `${shower_faucet_style} shower faucet/fixture${faucet_color ? ` in ${faucet_color} finish` : ""}${FAUCET_VISUAL[shower_faucet_style] ? ` — ${FAUCET_VISUAL[shower_faucet_style]}` : ""}`
      : "";

    const effectiveImageUrl = image_status === "Yes" && image_url ? image_url : "";
    const includeImageAnalysis = !!effectiveImageUrl;
    const hasReferenceImages = Object.values(refImages).some(Boolean);

    // ── Stage 2: Build prompt and call GPT (JSON mode) ────────────────────────
    let { systemPrompt, userPrompt } = buildBathroomDesignPrompt(
      {
        bathroom_type, style, budget_style,
        vanity_finish, countertop, flooring,
        faucet_finish: faucet_style,
        shower_faucet_finish: shower_faucet_style,
        faucet_color,
        design_comments,
        vanity_finish_desc, countertop_desc, flooring_desc, faucet_desc, shower_faucet_desc,
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
    if (vanity_finish)         concept.vanity_finish        = vanity_finish;
    if (countertop)            concept.countertop           = countertop;
    if (flooring)              concept.flooring             = flooring;
    if (faucet_style)          concept.faucet_finish        = faucet_style;
    if (shower_faucet_style)   concept.shower_faucet_finish = shower_faucet_style;
    if (faucet_color)          concept.faucet_color         = faucet_color;

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
          model:   "gpt-image-2.5-sunburst",
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
        console.log(`[bathroom-design] Using gpt-image-2.5-sunburst edit for redesign with type: ${bathroom_type}, style: ${style}`);
        const colorNote = faucet_color ? ` in ${faucet_color} finish` : "";
        const sections = [
          `Photorealistic residential bathroom photograph. Redesign using the customer's existing room — ONLY the vanity, countertop, flooring, and faucet(s) change. Everything else is copied from the source photo without modification.`,
          PHOTO_LOCKED,
          [
            `CHANGE LIST — the ONLY elements permitted to differ from the source photo:`,
            `• Vanity cabinet: new finish colour, door style, and configuration matching the selected style`,
            `• Countertop: new material`,
            `• Flooring: new material and colour`,
            faucet_style        ? `• Vanity faucet: replaced with ${faucet_style} style${colorNote}` : "",
            shower_faucet_style ? `• Shower faucet/fixture: replaced with ${shower_faucet_style}${colorNote}` : "",
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
        if (faucet_style) {
          const shape = FAUCET_VISUAL[faucet_style] ? ` Exact silhouette: ${FAUCET_VISUAL[faucet_style]}` : "";
          sections.push(`MANDATORY VANITY FAUCET: ${faucet_style} style faucet${colorNote} — must be clearly visible on the vanity, matching this silhouette exactly, not a generic faucet. Do not substitute or omit.${shape}`);
        }
        if (shower_faucet_style) {
          const shape = FAUCET_VISUAL[shower_faucet_style] ? ` Exact silhouette: ${FAUCET_VISUAL[shower_faucet_style]}` : "";
          sections.push(`MANDATORY SHOWER FAUCET/FIXTURE: ${shower_faucet_style}${colorNote} — must be clearly visible in the shower enclosure, matching this silhouette exactly, not a generic showerhead. Do not substitute or omit.${shape}`);
        }
        if (style) sections.push(`STYLE: ${style}`);
        if (design_comments) {
          sections.push(
            `MANDATORY SPECIAL REQUESTS — apply ALL of the following exactly as specified, in addition to the vanity/countertop/flooring/faucet changes above:\n${design_comments}\n` +
            `These requests are NOT limited to the vanity/countertop/flooring/faucet — if a request describes a fixture, feature, or enhancement not otherwise listed (e.g. lighting, storage, ventilation, a mirror upgrade), add or modify it even though it falls outside the CHANGE LIST, while still leaving every OTHER unmentioned element of the source photo untouched.`
          );
        }
        if (dalle_prompt) sections.push(`VISUAL STYLE (applies ONLY to the replaced vanity, countertop, and flooring):\n${dalle_prompt}`);
        const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
        sections.push(`BUDGET REALISM (applies ONLY to the replaced vanity, countertop, and flooring):\n${budgetTierDesc}`);

        dalleImageUrl = await editAndPersist(effectiveImageUrl, sections.join("\n\n"));

      } else {
        // New build, no reference photo → gpt-image-2.5-sunburst text-to-image
        const tv = bathroom_type ? TYPE_VISUAL[bathroom_type] : null;
        const typeLabel = bathroom_type ? `${bathroom_type} bathroom.` : "";
        const sections = [`${typeLabel} Photorealistic residential bathroom photograph.`.trim()];

        // For Full Bathroom, the selected layout (L-Shaped/Galley/Single Wall/
        // U-Shaped) IS the room's structure and camera framing — a generic
        // "three-quarter view" cannot show an L-turn, a facing-wall corridor,
        // a single run, or a three-wall wrap equally well. The layout's own
        // structure/camera therefore REPLACES the generic Full Bathroom ones
        // rather than being layered alongside them (which previously gave the
        // model two different, sometimes-conflicting camera instructions).
        const isFullBathroomLayout = bathroom_type === "Full Bathroom" && sv;

        // Full Bathroom and Shower Area both default to a shower, never a
        // bathtub, unless the customer explicitly asked for one, OR (Shower
        // Area only) selected the tub-inclusive "Tub & Shower Combo" style —
        // see the `*WithTub` variants defined alongside TYPE_VISUAL/STYLE_VISUAL above.
        const includeTub =
          (bathroom_type === "Full Bathroom" && wantsTub(design_comments)) ||
          (bathroom_type === "Shower Area" && (style === "Tub & Shower Combo" || wantsTub(design_comments)));

        const structureText = isFullBathroomLayout
          ? (includeTub && sv.structureWithTub ? sv.structureWithTub : sv.structure)
          : (includeTub && tv?.structureWithTub ? tv.structureWithTub : tv?.structure);
        const cameraText = isFullBathroomLayout
          ? sv.camera
          : (includeTub && tv?.cameraWithTub ? tv.cameraWithTub : tv?.camera);
        const boundaryText = tv
          ? (includeTub && tv.boundaryWithTub ? tv.boundaryWithTub : tv.boundary)
          : null;

        if (structureText) sections.push(`MANDATORY LAYOUT:\n${structureText}`);
        if (cameraText)    sections.push(`MANDATORY CAMERA VIEW:\n${cameraText}`);
        if (tv) {
          sections.push(`MANDATORY SPATIAL RULES:\n${tv.spatial}`);
          sections.push(`COMPOSITION BOUNDARIES:\n${boundaryText}`);
        }
        if (isFullBathroomLayout && sv.boundary) {
          sections.push(`LAYOUT BOUNDARY — wall count is non-negotiable:\n${includeTub ? sv.boundary.replace(/NO bathtub anywhere unless explicitly requested — [^.]*\./, "A bathtub was explicitly requested and replaces the shower enclosure in this layout.") : sv.boundary}`);
        }
        if (sv && !isFullBathroomLayout) {
          // Fixture-configuration styles (Vanity's Floating/Furniture Style/
          // Double Sink, Shower Area's Walk-in Glass/etc.) — layouts already
          // stated their structure above as MANDATORY LAYOUT, so skip the
          // redundant restatement here for Full Bathroom.
          sections.push(`MANDATORY STYLE CONFIGURATION — "${style}" (this fixture configuration and silhouette must be clearly visible in the final image; do not substitute a generic or different style's configuration):\n${sv.structure}`);
        }
        if (sv) {
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
        {
          const colorNote = faucet_color ? ` in ${faucet_color} finish` : "";
          if (faucet_style) {
            const shape = FAUCET_VISUAL[faucet_style] ? ` Exact silhouette: ${FAUCET_VISUAL[faucet_style]}` : "";
            sections.push(`MANDATORY VANITY FAUCET:\n${faucet_style} style faucet${colorNote} — must be clearly visible on the vanity, matching this silhouette exactly, not a generic faucet. Do not substitute.${shape}`);
          }
          if (shower_faucet_style) {
            const shape = FAUCET_VISUAL[shower_faucet_style] ? ` Exact silhouette: ${FAUCET_VISUAL[shower_faucet_style]}` : "";
            sections.push(`MANDATORY SHOWER FAUCET/FIXTURE:\n${shower_faucet_style}${colorNote} — must be clearly visible in the shower enclosure, matching this silhouette exactly, not a generic showerhead. Do not substitute.${shape}`);
          }
        }
        if (style) sections.push(`STYLE:\n${style}`);
        if (design_comments) sections.push(`MANDATORY SPECIAL REQUIREMENTS — apply ALL of the following exactly as specified:\n${design_comments}`);
        sections.push(dalle_prompt
          ? `VISUAL STYLE:\n${dalle_prompt}`
          : `VISUAL STYLE:\nClean minimal materials, soft natural lighting, balanced exposure.`
        );
        const budgetTierDesc = BUDGET_REALISM[budget_style] || BUDGET_REALISM["Modern Euro"];
        sections.push(`BUDGET REALISM:\n${budgetTierDesc}`);

        if (isFullBathroomLayout) {
          // Final restatement, placed last for recency — the single most
          // important structural fact repeated once more in plain terms
          // right before generation, after every other instruction.
          sections.push(
            `FINAL LAYOUT CHECK before rendering: this is a "${style}" bathroom. ${cameraText} Re-confirm the wall count and camera framing above match "${style}" exactly — do not default to a generic three-quarter room view.`
          );
        }
        if (bathroom_type === "Vanity" || bathroom_type === "Shower Area") {
          // Vanity and Shower Area are both tight, single-fixture crops, not
          // room-scale shots — this is the failure mode most likely for these
          // two types (image models default toward a wider "bathroom" shot
          // even when asked for a close-up), so it's restated last for
          // recency, right before generation.
          const subject = bathroom_type === "Vanity" ? "the vanity wall only" : "the shower/tub enclosure only";
          sections.push(
            `FINAL FRAMING CHECK before rendering: this is a "${bathroom_type}" composition — a FULL-BLEED close-up of ${subject}, extending edge-to-edge to fill the entire canvas with no blank margin, letterboxing, or empty background bordering the subject on any side. Do NOT render a wide, room-scale bathroom shot with multiple fixtures visible, and do NOT render the subject floating in empty space. ${cameraText}`
          );
        }
        if (bathroom_type === "Full Bathroom" || bathroom_type === "Shower Area") {
          // Final restatement of the shower/tub default, placed last for
          // recency — repeated once more in plain terms right before
          // generation since this is the fixture most likely to be
          // hallucinated by default (image models are heavily biased toward
          // showing a bathtub in "bathroom"/"shower" scenes).
          sections.push(
            includeTub
              ? `FINAL FIXTURE CHECK before rendering: a bathtub was explicitly requested or selected — include it as described above.`
              : `FINAL FIXTURE CHECK before rendering: this is a SHOWER ENCLOSURE ONLY. Do NOT render a bathtub, soaking tub, or freestanding tub anywhere in the image — no tub was requested or selected.`
          );
        }

        const finalPrompt = sections.join("\n\n");

        // Vanity and Shower Area are tight single-fixture close-ups — a tall,
        // narrow subject that doesn't fill a wide 1536x1024 landscape canvas
        // edge-to-edge, which left visible blank/white margins on both sides
        // of the render. A portrait canvas matches the subject's natural
        // shape instead. Full Bathroom stays landscape since a whole-room
        // shot genuinely is wide.
        const imageSize = (bathroom_type === "Vanity" || bathroom_type === "Shower Area")
          ? "1024x1536"
          : "1536x1024";

        const imageResponse = await client.images.generate({
          model:   "gpt-image-2.5-sunburst",
          prompt:  finalPrompt,
          n:       1,
          size:    imageSize,
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
