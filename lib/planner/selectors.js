/**
 * selectors.js
 *
 * Pure selector functions that project the authoritative scene graph into
 * the format consumed by each renderer:
 *
 *   selectProjectedItems  — 2D Konva canvas (identical shape to old placedItems[])
 *   select3DCabinets      — React Three Fiber Scene3DCabinet nodes
 *
 * Both renderers call these instead of reading placedItems directly, ensuring
 * the authoritative scene.items[] is the single source of truth.
 */

/** Category fallback colours — mirrors CATEGORY_COLORS_3D in sceneBuilder.js */
export const CATEGORY_COLORS_3D = {
  "Base Cabinets": "#d6d3d1",
  "Wall Cabinets": "#bfdbfe",
  "Tall Units":    "#d1fae5",
  "Appliances":    "#fde68a",
  default:         "#e7e5e4",
};

// ─── 2D Konva projection ──────────────────────────────────────────────────────

/**
 * Converts scene.items to top-down 2D canvas format.
 * The shape is deliberately identical to the old placedItems[] so that
 * PlannerCanvas.jsx only needs a one-line store-selector change.
 *
 * Mapping:  scene.position.xFt → x
 *           scene.position.zFt → y  (Z in 3D = north-south = 2D Y)
 *
 * @param   {Object} scene  - Authoritative scene { items, zones }
 * @returns {Array}         - 2D item descriptors
 */
export function selectProjectedItems(scene) {
  return (scene?.items ?? []).map((item) => ({
    id:       item.id,
    productId: item.productId,
    sku:      item.sku,
    name:     item.name,
    category: item.category,
    x:        item.position.xFt,
    y:        item.position.zFt,
    widthFt:  item.dimensions.widthFt,
    depthFt:  item.dimensions.depthFt,
    rotation: item.rotation.yDeg,
    imageUrl:    item.imageUrl,
    doorCount:   item.doorCount   ?? null,
    drawerCount: item.drawerCount ?? null,
    isFiller: item.isFiller ?? false,
  }));
}

// ─── 3D cabinet nodes ─────────────────────────────────────────────────────────

/**
 * Converts scene.items to the cabinet descriptor format consumed by
 * Scene3DCabinet and buildSceneGraph's cabinets array.
 *
 * @param   {Object} scene  - Authoritative scene { items, zones }
 * @returns {Array}         - 3D cabinet descriptors
 */
export function select3DCabinets(scene) {
  return (scene?.items ?? []).map((item) => ({
    id:           item.id,
    productId:    item.productId,
    sku:          item.sku,
    name:         item.name,
    category:     item.category,
    dimensions:   item.dimensions,
    position:     item.position,
    rotation:     item.rotation,
    gltfUrl:      item.gltfUrl ?? null,
    fallbackColor: CATEGORY_COLORS_3D[item.category] ?? CATEGORY_COLORS_3D.default,
    imageUrl:     item.imageUrl,
    doorCount:    item.doorCount   ?? null,
    drawerCount:  item.drawerCount ?? null,
    material:     item.material,
    isFiller:     item.isFiller ?? false,
  }));
}
