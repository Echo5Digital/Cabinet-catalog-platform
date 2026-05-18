import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { getAIConfig } from "@/lib/ai/config";

// Layout-specific cabinet placement rules (keyed by normalized layout name)
const LAYOUT_PLACEMENT = {
  lshaped:
    "Place upper and base cabinets along the BACK wall (full width) AND the RIGHT side wall (full depth). Left wall and front wall are completely clear of cabinets.",
  ushaped:
    "Place upper and base cabinets along the BACK wall (full width), LEFT side wall (full depth), and RIGHT side wall (full depth). Front wall is clear.",
  galley:
    "Place upper and base cabinets along the BACK wall (full width) AND the FRONT wall (full width). Both side walls are clear. Leave a central walking aisle between the two runs.",
  island:
    "Place upper and base cabinets along the BACK wall and RIGHT side wall. Add a large freestanding island rectangle in the center of the room. Front and left walls are clear.",
  singlewall:
    "Place upper and base cabinets ONLY along the BACK wall. All other walls are completely clear of cabinets.",
  gshaped:
    "Place upper and base cabinets along the BACK wall, LEFT side wall, RIGHT side wall, AND a short peninsula (about half the front wall width) extending inward from the front-right corner.",
};

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { width, depth, height, styleNotes, cabinet_style, layout } = body;

    if (!width || !depth || !height) {
      return NextResponse.json({ error: "width, depth, and height are required" }, { status: 400 });
    }

    const { apiKey } = await getAIConfig(ctx.tenantId);
    if (!apiKey) {
      return NextResponse.json({ error: "AI is not configured for this account." }, { status: 503 });
    }

    // ── Fetch catalog products + layout structures in parallel ─────────────────
    const admin = createAdminClient();
    const [linesRes, productsRes, structuresRes] = await Promise.all([
      admin
        .from("catalog_lines")
        .select("id, name, slug")
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "published"),
      admin
        .from("products")
        .select("sku, name, catalog_line_id, width_in, height_in, depth_in")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true)
        .limit(100),
      admin
        .from("structures")
        .select("id, name, code, assets!assets_structure_id_fkey(id, public_url, status, asset_type)")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true),
    ]);

    // Filter products by cabinet style if provided
    const styleKey = (cabinet_style || "").toLowerCase();
    const styleLineIds = styleKey
      ? (linesRes.data || [])
          .filter((l) => l.name.toLowerCase().includes(styleKey))
          .map((l) => l.id)
      : [];
    const styleProducts =
      styleLineIds.length > 0
        ? (productsRes.data || []).filter((p) => styleLineIds.includes(p.catalog_line_id))
        : productsRes.data || [];

    // Build catalog context
    const catalogLines = styleProducts.map((p) => {
      const dims = [
        p.width_in  ? `${p.width_in}"W`  : null,
        p.height_in ? `${p.height_in}"H` : null,
        p.depth_in  ? `${p.depth_in}"D`  : null,
      ]
        .filter(Boolean)
        .join("×");
      return dims ? `${p.sku}: ${p.name} (${dims})` : `${p.sku}: ${p.name}`;
    });
    const hasCatalog = catalogLines.length > 0;

    // ── Match selected layout to a structure reference image ──────────────────
    const layoutNorm = normalize(layout);
    const matchedStructure = layoutNorm
      ? (structuresRes.data || []).find((s) => {
          const nameNorm = normalize(s.name);
          const codeNorm = normalize(s.code);
          return (
            nameNorm.includes(layoutNorm) ||
            layoutNorm.includes(nameNorm) ||
            codeNorm.includes(layoutNorm) ||
            layoutNorm.includes(codeNorm)
          );
        })
      : null;
    const referenceImageUrl = matchedStructure
      ? (matchedStructure.assets || []).find(
          (a) => a.status === "confirmed" && a.asset_type === "structure_reference"
        )?.public_url ?? null
      : null;

    // Layout-specific placement rule
    const layoutPlacement =
      LAYOUT_PLACEMENT[layoutNorm] ||
      `Place cabinets according to a standard ${layout || "L-shaped"} kitchen layout.`;

    const hasIsland =
      parseFloat(width) * parseFloat(depth) > 150 || layoutNorm === "island";
    const backWallInches = Math.round(parseFloat(width) * 12 - 12);
    const sideWallInches = Math.round(parseFloat(depth) * 12 - 12);

    const client = new OpenAI({ apiKey });

    async function callGPT(messages, jsonMode) {
      const resp = await client.chat.completions.create({
        model:      "gpt-4o",
        messages,
        max_tokens: 4000,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      });
      return resp.choices[0]?.message?.content?.trim() ?? "";
    }

    // ── Primary path: JSON mode — returns SVG + product selections ────────────
    const jsonSystem = `You are a licensed architect and kitchen designer producing professional CAD-quality floor plans.
Draw walls as thick solid strokes, base cabinets as filled warm-gray rectangles with door lines and countertop edge, upper cabinets as dashed-outline rectangles (architectural section convention), and include accurate fixture symbols (sink with double basin, range with 4 burners, refrigerator).
Use a clean black-on-white architectural drafting palette — NOT colorful fills.${
      referenceImageUrl
        ? " A reference floor plan image has been provided — match its visual style, line weights, notation style, and professional quality closely."
        : ""
    }
Return ONLY raw JSON — no markdown fences, no explanation, no extra text.
The JSON must exactly match the schema provided.`;

    const jsonUser = `Room: ${width}ft wide × ${depth}ft deep × ${height}ft ceiling height.${
      layout ? ` Kitchen layout: ${layout}.` : ""
    }${styleNotes ? ` Style notes: ${styleNotes}.` : ""}${
      cabinet_style ? ` Cabinet style: ${cabinet_style}.` : ""
    }

LAYOUT PLACEMENT — strictly follow this rule:
${layoutPlacement}

${
  hasCatalog
    ? `AVAILABLE CABINET PRODUCTS — select ONLY from this list:
