/**
 * layoutPresets.js
 *
 * Defines the rough cabinet run footprints for each kitchen layout type.
 * These are visual-only placeholders — they represent where cabinet runs
 * would typically sit so the customer can see the layout immediately upon
 * entering Step 3, before placing real products.
 *
 * Coordinate system (matches both Konva 2D canvas and Three.js XZ plane):
 *   x2d  = east–west, 0 at west interior face
 *   y2d  = north–south, 0 at north interior face  → maps to z in Three.js
 *   elevFt = elevation from floor (used as y in Three.js)
 *
 * All dimensions in feet (1 ft = 1 Three.js unit = 60 Konva px at zoom 1).
 */

// ─── Standard cabinet dimensions ────────────────────────────────────────────
export const BASE_DEPTH    = 2.0;   // 24" — standard base cabinet run depth
export const BASE_HEIGHT   = 3.0;   // 36" — standard base cabinet run height
export const UPPER_DEPTH   = 1.0;   // 12" — wall cabinet depth
export const UPPER_HEIGHT  = 2.5;   // 30" — wall cabinet height
export const UPPER_ELEV    = 4.5;   // 54" — wall cabinet mount height from floor
export const COUNTER_THICK = 0.12;  // 1.5" countertop slab thickness

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Returns an array of cabinet run descriptors for the given layout + room.
 *
 * Each run descriptor:
 * {
 *   id       : string        — unique identifier
 *   x2d      : number (ft)   — west edge of run
 *   y2d      : number (ft)   — north edge of run (= Three.js z)
 *   widthFt  : number (ft)   — east–west extent
 *   depthFt  : number (ft)   — north–south extent
 *   heightFt : number (ft)   — vertical height
 *   elevFt   : number (ft)   — floor elevation (y in Three.js)
 *   type     : "base" | "upper" | "island" | "peninsula"
 * }
 */
export function buildLayoutRuns(layout, { width: W, length: L }) {
  const D  = BASE_DEPTH;
  const H  = BASE_HEIGHT;
  const UD = UPPER_DEPTH;
  const UH = UPPER_HEIGHT;
  const UE = UPPER_ELEV;

  switch (layout) {
    // ── Single wall ──────────────────────────────────────────────────────────
    case "Straight":
      return [
        { id: "base-north",  x2d: 0, y2d: 0, widthFt: W,  depthFt: D,  heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "upper-north", x2d: 0, y2d: 0, widthFt: W,  depthFt: UD, heightFt: UH, elevFt: UE, type: "upper" },
      ];

    // ── Two walls ────────────────────────────────────────────────────────────
    case "L-Shape":
      return [
        { id: "base-north",  x2d: 0, y2d: 0,  widthFt: W,   depthFt: D,    heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "base-west",   x2d: 0, y2d: D,  widthFt: D,   depthFt: L - D, heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "upper-north", x2d: 0, y2d: 0,  widthFt: W,   depthFt: UD,   heightFt: UH, elevFt: UE, type: "upper" },
        { id: "upper-west",  x2d: 0, y2d: UD, widthFt: UD,  depthFt: L - UD, heightFt: UH, elevFt: UE, type: "upper" },
      ];

    // ── Three walls ──────────────────────────────────────────────────────────
    case "U-Shape":
      return [
        { id: "base-north",  x2d: 0,     y2d: 0,  widthFt: W,   depthFt: D,      heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "base-west",   x2d: 0,     y2d: D,  widthFt: D,   depthFt: L - D,  heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "base-east",   x2d: W - D, y2d: D,  widthFt: D,   depthFt: L - D,  heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "upper-north", x2d: 0,     y2d: 0,  widthFt: W,   depthFt: UD,     heightFt: UH, elevFt: UE, type: "upper" },
        { id: "upper-west",  x2d: 0,     y2d: UD, widthFt: UD,  depthFt: L - UD, heightFt: UH, elevFt: UE, type: "upper" },
        { id: "upper-east",  x2d: W - UD,y2d: UD, widthFt: UD,  depthFt: L - UD, heightFt: UH, elevFt: UE, type: "upper" },
      ];

    // ── Two parallel walls (Galley) ───────────────────────────────────────────
    case "Parallel":
      return [
        { id: "base-north",  x2d: 0, y2d: 0,     widthFt: W, depthFt: D,  heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "base-south",  x2d: 0, y2d: L - D, widthFt: W, depthFt: D,  heightFt: H,  elevFt: 0,  type: "base"  },
        { id: "upper-north", x2d: 0, y2d: 0,     widthFt: W, depthFt: UD, heightFt: UH, elevFt: UE, type: "upper" },
        { id: "upper-south", x2d: 0, y2d: L - UD,widthFt: W, depthFt: UD, heightFt: UH, elevFt: UE, type: "upper" },
      ];

    // ── Back wall + island ───────────────────────────────────────────────────
    case "Island": {
      const iW  = Math.min(W * 0.48, 5.0);
      const iD  = Math.min(L * 0.22, 3.0);
      const iX  = (W - iW) / 2;
      const iZ  = L / 2 + 0.5;
      return [
        { id: "base-north",  x2d: 0,  y2d: 0,  widthFt: W,  depthFt: D,  heightFt: H,  elevFt: 0,  type: "base"   },
        { id: "island",      x2d: iX, y2d: iZ, widthFt: iW, depthFt: iD, heightFt: H,  elevFt: 0,  type: "island" },
        { id: "upper-north", x2d: 0,  y2d: 0,  widthFt: W,  depthFt: UD, heightFt: UH, elevFt: UE, type: "upper"  },
      ];
    }

    // ── Three walls + peninsula ──────────────────────────────────────────────
    case "G-Shape": {
      const penW = W * 0.42 - D;
      return [
        { id: "base-north",  x2d: 0,      y2d: 0,      widthFt: W,    depthFt: D,      heightFt: H,  elevFt: 0,  type: "base"      },
        { id: "base-west",   x2d: 0,      y2d: D,      widthFt: D,    depthFt: L - D,  heightFt: H,  elevFt: 0,  type: "base"      },
        { id: "base-east",   x2d: W - D,  y2d: D,      widthFt: D,    depthFt: L - D,  heightFt: H,  elevFt: 0,  type: "base"      },
        { id: "peninsula",   x2d: D,      y2d: L - D,  widthFt: penW, depthFt: D,      heightFt: H,  elevFt: 0,  type: "peninsula" },
        { id: "upper-north", x2d: 0,      y2d: 0,      widthFt: W,    depthFt: UD,     heightFt: UH, elevFt: UE, type: "upper"     },
        { id: "upper-west",  x2d: 0,      y2d: UD,     widthFt: UD,   depthFt: L - UD, heightFt: UH, elevFt: UE, type: "upper"     },
        { id: "upper-east",  x2d: W - UD, y2d: UD,     widthFt: UD,   depthFt: L - UD, heightFt: UH, elevFt: UE, type: "upper"     },
      ];
    }

    default:
      return [];
  }
}
