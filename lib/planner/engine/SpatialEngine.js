/**
 * SpatialEngine.js
 *
 * Authoritative spatial command dispatcher for the kitchen planner.
 * Pure functions only — no side effects, no store imports, no React.
 *
 * Pattern:  applyCommand(scene, command, roomDimensions) → newScene
 *
 * The Zustand store calls this inside set(), keeping all mutation logic
 * outside of React and fully unit-testable.
 *
 * Coordinate system (Three.js / scene):
 *   X = east–west (matches 2D canvas X in feet)
 *   Y = elevation from floor (0 = floor)
 *   Z = north–south (matches 2D canvas Y in feet)
 */

import { snapToGrid, SNAP_GRID_FT } from "@/lib/planner/snap";
import {
  CABINET_HEIGHTS_FT,
  WALL_CABINET_ELEVATION_FT,
} from "@/lib/planner/sceneBuilder";

// ─── Command type constants ────────────────────────────────────────────────────

export const COMMANDS = {
  PLACE_ITEM:  "PLACE_ITEM",   // add a new item from a product
  MOVE_ITEM:   "MOVE_ITEM",    // translate an existing item
  ROTATE_ITEM: "ROTATE_ITEM",  // rotate around Y axis
  REMOVE_ITEM: "REMOVE_ITEM",  // delete by id
  SET_ITEMS:   "SET_ITEMS",    // replace all items (used by generator)
  CLEAR_SCENE: "CLEAR_SCENE",  // remove all items
};

// ─── Main dispatcher ───────────────────────────────────────────────────────────

/**
 * Applies a spatial command to the current scene and returns a new scene.
 * Immutable — never mutates the input scene.
 *
 * @param {Object} scene           - Current authoritative scene: { items, zones }
 * @param {Object} command         - { type: COMMANDS.*, ...payload }
 * @param {Object} roomDimensions  - { width, length, height } in feet
 * @returns {Object}               - New scene
 */
export function applyCommand(scene, command, roomDimensions) {
  switch (command.type) {
    case COMMANDS.PLACE_ITEM:
      return cmdPlaceItem(scene, command, roomDimensions);
    case COMMANDS.MOVE_ITEM:
      return cmdMoveItem(scene, command, roomDimensions);
    case COMMANDS.ROTATE_ITEM:
      return cmdRotateItem(scene, command);
    case COMMANDS.REMOVE_ITEM:
      return cmdRemoveItem(scene, command);
    case COMMANDS.SET_ITEMS:
      return {
        ...scene,
        items: command.items,
        zones: command.zones ?? scene.zones,
      };
    case COMMANDS.CLEAR_SCENE:
      return { ...scene, items: [] };
    default:
      return scene;
  }
}

// ─── Category normaliser ──────────────────────────────────────────────────────
// The DB seeds short category names ("Base", "Wall", "Tall"). Normalise to the
// canonical long form so height, elevation, and layer lookups all work correctly.

function normalizeCategory(cat) {
  const c = (cat || "").toLowerCase().trim();
  if (c === "base" || c === "base cabinet")            return "Base Cabinets";
  if (c === "wall" || c === "wall cabinet")            return "Wall Cabinets";
  if (c === "tall" || c === "tall unit" || c === "pantry") return "Tall Units";
  return cat || "Base Cabinets";
}

// ─── PLACE_ITEM ───────────────────────────────────────────────────────────────

function cmdPlaceItem(scene, { id, product, position }, room) {
  const snappedX = snapToGrid(position?.xFt ?? 0, SNAP_GRID_FT);
  const snappedZ = snapToGrid(position?.zFt ?? 0, SNAP_GRID_FT);
  const clampedX = Math.max(0, Math.min(room.width  - (product.widthFt || 2), snappedX));
  const clampedZ = Math.max(0, Math.min(room.length - (product.depthFt || 2), snappedZ));

  const category = normalizeCategory(product.category);
  const heightFt = CABINET_HEIGHTS_FT[category] ?? CABINET_HEIGHTS_FT.default;
  const yFt      = category === "Wall Cabinets" ? WALL_CABINET_ELEVATION_FT : 0;

  const newItem = {
    id:        id || makeId(),
    productId: product.id,
    sku:       product.sku,
    name:      product.name,
    category,
    dimensions: {
      widthFt:  product.widthFt || 2,
      depthFt:  product.depthFt || 2,
      heightFt,
    },
    position: { xFt: clampedX, yFt, zFt: clampedZ },
    rotation: { yDeg: product.rotation ?? 0 },
    zoneId:   product.zoneId ?? null,
    wallId:   null,
    gltfUrl:     product.gltfUrl    ?? null,
    imageUrl:    product.imageUrl   ?? null,
    doorCount:   product.doorCount  ?? null,
    drawerCount: product.drawerCount ?? null,
    isFiller: false,
    material: {
      color:     "#f0ece8",
      roughness: 0.45,
      metalness: 0.0,
      finishId:  null,
    },
  };

  return { ...scene, items: [...scene.items, newItem] };
}

// ─── MOVE_ITEM ────────────────────────────────────────────────────────────────

function cmdMoveItem(scene, { id, position }, room) {
  return {
    ...scene,
    items: scene.items.map((item) => {
      if (item.id !== id) return item;
      const snappedX = snapToGrid(position.xFt, SNAP_GRID_FT);
      const snappedZ = snapToGrid(position.zFt, SNAP_GRID_FT);
      const clampedX = Math.max(0, Math.min(room.width  - item.dimensions.widthFt, snappedX));
      const clampedZ = Math.max(0, Math.min(room.length - item.dimensions.depthFt, snappedZ));
      return { ...item, position: { ...item.position, xFt: clampedX, zFt: clampedZ } };
    }),
  };
}

// ─── ROTATE_ITEM ──────────────────────────────────────────────────────────────

function cmdRotateItem(scene, { id, yDeg }) {
  return {
    ...scene,
    items: scene.items.map((item) =>
      item.id === id ? { ...item, rotation: { yDeg } } : item
    ),
  };
}

// ─── REMOVE_ITEM ──────────────────────────────────────────────────────────────

function cmdRemoveItem(scene, { id }) {
  return {
    ...scene,
    items: scene.items.filter((item) => item.id !== id),
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function makeId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
