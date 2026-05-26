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
 *   2. Detect zone orientation: east-west (EW) or north-south (NS)
 *   3. Greedily fill along the run axis with the largest product that still fits
 *   4. Insert a filler panel for any gap that no catalog product can fill
 *
 * Orientation rules (derived from zone geometry):
 *   EW zone (north wall, island, peninsula): widthFt > depthFt
 *     — run axis is X; fill from x2d to x2d+widthFt
 *     — item.widthFt = product.widthFt (X extent), item.depthFt = zone.depthFt (Z extent)
 *   NS zone (west / east walls): depthFt > widthFt
 *     — run axis is Z; fill from y2d to y2d+depthFt
 *     — item.widthFt = zone.widthFt (X extent = cabinet depth from wall)
 *     — item.depthFt = product.widthFt (Z extent = door-facing width along wall)
 *
 * The output is a scene-compatible { items, zones } object that the store
 * drops directly into scene.items / scene.zones.
 */

import { buildLayoutRuns } from "@/lib/planner/layoutPresets";

/** Tall units always use their own full height, not the base zone's 36" default. */
const TALL_UNIT_HEIGHT_FT = 7.0; // 84 in — matches CABINET_HEIGHTS_FT in sceneBuilder.js

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
    return { items: buildFixtureItems(layout, W, L, Date.now()), zones };
  }

  const catalog   = buildCatalog(products);
  const timestamp = Date.now();
  let   itemIdx   = 0;
  const allItems  = [];

  // Pre-compute fixture footprint exclusions per base zone so that fill cursors
  // jump over fixture slots cleanly — no partial-overlap deletions, no gaps.
  const slots = getFixtureSlots(layout, W, L);
  const exclusionsByZone = {};  // zoneId → [{lo, hi}] in run-direction coords
  for (const slot of Object.values(slots)) {
    if (!exclusionsByZone[slot.zoneId]) exclusionsByZone[slot.zoneId] = [];
    const slotNS = slot.zoneId.includes("-west") || slot.zoneId.includes("-east");
    exclusionsByZone[slot.zoneId].push(
      slotNS
        ? { lo: slot.z, hi: slot.z + slot.d }
        : { lo: slot.x, hi: slot.x + slot.w }
    );
  }

  for (const zone of zones) {
    const pool = selectPool(zone, catalog);
    // Graceful fallback: if there are no products in the right category use all
    const effectivePool = pool.length > 0 ? pool : catalog.all;
    if (effectivePool.length === 0) continue;

    const zoneExclusions = exclusionsByZone[zone.id];
    if (!zoneExclusions || zone.type !== "base") {
      // Upper / island / peninsula zones have no fixture exclusions — fill whole zone
      const zoneItems = fillZone(zone, effectivePool, timestamp, itemIdx);
      itemIdx += zoneItems.length;
      allItems.push(...zoneItems);
      continue;
    }

    // Base zone: fill only the segments between (and beyond) fixture footprints
    const ns       = isNS(zone);
    const runStart = ns ? zone.y2d : zone.x2d;
    const runEnd   = runStart + (ns ? zone.depthFt : zone.widthFt);
    const sorted   = [...zoneExclusions].sort((a, b) => a.lo - b.lo);

    let cursor = runStart;
    for (const { lo, hi } of sorted) {
      if (lo > cursor + 0.02) {
        const seg      = makeSubZone(zone, cursor, lo, ns);
        const segItems = fillZone(seg, effectivePool, timestamp, itemIdx);
        itemIdx += segItems.length;
        allItems.push(...segItems);
      }
      cursor = Math.max(cursor, hi);
    }
    if (runEnd > cursor + 0.02) {
      const seg      = makeSubZone(zone, cursor, runEnd, ns);
      const segItems = fillZone(seg, effectivePool, timestamp, itemIdx);
      itemIdx += segItems.length;
      allItems.push(...segItems);
    }
  }

  // Post-process: remove Wall Cabinet items directly above a Tall Unit on the same wall.
  // EW zones (north wall): overlap is checked along the X axis.
  // NS zones (west/east walls): overlap is checked along the Z axis.
  const tallItems = allItems.filter((i) => i.category === "Tall Units");
  let finalItems = allItems;
  if (tallItems.length > 0) {
    finalItems = allItems.filter((item) => {
      if (item.category !== "Wall Cabinets") return true;
      for (const tall of tallItems) {
        const blockedUpperZoneId = tall.zoneId?.replace("base-", "upper-");
        if (!blockedUpperZoneId || item.zoneId !== blockedUpperZoneId) continue;
        const ns = tall.zoneId.includes("-west") || tall.zoneId.includes("-east");
        if (ns) {
          // NS zone: items run along Z; depthFt is the run-direction extent
          const tallZ0 = tall.position.zFt;
          const tallZ1 = tallZ0 + tall.dimensions.depthFt;
          const itemZ0 = item.position.zFt;
          const itemZ1 = itemZ0 + item.dimensions.depthFt;
          if (itemZ0 < tallZ1 - 0.02 && itemZ1 > tallZ0 + 0.02) return false;
        } else {
          // EW zone: items run along X; widthFt is the run-direction extent
          const tallX0 = tall.position.xFt;
          const tallX1 = tallX0 + tall.dimensions.widthFt;
          const itemX0 = item.position.xFt;
          const itemX1 = itemX0 + item.dimensions.widthFt;
          if (itemX0 < tallX1 - 0.02 && itemX1 > tallX0 + 0.02) return false;
        }
      }
      return true;
    });
  }

  // Inject Sink and Range fixtures (zone fills have already left their footprints empty)
  const fixtures = buildFixtureItems(layout, W, L, timestamp);
  return { items: [...finalItems, ...fixtures], zones };
}

