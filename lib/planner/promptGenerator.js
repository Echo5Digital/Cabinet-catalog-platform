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
 * Derives which wall an item sits against based on its x/y position and
 * room dimensions. Items are in selectProjectedItems format:
 * { x (EW feet), y (NS feet), widthFt, depthFt }.
 *
 * Returns "north wall" | "east wall" | "south wall" | "west wall" | null.
 * null means the item is floating (island/peninsula — not touching any wall).
 */
function wallOf(item, roomWidth, roomLength) {
  const T = 0.8; // proximity threshold in feet
  const x = item.x ?? 0;
  const y = item.y ?? 0;
  const w = item.widthFt ?? 2;
  const d = item.depthFt ?? 2;
  if (y <= T)                  return "north wall";
  if (x <= T)                  return "west wall";
  if (x + w >= roomWidth  - T) return "east wall";
  if (y + d >= roomLength - T) return "south wall";
  return null;
}

/**
 * Builds a sentence describing which walls have base/tall/wall cabinets after
 * manual edits — e.g. "Base cabinets and upper cabinets on the north and west walls,
 * tall pantry units on the east wall."
 *
 * This ensures the AI prompt reflects the actual post-edit layout, not just the
 * original layout type name.
 */
function getCabinetWallDesc(items, roomWidth, roomLength) {
  // Collect which walls each category touches
  const wallsByCategory = {};

  for (const item of items) {
    const cat = item.category;
    if (!cat || cat === "Sink" || cat === "Range") continue; // fixtures handled separately
    const wall = wallOf(item, roomWidth, roomLength);
    if (!wall) continue; // floating/island item — skip
    if (!wallsByCategory[cat]) wallsByCategory[cat] = new Set();
    wallsByCategory[cat].add(wall);
  }

  if (Object.keys(wallsByCategory).length === 0) return null;

  // Build readable descriptions grouped by category
  const ORDER = ["Base Cabinets", "Tall Units", "Wall Cabinets", "Appliances"];
  const LABELS = {
    "Base Cabinets": "base cabinets",
    "Wall Cabinets": "upper wall cabinets",
    "Tall Units":    "tall pantry units",
    "Appliances":    "appliances",
  };

  const parts = [];
  for (const cat of ORDER) {
    if (!wallsByCategory[cat]) continue;
    const walls = [...wallsByCategory[cat]];
    const label = LABELS[cat] || cat.toLowerCase();
    // Format wall list: "north and west walls" / "north, west and east walls"
    let wallStr;
    if (walls.length === 1) {
      wallStr = walls[0];
    } else if (walls.length === 2) {
      wallStr = `${walls[0]} and ${walls[1]}`;
    } else {
      wallStr = `${walls.slice(0, -1).join(", ")} and ${walls[walls.length - 1]}`;
    }
    parts.push(`${label} along the ${wallStr}`);
  }

  return parts.length > 0 ? parts.join("; ") : null;
}

/**
 * Derives which wall a fixture (sink/range) sits against based on its
 * x/y position and room dimensions. Items are in selectProjectedItems format:
 * { x (EW feet), y (NS feet), widthFt, depthFt, category }.
 *
 * Returns a sentence like "Kitchen sink on the north wall, range/cooktop on the west wall"
 * so the AI model places appliances on the correct walls to match the 3D scene.
 */
