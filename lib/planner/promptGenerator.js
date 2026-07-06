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
  "G-Shape": "G-shaped with a peninsula counter",
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
 * @param {string}   params.layout              - selected layout name
 * @param {number}   params.roomWidth           - room width in feet
 * @param {number}   params.roomLength          - room length in feet
 * @param {number}   [params.ceilingHeight]     - ceiling height in feet
 * @param {Array}    params.items               - placed items array from store
 * @param {object}   [params.upperCabinetColor] - { name, finishFamily } | null
 * @param {object}   [params.lowerCabinetColor] - { name, finishFamily } | null
 * @returns {string} - the final image generation prompt
 */
export function buildPlannerPrompt({
  layout,
  roomWidth,
  roomLength,
  ceilingHeight,
  items = [],
  upperCabinetColor = null,
  lowerCabinetColor = null,
}) {
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

  // For peninsula/island layouts, placement description differs from wall-only layouts
  const isIslandLayout   = layout === "Island";
  const isPeninsulaLayout = layout === "G-Shape";
  let placementDesc;
  if (isPeninsulaLayout) {
    placementDesc = `${cabinetDesc} arranged along the perimeter walls and along the peninsula.`;
  } else if (isIslandLayout) {
    placementDesc = `${cabinetDesc} arranged along the walls and around the central island.`;
  } else {
    placementDesc = `${cabinetDesc} arranged along the walls.`;
  }

  // Build cabinet color description from user selections
  let cabinetColorDesc = "White quartz countertops, stainless steel appliances.";
  if (upperCabinetColor || lowerCabinetColor) {
    const upperName = upperCabinetColor?.name;
    const lowerName = lowerCabinetColor?.name;
    const parts = [];
    if (upperName && lowerName && upperName !== lowerName) {
      parts.push(`${upperName} upper cabinets and ${lowerName} lower cabinets`);
    } else if (lowerName) {
      parts.push(`${lowerName} cabinets`);
    } else if (upperName) {
      parts.push(`${upperName} cabinets`);
    }
    if (parts.length > 0) {
      cabinetColorDesc = `${parts.join(", ")}. White quartz countertops, stainless steel appliances.`;
    }
  }

  // G-Shape specific layout detail for better AI rendering accuracy
  const layoutDetailDesc = isPeninsulaLayout
    ? "Kitchen has three perimeter walls with full cabinetry and a peninsula extending from one wall creating a partial fourth wall, with seating on the open side."
    : "";

  const prompt = [
    `Modern ${layoutDesc} kitchen inside a ${roomDesc}${heightDesc}.`,
    placementDesc,
    layoutDetailDesc,
    cabinetColorDesc,
    "Photorealistic residential kitchen visualization.",
    "Contemporary interior design.",
    "Warm ambient lighting, soft natural light from windows.",
    "Clean and polished finish, high quality architectural render.",
    "Professional interior photography style.",
  ].filter(Boolean).join(" ");

  return prompt;
}
