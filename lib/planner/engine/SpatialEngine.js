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
 *
 * Features added:
 *  - Collision detection (Feature 2): PLACE_ITEM, MOVE_ITEM, ROTATE_ITEM
 *    all reject the command if the result would overlap an existing item.
 *    Returns same scene reference on rejection so store skips undo snapshot.
 *  - Cabinet edge snapping (Feature 3): MOVE_ITEM snaps to adjacent cabinet
 *    edges before the collision check, forming clean runs.
 *  - Tall unit / wall cabinet alignment: When a Tall Unit is placed or moved,
 *    any Wall Cabinet whose X-Z footprint overlaps is automatically removed.
 *    Tall units occupy the full vertical column (0–7 ft) so they conflict with
 *    wall cabinets (4.5–7 ft). Rather than reject the placement, the wall
 *    cabinets are cleared to give the tall unit a clean column.
 */

import { snapToGrid, SNAP_GRID_FT } from "@/lib/planner/snap";
import {
  CABINET_HEIGHTS_FT,
  WALL_CABINET_ELEVATION_FT,
} from "@/lib/planner/sceneBuilder";
import { hasCollision } from "@/lib/planner/engine/collision";
import { snapToNearestCabinet } from "@/lib/planner/engine/cabinetSnap";

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
 * Returns the SAME scene reference if the command is rejected (collision).
 * The store's applyCommand wrapper uses this as a no-op guard to skip
 * pushing an undo snapshot.
 *
 * @param {Object} scene           - Current authoritative scene: { items, zones }
 * @param {Object} command         - { type: COMMANDS.*, ...payload }
 * @param {Object} roomDimensions  - { width, length, height } in feet
 * @returns {Object}               - New scene (or same scene on rejection)
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

  // Tall unit: auto-remove any wall cabinets whose floor footprint overlaps,
  // then skip the normal collision check against those (now-removed) items.
  // This keeps the vertical column clean — the user should not have to manually
  // remove wall cabinets before placing a tall unit.
  let baseItems = scene.items;
  if (newItem.category === "Tall Units") {
    const wallConflicts = findConflictingWallCabinets(scene.items, newItem);
    if (wallConflicts.size > 0) {
      baseItems = scene.items.filter((i) => !wallConflicts.has(i.id));
    }
  }

  // Collision check (Feature 2): reject placement if it overlaps an existing item.
  // Return the same scene reference so the store skips adding an undo snapshot.
  if (hasCollision(baseItems, newItem)) return scene;

  return { ...scene, items: [...baseItems, newItem] };
}

// ─── MOVE_ITEM ────────────────────────────────────────────────────────────────

function cmdMoveItem(scene, { id, position }, room) {
  // First resolve the final position of the item being moved
  const movingItem = scene.items.find((i) => i.id === id);
  if (!movingItem) return scene;

  // 1. Grid snap
  const snappedX = snapToGrid(position.xFt, SNAP_GRID_FT);
  const snappedZ = snapToGrid(position.zFt, SNAP_GRID_FT);

  // 2. Room boundary clamp
  const clampedX = Math.max(0, Math.min(room.width  - movingItem.dimensions.widthFt, snappedX));
  const clampedZ = Math.max(0, Math.min(room.length - movingItem.dimensions.depthFt, snappedZ));

  // 3. Cabinet edge snapping (Feature 3): pull toward adjacent cabinet edges
  const snapped = snapToNearestCabinet(
    { xFt: clampedX, zFt: clampedZ },
    movingItem,
    scene.items,
  );

  // 4. Re-clamp after cabinet snap (snap may push past room boundary)
  const finalX = Math.max(0, Math.min(room.width  - movingItem.dimensions.widthFt, snapped.xFt));
  const finalZ = Math.max(0, Math.min(room.length - movingItem.dimensions.depthFt, snapped.zFt));

  const updatedItem = {
    ...movingItem,
    position: { ...movingItem.position, xFt: finalX, zFt: finalZ },
  };

  // 5. Tall unit: auto-remove wall cabinets that conflict with the new position
  // (exclude the moving item itself so it doesn't conflict with its old slot).
  let itemsWithoutMoving = scene.items.filter((i) => i.id !== id);
  if (updatedItem.category === "Tall Units") {
    const wallConflicts = findConflictingWallCabinets(itemsWithoutMoving, updatedItem);
    if (wallConflicts.size > 0) {
      itemsWithoutMoving = itemsWithoutMoving.filter((i) => !wallConflicts.has(i.id));
    }
  }

  // 6. Collision check (Feature 2): reject move if result overlaps another item.
  if (hasCollision(itemsWithoutMoving, updatedItem)) return scene;

  return { ...scene, items: [...itemsWithoutMoving, updatedItem] };
}

// ─── ROTATE_ITEM ──────────────────────────────────────────────────────────────

function cmdRotateItem(scene, { id, yDeg }) {
  return {
    ...scene,
    items: scene.items.map((item) => {
      if (item.id !== id) return item;
      const rotatedItem = { ...item, rotation: { yDeg } };
      // Collision check (Feature 2): reject rotation if rotated footprint overlaps
      if (hasCollision(scene.items, rotatedItem, id)) return item;
      return rotatedItem;
    }),
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

/**
 * Returns the 2D floor-projection (X-Z) AABB for an item.
 * Used to find wall-cabinet conflicts for tall unit placement —
 * wall cabinets are elevated (yFt=4.5) but share the same floor footprint.
 *
 * @param {Object} item - SceneItem
 * @returns {{ minX, maxX, minZ, maxZ }}
 */
function getFootprintAABB(item) {
  const xFt = item.position?.xFt ?? 0;
  const zFt = item.position?.zFt ?? 0;
  const { widthFt = 2, depthFt = 2 } = item.dimensions ?? {};
  const rot = ((item.rotation?.yDeg ?? 0) % 360 + 360) % 360;
  const [w, d] = (rot === 90 || rot === 270) ? [depthFt, widthFt] : [widthFt, depthFt];
  return { minX: xFt, maxX: xFt + w, minZ: zFt, maxZ: zFt + d };
}

/**
 * Returns true when two 2D floor footprints overlap (beyond a small margin).
 */
function footprintOverlap(a, b) {
  const M = 0.01;
  return (
    a.minX < b.maxX - M && a.maxX > b.minX + M &&
    a.minZ < b.maxZ - M && a.maxZ > b.minZ + M
  );
}

/**
 * Given a tall unit item, returns the IDs of all wall cabinets in `items`
 * whose floor footprint overlaps the tall unit's footprint.
 * These must be removed to keep the vertical column clean.
 *
 * @param {Object[]} items      - scene.items
 * @param {Object}   tallItem   - the tall unit being placed/moved
 * @param {string}   [excludeId] - optional ID to skip (the item being moved)
 * @returns {Set<string>}  IDs to remove
 */
function findConflictingWallCabinets(items, tallItem, excludeId = null) {
  const tallFP = getFootprintAABB(tallItem);
  const toRemove = new Set();
  for (const item of items) {
    if (item.id === excludeId) continue;
    if (item.category !== "Wall Cabinets") continue;
    if (footprintOverlap(tallFP, getFootprintAABB(item))) {
      toRemove.add(item.id);
    }
  }
  return toRemove;
}
