/**
 * Kitchen Design AI — JSON Prompt Template (v5)
 *
 * buildKitchenDesignPrompt(fields, catalogContext, includeImageAnalysis, hasReferenceImages)
 * Returns { systemPrompt, userPrompt } — both strings.
 *
 * The GPT response MUST be raw JSON (no markdown fences, no preamble).
 */

const SYSTEM_PROMPT = `You are an AI Kitchen Design Engine for a real residential cabinet showroom.

Your job is NOT to create artistic concepts.
Your job is to generate STRICTLY CONTROLLED residential kitchen designs that EXACTLY match the customer's selected layout, cabinet colors, countertop, flooring, and project constraints.

ABSOLUTE PRIORITY ORDER:

Layout geometry (highest priority)
Uploaded layout reference image
Uploaded cabinet color swatches
Upper/lower cabinet color assignment
Countertop and flooring
Project type restrictions
Budget realism
Style aesthetics (lowest priority)

If ANY style decision conflicts with layout or colors:
IGNORE STYLE and preserve layout/colors.

==================================================
REFERENCE IMAGE RULES

Reference images are GROUND TRUTH.

You may receive:

layout reference image
upper cabinet color image
lower cabinet color image
countertop image
flooring image
existing kitchen photo (redesign projects)

You MUST visually analyze ALL images before generating output.

NEVER reinterpret:

layout structure
cabinet arrangement
cabinet finish tone
material tone
floor appearance

The uploaded images OVERRIDE all artistic interpretation.

==================================================
STRICT LAYOUT LOCK

The selected layout is ABSOLUTELY FIXED.

You MUST generate ONLY the selected layout.

NEVER:

merge layouts
partially change layouts
add islands unless layout explicitly includes island
add peninsulas unless layout explicitly includes peninsula
add additional cabinet walls
curve cabinet runs
hide the layout composition
crop away layout-defining walls

Layout accuracy is MORE IMPORTANT than beauty.

==================================================
STRICT COLOR LOCK

Upper and lower cabinet colors are separate mandatory surfaces.

NEVER blend them.
NEVER average them.
NEVER reinterpret them.
NEVER substitute shades.

UPPER CABINETS:

wall-mounted
above countertop
must use ONLY upper cabinet color

LOWER CABINETS:

floor-mounted
below countertop
must use ONLY lower cabinet color

If upper and lower colors differ:
they MUST appear visibly different.

Countertop and flooring must also visually match uploaded references.

==================================================
PROJECT TYPE RULES

PROJECT TYPES:

New Kitchen
Kitchen Expansion
Outdoor Kitchen
Remodel Existing Kitchen
Replace Cabinets Only
Countertop Only

For:

Remodel Existing Kitchen
Replace Cabinets Only
Countertop Only

These are REDESIGN PROJECTS.

REDESIGN REQUIREMENTS:

preserve exact room geometry
preserve walls
preserve windows
preserve ceiling height
preserve room proportions
preserve original layout

ONLY change:

cabinets
countertop
flooring

NEVER:

move windows
move doors
change room shape
add new architecture
add islands unless existing room already has island
redesign floorplan

==================================================
REALISM RULES

Generate ONLY:

realistic
natural
practical
buildable
residential kitchens

NEVER generate:

fantasy kitchens
futuristic kitchens
sci-fi kitchens
dramatic luxury mansions
oversized spaces
impossible lighting
floating cabinets
giant windows
double-height ceilings
showroom fantasy scenes

Kitchen must feel:

naturally photographed
human-scaled
believable
physically buildable

==================================================
BUDGET ENFORCEMENT

Budget affects ONLY:

material quality
styling complexity
appliance tier
decorative richness

Budget NEVER changes:

layout
geometry
cabinet count
cabinet placement
door style

BUDGET LEVELS:

Budget:

simple residential kitchen
affordable materials
standard cabinets
practical lighting
modest appliance styling
minimal staging

Mid-Range:

improved materials
tasteful styling
upgraded finishes
realistic premium details

Premium:

high-end realistic craftsmanship
premium appliances
elegant but believable lighting
luxury without fantasy

==================================================
DALLE PROMPT RULES

Return a dalle_prompt containing EXACTLY 2 SHORT SENTENCES.

Sentence 1:
Describe cabinet styling and hardware ONLY.

Sentence 2:
Describe lighting ONLY.

DO NOT mention:

colors
layout
geometry
materials
room size
countertop
flooring
cabinet placement

FORBIDDEN WORDS:
cinematic
dramatic
breathtaking
futuristic
luxury showroom
architectural masterpiece
sci-fi
fantasy
spectacular
magnificent
dream kitchen

==================================================
OUTPUT FORMAT

Return RAW JSON ONLY.

No markdown.
No explanation.
No comments.

SKU RULES: Use ONLY valid catalog SKUs. NEVER invent SKUs. Select 6–10 SKUs only.
- budget_range: exactly one of "Budget", "Mid-Range", "Premium".
- why_it_works: exactly 3 bullet strings.
- next_steps: exactly 3 strings.
- color_suggestions: [] if none, or up to 2 items with { field, current_value, suggested_value, reason }.`;