// ─── Category helpers (flexible matching) ────────────────────────────────────
// The DB stores short category names ("Base", "Wall", "Tall") or long names
// ("Base Cabinets", "Wall Cabinets", "Tall Units") depending on how the admin
// seeded them. These helpers normalise both forms so the catalog buckets and
// zone-authoritative category assignment always work.

function isCatBase(category) {
  const c = (category || "").toLowerCase().trim();
  return c === "base" || c === "base cabinet" || c === "base cabinets";
}
function isCatWall(category) {
  const c = (category || "").toLowerCase().trim();
  return c === "wall" || c === "wall cabinet" || c === "wall cabinets";
}
function isCatTall(category) {
  const c = (category || "").toLowerCase().trim();
  return c === "tall" || c === "tall unit" || c === "tall units" || c === "pantry";
}

// ─── Orientation helper ───────────────────────────────────────────────────────

/**
 * Returns true if the zone runs north-south (west or east wall runs).
 * Sub-zones created by makeSubZone carry an explicit `_ns` flag to avoid
 * a false result when a short segment has depthFt < widthFt.
 */
function isNS(zone) {
  if (zone._ns !== undefined) return zone._ns;
  return (zone.depthFt || 0) > (zone.widthFt || 0);
}

// ─── Catalog helpers ──────────────────────────────────────────────────────────

/** Splits the product array into category buckets, sorted by width ascending. */
function buildCatalog(products) {
  const sorted = (arr) => [...arr].sort((a, b) => (a.widthFt || 0) - (b.widthFt || 0));
  return {
    base:      sorted(products.filter((p) => isCatBase(p.category))),
    wall:      sorted(products.filter((p) => isCatWall(p.category))),
    tall:      sorted(products.filter((p) => isCatTall(p.category))),
    appliance: sorted(products.filter((p) => (p.category || "").toLowerCase().includes("appliance"))),
    // all: last-resort fallback when a zone's primary pool is empty.
    // Strictly limited to the three structural cabinet categories — Accessories,
    // Vanity, Appliances, and any other category are never auto-placed.
    all:       sorted(products.filter((p) =>
      isCatBase(p.category) || isCatWall(p.category) || isCatTall(p.category)
    )),
  };
}

/**
 * Maps a zone to the appropriate product pool.
 * For base wall runs, Tall Units are included only when their product depthFt
 * matches the zone's cabinet depth (widthFt for NS zones, depthFt for EW zones).
 */
function selectPool(zone, catalog) {
  if (zone.type === "upper")                                  return catalog.wall;
  if (zone.type === "island" || zone.type === "peninsula")    return catalog.base;
  // Wall-run base zones: Base Cabinets + depth-aligned Tall Units.
  // "cabinet depth" = how far the cabinet protrudes from the wall:
  //   EW zone → zone.depthFt   (the short dimension, e.g. 2 ft)
  //   NS zone → zone.widthFt   (the short dimension, e.g. 2 ft)
  const cabinetDepth = isNS(zone) ? (zone.widthFt || 2) : (zone.depthFt || 2);
  const matchedTall  = catalog.tall.filter(
    (p) => Math.abs((p.depthFt || 2) - cabinetDepth) <= 0.25
  );
  return [...catalog.base, ...matchedTall];
}

// ─── Sub-zone helper ──────────────────────────────────────────────────────────

/**
 * Creates a zone slice covering only [segStart, segEnd] along the run axis.
 * Preserves all other zone fields (id, type, heightFt, elevFt, etc.) so that
 * fillZone, buildProductItem, and buildFillerItem work identically on the slice.
 */
