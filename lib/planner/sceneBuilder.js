/**
 * sceneBuilder.js
 *
 * Pure functions that derive the 3D scene graph from the current Zustand
 * planner state (layout, roomDimensions, placedItems).
 *
 * The scene graph is a serializable JSON object consumed by PlannerScene3D
 * and, in future phases, by the export / AI conditioning pipeline.
 *
 * Coordinate system (Three.js):
 *   X = east–west  (matches 2D canvas X in feet)
 *   Y = up–down    (elevation, 0 = floor)
 *   Z = north–south (matches 2D canvas Y in feet)
 */

// ─── Cabinet heights by category (feet) ─────────────────────────────────────

export const CABINET_HEIGHTS_FT = {
  "Base Cabinets": 3.0,    // 36 in
  "Wall Cabinets": 1.25,   // 15 in (standard upper)
  "Tall Units":    7.0,    // 84 in
  "Appliances":    3.0,    // default; use product height_in / 12 when available
  default:         3.0,
};

// Elevation from floor for wall cabinets (standard 54 in = 4.5 ft)
export const WALL_CABINET_ELEVATION_FT = 4.5;

// Category fallback colors (mirrors PlannerCanvas CATEGORY_COLORS)
export const CATEGORY_COLORS_3D = {
  "Base Cabinets": "#d6d3d1",
  "Wall Cabinets": "#bfdbfe",
  "Tall Units":    "#d1fae5",
  "Appliances":    "#fde68a",
  default:         "#e7e5e4",
};

// ─── Wall geometry per layout type ──────────────────────────────────────────

/**
 * Returns an array of wall segment definitions for the given layout.
 * Each wall: { id, startFt: [x,z], endFt: [x,z], thicknessFt }
 *
 * Coordinate origin is the north-west (top-left) corner of the room.
 *   x increases east, z increases south.
 */
export function buildWallsFromLayout(layout, { width: W, length: L }) {
  const T = 0.5; // wall thickness in feet

  // All layouts share the four perimeter walls.
  const perimeter = [
    { id: "wall-north", startFt: [0, 0],  endFt: [W, 0],  thicknessFt: T },
    { id: "wall-south", startFt: [0, L],  endFt: [W, L],  thicknessFt: T },
    { id: "wall-west",  startFt: [0, 0],  endFt: [0, L],  thicknessFt: T },
    { id: "wall-east",  startFt: [W, 0],  endFt: [W, L],  thicknessFt: T },
  ];

  // Layout-specific peninsula / extra walls
  switch (layout) {
    case "G-Shape":
      // Add a peninsula wall extending inward from the west, at 80 % of the
      // room depth (roughly the bottom-left G counter).
      return [
        ...perimeter,
        {
          id: "wall-peninsula",
          startFt: [0, L * 0.8],
          endFt:   [W * 0.45, L * 0.8],
          thicknessFt: T,
        },
      ];
    default:
      return perimeter;
  }
}

// ─── placedItem → 3D cabinet ─────────────────────────────────────────────────

/**
 * Converts a 2D placedItem from the Zustand store into a 3D cabinet node
 * for the scene graph.
 *
 * 2D item:  { id, productId, sku, name, category, widthFt, depthFt, x, y, imageUrl, rotation? }
 * 3D result: full cabinet object with position.{xFt,yFt,zFt}, dimensions.heightFt, etc.
 */
export function placedItemTo3D(item) {
  const category  = item.category || "default";
  const heightFt  = CABINET_HEIGHTS_FT[category] ?? CABINET_HEIGHTS_FT.default;
  const elevationFt = category === "Wall Cabinets" ? WALL_CABINET_ELEVATION_FT : 0;

  return {
    // Identity
    id:        item.id,
    productId: item.productId,
    sku:       item.sku,
    name:      item.name,
    category,

    // Geometry
    dimensions: {
      widthFt:  item.widthFt,
      depthFt:  item.depthFt,
      heightFt,
    },

    // 3D position — 2D {x,y} maps to {xFt, zFt}; yFt is elevation
    position: {
      xFt: item.x ?? 0,
      yFt: elevationFt,
      zFt: item.y ?? 0,
    },

    rotation: { yDeg: item.rotation ?? 0 },

    // Assets
    gltfUrl:       item.gltfUrl ?? null,
    fallbackColor: CATEGORY_COLORS_3D[category] ?? CATEGORY_COLORS_3D.default,
    imageUrl:      item.imageUrl ?? null,

    // Material (Phase 2 — placeholders)
    material: {
      finishId:  null,
      roughness: 0.4,
      metalness: 0.0,
      color:     CATEGORY_COLORS_3D[category] ?? CATEGORY_COLORS_3D.default,
    },

    // Wall attachment (resolved by wallSnap3D.js in Phase 2)
    attachedWallId: null,
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Derives a full 3D scene graph from current planner store state.
 * Call this whenever placedItems or roomDimensions change.
 *
 * @param {string}  layout         - selected layout id
 * @param {object}  roomDimensions - { width, length, height } in feet
 * @param {Array}   placedItems    - array from plannerStore
 * @param {string}  [tenantId]     - optional, stored in meta
 * @returns {SceneGraph}
 */
export function buildSceneGraph(layout, roomDimensions, placedItems, tenantId = null) {
  const { width: W, length: L, height: H } = roomDimensions;

  return {
    version: "1.0",
    meta: {
      layoutType: layout,
      tenantId,
      createdAt: new Date().toISOString(),
    },
    room: {
      widthFt:  W,
      lengthFt: L,
      heightFt: H,
      walls: buildWallsFromLayout(layout, roomDimensions),
      floor:   { materialId: "hardwood-light" },
      ceiling: { heightFt: H, materialId: "white-paint" },
    },
    cabinets: (placedItems || []).map(placedItemTo3D),
    lighting: {
      ambientIntensity: 0.5,
      sunPosition:      [W / 2 + 3, H + 2, -2],
      sunIntensity:     1.0,
    },
    camera: {
      mode:     "perspective",
      position: [W / 2, H * 0.8, L + H],
      target:   [W / 2, H * 0.25, L / 2],
    },
  };
}