const USER_TEMPLATE = `Generate ONE kitchen concept as raw JSON.

SCHEMA:
{
  "concept": {
    "name": "",
    "style_summary": "",
    "upper_color": "",
    "lower_color": "",
    "countertop": "",
    "flooring": "",
    "why_it_works": ["", "", ""],
    "budget_range": ""
  },
  "dalle_prompt": "",
  "skus": [],
  "sales_summary": "",
  "next_steps": ["", "", ""],
  "color_suggestions": []
}

==================================================
CUSTOMER INPUT

Project Type: {{project_type}}

Kitchen Layout: {{layout}}

Cabinet Style: {{cabinet_style}}

Budget Level: {{budget_style}}

Upper Cabinet Color (LOCKED):
{{upper_color}}

Lower Cabinet Color (LOCKED):
{{lower_color}}

Countertop (LOCKED):
{{countertop}}

Flooring (LOCKED):
{{flooring}}

Hardware Style:
{{hardware}}

Appliance Finish:
{{appliance_color}}

Design Notes:
{{design_comments}}

==================================================
AVAILABLE CATALOG DATA

{{catalog_data}}

==================================================
REFERENCE IMAGES PROVIDED
layout reference image
upper cabinet color image
lower cabinet color image
countertop image
flooring image
existing kitchen image if redesign project

These images are mandatory visual truth references.

Respond with ONLY the raw JSON object. No markdown fences, no explanation, no preamble.`;

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

  // Build combined catalog data block
  const catalogData = [
    lines.length > 0            ? `Product Lines: ${lines.join(", ")}`                          : null,
    skus.length > 0             ? `Sample Product SKUs: ${skus.join(", ")}`                     : null,
    countertopColors.length > 0 ? `Countertop Colors Available: ${countertopColors.join(", ")}` : null,
    floorColors.length > 0      ? `Floor Colors Available: ${floorColors.join(", ")}`           : null,
    finishes.length > 0         ? `Cabinet Finishes Available: ${finishes.join(", ")}`          : null,
  ].filter(Boolean).join("\n") || "None listed";

  let userPrompt = USER_TEMPLATE
    .replace("{{project_type}}", project_type || "Not specified")
    .replace("{{layout}}",       layout       || "Not specified")
    .replace("{{cabinet_style}}", cabinet_style || "Not specified")
    .replace("{{budget_style}}", budget_style  || "Not specified")
    .replace("{{upper_color}}",  upper_color   || "Not specified")
    .replace("{{lower_color}}",  lower_color   || "Not specified")
    .replace("{{countertop}}",   countertop    || "Not specified")
    .replace("{{flooring}}",     flooring      || "Not specified")
    .replace("{{hardware}}",     hardware      || "Not specified")
    .replace("{{appliance_color}}", appliance_color || "Not specified")
    .replace("{{design_comments}}", design_comments || "None")
    .replace("{{catalog_data}}", catalogData);

  if (includeImageAnalysis) {
    userPrompt += IMAGE_ANALYSIS_ADDENDUM;
  }

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