function makeSubZone(zone, segStart, segEnd, ns) {
  return {
    ...zone,
    _ns:     ns,
    x2d:     ns ? zone.x2d           : segStart,
    y2d:     ns ? segStart            : zone.y2d,
    widthFt: ns ? zone.widthFt        : segEnd - segStart,
    depthFt: ns ? segEnd - segStart   : zone.depthFt,
  };
}

// ─── Zone filler ─────────────────────────────────────────────────────────────

/**
 * Fills a zone greedily along its run axis:
 *   EW zones → fill along X (cursor: x2d … x2d + widthFt)
 *   NS zones → fill along Z (cursor: y2d … y2d + depthFt)
 *
 *   • Pick the largest catalog product that still fits the remaining run length
 *   • Advance cursor by that product's width
 *   • If nothing fits, insert a filler panel for the residual gap
 */
function fillZone(zone, pool, timestamp, startIdx) {
  const items  = [];
  const ns     = isNS(zone);
  let   cursor = ns ? zone.y2d : zone.x2d;
  const end    = cursor + (ns ? zone.depthFt : zone.widthFt);
  let   idx    = startIdx;

  // Pre-sort descending; exclude products with no usable width (avoids infinite loop
  // if a product has widthFt = 0 / null from a bad DB entry).
  const sortedDesc = [...pool]
    .filter((p) => (p.widthFt || 0) > 0.01)
    .sort((a, b) => (b.widthFt || 0) - (a.widthFt || 0));

  while (cursor < end - 0.02) {
    const remaining = end - cursor;

    // Find the largest product that fits (allow 0.05 ft rounding tolerance)
    const product = sortedDesc.find((p) => (p.widthFt || 0) <= remaining + 0.05);

    if (!product) {
      if (remaining > 0.04) {
        items.push(buildFillerItem(cursor, remaining, zone, timestamp, idx++, ns));
      }
      break;
    }

    items.push(buildProductItem(product, cursor, zone, timestamp, idx++, ns));
    cursor += product.widthFt || 0;
  }

  return items;
}

// ─── Item builders ────────────────────────────────────────────────────────────

function buildProductItem(product, cursor, zone, timestamp, idx, ns = false) {
  // Zone type is fully authoritative for category:
  //   upper  → always "Wall Cabinets"   (Upper 2D layer, wall-mounted elevation)
  //   base   → "Tall Units" if the product is a tall unit (preserves 84" height +
  //             upper-zone blocking logic), "Base Cabinets" for everything else
  // This prevents fallback products (e.g. Wall Cabinets placed in a base zone via
  // catalog.all) from leaking into the wrong 2D layer.
  const category = zone.type === "upper"
    ? "Wall Cabinets"
    : isCatTall(product.category)
      ? "Tall Units"
      : "Base Cabinets";
  // Zone is authoritative for elevation and upper-zone height.
  // Tall Units override the zone's default 36" base height with their own 84".
  const heightFt = category === "Tall Units" ? TALL_UNIT_HEIGHT_FT : zone.heightFt;
  const yFt      = zone.elevFt ?? 0;

  // EW zones: run along X.  xFt = cursor, zFt = zone.y2d
  //   widthFt = product.widthFt (X extent), depthFt = zone.depthFt (Z extent)
  // NS zones: run along Z.  xFt = zone.x2d, zFt = cursor
  //   widthFt = zone.widthFt  (X extent = cabinet depth from wall)
  //   depthFt = product.widthFt (Z extent = door-facing width along the wall)
  const xFt     = ns ? zone.x2d        : cursor;
  const zFt     = ns ? cursor          : zone.y2d;
  const widthFt = ns ? zone.widthFt    : product.widthFt;
  const depthFt = ns ? product.widthFt : zone.depthFt;

  return {
    id:         `item-${timestamp}-${idx}`,
    productId:  product.id,
    sku:        product.sku,
    name:       product.name,
    category,
    dimensions: { widthFt, depthFt, heightFt },
    position:   { xFt, yFt, zFt },
    rotation:   { yDeg: 0 },
    zoneId:     zone.id,
    wallId:     null,
    gltfUrl:     product.gltfUrl    ?? null,
    imageUrl:    product.imageUrl   ?? null,
    doorCount:   product.doorCount  ?? null,
    drawerCount: product.drawerCount ?? null,
    isFiller:   false,
    material:   { color: "#f0ece8", roughness: 0.45, metalness: 0.0, finishId: null },
  };
}

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/**
 * Returns {sink, range} placement slots for the given layout and room size.
 *
 * All layouts except Parallel have a north-wall base run (EW zone, depthFt 2.0).
 * Parallel has only west + east wall runs (NS zones, widthFt 2.0).
 */