function getFixturePlacementDesc(items, roomWidth, roomLength) {
  const sink  = items.find((i) => i.category === "Sink");
  const range = items.find((i) => i.category === "Range");

  const parts = [];
  if (sink) {
    const wall = wallOf(sink, roomWidth, roomLength);
    parts.push(wall ? `kitchen sink on the ${wall}` : "kitchen sink on the peninsula");
  }
  if (range) {
    const wall = wallOf(range, roomWidth, roomLength);
    parts.push(wall ? `range/cooktop on the ${wall}` : "range/cooktop on the peninsula");
  }

  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Per-layout structural constraints for the AI image generator.
 * Each entry enforces the exact cabinet geometry, camera angle, sink/range
 * placement with hood, and a negative constraint preventing wrong shapes.
 *
 * Derived from the AI kitchen designer's LAYOUT_VISUAL + LAYOUT_WORKFLOW
 * constants so both tools generate consistent kitchen shapes.
 */
const LAYOUT_STRUCTURE = {
  Straight: [
    "LAYOUT: All cabinets, sink, and range in one straight continuous line on the back wall only. No cabinetry on any other wall. No island. No peninsula.",
    "CAMERA: Straight-on view facing the single cabinet wall. Camera pulled far back so the full cabinet wall is visible from edge to edge. Large open floor fills the foreground.",
    "APPLIANCES: Sink centered on the back wall above the countertop. Range/cooktop on the same back wall adjacent to the sink with a hood or over-range microwave mounted above the range.",
    "CONSTRAINT: Only the back wall has cabinets. The left wall, right wall, and ceiling on the open sides are bare painted drywall with no cabinetry. No island or peninsula exists.",
  ].join(" "),

  "L-Shape": [
    "LAYOUT: Two cabinet walls meeting at one corner forming an L shape — cabinets on the back wall and one side wall only. The other two sides of the room are completely open floor.",
    "CAMERA: Camera angled diagonally into the corner where the two cabinet walls meet. Both walls visible receding into the corner. Large open floor fills the foreground.",
    "APPLIANCES: Sink on the back wall cabinet run, visible above the countertop. Range/cooktop on the side wall cabinet run with visible burners and a hood or over-range microwave mounted above the range.",
    "CONSTRAINT: Only two walls have cabinets. The other two walls are bare drywall with no cabinetry. No island. No peninsula. More than half the floor is clear empty space.",
  ].join(" "),

  "U-Shape": [
    "LAYOUT: Three walls of cabinets forming a closed horseshoe — back wall, left wall, and right wall all have full cabinet runs. The front of the kitchen is completely open.",
    "CAMERA: Camera at the open front facing directly toward the back wall. Left cabinet wall extends to the left, right cabinet wall extends to the right, back wall closes the view ahead.",
    "APPLIANCES: Sink centered on the back wall, clearly visible above the countertop. Range/cooktop on one of the side wall runs with a hood mounted above.",
    "CONSTRAINT: Three enclosed walls with cabinets and one fully open front entrance. Center floor between the three walls is open clear space with no island or peninsula.",
  ].join(" "),

  Parallel: [
    "LAYOUT: Two parallel rows of cabinets on opposite walls, directly facing each other, with a narrow corridor between them. No cabinets on the back or front walls.",
    "CAMERA: Camera at one end of the corridor looking straight down its full length. Both cabinet rows converge symmetrically toward a single vanishing point. Both ends are open passageways.",
    "APPLIANCES: Sink on one parallel wall run. Range/cooktop on the opposite parallel wall run with a hood or over-range microwave mounted above the range.",
    "CONSTRAINT: Two parallel rows only, running the full length. The corridor between them is the only floor space. No back-wall cabinets. No island. No peninsula.",
  ].join(" "),

  Island: [
    "LAYOUT: Wall cabinets on the back wall and one side wall. One large freestanding rectangular kitchen island in the center of the room, completely detached from all walls with clear walking space on all four sides.",
    "CAMERA: Three-quarter view with the freestanding island prominent in the foreground center. Wall cabinets visible in the background.",
    "APPLIANCES: Sink on the back wall run or integrated into the island top. Range/cooktop on the back wall run with a hood mounted above. Island has countertop seating on the open sides.",
    "CONSTRAINT: The island is freestanding — clear open floor completely surrounds all four sides of the island with no connection to any wall. No peninsula.",
  ].join(" "),

  "G-Shape": [
    "LAYOUT: Three walls of cabinets — back wall, left wall, and right wall — plus one shorter peninsula counter attached to and extending inward from one wall. The peninsula creates a partial barrier leaving the kitchen entrance open.",
    "CAMERA: Angled three-quarter view showing all three cabinet walls and the peninsula clearly projecting inward from one side.",
    "APPLIANCES: Sink on the back wall run, visible above the countertop. Range/cooktop on one of the side wall runs with a hood mounted above.",
    "CONSTRAINT: The peninsula is shorter than the full room width, leaving a clear open entrance gap. No freestanding island in the center floor.",
  ].join(" "),
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
 * @param {string}   [params.doorStyleName]     - door style name | null
 * @param {string}   [params.drawerStyleName]   - drawer style name | null
 * @param {string}   [params.hardwareName]      - hardware/pull style name | null
 * @param {string}   [params.countertopName]    - countertop name | null
 * @param {string}   [params.flooringName]      - flooring name | null
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
  doorStyleName   = null,
  drawerStyleName = null,
  hardwareName    = null,
  countertopName  = null,
  flooringName    = null,
}) {
  const layoutDesc = LAYOUT_DESCRIPTIONS[layout] || layout || "open-plan";

  // Mandatory structural description for this layout — locks the AI to the correct shape
  const layoutStructure = LAYOUT_STRUCTURE[layout] || "";

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

  // ── Cabinet color description ──────────────────────────────────────────────
  let cabinetColorDesc = "";
  if (upperCabinetColor || lowerCabinetColor) {
    const upperName = upperCabinetColor?.name;
    const lowerName = lowerCabinetColor?.name;
    if (upperName && lowerName && upperName !== lowerName) {
      cabinetColorDesc = `${upperName} upper cabinets and ${lowerName} lower cabinets.`;
    } else if (lowerName) {
      cabinetColorDesc = `${lowerName} cabinets.`;
    } else if (upperName) {
      cabinetColorDesc = `${upperName} cabinets.`;
    }
  }

  // ── Door style ─────────────────────────────────────────────────────────────
  const doorDesc = doorStyleName
    ? `${doorStyleName} style cabinet doors.`
    : "Shaker style cabinet doors.";

  // ── Drawer style ───────────────────────────────────────────────────────────
  const drawerDesc = drawerStyleName && drawerStyleName !== doorStyleName
    ? `${drawerStyleName} style drawer fronts.`
    : null;

  // ── Hardware / pull style ──────────────────────────────────────────────────
  const hardwareDesc = hardwareName
    ? `${hardwareName} cabinet hardware.`
    : "Bar pull cabinet hardware.";

  // ── Countertop ─────────────────────────────────────────────────────────────
  const countertopDesc = countertopName
    ? `${countertopName} countertops.`
    : "White quartz countertops.";

  // ── Flooring ───────────────────────────────────────────────────────────────
  const flooringDesc = flooringName
    ? `${flooringName} kitchen flooring.`
    : "Natural hardwood kitchen flooring.";

  // Combine all material descriptions
  const materialDesc = [
    cabinetColorDesc,
    doorDesc,
    drawerDesc,
    hardwareDesc,
    countertopDesc,
    flooringDesc,
    "Stainless steel appliances.",
  ].filter(Boolean).join(" ");

  // Describe exact wall positions of all cabinets (reflects manual edits)
  const cabinetWallDesc = getCabinetWallDesc(items, roomWidth, roomLength);
  // Describe exact wall position of sink and range so the AI places them correctly
  const fixturePlacementDesc = getFixturePlacementDesc(items, roomWidth, roomLength);

  const prompt = [
    `Modern ${layoutDesc} kitchen inside a ${roomDesc}${heightDesc}.`,
    // Mandatory layout shape constraint — always first so it dominates the AI's framing
    layoutStructure,
    `${cabinetDesc}.`,
    cabinetWallDesc      ? `Cabinet placement: ${cabinetWallDesc}.` : null,
    fixturePlacementDesc ? `${fixturePlacementDesc}.` : null,
    materialDesc,
    "Photorealistic residential kitchen visualization.",
    "Contemporary interior design.",
    "Warm ambient lighting, soft natural light from windows.",
    "Clean and polished finish, high quality architectural render.",
    "Professional interior photography style.",
  ].filter(Boolean).join(" ");

  return prompt;
}
