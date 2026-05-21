/**
 * AI prompt generator for the Kitchen Planner.
 * Builds a descriptive photorealistic image prompt from planner state.
 */

const LAYOUT_DESCRIPTIONS = {
  Straight:  "straight single-wall",
  "L-Shape": "L-shaped",
  "U-Shape": "U-shaped",
  Parallel:  "galley (parallel two-wall)",
  Island:    "open-plan with a kitchen island",
};

const CATEGORY_LABELS = {
  "Base Cabinets":  "base cabinets",
  "Wall Cabinets":  "wall-mounted upper cabinets",
  "Tall Units":     "tall pantry units",
  Appliances:       "appliances",
};

/**
 * Build a descriptive AI prompt from planner state.
 *
 * @param {object} params
 * @param {string}   params.layout         - selected layout name
 * @param {number}   params.roomWidth      - room width in feet
 * @param {number}   params.roomLength     - room length in feet
 * @param {number}   [params.ceilingHeight] - ceiling height in feet
 * @param {Array}    params.items          - placed items array from store
 * @returns {string} - the final image generation prompt
 */
export function buildPlannerPrompt({ layout, roomWidth, roomLength, ceilingHeight, items = [] }) {
  const layoutDesc = LAYOUT_DESCRIPTIONS[layout] || layout || "open-plan";

  // Count items by category
  const counts = {};
  for (const item of items) {
    const cat = item.category || "Cabinets";
    counts[cat] = (counts[cat] || 0) + 1;
  }

  // Build cabinet description list
  const cabinetParts = [];
  for (const [cat, count] of Object.entries(counts)) {
    const label = CATEGORY_LABELS[cat] || cat.toLowerCase();
    cabinetParts.push(`${count} ${label}`);
  }

  const roomDesc = `${roomWidth} ft by ${roomLength} ft room`;
  const heightDesc = ceilingHeight ? `, ${ceilingHeight} ft ceiling height` : "";
  const cabinetDesc = cabinetParts.length > 0
    ? `featuring ${cabinetParts.join(", ")}`
    : "featuring custom cabinetry";

  const prompt = [
    `Modern ${layoutDesc} kitchen inside a ${roomDesc}${heightDesc}.`,
    `${cabinetDesc} arranged along the walls.`,
    "Photorealistic residential kitchen visualization.",
    "Contemporary interior design.",
    "Warm ambient lighting, soft natural light from windows.",
    "White quartz countertops, stainless steel appliances.",
    "Clean and polished finish, high quality architectural render.",
    "Professional interior photography style.",
  ].join(" ");

  return prompt;
}