function getFixtureSlots(layout, W, L) {
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const D       = 2.0;   // cabinet depth from wall (BASE_DEPTH)
  const SW      = 2.5;   // sink footprint along its wall
  const RW      = 2.5;   // range footprint along its wall
  const MIN_GAP = 1.5;   // minimum counter space between sink and range on same wall

  switch (layout) {

    // ── Galley: opposite side walls ───────────────────────────────────────────
    case "Parallel":
      return {
        sink:  { x: 0,     z: cl(L*0.35 - SW/2, 0, L - SW), w: D, d: SW, zoneId: "base-west" },
        range: { x: W - D, z: cl(L*0.35 - RW/2, 0, L - RW), w: D, d: RW, zoneId: "base-east" },
      };

    // ── Sink on back wall (base-north), Range on west side wall (base-west) ───
    case "L-Shape":
    case "U-Shape":
    case "G-Shape":
      return {
        sink:  { x: cl(W/2 - SW/2, 0, W - SW), z: 0,                             w: SW, d: D,  zoneId: "base-north" },
        range: { x: 0,                          z: cl(L*0.40 - RW/2, D, L - RW), w: D,  d: RW, zoneId: "base-west"  },
      };

    // ── Both on back wall with enforced gap ───────────────────────────────────
    case "Island":
    case "Straight":
    default: {
      let sinkX  = cl(W*0.25 - SW/2, 0, W - SW);
      let rangeX = cl(W*0.62 - RW/2, 0, W - RW);
      if (rangeX < sinkX + SW + MIN_GAP) rangeX = Math.min(sinkX + SW + MIN_GAP, W - RW);
      return {
        sink:  { x: sinkX,  z: 0, w: SW, d: D, zoneId: "base-north" },
        range: { x: rangeX, z: 0, w: RW, d: D, zoneId: "base-north" },
      };
    }
  }
}

/** Builds the two hardcoded fixture scene items (Sink + Range). */
function buildFixtureItems(layout, W, L, timestamp) {
  const H     = 3.0; // matches CABINET_HEIGHTS_FT["Sink"/"Range"] in sceneBuilder.js
  const slots = getFixtureSlots(layout, W, L);
  return [
    {
      id: `fixture-sink-${timestamp}`,  productId: "fixture-sink",
      sku: "FIXTURE-SINK",  name: "Kitchen Sink",  category: "Sink",
      dimensions: { widthFt: slots.sink.w,  depthFt: slots.sink.d,  heightFt: H },
      position:   { xFt: slots.sink.x,  yFt: 0, zFt: slots.sink.z  },
      rotation: { yDeg: 0 }, zoneId: slots.sink.zoneId,  wallId: null,
      gltfUrl: null, imageUrl: null, doorCount: null, drawerCount: null, isFiller: false,
      material: { color: "#d4cfc8", roughness: 0.45, metalness: 0.0, finishId: null },
    },
    {
      id: `fixture-range-${timestamp}`, productId: "fixture-range",
      sku: "FIXTURE-RANGE", name: "Range / Cooktop", category: "Range",
      dimensions: { widthFt: slots.range.w, depthFt: slots.range.d, heightFt: H },
      position:   { xFt: slots.range.x, yFt: 0, zFt: slots.range.z },
      rotation: { yDeg: 0 }, zoneId: slots.range.zoneId, wallId: null,
      gltfUrl: null, imageUrl: null, doorCount: null, drawerCount: null, isFiller: false,
      material: { color: "#c0b8ac", roughness: 0.30, metalness: 0.20, finishId: null },
    },
  ];
}


function buildFillerItem(cursor, runWidth, zone, timestamp, idx, ns = false) {
  const safeWidth = Math.max(0.04, runWidth);
  const category  = zone.type === "upper" ? "Wall Cabinets" : "Base Cabinets";
  // Zone is authoritative for height and elevation (matches buildProductItem).
  const heightFt  = zone.heightFt;
  const yFt       = zone.elevFt ?? 0;

  // Mirror the NS/EW dimension-swap from buildProductItem.
  // safeWidth is the remaining run-direction gap to fill.
  const xFt     = ns ? zone.x2d     : cursor;
  const zFt     = ns ? cursor       : zone.y2d;
  const widthFt = ns ? zone.widthFt : safeWidth;
  const depthFt = ns ? safeWidth    : zone.depthFt;

  return {
    id:         `filler-${timestamp}-${idx}`,
    productId:  null,
    sku:        "FILLER",
    name:       `Filler ${Math.round(safeWidth * 12)}"`,
    category,
    dimensions: { widthFt, depthFt, heightFt },
    position:   { xFt, yFt, zFt },
    rotation:   { yDeg: 0 },
    zoneId:     zone.id,
    wallId:     null,
    gltfUrl:    null,
    imageUrl:   null,
    isFiller:   true,
    material:   { color: "#e8e4df", roughness: 0.6, metalness: 0.0, finishId: null },
  };
}
