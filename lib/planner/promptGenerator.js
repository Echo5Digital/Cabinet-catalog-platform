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
    if (!cat || cat === "Sink" || cat === "Range" || cat === "Refrigerator") continue; // fixtures handled separately
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
 * Returns a human-readable horizontal position label for a fixture on a wall.
 * For EW walls (north/south): describes left/center/right thirds by X position.
 * For NS walls (west/east):   describes top/middle/bottom thirds by Y (Z) position.
 */
function wallPositionLabel(item, wall, roomWidth, roomLength) {
  if (wall === "north" || wall === "south") {
    // EW wall — position along X axis
    const center = (item.x ?? 0) + (item.widthFt ?? 2) / 2;
    const ratio  = roomWidth > 0 ? center / roomWidth : 0.5;
    if (ratio < 0.33) return "left side";
    if (ratio > 0.60) return "right side";
    return "center";
  }
  if (wall === "west" || wall === "east") {
    // NS wall — position along Z axis
    const center = (item.y ?? 0) + (item.depthFt ?? 2) / 2;
    const ratio  = roomLength > 0 ? center / roomLength : 0.5;
    if (ratio < 0.33) return "upper section";
    if (ratio > 0.60) return "lower section";
    return "middle section";
  }
  return "";
}

/**
 * Derives which wall a fixture (sink/range) sits against based on its
 * x/y position and room dimensions. Items are in selectProjectedItems format:
 * { x (EW feet), y (NS feet), widthFt, depthFt, category }.
 *
 * Returns a detailed sentence describing exact wall and position of sink and
 * range/cooktop so the AI model places appliances in the correct location to
 * match the 2D/3D scene precisely.
 */
