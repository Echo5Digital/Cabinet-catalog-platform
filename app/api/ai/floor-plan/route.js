import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { getAIConfig } from "@/lib/ai/config";

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

    const { width, depth, height, styleNotes, cabinet_style } = body;

    if (!width || !depth || !height) {
      return NextResponse.json({ error: "width, depth, and height are required" }, { status: 400 });
    }

    const { apiKey } = await getAIConfig(ctx.tenantId);
    if (!apiKey) {
      return NextResponse.json({ error: "AI is not configured for this account." }, { status: 503 });
    }

    // ── Fetch catalog products (same pattern as kitchen-design route) ──────────
    const admin = createAdminClient();
    const [linesRes, productsRes] = await Promise.all([
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
    ]);

    // Filter by cabinet style if provided
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

    // Build catalog context: "SKU: name (W"×H"×D")"
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

    const hasIsland      = parseFloat(width) * parseFloat(depth) > 150;
    const backWallInches = Math.round(parseFloat(width) * 12 - 12);
    const sideWallInches = Math.round(parseFloat(depth) * 12 - 12);

    const client = new OpenAI({ apiKey });

    // ── Helper: shared GPT caller ─────────────────────────────────────────────
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
    const jsonSystem = `You are a professional kitchen cabinet planner and floor plan generator.
Return ONLY raw JSON — no markdown fences, no explanation, no extra text.
The JSON must exactly match the schema provided.`;

    const jsonUser = `Room: ${width}ft wide × ${depth}ft deep × ${height}ft ceiling height.${
      styleNotes ? ` Style notes: ${styleNotes}.` : ""
    }${cabinet_style ? ` Cabinet style: ${cabinet_style}.` : ""}

${
  hasCatalog
    ? `AVAILABLE CABINET PRODUCTS — select ONLY from this list:
${catalogLines.join("\n")}

Room wall analysis:
- Back wall usable length: approx ${backWallInches} inches (after corner/door clearance)
- Side wall usable lengths: approx ${sideWallInches} inches each${
      hasIsland ? "\n- Room area exceeds 150 sq ft — include a center island" : ""
    }

INSTRUCTIONS:
1. For each wall, sum product widths to fill the available run — prefer combinations that minimise gaps
2. Select base cabinets (lower) AND wall cabinets (upper) for every wall that has runs
3. In floor_plan_svg: label each cabinet block with its SKU in small text (font-size="9")
4. In product_selections: include every SKU selected, with qty, wall, and placement`
    : `INSTRUCTIONS:
1. Generate a generic floor plan with unlabelled cabinet blocks
2. Return product_selections as an empty array`
}

SVG requirements:
- viewBox="0 0 500 400" width="500" height="400"
- Draw room as a proportional rectangle (40px margin all sides)
- Label each wall dimension along that wall
- Upper cabinets: narrow rectangles along top wall
- Lower cabinets: narrow rectangles along bottom and side walls${
      hasIsland ? '\n- Center island: rounded rectangle labelled "Island"' : ""
    }
- Door opening: arc indicator on one wall
- 1–2 window openings: small gaps with parallel lines
- Colours: stroke="#334155" fill="#f8fafc" room, fill="#e2e8f0" cabinets, fill="#f1f5f9" island, text fill="#64748b" font-size="12" font-family="sans-serif"

Return exactly this JSON schema:
{
  "floor_plan_svg": "<svg viewBox='0 0 500 400' ...>...</svg>",
  "product_selections": [
    { "sku": "B36", "product_name": "36\\" Base Cabinet", "qty": 2, "wall": "back", "placement": "sink zone base" }
  ]
}`;

    let svg              = "";
    let product_selections = [];

    try {
      const raw    = await callGPT(
        [{ role: "system", content: jsonSystem }, { role: "user", content: jsonUser }],
        true
      );
      const parsed = JSON.parse(raw);
      svg = ((parsed.floor_plan_svg || ""))
        .replace(/^```(?:svg|xml)?\n?/i, "")
        .replace(/\n?```$/, "")
        .trim();
      product_selections = Array.isArray(parsed.product_selections)
        ? parsed.product_selections
        : [];

      // Server-side SKU validation: strip any SKUs not in the catalog
      if (hasCatalog) {
        const validSkus = new Set(styleProducts.map((p) => p.sku));
        product_selections = product_selections.filter((s) => s.sku && validSkus.has(s.sku));
      }
    } catch {
      // JSON parse failed — fall through to SVG-only fallback below
      svg              = "";
      product_selections = [];
    }

    // ── Fallback path: SVG-only prompt (existing logic preserved) ─────────────
    if (!svg.startsWith("<svg")) {
      const svgSystem = `You are a floor plan SVG generator. Return ONLY a valid SVG element — no markdown, no code fences, no explanations, no extra text. The response must start with <svg and end with </svg>.`;
      const svgUser   = `Generate a top-down kitchen floor plan SVG for a room that is ${width} ft wide × ${depth} ft deep × ${height} ft ceiling height.${
        styleNotes ? ` Style notes: ${styleNotes}.` : ""
      }

Requirements:
- SVG viewBox="0 0 500 400" width="500" height="400"
- Draw the room as a proportional rectangle (leave 40px margin on all sides)
- Label each wall dimension (e.g., "${width} ft" along the top, "${depth} ft" along the right)
- Draw upper cabinets as narrow rectangles along the top wall
- Draw lower cabinets as narrow rectangles along the bottom wall and side walls
- Draw a door opening on one wall (arc indicator)
- Draw 1–2 window openings on walls (small gap with parallel lines)${
        hasIsland ? "\n- Draw a center island as a rounded rectangle in the middle of the room" : ""
      }
- Style: stroke="#334155", fill="#f8fafc" for room background, fill="#e2e8f0" for cabinet blocks, fill="#f1f5f9" for island, text fill="#64748b" font-size="12" font-family="sans-serif"
- Keep it clean and professional`;

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
