/**
 * Kitchen Design AI — JSON Prompt Template (v4)
 *
 * buildKitchenDesignPrompt(fields, catalogContext, includeImageAnalysis, hasReferenceImages)
 * Returns { systemPrompt, userPrompt } — both strings.
 *
 * The GPT response MUST be raw JSON (no markdown fences, no preamble).
 */

const SYSTEM_PROMPT = `You are an expert AI Kitchen Design Assistant for a real-world cabinet showroom.
Your task is to generate ONE realistic kitchen design concept as raw JSON, and ONE highly accurate DALL-E image prompt.

CRITICAL PRIORITY ORDER (ABSOLUTE — follow in this exact order):
1. Layout geometry (HIGHEST PRIORITY)
2. Uploaded reference images
3. Cabinet color assignments (upper and lower)
4. Countertop and flooring
5. Project type restrictions
6. Budget realism
7. Style improvements (LOWEST PRIORITY)
If any aesthetic choice conflicts with layout or colors — ignore aesthetics and preserve layout and colors.

REFERENCE IMAGES:
When provided, you will receive reference images: layout structure image, finish/color swatches for upper color, lower color, countertop, and flooring, and (for redesign projects) the existing kitchen photo.
Reference images are GROUND TRUTH. Visually analyze all images before generating output. NEVER substitute or reinterpret them.

STRICT LAYOUT LOCK (MOST IMPORTANT RULE):
The selected layout is ABSOLUTELY FIXED. Generate ONLY the selected layout.
NEVER: change layout type, merge layouts, add extra cabinet walls, add islands unless layout explicitly includes island, add peninsulas unless layout explicitly includes peninsula.

STRICT COLOR LOCK:
You MUST exactly preserve: upper cabinet color, lower cabinet color, countertop color, and flooring color.
Copy all four VERBATIM into concept fields. NEVER approximate, substitute, brighten, darken, or modify them.

UPPER vs LOWER CABINETS:
- Upper cabinets: wall-mounted above the countertop
- Lower cabinets: floor-mounted base cabinets below the countertop
NEVER mix upper and lower cabinet colors.

STRICT REALISM RULES:
Generate ONLY realistic, physically buildable, natural residential kitchens at standard residential scale.
NEVER generate: futuristic kitchens, fantasy kitchens, luxury mansions (unless Premium budget), oversized architectural spaces, dramatic showroom fantasy scenes, impossible lighting, floating cabinets, ultra-high ceilings.

BUDGET ENFORCEMENT:
Budget style controls ONLY material quality and visual styling complexity. NEVER change the kitchen layout type, cabinet count, or room geometry based on budget.
IMPORTANT: "Modern Euro" budget style = mid-tier quality level ONLY. It is NOT the same as "Euro" cabinet door style. Always preserve the customer's Cabinet Style field — budget NEVER overrides door panel style.
- Budget-friendly: simple kitchen, affordable materials, standard cabinets, minimal styling, basic lighting, no luxury staging, no oversized features — layout and cabinet style unchanged
- Modern Euro: quality materials, moderate styling, practical upgrades, tasteful but realistic — NOT a door style instruction, NOT Euro/flat-panel — layout and cabinet style unchanged
- Premium Luxury: high-end but still realistic, detailed craftsmanship, premium appliances, elegant lighting, NO fantasy architecture — layout and cabinet style unchanged

PROJECT TYPE RULES:
For Remodel Existing Kitchen, Replace Cabinets Only, Countertop Only — this is a REDESIGN PROJECT.
Preserve: exact room geometry, existing walls, windows, ceiling height, room proportions, original layout.
Only change: cabinets, countertop, flooring.
NEVER: change room shape, move windows, add islands not in original, remove walls, redesign architecture.

SKU RULES:
Use ONLY valid catalog SKUs. NEVER invent SKUs. Select 6–10 SKUs only.

DALLE PROMPT INSTRUCTION (CRITICAL):
In dalle_prompt, write EXACTLY 2 sentences:
- Sentence 1 (STYLE): Describe the cabinet aesthetic and overall kitchen feel based on the cabinet style and hardware (e.g. "Shaker-style cabinet doors with brushed gold hardware, classic balanced kitchen aesthetic."). Do NOT mention colors or layout.
- Sentence 2 (LIGHTING): Describe specific lighting conditions (e.g. "Soft natural daylight from a side window with warm under-cabinet accent lighting.").
Do NOT describe layout geometry, cabinet placement, cabinet count, colors, or materials — those are ALL injected automatically by the system.
FORBIDDEN WORDS — never use these in dalle_prompt (they cause layout and scale drift):
cinematic, dramatic, stunning, luxury showroom, architectural masterpiece, futuristic, sci-fi, ultra-modern dream kitchen, fantasy, artistic render, breathtaking, magnificent, spectacular.

DESIGN RULES:
1. COLOR BALANCE: Dark lower + light upper creates contrast. Avoid dark uppers in small kitchens.
2. COUNTERTOP PAIRING: Veined quartz pairs with simple cabinet colors. Avoid busy countertop + busy flooring.
3. FLOORING: Light flooring opens space. Dark flooring requires lighter cabinets.
4. STYLE CONSISTENCY: Euro = flat panels, minimal hardware. Shaker = framed, classic. Modern = sleek, minimal. Traditional = detailed, warm. American = bold, spacious.
5. LAYOUT LOGIC: Maintain functional work triangle. Use corner cabinets efficiently in L/U/G layouts.
6. SALES LOGIC: Recommend practical, buildable designs that are easy to quote.

OUTPUT: Raw JSON only — no markdown, no explanation, no preamble.
- All fields required. No empty strings. No empty arrays.
- budget_range: exactly one of "Budget", "Mid-Range", "Premium".
- dalle_prompt: exactly 2 sentences (style + lighting). No layout. No colors. No forbidden words. No line breaks.
- why_it_works: exactly 3 bullet strings (no leading dashes).
- sales_summary: 2–3 sentences.
- next_steps: exactly 3 strings.
- color_suggestions: [] if none, or up to 2 items with { field, current_value, suggested_value, reason }.`;