function getFixturePlacementDesc(items, roomWidth, roomLength) {
  const sink   = items.find((i) => i.category === "Sink");
  const range  = items.find((i) => i.category === "Range");
  const fridge = items.find((i) => i.category === "Refrigerator");

  const parts = [];

  if (sink) {
    const wallFull = wallOf(sink, roomWidth, roomLength);
    if (wallFull) {
      const wallName = wallFull.replace(" wall", "");
      const posLabel = wallPositionLabel(sink, wallName, roomWidth, roomLength);
      const posStr   = posLabel ? ` at the ${posLabel}` : "";
      const hasDW    = (sink.productId === "fixture-sink-dw" || (sink.name ?? "").toLowerCase().includes("dishwasher"));
      const dwNote   = hasDW
        ? ". Directly beside the sink (sharing the same base cabinet run) is a built-in dishwasher with a matching panel-front door, flush with the cabinet face, and a thin control strip along its top edge"
        : "";
      const sinkDesc = hasDW
        ? `Combined sink and dishwasher unit mounted on the ${wallFull}${posStr}: the left portion has a stainless steel undermount single-bowl sink with a tall chrome gooseneck faucet and two side lever handles on the countertop${dwNote}`
        : `Kitchen sink mounted on the ${wallFull}${posStr} — stainless steel undermount single-bowl with a tall chrome gooseneck faucet on the countertop`;
      parts.push(sinkDesc);
    } else {
      parts.push("Kitchen sink is integrated into the island or peninsula countertop");
    }
  }

  if (range) {
    const wallFull = wallOf(range, roomWidth, roomLength);
    if (wallFull) {
      const wallName = wallFull.replace(" wall", "");
      const posLabel = wallPositionLabel(range, wallName, roomWidth, roomLength);
      const posStr   = posLabel ? ` at the ${posLabel}` : "";
      // Determine whether the range is on the same wall as the sink
      const sinkWall = sink ? wallOf(sink, roomWidth, roomLength) : null;
      const sameWall = sinkWall && sinkWall === wallFull;
      const wallCtx  = sameWall ? `on the same ${wallFull}` : `on the ${wallFull}`;
      parts.push(`Range/cooktop is placed ${wallCtx}${posStr} with visible burners on top and a range hood or over-range microwave mounted directly above it on the wall`);
    } else {
      parts.push("Range/cooktop is integrated into the island or peninsula with a ceiling-mounted hood above");
    }
  }

  if (fridge) {
    const wallFull = wallOf(fridge, roomWidth, roomLength);
    if (wallFull) {
      const wallName = wallFull.replace(" wall", "");
      const posLabel = wallPositionLabel(fridge, wallName, roomWidth, roomLength);
      const posStr   = posLabel ? ` at the ${posLabel}` : "";
      parts.push(`Full-height stainless steel French-door refrigerator is positioned on the ${wallFull}${posStr}, flush against the wall next to the surrounding cabinets`);
    }
  }

  return parts.length > 0 ? parts.join(". ") : null;
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
    "LAYOUT: All cabinets in one straight continuous line on the back (north) wall only. No cabinetry on any other wall. No island. No peninsula.",
    "CAMERA: Straight-on view facing the single cabinet wall. Camera pulled far back so the full cabinet wall is visible from edge to edge. Large open floor fills the foreground.",
    "CONSTRAINT: Only the back wall has cabinets. The left wall, right wall, and ceiling on the open sides are bare painted drywall with no cabinetry. No island or peninsula exists.",
  ].join(" "),

  "L-Shape": [
    "LAYOUT: Two cabinet walls meeting at one corner forming an L shape — cabinets on the back (north) wall and the left (west) side wall only. The other two sides of the room are completely open floor.",
    "CAMERA: Camera angled diagonally into the corner where the two cabinet walls meet. Both walls visible receding into the corner. Large open floor fills the foreground.",
    "CONSTRAINT: Only two walls have cabinets. The other two walls are bare drywall with no cabinetry. No island. No peninsula. More than half the floor is clear empty space.",
  ].join(" "),

  "U-Shape": [
    "LAYOUT: Three walls of cabinets forming a closed horseshoe — back (north) wall, left (west) wall, and right (east) wall all have full cabinet runs. The front of the kitchen is completely open.",
    "CAMERA: Camera at the open front facing directly toward the back wall. Left cabinet wall extends to the left, right cabinet wall extends to the right, back wall closes the view ahead.",
    "CONSTRAINT: Three enclosed walls with cabinets and one fully open front entrance. Center floor between the three walls is open clear space with no island or peninsula.",
  ].join(" "),

  Parallel: [
    "LAYOUT: Two parallel rows of cabinets on opposite side walls (left/west and right/east), directly facing each other, with a narrow corridor between them. No cabinets on the back or front walls.",
    "CAMERA: Camera at one end of the corridor looking straight down its full length. Both cabinet rows converge symmetrically toward a single vanishing point. Both ends are open passageways.",
    "CONSTRAINT: Two parallel rows only, running the full length. The corridor between them is the only floor space. No back-wall cabinets. No island. No peninsula.",
  ].join(" "),

  Island: [
    "LAYOUT: Wall cabinets on the back (north) wall and left (west) side wall. One large freestanding rectangular kitchen island in the center of the room, completely detached from all walls with clear walking space on all four sides.",
    "CAMERA: Three-quarter view with the freestanding island prominent in the foreground center. Wall cabinets visible in the background.",
    "CONSTRAINT: The island is freestanding — clear open floor completely surrounds all four sides of the island with no connection to any wall. No peninsula.",
  ].join(" "),

  "G-Shape": [
    "LAYOUT: Three walls of cabinets — back (north) wall, left (west) wall, and right (east) wall — plus one shorter peninsula counter attached to and extending inward from the front of the left or right wall. The peninsula creates a partial barrier leaving the kitchen entrance open.",
    "CAMERA: Angled three-quarter view showing all three cabinet walls and the peninsula clearly projecting inward from one side.",
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
const LIFESTYLE_PROMPTS = {
  solo:         "Minimalist and efficient kitchen designed for one cook.",
  couple:       "Stylish kitchen with two designated work zones for couple cooking.",
  family:       "Family-friendly spacious kitchen with ample storage and prep space.",
  entertainer:  "Entertainer's kitchen with an open concept and social gathering areas.",
  professional: "Chef's kitchen with professional-grade finishes and extra prep surface.",
};

export function buildPlannerPrompt({
  layout,
  roomWidth,
  roomLength,
  ceilingHeight,
  items = [],
  upperCabinetColor = null,
  lowerCabinetColor = null,
  doorStyleName     = null,
  drawerStyleName   = null,
  hardwareName      = null,
  countertopName    = null,
  flooringName      = null,
  lifestyleProfile  = null,
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
    "Stainless steel appliances including refrigerator, range with four burners, and sink with chrome gooseneck faucet.",
  ].filter(Boolean).join(" ");

  // Describe exact wall positions of all cabinets (reflects manual edits)
  const cabinetWallDesc = getCabinetWallDesc(items, roomWidth, roomLength);
  // Describe exact wall position of sink and range so the AI places them correctly
  const fixturePlacementDesc = getFixturePlacementDesc(items, roomWidth, roomLength);

  const lifestyleDesc = lifestyleProfile ? LIFESTYLE_PROMPTS[lifestyleProfile] || null : null;

  // Fixture placement is the authoritative source — computed from actual 2D/3D item positions.
  // Wrap in APPLIANCE_PLACEMENT marker so it's clearly distinguished from layout structure.
  const fixtureSection = fixturePlacementDesc
    ? `APPLIANCE PLACEMENT (match exactly): ${fixturePlacementDesc}.`
    : null;

  const prompt = [
    `Modern ${layoutDesc} kitchen inside a ${roomDesc}${heightDesc}.`,
    // Mandatory layout shape constraint — always first so it dominates the AI's framing
    layoutStructure,
    `${cabinetDesc}.`,
    cabinetWallDesc ? `Cabinet placement: ${cabinetWallDesc}.` : null,
    // Appliance placement MUST follow exact wall/position derived from planner scene
    fixtureSection,
    materialDesc,
    lifestyleDesc,
    "Photorealistic residential kitchen visualization.",
    "Contemporary interior design.",
    "Warm ambient lighting, soft natural light from windows.",
    "Clean and polished finish, high quality architectural render.",
    "Professional interior photography style.",
  ].filter(Boolean).join(" ");

  return prompt;
}