${catalogLines.join("\n")}

Room wall analysis:
- Back wall usable length: approx ${backWallInches} inches (after corner/door clearance)
- Side wall usable lengths: approx ${sideWallInches} inches each${
        hasIsland ? "\n- Include a freestanding center island" : ""
      }

PRODUCT SELECTION INSTRUCTIONS:
1. For each wall that has cabinets per the layout rule above, sum product widths to fill the run
2. Select base cabinets (lower) AND wall cabinets (upper) for every wall that has runs
3. In floor_plan_svg: label each cabinet block with its SKU (font-size="8")
4. In product_selections: include every selected SKU with qty, wall, and placement`
    : `PRODUCT INSTRUCTIONS:
1. Generate a generic floor plan with unlabelled cabinet blocks
2. Return product_selections as an empty array`
}

SVG REQUIREMENTS — professional architectural CAD-style floor plan:

CANVAS: viewBox="0 0 640 580" width="640" height="580"

BACKGROUND: <rect width="640" height="580" fill="#ECEAE4"/>

TITLE BLOCK (y=6 to y=50):
  - Project title at (320,22): font-size="13" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle" fill="#111111": "${width}' × ${depth}' — ${layout || "Kitchen"} Floor Plan"
  - Sub-caption at (320,37): font-size="8" font-family="Arial,sans-serif" text-anchor="middle" fill="#888888": "Floor Plan  ·  Scale: Approximate"
  - Horizontal rule: <line x1="50" y1="48" x2="590" y2="48" stroke="#AAAAAA" stroke-width="0.75"/>

ROOM RECTANGLE (starts at y=58, leave 76px margin on ALL sides from canvas edge for dimension annotations):
  - WALLS drawn as thick-stroked white rectangle: fill="#FFFFFF" stroke="#161616" stroke-width="14"
  - The thick stroke IS the wall — no separate wall hatching needed
  - Proportional to actual room dimensions

DOOR OPENING:
  - Erase a ~36" segment of ONE side wall by drawing a white rect over the wall stroke
  - Door panel: thin straight line (stroke="#333" stroke-width="1")
  - Door swing arc: quarter-circle, stroke="#444444" stroke-width="0.75" fill="none" stroke-dasharray="4,2"

WINDOW OPENING:
  - Erase a ~40" segment on back wall using a white rect
  - Inside the gap draw 3 thin parallel lines perpendicular to the wall: stroke="#555555" stroke-width="0.75"

BASE CABINETS (24" deep proportional, flush to INSIDE wall face, on walls specified by layout):
  - fill="#D0CABА" stroke="#2A2A2A" stroke-width="1.25"
  - Countertop front edge: thin solid line 2px inset from cabinet face, stroke="#111111" stroke-width="0.75"
  - Door/drawer division lines every ~36px parallel to wall face: stroke="#808080" stroke-width="0.5"
  - Label "BASE" centered: font-size="7" font-family="Arial,sans-serif" fill="#333333" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5"

UPPER CABINETS (12" deep, DASHED outline — architectural convention for elements above the section cut plane):
  - Draw flush against wall BEHIND base cabinets (same wall face, 12" depth)
  - fill="#F5F2EC" stroke="#505050" stroke-width="0.75" stroke-dasharray="5,3"
  - Label "UPPER" centered: font-size="7" font-family="Arial,sans-serif" fill="#505050" text-anchor="middle" dominant-baseline="middle"

KITCHEN FIXTURES (place on countertops at logical positions):

  SINK — on back wall countertop near center:
    Outer body: <rect> ~30"W × 20"D proportional, fill="#E2E2E2" stroke="#2A2A2A" stroke-width="1"
    Left basin: inner <rect> (half width), fill="white" stroke="#666" stroke-width="0.6"
    Right basin: inner <rect> (half width), fill="white" stroke="#666" stroke-width="0.6"
    Drains: <circle r="2.5" fill="#888888"/> centered in each basin
    Label "SINK": font-size="6" fill="#444" text-anchor="middle"

  RANGE — on same or adjacent wall:
    Body: <rect> ~30"W × 24"D proportional, fill="#E6E6E6" stroke="#2A2A2A" stroke-width="1"
    Four burners: <circle r="5" fill="#CCCCCC" stroke="#555" stroke-width="0.75"/> at 4 inner corners
    Label "RANGE": font-size="6" fill="#444" text-anchor="middle"

  REFRIGERATOR — in a corner:
    <rect> ~30"W × 30"D proportional, fill="#EFEFEF" stroke="#2A2A2A" stroke-width="1"
    Label "REF": font-size="7" fill="#444" text-anchor="middle" dominant-baseline="middle"

ISLAND (only if applicable per layout rule above):
  Centered <rect> rx="3": fill="#C8C4B4" stroke="#161616" stroke-width="1.5"
  Countertop edge: inner inset line stroke="#333" stroke-width="0.5"
  Label "ISLAND": font-size="8" fill="#222" text-anchor="middle" dominant-baseline="middle"

DIMENSION ANNOTATIONS (outside room, 30px offset beyond outer wall face):

  HORIZONTAL (below room, showing ${width} ft):
    Left extension line: <line> from bottom-left room corner down 30px, stroke="#666" stroke-width="0.75"
    Right extension line: <line> from bottom-right room corner down 30px, stroke="#666" stroke-width="0.75"
    Dimension baseline: <line> connecting the two extension bottoms, stroke="#444" stroke-width="0.75"
    Tick marks at each end: two short diagonal lines forming an "×" or single slash, stroke="#444"
    Text centered above line: font-size="10" font-family="Arial,sans-serif" fill="#333333": "${Math.round(parseFloat(width))}'-0\\""

  VERTICAL (left of room, showing ${depth} ft):
    Same pattern rotated 90°
    Text rotated -90°: font-size="10" fill="#333333": "${Math.round(parseFloat(depth))}'-0\\""

CORNER ANNOTATIONS (bottom-right of canvas):
  - Layout type: font-size="9" fill="#AAAAAA" font-style="italic": "${layout || "Kitchen"} Layout"
  - North arrow indicator (simple "N" with small arrow): font-size="9" fill="#777"

CABINET SKU LABELS (if catalog products provided):
  Each cabinet block: font-size="7" font-weight="600" fill="#1A3A6A" text-anchor="middle" dominant-baseline="middle"

Return exactly this JSON schema:
{
  "floor_plan_svg": "<svg viewBox='0 0 640 580' ...>...</svg>",
  "product_selections": [
    { "sku": "B36", "product_name": "36\\" Base Cabinet", "qty": 2, "wall": "back", "placement": "sink zone base" }
  ]
}`;

    let svg              = "";
    let product_selections = [];

    try {
      // Use vision content if a reference image is available
      const userContent = referenceImageUrl
        ? [
            { type: "image_url", image_url: { url: referenceImageUrl, detail: "high" } },
            { type: "text", text: jsonUser },
          ]
        : jsonUser;

      const raw    = await callGPT(
        [{ role: "system", content: jsonSystem }, { role: "user", content: userContent }],
        true
      );
      const parsed = JSON.parse(raw);
      svg = (parsed.floor_plan_svg || "")
        .replace(/^```(?:svg|xml)?\n?/i, "")
        .replace(/\n?```$/, "")
        .trim();
      product_selections = Array.isArray(parsed.product_selections)
        ? parsed.product_selections
        : [];

      // Server-side SKU validation: strip any hallucinated SKUs
      if (hasCatalog) {
        const validSkus = new Set(styleProducts.map((p) => p.sku));
        product_selections = product_selections.filter((s) => s.sku && validSkus.has(s.sku));
      }
    } catch {
      // JSON parse failed — fall through to SVG-only fallback
      svg              = "";
      product_selections = [];
    }

    // ── Fallback path: SVG-only prompt ────────────────────────────────────────
    if (!svg.startsWith("<svg")) {
      const svgSystem = `You are a licensed architect generating professional CAD-quality kitchen floor plans as SVG. Walls are thick solid strokes, base cabinets have door lines and countertop edge lines, upper cabinets use dashed outlines (section convention), fixtures have proper symbols. Use black/white/warm-gray architectural drafting palette. Return ONLY a valid SVG element — no markdown, no code fences, no explanations. The response must start with <svg and end with </svg>.`;
      const svgUser   = `Generate a professional architectural CAD-style top-down kitchen floor plan SVG.
Room: ${width}ft wide × ${depth}ft deep × ${height}ft ceiling.
Layout: ${layout || "L-shaped"}.${styleNotes ? ` Notes: ${styleNotes}.` : ""}
LAYOUT RULE: ${layoutPlacement}

SVG: viewBox="0 0 640 580" width="640" height="580"

CANVAS: <rect width="640" height="580" fill="#ECEAE4"/>

TITLE BLOCK at top (y=6–48):
  Title: "${width}' × ${depth}' — ${layout || "Kitchen"} Floor Plan" at (320,22) font-size="13" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle" fill="#111111"
  Sub: "Floor Plan  ·  Scale: Approximate" at (320,37) font-size="8" text-anchor="middle" fill="#888888"
  Rule: <line x1="50" y1="48" x2="590" y2="48" stroke="#AAAAAA" stroke-width="0.75"/>

ROOM (start at y=58, 76px margins for dimension space):
  WALLS: <rect> fill="#FFFFFF" stroke="#161616" stroke-width="14" — thick stroke IS the wall
  DOOR: white rect erases one side wall segment; add door line + dashed quarter-circle arc
  WINDOW: white rect erases back wall segment; add 3 parallel lines across gap

BASE CABINETS — flush to inside wall face, 24" deep proportional:
  fill="#D0CABА" stroke="#2A2A2A" stroke-width="1.25"
  Countertop front edge line: stroke="#111" stroke-width="0.75" 2px inset
  Door division lines: stroke="#808080" stroke-width="0.5" every ~36px
  Label "BASE" font-size="7" fill="#333" centered

UPPER CABINETS — 12" deep, DASHED (above cut plane):
  fill="#F5F2EC" stroke="#505050" stroke-width="0.75" stroke-dasharray="5,3"
  Label "UPPER" font-size="7" fill="#505050" centered

FIXTURES on countertops:
  SINK: outer rect + two inner basin rects (fill="white") + drain circles (r="2.5" fill="#888") + "SINK" label
  RANGE: rect + four corner burner circles (r="5") + "RANGE" label
  REF: rect in corner + "REF" label centered

DIMENSIONS (30px outside outer wall face):
  Horizontal below: extension lines + dimension baseline + tick marks + text "${Math.round(parseFloat(width))}'-0\\""
  Vertical left: same rotated + text "${Math.round(parseFloat(depth))}'-0\\""

BOTTOM-RIGHT: italic "${layout || "Kitchen"} Layout" font-size="9" fill="#AAAAAA"

Output: clean, minimal, black walls, white room, warm gray cabinets — professional architect drawing`;

      svg = await callGPT(
        [{ role: "system", content: svgSystem }, { role: "user", content: svgUser }],
        false
      );
      svg = svg.replace(/^```(?:svg|xml)?\n?/i, "").replace(/\n?```$/, "").trim();
      product_selections = [];

      if (!svg.startsWith("<svg")) {
        // Second retry
        svg = await callGPT(
          [
            { role: "system",    content: svgSystem },
            { role: "user",      content: svgUser },
            { role: "assistant", content: svg },
            { role: "user",      content: "Your response did not start with <svg. Return ONLY the raw SVG element, nothing else — no markdown, no explanation." },
          ],
          false
        );
        svg = svg.replace(/^```(?:svg|xml)?\n?/i, "").replace(/\n?```$/, "").trim();
      }
    }

    if (!svg.startsWith("<svg")) {
      return NextResponse.json(
        { error: "AI failed to generate a valid floor plan. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ svg, product_selections });
  } catch (err) {
    console.error("floor-plan route error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