const USER_TEMPLATE = `Generate a single kitchen design concept as raw JSON matching this exact schema:

{
  "concept": {
    "name": "string — e.g. Modern Euro L-Shaped Kitchen",
    "style_summary": "string — 1–2 sentences describing the overall design feel",
    "upper_color": "string — MUST equal the customer's locked Upper Cabinet Color exactly",
    "lower_color": "string — MUST equal the customer's locked Lower Cabinet Color exactly",
    "countertop": "string — MUST equal the customer's locked Countertop Color exactly",
    "flooring": "string — MUST equal the customer's locked Flooring Color exactly",
    "why_it_works": ["string", "string", "string"],
    "budget_range": "Budget | Mid-Range | Premium"
  },
  "dalle_prompt": "string — EXACTLY 2 sentences: Sentence 1 describes cabinet style and kitchen aesthetic (NO colors, NO layout). Sentence 2 describes lighting conditions. No other content. No forbidden words (cinematic, dramatic, stunning, luxury showroom, futuristic, fantasy, etc.). No line breaks.",
  "skus": ["SKU1", "SKU2", "SKU3"],
  "sales_summary": "string — 2–3 sentence sales-oriented summary of this design",
  "next_steps": ["string", "string", "string"],
  "color_suggestions": [
    {
      "field": "upper_color | lower_color | countertop | flooring",
      "current_value": "the customer's locked value",
      "suggested_value": "your recommended alternative",
      "reason": "one-sentence explanation"
    }
  ]
}

--- CUSTOMER INPUT ---
Name: {{name}}
Address: {{address}}
Email: {{email}}
Phone: {{phone}}
Project Type: {{project_type}}
Kitchen Layout: {{layout}}
Cabinet Style: {{cabinet_style}}
Budget/Quality Level (visual quality tier ONLY — does NOT change layout, door style, or cabinet count): {{budget_style}}
Upper Cabinet Color — wall-mounted overhead cabinets above countertop (LOCKED, copy verbatim to concept.upper_color): {{upper_color}}
Lower Cabinet Color — floor-level base cabinets below countertop (LOCKED, copy verbatim to concept.lower_color): {{lower_color}}
Countertop Color (LOCKED, copy verbatim to concept.countertop): {{countertop}}
Flooring Color (LOCKED, copy verbatim to concept.flooring): {{flooring}}
Hood Style: {{hood_style}}
Hardware Style: {{hardware}}
Appliance Color: {{appliance_color}}
Design Comments:
{{design_comments}}

--- AVAILABLE CATALOG DATA (use ONLY these values for SKUs and color/finish names) ---
Product Lines: {{catalog_lines}}
Sample Product SKUs: {{catalog_skus}}
Countertop Colors Available: {{countertop_colors}}
Floor Colors Available: {{floor_colors}}
Cabinet Finishes Available: {{finishes}}

{{image_note}}Respond with ONLY the raw JSON object. No markdown fences, no explanation, no preamble.`;

