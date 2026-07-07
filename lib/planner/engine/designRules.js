/**
 * designRules.js — Professional kitchen design rule validator.
 *
 * Analyzes a scene.items array and returns advisory validation results.
 * Rules NEVER block the user's workflow — they are informational only.
 *
 * All functions are pure — no React, no store imports, no side effects.
 *
 * @returns {Array<{ id, severity, message, affectedItemId }>}
 *   severity: "warning" | "error"
 */

// ─── AABB helpers (local, no circular dep with collision.js) ──────────────────

function getAABB(item) {
  const xFt = item.position?.xFt ?? 0;
  const yFt = item.position?.yFt ?? 0;
  const zFt = item.position?.zFt ?? 0;
  const { widthFt = 2, depthFt = 2, heightFt = 3 } = item.dimensions ?? {};
  return {
    minX: xFt, maxX: xFt + widthFt,
    minY: yFt, maxY: yFt + heightFt,
    minZ: zFt, maxZ: zFt + depthFt,
  };
}

// 3D overlap — items at different vertical elevations (wall vs base) never collide.
function aabbOverlap(a, b) {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

function centerDistance(a, b) {
  const ax = (a.position?.xFt ?? 0) + (a.dimensions?.widthFt ?? 2) / 2;
  const az = (a.position?.zFt ?? 0) + (a.dimensions?.depthFt ?? 2) / 2;
  const bx = (b.position?.xFt ?? 0) + (b.dimensions?.widthFt ?? 2) / 2;
  const bz = (b.position?.zFt ?? 0) + (b.dimensions?.depthFt ?? 2) / 2;
  return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);
}

// ─── Name-based category helpers ─────────────────────────────────────────────

function isDishwasher(item) {
  return item.name?.toLowerCase().includes("dishwasher");
}

function isFridge(item) {
  const n = item.name?.toLowerCase() ?? "";
  return n.includes("refrigerator") || n.includes("fridge");
}

function isSink(item) {
  return item.category === "Sink";
}

function isRange(item) {
  return item.category === "Range";
}

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * @param {Object[]} items          - scene.items (SceneItem[])
 * @param {{ width, length, height }} roomDimensions
 * @returns {Array<{ id, severity, message, affectedItemId }>}
 */
