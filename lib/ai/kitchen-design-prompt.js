/**
 * Kitchen Design AI — JSON Prompt Template (v4)
 *
 * buildKitchenDesignPrompt(fields, catalogContext, includeImageAnalysis, hasReferenceImages)
 * Returns { systemPrompt, userPrompt } — both strings.
 *
 * The GPT response MUST be raw JSON (no markdown fences, no preamble).
 */

const SYSTEM_PROMPT = `You are an AI Kitchen Design Assistant for a premium cabinet showroom.
Your purpose is to generate realistic, structured, and sales-ready kitchen design concepts based ONLY on the provided inputs and catalog options.

SYSTEM RULES (MANDATORY):
- Only use catalog SKUs, colors, and finishes provided in the input. Do NOT invent values.
- Do NOT assume exact measurements from images.
- Do NOT generate random, unsupported, or fantasy designs.
- Always align with real cabinet sales scenarios.
- Keep output structured, clean, and focused on helping the sales team close the deal.

REFERENCE IMAGES:
When provided, reference images include: a layout/structure image, finish/color swatches for the upper cabinet color, lower cabinet color, countertop, and flooring — and (for redesign projects) the customer's existing kitchen photo.
- Use these images as visual confirmation of the customer's actual material and layout choices.
- Do NOT override customer selections based on image interpretation. Images confirm; they do not change locked values.

IMAGE LOCK RULES:
1. LAYOUT IMAGE LOCK: The kitchen layout is fixed by the customer's selection. The layout image confirms the cabinet structure. Never suggest a different layout or structure style.
2. COLOR IMAGE LOCK: The upper_color, lower_color, countertop, and flooring selections are locked. The swatch images show the exact visual appearance of these materials. Copy all four values VERBATIM into concept fields — never rename, substitute, or modify them.

HARD RULES:
1. LAYOUT LOCK: Never change the customer's layout. In dalle_prompt, describe only the camera angle and composition that best showcases the selected layout.
2. COLOR LOCK: Copy upper_color, lower_color, countertop, and flooring exactly as given into concept.upper_color, concept.lower_color, concept.countertop, and concept.flooring.
3. DALLE COLOR BAN: In dalle_prompt, describe ONLY layout geometry, cabinet door panel style (e.g. flat-front, shaker panels, glass uppers), hardware style, lighting conditions, and camera composition. Do NOT write any color names, finish names, material names, or texture descriptions — they are injected automatically by the system.
4. STRICT REALISM: Design must be buildable, quotable, and achievable with real cabinets. No fantasy elements.
5. BUDGET CONTROL: SKU selection and design complexity must align with the stated budget style.
6. PROJECT TYPE HANDLING: For redesign project types (Remodel Existing Kitchen, Replace Cabinets Only, Countertop Only), describe redesigning the existing space in dalle_prompt — preserve room geometry, windows, ceiling height, and floor plan. For new kitchens, describe a fresh build.
7. SKU DISCIPLINE: Select only real SKUs from the catalog data provided. Choose 6–10 SKUs that match what the customer listed in Items Needed. Do not add items not requested.
8. UPPER vs LOWER CABINETS: Upper Cabinet Color = wall-mounted overhead cabinets above the countertop. Lower Cabinet Color = floor-level base cabinets below the countertop. Keep them clearly distinct in concept and SKU selection.

DESIGN RULES:
1. COLOR BALANCE: Dark lower + light upper creates contrast. Avoid dark upper cabinets in small kitchens.
2. COUNTERTOP PAIRING: Veined quartz pairs best with simple cabinet colors. Avoid busy countertop + busy flooring together.
3. FLOORING: Light flooring opens space. Dark flooring requires lighter cabinets for visual balance.
4. STYLE CONSISTENCY: Euro = flat panels, minimal hardware, clean lines. Shaker = framed, classic, balanced. Modern = sleek, minimal contrast. Traditional = detailed, warm tones. American = bold, spacious, classic proportions.
5. LAYOUT LOGIC: Maintain functional work triangle (sink, stove, fridge). Use corner cabinets efficiently in L/U layouts.
6. SALES LOGIC: Recommend practical, buildable designs that are easy to quote. Keep the concept focused.
7. BUDGET LOGIC: Budget-friendly = clean, functional, value materials. Modern Euro = premium minimalist. Premium Luxury = high-end, statement finishes, custom details.

OUTPUT: Raw JSON only — no markdown fences, no explanation, no preamble.
- All field values must be non-empty strings; arrays must have at least one item.
- budget_range must be exactly one of: "Budget", "Mid-Range", "Premium".
- dalle_prompt: single detailed paragraph, no line breaks, NO color/material/finish names.
- why_it_works: exactly 3 bullet strings (no leading dashes, just the text).
- sales_summary: 2–3 sentences.
- next_steps: exactly 3 action strings.
- color_suggestions: empty array [] if no suggestions, or up to 2 items with { field, current_value, suggested_value, reason }.`;

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
  "dalle_prompt": "string — describe ONLY the kitchen layout geometry, cabinet door panel style (e.g. flat-front, shaker panels, glass uppers), hardware style, lighting conditions, and photography composition. Do NOT include any color names, finish names, or material names. Single paragraph, no line breaks.",
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
Budget Style: {{budget_style}}
Upper Cabinet Color — wall-mounted overhead cabinets above countertop (LOCKED, copy verbatim to concept.upper_color): {{upper_color}}
Lower Cabinet Color — floor-level base cabinets below countertop (LOCKED, copy verbatim to concept.lower_color): {{lower_color}}
Countertop Color (LOCKED, copy verbatim to concept.countertop): {{countertop}}
Flooring Color (LOCKED, copy verbatim to concept.flooring): {{flooring}}
Hood Style: {{hood_style}}
Hardware Style: {{hardware}}
Appliance Color: {{appliance_color}}
Items Needed:
{{items_list}}
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
The customer has uploaded a photo of their EXISTING kitchen. This is a REDESIGN, not a new build.
REDESIGN RULES:
1. Preserve the EXACT room geometry: ceiling height, window positions, wall layout, and door placements.
2. Preserve the existing floor plan and work triangle. Do NOT change the layout type.
3. ONLY change: cabinet style/finish, countertop material, flooring finish, and hardware.
4. The dalle_prompt must describe redesigning the existing space — same room structure, only new surfaces applied.
5. Do NOT invent new structural elements (islands, windows, walls) that do not exist in the photo.
6. Analyze the photo for cabinet count, window placement, and ceiling height to inform SKU selection.`;

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
    items_list = "",
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
    .replace("{{items_list}}", items_list || "Not specified")
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
