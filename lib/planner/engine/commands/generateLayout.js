/**
 * generateLayout.js
 *
 * Procedural kitchen layout generator.
 *
 * Given a layout type, room dimensions, and the tenant product catalog,
 * automatically fills every cabinet-run zone with appropriate products.
 *
 * Algorithm per zone:
 *   1. Select the matching product category pool (base / wall / island)
 *   2. Greedily fill left-to-right with the largest product that still fits
 *   3. Insert a filler panel for any gap that no catalog product can fill
 *
 * The output is a scene-compatible { items, zones } object that the store
 * drops directly into scene.items / scene.zones.
 */

import { buildLayoutRuns } from "@/lib/planner/layoutPresets";

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates a complete scene population from layout + room + product catalog.
 *
 * @param {string} layout          - e.g. "G-Shape", "L-Shape", "U-Shape" …
 * @param {Object} roomDimensions  - { width, length, height } in feet
 * @param {Array}  products        - Planner-format products from page.jsx/API
 *                                   Each: { id, sku, name, category, widthFt, depthFt, imageUrl }
 * @returns {{ items: Array, zones: Array }}
 */
export function generateLayout(layout, roomDimensions, products) {
  const { width: W, length: L } = roomDimensions;
  const zones = buildLayoutRuns(layout, { width: W, length: L });

  if (!products || products.length === 0) {
    return { items: [], zones };
  }

  const catalog   = buildCatalog(products);
  const timestamp = Date.now();
  let   itemIdx   = 0;
  const allItems  = [];

  for (const zone of zones) {
    const pool = selectPool(zone.type, catalog);
    // Graceful fallback: if there are no products in the right category use all
    const effectivePool = pool.length > 0 ? pool : catalog.all;
    if (effectivePool.length === 0) continue;

    const zoneItems = fillZone(zone, effectivePool, timestamp, itemIdx);
    itemIdx += zoneItems.length;
    allItems.push(...zoneItems);
  }

  return { items: allItems, zones };
}

// ─── Catalog helpers ──────────────────────────────────────────────────────────

/** Splits the product array into category buckets, sorted by width ascending. */
function buildCatalog(products) {
  const sorted = (arr) => [...arr].sort((a, b) => (a.widthFt || 0) - (b.widthFt || 0));
  return {
    base:      sorted(products.filter((p) => p.category === "Base Cabinets")),
    wall:      sorted(products.filter((p) => p.category === "Wall Cabinets")),
    tall:      sorted(products.filter((p) => p.category === "Tall Units")),
    appliance: sorted(products.filter((p) => p.category === "Appliances")),
    all:       sorted(products),
  };
}

/** Maps a zone type to the appropriate product pool. */
function selectPool(type, catalog) {
  if (type === "upper")                                return catalog.wall;
  if (type === "island" || type === "peninsula")       return catalog.base;
  return catalog.base; // "base" and any unknown type
}

// ─── Zone filler ─────────────────────────────────────────────────────────────

/**
 * Fills a zone greedily:
 *   • Pick the largest catalog product that still fits the remaining width
 *   • Advance cursor by that product's width
 *   • If nothing fits, insert a filler panel for the residual gap
 */
function fillZone(zone, pool, timestamp, startIdx) {
  const items = [];
  let cursor  = zone.x2d;
  const end   = zone.x2d + zone.widthFt;
  let idx     = startIdx;

  // Pre-sort descending so we always try the largest product first
  const sortedDesc = [...pool].sort((a, b) => (b.widthFt || 0) - (a.widthFt || 0));

  while (cursor < end - 0.02) {
    const remaining = end - cursor;

    // Find the largest product that fits (allow 0.05 ft rounding tolerance)
    const product = sortedDesc.find((p) => (p.widthFt || 0) <= remaining + 0.05);

    if (!product) {
      if (remaining > 0.04) {
        items.push(buildFillerItem(cursor, remaining, zone, timestamp, idx++));
      }
      break;
    }

    items.push(buildProductItem(product, cursor, zone, timestamp, idx++));
    cursor += product.widthFt || 0;
  }

  return items;
}

// ─── Item builders ────────────────────────────────────────────────────────────

function buildProductItem(product, xPos, zone, timestamp, idx) {
  const category = product.category || "Base Cabinets";
  // Zone is authoritative for height and elevation so upper zones always get
  // the correct 30" height and 54" elevation regardless of product category.
  const heightFt = zone.heightFt;
  const yFt      = zone.elevFt ?? 0;

  return {
    id:         `item-${timestamp}-${idx}`,
    productId:  product.id,
    sku:        product.sku,
    name:       product.name,
    category,
    dimensions: {
      widthFt: product.widthFt,
      depthFt: zone.depthFt,
      heightFt,
    },
    position:  { xFt: xPos, yFt, zFt: zone.y2d },
    rotation:  { yDeg: 0 },
    zoneId:    zone.id,
    wallId:    null,
    gltfUrl:   product.gltfUrl  ?? null,
    imageUrl:  product.imageUrl ?? null,
    isFiller:  false,
    material:  { color: "#f0ece8", roughness: 0.45, metalness: 0.0, finishId: null },
  };
}

function buildFillerItem(xPos, widthFt, zone, timestamp, idx) {
  const safeWidth = Math.max(0.04, widthFt);
  const category  = zone.type === "upper" ? "Wall Cabinets" : "Base Cabinets";
  // Zone is authoritative for height and elevation (matches buildProductItem).
  const heightFt  = zone.heightFt;
  const yFt       = zone.elevFt ?? 0;

  return {
    id:         `filler-${timestamp}-${idx}`,
    productId:  null,
    sku:        "FILLER",
    name:       `Filler ${Math.round(safeWidth * 12)}"`,
    category,
    dimensions: { widthFt: safeWidth, depthFt: zone.depthFt, heightFt },
    position:   { xFt: xPos, yFt, zFt: zone.y2d },
    rotation:   { yDeg: 0 },
    zoneId:     zone.id,
    wallId:     null,
    gltfUrl:    null,
    imageUrl:   null,
    isFiller:   true,
    material:   { color: "#e8e4df", roughness: 0.6, metalness: 0.0, finishId: null },
  };
}