export function validateKitchenLayout(items, roomDimensions) {
  const results = [];
  let counter = 0;
  const nextId = () => `rule-${counter++}`;

  const sinks       = items.filter(isSink);
  const dishwashers = items.filter(isDishwasher);
  const ranges      = items.filter(isRange);
  const fridges     = items.filter(isFridge);

  // ── SINK rules ──────────────────────────────────────────────────────────────

  for (const sink of sinks) {
    // Sink must not physically overlap any other item
    const overlapping = items.filter(
      (i) => i.id !== sink.id && aabbOverlap(getAABB(sink), getAABB(i))
    );
    if (overlapping.length > 0) {
      results.push({
        id: nextId(),
        severity: "error",
        message: "Sink is overlapping another item. Move or remove the conflicting cabinet.",
        affectedItemId: sink.id,
      });
    }
  }

  // ── DISHWASHER rules ────────────────────────────────────────────────────────

  for (const dw of dishwashers) {
    if (sinks.length === 0) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: "Dishwasher is placed but no sink is in the layout.",
        affectedItemId: dw.id,
      });
      continue;
    }
    // Dishwasher should be adjacent to a sink (within 3 ft center-to-center)
    const nearSink = sinks.some((s) => centerDistance(dw, s) < 3.0);
    if (!nearSink) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: "Dishwasher should be placed adjacent to the sink (within 3 ft).",
        affectedItemId: dw.id,
      });
    }
  }

  // ── RANGE / COOKTOP rules ───────────────────────────────────────────────────

  const RANGE_CLEARANCE_FT = 2.0;

  for (const range of ranges) {
    const xFt     = range.position?.xFt ?? 0;
    const zFt     = range.position?.zFt ?? 0;
    const widthFt  = range.dimensions?.widthFt ?? 2;
    const depthFt  = range.dimensions?.depthFt ?? 2;

    // Determine orientation: an NS range runs along Z (west/east wall, depthFt > widthFt).
    // An EW range runs along X (north wall, widthFt >= depthFt).
    // The clearance check must use the axis perpendicular to the run direction —
    // i.e. the axis along which neighbor cabinets sit beside the range.
    const isNSRange = depthFt > widthFt;

    const tooClose = items.filter((i) => {
      if (i.id === range.id || isRange(i)) return false;
      const ib = getAABB(i);

      if (isNSRange) {
        // NS range (west/east wall): run axis is Z, neighbors sit along Z.
        // Check clearance along Z — neighbor must share the same X band (same wall).
        const inXBand = ib.maxX > xFt && ib.minX < xFt + widthFt;
        if (!inXBand) return false;
        const belowConflict = ib.maxZ > zFt  - RANGE_CLEARANCE_FT && ib.maxZ <= zFt;
        const aboveConflict = ib.minZ < zFt  + depthFt + RANGE_CLEARANCE_FT && ib.minZ >= zFt + depthFt;
        return belowConflict || aboveConflict;
      } else {
        // EW range (north wall): run axis is X, neighbors sit along X.
        // Check clearance along X — neighbor must share the same Z band (same wall depth).
        const inZBand = ib.maxZ > zFt && ib.minZ < zFt + depthFt;
        if (!inZBand) return false;
        const leftConflict  = ib.maxX > xFt - RANGE_CLEARANCE_FT && ib.maxX <= xFt;
        const rightConflict = ib.minX < xFt + widthFt + RANGE_CLEARANCE_FT && ib.minX >= xFt + widthFt;
        return leftConflict || rightConflict;
      }
    });

    if (tooClose.length > 0) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: `Range/cooktop requires ${RANGE_CLEARANCE_FT} ft clearance on each side for safety.`,
        affectedItemId: range.id,
      });
    }
  }

  // ── REFRIGERATOR rules ──────────────────────────────────────────────────────

  const FRIDGE_SWING_CLEARANCE_FT = 3.0;

  for (const fridge of fridges) {
    const frontZ = (fridge.position?.zFt ?? 0) + (fridge.dimensions?.depthFt ?? 2);
    const clearanceEnd = frontZ + FRIDGE_SWING_CLEARANCE_FT;

    // Warn if the door-swing zone extends beyond the room
    if (clearanceEnd > (roomDimensions?.length ?? Infinity)) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: `Refrigerator may have insufficient door-swing clearance (needs ${FRIDGE_SWING_CLEARANCE_FT} ft in front).`,
        affectedItemId: fridge.id,
      });
    }

    // Warn if another item is directly in front within swing clearance
    const fridgeAABB = getAABB(fridge);
    const blocking = items.filter((i) => {
      if (i.id === fridge.id) return false;
      const ib = getAABB(i);
      // Must overlap in X and be in the clearance Z band in front of fridge
      const xOverlap = ib.minX < fridgeAABB.maxX && ib.maxX > fridgeAABB.minX;
      const inFront  = ib.minZ >= fridgeAABB.maxZ && ib.minZ < fridgeAABB.maxZ + FRIDGE_SWING_CLEARANCE_FT;
      return xOverlap && inFront;
    });

    if (blocking.length > 0) {
      results.push({
        id: nextId(),
        severity: "warning",
        message: "An item is blocking the refrigerator's door-swing clearance zone.",
        affectedItemId: fridge.id,
      });
    }
  }

  // ── GENERAL: duplicate items at same position ────────────────────────────────

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (aabbOverlap(getAABB(a), getAABB(b))) {
        // Only report if not already covered by a specific rule above
        const alreadyReported = results.some(
          (r) => r.affectedItemId === a.id || r.affectedItemId === b.id
        );
        if (!alreadyReported) {
          results.push({
            id: nextId(),
            severity: "error",
            message: `"${a.name || a.sku}" overlaps "${b.name || b.sku}". Move one of them.`,
            affectedItemId: a.id,
          });
        }
      }
    }
  }

  return results;
}
