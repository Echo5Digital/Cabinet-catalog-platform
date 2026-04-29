/**
 * Kitchen Design AI — JSON Prompt Template (v3)
 *
 * buildKitchenDesignPrompt(fields, catalogContext, includeImageAnalysis)
 * Returns { systemPrompt, userPrompt } — both strings.
 *
 * The GPT response MUST be raw JSON (no markdown fences, no preamble).
 */

const SYSTEM_PROMPT = `You are an expert AI Kitchen Design Assistant for a cabinet showroom.
You receive customer design preferences and a product catalog. You output ONE kitchen design concept as raw JSON — no markdown, no explanation, no extra text.

STRICT RULES:
- Only use SKUs from the catalog data provided. Do NOT invent SKUs.
- Select 6–10 representative SKUs that would realistically furnish the requested layout.
- All field values must be non-empty strings; arrays must have at least one item.
- budget_range must be exactly one of: "Budget", "Mid-Range", "Premium".
- dalle_prompt must be a single detailed paragraph (no line breaks) suitable for DALL-E 3 image generation. Make it photorealistic, architectural photography style, high-end showroom quality.
- why_it_works must be exactly 3 bullet strings (no leading dashes, just the text).
- sales_summary must be 2–3 sentences.
- next_steps must be exactly 3 action strings.
- The design MUST be based primarily on the selected cabinet style, colors, countertop, flooring, and items needed.
- Only recommend SKUs that match the items the customer listed in Items Needed.

DESIGN RULES:
1. COLOR BALANCE: Dark lower + light upper creates contrast. Avoid dark uppers in small kitchens.
2. COUNTERTOP PAIRING: Veined quartz pairs with simple cabinet colors. Avoid busy countertop + busy flooring together.
3. FLOORING: Light flooring opens space. Dark flooring requires lighter cabinets.
4. STYLE CONSISTENCY: Euro = flat panels, minimal hardware. Shaker = framed classic. Modern = sleek, low contrast. Traditional = detailed, warm tones. American = bold, spacious, classic proportions.
5. LAYOUT LOGIC: Maintain functional work triangle. Use corner cabinets efficiently in L/U layouts.
6. SKU SELECTION: Select only real SKUs from the catalog data. Choose cabinets that exactly match what is listed in items_list. Do not include items not requested.
7. BUDGET STYLE: Budget-friendly = value materials, clean look. Modern Euro = premium minimalist. Premium Luxury = high-end custom details, statement finishes.`;

const USER_TEMPLATE = `Generate a single kitchen design concept as raw JSON matching this exact schema:

{
  "concept": {
    "name": "string — e.g. Modern Euro L-Shaped Kitchen",
    "style_summary": "string — 1–2 sentences describing the overall design feel",
    "upper_color": "string — finish name from catalog finishes list",
    "lower_color": "string — finish name from catalog finishes list",
    "countertop": "string — countertop color name from catalog",
    "flooring": "string — floor color name from catalog",
    "why_it_works": ["string", "string", "string"],
    "budget_range": "Budget | Mid-Range | Premium"
  },
  "dalle_prompt": "string — detailed photorealistic DALL-E 3 render prompt, single paragraph, no line breaks",
  "skus": ["SKU1", "SKU2", "SKU3"],
  "sales_summary": "string — 2–3 sentence sales-oriented summary of this design",
  "next_steps": ["string", "string", "string"]
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
Upper Cabinet Color Preference: {{upper_color}}
Lower Cabinet Color Preference: {{lower_color}}
Countertop Preference: {{countertop}}
Flooring Preference: {{flooring}}
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

Respond with ONLY the raw JSON object. No markdown fences, no explanation, no preamble.`;

const IMAGE_ANALYSIS_ADDENDUM = `

--- EXISTING KITCHEN PHOTO PROVIDED — THIS IS A REDESIGN ---
The customer has uploaded a photo of their EXISTING kitchen. This is a REDESIGN, NOT a new build from scratch.

REDESIGN RULES (strictly enforced):
1. Preserve the EXACT room geometry: ceiling height, window positions, wall layout, door placements, and overall room shape.
2. Preserve the existing floor plan and work triangle — do NOT change the layout type (e.g. if it is L-shaped, keep it L-shaped).
3. ONLY change: cabinet style/finish, countertop material, flooring finish, hardware style.
4. The dalle_prompt MUST start with: "Photo-realistic kitchen redesign. Same room geometry, window placement, and floor plan as the existing kitchen. Only new cabinetry, countertop, and flooring applied."
5. Do NOT invent new structural elements (islands, windows, walls) that do not exist in the photo.
6. Analyze the photo for: cabinet count, window light, ceiling height, and existing constraints — use these to select appropriate SKUs.`;

/**
 * Build the fully-filled prompt strings.
 *
 * @param {object} fields - Form field values
 * @param {object} catalogContext - { lines, skus, countertopColors, floorColors, finishes }
 * @param {boolean} includeImageAnalysis - Whether to append the image analysis addendum
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildKitchenDesignPrompt(fields, catalogContext, includeImageAnalysis = false) {
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
    .replace("{{finishes}}", finishes.length > 0 ? finishes.join(", ") : "None listed");

  if (includeImageAnalysis) {
    userPrompt += IMAGE_ANALYSIS_ADDENDUM;
  }

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