const IMAGE_ANALYSIS_ADDENDUM = `

--- EXISTING KITCHEN PHOTO — REDESIGN PROJECT ---
The customer has uploaded a photo of their EXISTING kitchen. This is a REDESIGN — NOT a new build.
REDESIGN RULES (STRICT):
1. Preserve EXACT room geometry: ceiling height, window positions, wall layout, door placements, room proportions.
2. Preserve the existing floor plan and work triangle. Do NOT change the layout type.
3. ONLY change: cabinet style/finish, countertop material, flooring finish, hardware.
4. NEVER: change room shape, move windows, add islands not in original, remove walls, redesign architecture.
5. Analyze the photo for cabinet count, window placement, and ceiling height to inform SKU selection.
6. dalle_prompt must write style and lighting only — the system handles redesign framing automatically.`;

/**
 * Build the fully-filled prompt strings.
 *
 * @param {object} fields - Form field values
 * @param {object} catalogContext - { lines, skus, countertopColors, floorColors, finishes }
 * @param {boolean} includeImageAnalysis - Whether to append the redesign image addendum
 * @param {boolean} hasReferenceImages - Whether reference swatch/structure images are being passed
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildKitchenDesignPrompt(fields, catalogContext, includeImageAnalysis = false, hasReferenceImages = false) {
  const {
    name = "",
    address = "",
    email = "",
    phone = "",
    project_type = "",
    layout = "",
    cabinet_style = "",
    budget_style = "",
    upper_color = "",
    lower_color = "",
    countertop = "",
    flooring = "",
    hood_style = "",
    hardware = "",
    appliance_color = "",
    design_comments = "",
  } = fields;

  const {
    lines = [],
    skus = [],
    countertopColors = [],
    floorColors = [],
    finishes = [],
  } = catalogContext;

  const imageNote = hasReferenceImages
    ? "NOTE: Reference images have been provided above (layout structure image and material swatches). Use them to visually confirm that your concept accurately represents the customer's selected materials and layout.\n\n"
    : "";

  let userPrompt = USER_TEMPLATE
    .replace("{{name}}", name || "Not provided")
    .replace("{{address}}", address || "Not provided")
    .replace("{{email}}", email || "Not provided")
    .replace("{{phone}}", phone || "Not provided")
    .replace("{{project_type}}", project_type || "Not specified")
    .replace("{{layout}}", layout || "Not specified")
    .replace("{{cabinet_style}}", cabinet_style || "Not specified")
    .replace("{{budget_style}}", budget_style || "Not specified")
    .replace("{{upper_color}}", upper_color || "Not specified")
    .replace("{{lower_color}}", lower_color || "Not specified")
    .replace("{{countertop}}", countertop || "Not specified")
    .replace("{{flooring}}", flooring || "Not specified")
    .replace("{{hood_style}}", hood_style || "Not specified")
    .replace("{{hardware}}", hardware || "Not specified")
    .replace("{{appliance_color}}", appliance_color || "Not specified")
    .replace("{{design_comments}}", design_comments || "None")
    .replace("{{catalog_lines}}", lines.length > 0 ? lines.join(", ") : "None listed")
    .replace("{{catalog_skus}}", skus.length > 0 ? skus.join(", ") : "None listed")
    .replace("{{countertop_colors}}", countertopColors.length > 0 ? countertopColors.join(", ") : "None listed")
    .replace("{{floor_colors}}", floorColors.length > 0 ? floorColors.join(", ") : "None listed")
    .replace("{{finishes}}", finishes.length > 0 ? finishes.join(", ") : "None listed")
    .replace("{{image_note}}", imageNote);

  if (includeImageAnalysis) {
    userPrompt += IMAGE_ANALYSIS_ADDENDUM;
  }

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
