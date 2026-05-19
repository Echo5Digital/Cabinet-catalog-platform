import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";

// ── Layout → active wall IDs ───────────────────────────────────────────────
const WALL_LAYOUTS = {
  singlewall: { walls: ["A"],                        hasIsland: false },
  galley:     { walls: ["A", "C"],                   hasIsland: false },
  lshaped:    { walls: ["A", "B"],                   hasIsland: false },
  ushaped:    { walls: ["A", "B", "D"],              hasIsland: false },
  island:     { walls: ["A", "B"],                   hasIsland: true  },
  gshaped:    { walls: ["A", "B", "D", "C-partial"], hasIsland: false },
};

// ── Visual palette — matches warm kitchen render colors ────────────────────
const C = {
  wall:       "#4A4844",   // thick wall fill
  floor:      "#F5F2EC",   // room floor
  cab:        "#C4AE94",   // cabinet fill (warm beige/tan)
  cabStr:     "#8B7D6B",   // cabinet stroke
  upperCab:   "#E8E0D4",   // upper cabinets (lighter)
  counter:    "#DEDAD3",   // counter surface
  backsplash: "#F2E5C8",   // warm backsplash
  toekick:    "#2A2520",   // toe kick
  dimLine:    "#9A9590",   // dimension lines
  dimText:    "#4A4540",   // dimension text
  head:       "#1C1917",   // headings
  accent:     "#6E1020",   // section label accent
  divider:    "#D6D3D1",   // divider lines
  ceilLine:   "#C8C4C0",   // ceiling indicator
  bg:         "#FFFFFF",   // canvas background
};

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getWallLayout(n) {
  return WALL_LAYOUTS[n] || WALL_LAYOUTS.lshaped;
}

// Wall usable length in inches (12" deducted each end for walls)
function wallLengthIn(id, wFt, dFt) {
  if (id === "C-partial") return (wFt * 12 - 12) / 2;
  if (id === "A" || id === "C") return wFt * 12 - 12;
  return dFt * 12 - 12; // B or D
}

function selectProductsForWall(lenIn, products, wallId, placement) {
  const sorted = [...products].sort((a, b) => (b.width_in || 0) - (a.width_in || 0));
  let rem = lenIn;
  const out = [];
  for (const p of sorted) {
    const w = parseFloat(p.width_in) || 0;
    if (w > 0 && w <= rem) {
      out.push({ sku: p.sku, product_name: p.name, qty: 1, wall: wallId, placement, width_in: w });
      rem -= w;
      if (rem < 12) break;
    }
  }
  return out;
}

function fpScale(wFt, dFt) {
  return Math.min(400 / (wFt * 12), 340 / (dFt * 12));
}

function elevScaleX(wallIds, wFt, dFt) {
  // Use full room interior dimension so the elevation scale matches what the user entered.
  const longest = Math.max(
    ...wallIds.map((id) => {
      if (id === "A" || id === "C") return wFt * 12;
      if (id === "C-partial")       return wFt * 6;
      return dFt * 12; // B or D
    })
  );
  return Math.min(520 / longest, 4.0);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Active corner IDs: TL (A+D), TR (A+B), BR (B+C), BL (C+D)
function getActiveCorners(wallIds) {
  const has = (id) =>
    wallIds.some((w) => w === id || (id === "C" && w === "C-partial"));
  const s = new Set();
  if (has("A") && has("D")) s.add("TL");
  if (has("A") && has("B")) s.add("TR");
  if (has("B") && has("C")) s.add("BR");
  if (has("C") && has("D")) s.add("BL");
  return s;
}

// ── Floor Plan (top view) ──────────────────────────────────────────────────
function buildFloorPlanSection(wFt, dFt, s, wallIds, hasIsland, wallProds) {
  const wMm = Math.round(wFt * 304.8);
  const dMm = Math.round(dFt * 304.8);

  const roomW = wFt * 12 * s;
  const roomD = dFt * 12 * s;
  const WT = 18; // wall thickness in px — thick enough for wall-badge labels

  // Room position within left column (parent applies translate(20,40))
  const ox = Math.max(55, (540 - roomW) / 2 + 10);
  const oy = 58;

  const oR = ox + roomW;
  const oB = oy + roomD;
  const iL = ox + WT, iR = oR - WT;
  const iT = oy + WT, iB = oB - WT;
  const iW = iR - iL, iH = iB - iT;

  // Cabinet depth is exactly 24" (standard base cabinet depth = 610 mm)
  const baseD = 24 * s;
  const tallSz = baseD; // corner tall cab is a square the same depth as base

  const corners = getActiveCorners(wallIds);

  let svg = "";

  // ── Corner tall cabinet blocks ─────────────────────────────────────────
  const CAB_FILL = `fill="${C.cab}" stroke="${C.cabStr}" stroke-width="1"`;

  function drawCornerBlock(cx, cy) {
    svg += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${tallSz.toFixed(1)}" height="${tallSz.toFixed(1)}" ${CAB_FILL}/>`;
    // Cross-hatch marks tall (pantry/oven) cabinet symbol
    svg += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + tallSz).toFixed(1)}" y2="${(cy + tallSz).toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.7"/>`;
    svg += `<line x1="${(cx + tallSz).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy + tallSz).toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.7"/>`;
  }

  if (corners.has("TL")) drawCornerBlock(iL, iT);
  if (corners.has("TR")) drawCornerBlock(iR - tallSz, iT);
  if (corners.has("BR")) drawCornerBlock(iR - tallSz, iB - tallSz);
  if (corners.has("BL")) drawCornerBlock(iL, iB - tallSz);

  // ── Cabinet footprints ─────────────────────────────────────────────────
  for (const wid of wallIds) {
    const prods = wallProds[wid] || { base: [] };
    let bx, by, bw, bh;

    if (wid === "A") {
      const sX = iL + (corners.has("TL") ? tallSz : 0);
      const eX = iR - (corners.has("TR") ? tallSz : 0);
      bx = sX; by = iT; bw = eX - sX; bh = baseD;
    } else if (wid === "C" || wid === "C-partial") {
      const sX = iL + (corners.has("BL") ? tallSz : 0);
      const eX = iR - (corners.has("BR") ? tallSz : 0);
      bw = wid === "C-partial" ? (eX - sX) / 2 : eX - sX;
      bx = sX; by = iB - baseD; bh = baseD;
    } else if (wid === "B") {
      const sY = iT + (corners.has("TR") ? tallSz : 0);
      const eY = iB - (corners.has("BR") ? tallSz : 0);
      bx = iR - baseD; by = sY; bw = baseD; bh = eY - sY;
    } else if (wid === "D") {
      const sY = iT + (corners.has("TL") ? tallSz : 0);
      const eY = iB - (corners.has("BL") ? tallSz : 0);
      bx = iL; by = sY; bw = baseD; bh = eY - sY;
    } else {
      continue;
    }

    const bwS = Math.max(0, bw);
    const bhS = Math.max(0, bh);
    if (bwS < 1 || bhS < 1) continue;

    svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bwS.toFixed(1)}" height="${bhS.toFixed(1)}" ${CAB_FILL}/>`;

    // Door division lines
    const horiz = wid === "A" || wid === "C" || wid === "C-partial";
    const divStep = Math.max(28, 36 * s);

    if (prods.base.length > 0) {
      let cur = 0;
      for (const p of prods.base) {
        const pw = (p.width_in || 0) * s;
        cur += pw;
        if (horiz && cur < bwS - 2) {
          svg += `<line x1="${(bx + cur).toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + cur).toFixed(1)}" y2="${(by + bhS).toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
        } else if (!horiz && cur < bhS - 2) {
          svg += `<line x1="${bx.toFixed(1)}" y1="${(by + cur).toFixed(1)}" x2="${(bx + bwS).toFixed(1)}" y2="${(by + cur).toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
        }
        // SKU label centered in door span
        const lx = horiz ? bx + cur - pw / 2 : bx + bwS / 2;
        const ly = horiz ? by + bhS / 2 : by + cur - pw / 2;
        if (bhS > 12 && bwS > 12) {
          const rot = horiz ? "" : ` transform="rotate(-90,${lx.toFixed(1)},${ly.toFixed(1)})"`;
          svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-family="Arial,sans-serif" font-size="7" fill="#3A3028" text-anchor="middle" dominant-baseline="middle" font-weight="700"${rot}>${esc(p.sku)}</text>`;
        }
      }
    } else {
      if (horiz) {
        for (let x = divStep; x < bwS - 4; x += divStep)
          svg += `<line x1="${(bx + x).toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + x).toFixed(1)}" y2="${(by + bhS).toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      } else {
        for (let y = divStep; y < bhS - 4; y += divStep)
          svg += `<line x1="${bx.toFixed(1)}" y1="${(by + y).toFixed(1)}" x2="${(bx + bwS).toFixed(1)}" y2="${(by + y).toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      }
    }
  }

  // ── Island ────────────────────────────────────────────────────────────
  if (hasIsland) {
    const iw = iW * 0.3, ih = iH * 0.22;
    const ix = iL + (iW - iw) / 2;
    const iy = iT + (iH - ih) / 2;
    svg += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" rx="3" fill="${C.cab}" stroke="${C.cabStr}" stroke-width="1"/>`;
    svg += `<text x="${(ix + iw / 2).toFixed(1)}" y="${(iy + ih / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="9" fill="${C.head}" text-anchor="middle" dominant-baseline="middle" font-weight="700">ISLAND</text>`;
  }

  // ── "KITCHEN AREA" label in room center ───────────────────────────────
  const kx = (iL + iR) / 2;
  const ky = (iT + iB) / 2 - (hasIsland ? iH * 0.2 : 0);
  svg += `<text x="${kx.toFixed(1)}" y="${(ky - 8).toFixed(1)}" font-family="Arial,sans-serif" font-size="10" fill="#B0ABA5" text-anchor="middle" font-weight="700" letter-spacing="1.8">KITCHEN AREA</text>`;
  svg += `<text x="${kx.toFixed(1)}" y="${(ky + 9).toFixed(1)}" font-family="Arial,sans-serif" font-size="9.5" fill="#B0ABA5" text-anchor="middle" font-weight="500">${wMm} × ${dMm} mm</text>`;

  // ── Wall label badges A / B / C / D on the wall bands ─────────────────
  // Shown on all four walls so orientation is always clear.
  function drawWallBadge(bx2, by2, label) {
    const bw2 = 17, bh2 = 12, br = 2;
    svg += `<rect x="${(bx2 - bw2 / 2).toFixed(1)}" y="${(by2 - bh2 / 2).toFixed(1)}" width="${bw2}" height="${bh2}" rx="${br}" fill="${C.accent}"/>`;
    svg += `<text x="${bx2.toFixed(1)}" y="${by2.toFixed(1)}" font-family="Arial,sans-serif" font-size="8.5" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" font-weight="800">${label}</text>`;
  }

  // Wall A — top band (centered horizontally)
  drawWallBadge((ox + oR) / 2, oy + WT / 2, "A");
  // Wall B — right band (centered vertically)
  drawWallBadge(oR - WT / 2, (oy + oB) / 2, "B");
  // Wall C — bottom band (centered horizontally)
  drawWallBadge((ox + oR) / 2, oB - WT / 2, "C");
  // Wall D — left band (centered vertically)
  drawWallBadge(ox + WT / 2, (oy + oB) / 2, "D");

  // ── Dimension annotations with arrow heads ─────────────────────────────
  const TK = 6; // tick offset

  // Width dimension — below room
  const dimWY = oB + TK + 2;
  svg += `<line x1="${ox.toFixed(1)}" y1="${(oB + 2).toFixed(1)}" x2="${ox.toFixed(1)}" y2="${(oB + TK + 4).toFixed(1)}" stroke="${C.dimLine}" stroke-width="1"/>`;
  svg += `<line x1="${oR.toFixed(1)}" y1="${(oB + 2).toFixed(1)}" x2="${oR.toFixed(1)}" y2="${(oB + TK + 4).toFixed(1)}" stroke="${C.dimLine}" stroke-width="1"/>`;
  svg += `<line x1="${ox.toFixed(1)}" y1="${dimWY.toFixed(1)}" x2="${oR.toFixed(1)}" y2="${dimWY.toFixed(1)}" stroke="${C.dimLine}" stroke-width="1"/>`;
  // Arrow heads
  svg += `<polygon points="${ox},${dimWY} ${(ox + 5)},${(dimWY - 3)} ${(ox + 5)},${(dimWY + 3)}" fill="${C.dimLine}"/>`;
  svg += `<polygon points="${oR},${dimWY} ${(oR - 5)},${(dimWY - 3)} ${(oR - 5)},${(dimWY + 3)}" fill="${C.dimLine}"/>`;
  svg += `<text x="${((ox + oR) / 2).toFixed(1)}" y="${(oB + TK + 18).toFixed(1)}" font-family="Arial,sans-serif" font-size="11" fill="${C.dimText}" text-anchor="middle" font-weight="700">${wMm} mm</text>`;

  // Depth dimension — left of room
  const dimDX = ox - TK - 2;
  svg += `<line x1="${(ox - 2).toFixed(1)}" y1="${oy.toFixed(1)}" x2="${(ox - TK - 4).toFixed(1)}" y2="${oy.toFixed(1)}" stroke="${C.dimLine}" stroke-width="1"/>`;
  svg += `<line x1="${(ox - 2).toFixed(1)}" y1="${oB.toFixed(1)}" x2="${(ox - TK - 4).toFixed(1)}" y2="${oB.toFixed(1)}" stroke="${C.dimLine}" stroke-width="1"/>`;
  svg += `<line x1="${dimDX.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${dimDX.toFixed(1)}" y2="${oB.toFixed(1)}" stroke="${C.dimLine}" stroke-width="1"/>`;
  // Arrow heads
  svg += `<polygon points="${dimDX},${oy} ${(dimDX - 3)},${(oy + 5)} ${(dimDX + 3)},${(oy + 5)}" fill="${C.dimLine}"/>`;
  svg += `<polygon points="${dimDX},${oB} ${(dimDX - 3)},${(oB - 5)} ${(dimDX + 3)},${(oB - 5)}" fill="${C.dimLine}"/>`;
  const dtx = (ox - TK - 16).toFixed(1);
  const dty = ((oy + oB) / 2).toFixed(1);
  svg += `<text x="${dtx}" y="${dty}" font-family="Arial,sans-serif" font-size="11" fill="${C.dimText}" text-anchor="middle" font-weight="700" transform="rotate(-90,${dtx},${dty})">${dMm} mm</text>`;

  return `<g transform="translate(20,40)">
  <text x="0" y="14" font-family="Arial,sans-serif" font-size="10.5" fill="${C.accent}" font-weight="800" letter-spacing="1.5">FLOOR PLAN  (TOP VIEW)</text>
  <!-- Outer wall fill -->
  <rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${roomW.toFixed(1)}" height="${roomD.toFixed(1)}" fill="${C.wall}"/>
  <!-- Inner floor -->
  <rect x="${iL.toFixed(1)}" y="${iT.toFixed(1)}" width="${iW.toFixed(1)}" height="${iH.toFixed(1)}" fill="${C.floor}"/>
  ${svg}
</g>`;
}

// ── Cabinet Elevations ─────────────────────────────────────────────────────
function buildElevationSection(wallIds, wFt, dFt, hFt, sx, wallProds) {
  // Available height: translate(601,40), content y=0 to 780 (820-40)
  const AVAIL_H = 774;
  const wallCnt = wallIds.length;
  const slotH   = Math.floor((AVAIL_H - 24) / wallCnt);
  const boxH    = slotH - 40;

  // Standard kitchen heights in inches
  const toeIn  = 3.5, baseIn = 31, ctrIn  = 1.5;
  const bsIn   = 18,  upIn   = 30;

  const sy = boxH / (hFt * 12); // px per inch (elevation scale)

  const corners = getActiveCorners(wallIds);

  let out = "";

  wallIds.forEach((wid, idx) => {
    const ySlot = 24 + idx * slotH;
    // Full interior dimension — same value the user entered.
    const wallFullIn = (wid === "A" || wid === "C") ? wFt * 12
                     : (wid === "C-partial")         ? wFt * 6
                     : dFt * 12;
    const boxW  = Math.min(wallFullIn * sx, 530);
    const boxX  = 10;
    const boxY  = ySlot + 32;

    // Layer heights in px (bottom → up)
    const toePx  = toeIn * sy,  basePx = baseIn * sy;
    const ctrPx  = ctrIn * sy,  bsPx   = bsIn   * sy;
    const upPx   = upIn  * sy;

    const flY    = boxY + boxH;
    const toeT   = flY  - toePx;
    const baseT  = toeT - basePx;
    const ctrT   = baseT - ctrPx;
    const bsT    = ctrT  - bsPx;
    const upT    = bsT   - upPx;
    const ceilY  = flY   - hFt * 12 * sy;

    // Which ends of this wall have corner tall cabinets?
    let hasL = false, hasR = false;
    if      (wid === "A")                        { hasL = corners.has("TL"); hasR = corners.has("TR"); }
    else if (wid === "B")                        { hasL = corners.has("TR"); hasR = corners.has("BR"); }
    else if (wid === "C" || wid === "C-partial") { hasL = corners.has("BL"); hasR = corners.has("BR"); }
    else if (wid === "D")                        { hasL = corners.has("TL"); hasR = corners.has("BL"); }

    const tallW  = 24 * sx; // exactly 24" = 610 mm
    const cabX   = boxX + (hasL ? tallW : 0);
    const cabEnd = boxX + boxW - (hasR ? tallW : 0);
    const cabW   = Math.max(0, cabEnd - cabX);

    const prods = wallProds[wid] || { base: [], upper: [] };
    const dStep  = Math.max(24, 36 * sx);

    // 1 — Background box
    out += `<rect x="${boxX}" y="${boxY.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="#FAFAF7" stroke="${C.divider}" stroke-width="0.75"/>`;
    // 2 — Ceiling line (dashed) + label
    out += `<line x1="${boxX}" y1="${ceilY.toFixed(1)}" x2="${(boxX + boxW).toFixed(1)}" y2="${ceilY.toFixed(1)}" stroke="${C.ceilLine}" stroke-width="1" stroke-dasharray="5,3"/>`;
    if (upPx > 18)
      out += `<text x="${(boxX + 5).toFixed(1)}" y="${(ceilY - 3).toFixed(1)}" font-family="Arial,sans-serif" font-size="6.5" fill="${C.ceilLine}" font-style="italic">CEILING</text>`;

    if (cabW > 0) {
      // 3 — Upper cabinets
      out += `<rect x="${cabX.toFixed(1)}" y="${upT.toFixed(1)}" width="${cabW.toFixed(1)}" height="${upPx.toFixed(1)}" fill="${C.upperCab}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      // 4 — Backsplash
      out += `<rect x="${cabX.toFixed(1)}" y="${bsT.toFixed(1)}" width="${cabW.toFixed(1)}" height="${bsPx.toFixed(1)}" fill="${C.backsplash}" stroke="${C.cabStr}" stroke-width="0.6"/>`;
      if (bsPx > 12)
        out += `<text x="${(cabX + cabW / 2).toFixed(1)}" y="${((bsT + ctrT) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7.5" fill="#9A7A5A" text-anchor="middle" dominant-baseline="middle" font-style="italic" font-weight="600">BACKSPLASH</text>`;
      // 5 — Counter
      out += `<rect x="${cabX.toFixed(1)}" y="${ctrT.toFixed(1)}" width="${cabW.toFixed(1)}" height="${ctrPx.toFixed(1)}" fill="${C.counter}" stroke="${C.cabStr}" stroke-width="0.5"/>`;
      // 6 — Base cabinet body
      out += `<rect x="${cabX.toFixed(1)}" y="${baseT.toFixed(1)}" width="${cabW.toFixed(1)}" height="${basePx.toFixed(1)}" fill="${C.cab}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      // 7 — Toe kick
      out += `<rect x="${cabX.toFixed(1)}" y="${toeT.toFixed(1)}" width="${cabW.toFixed(1)}" height="${toePx.toFixed(1)}" fill="${C.toekick}"/>`;

      // Base door lines / SKU labels
      if (prods.base.length > 0) {
        let cur = 0;
        for (const p of prods.base) {
          const pw = (p.width_in || 0) * sx;
          const divX = cabX + cur + pw;
          if (divX < cabEnd - 1)
            out += `<line x1="${divX.toFixed(1)}" y1="${baseT.toFixed(1)}" x2="${divX.toFixed(1)}" y2="${toeT.toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
          const lx = cabX + cur + pw / 2;
          out += `<text x="${lx.toFixed(1)}" y="${((baseT + toeT) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7" fill="#3A3028" text-anchor="middle" dominant-baseline="middle" font-weight="700">${esc(p.sku)}</text>`;
          // mm dimension above box
          out += `<text x="${lx.toFixed(1)}" y="${(boxY - 7).toFixed(1)}" font-family="Arial,sans-serif" font-size="6.5" fill="${C.dimText}" text-anchor="middle" font-weight="600">${Math.round((p.width_in || 0) * 25.4)}mm</text>`;
          cur += pw;
        }
      } else {
        for (let x = dStep; x < cabW - 4; x += dStep)
          out += `<line x1="${(cabX + x).toFixed(1)}" y1="${baseT.toFixed(1)}" x2="${(cabX + x).toFixed(1)}" y2="${toeT.toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      }

      // Upper door lines / SKU labels
      if (prods.upper.length > 0) {
        let cur = 0;
        for (const p of prods.upper) {
          const pw = (p.width_in || 0) * sx;
          const divX = cabX + cur + pw;
          if (divX < cabEnd - 1)
            out += `<line x1="${divX.toFixed(1)}" y1="${upT.toFixed(1)}" x2="${divX.toFixed(1)}" y2="${bsT.toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
          const lx = cabX + cur + pw / 2;
          out += `<text x="${lx.toFixed(1)}" y="${((upT + bsT) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7" fill="#3A3028" text-anchor="middle" dominant-baseline="middle" font-weight="700">${esc(p.sku)}</text>`;
          cur += pw;
        }
      } else {
        for (let x = dStep; x < cabW - 4; x += dStep)
          out += `<line x1="${(cabX + x).toFixed(1)}" y1="${upT.toFixed(1)}" x2="${(cabX + x).toFixed(1)}" y2="${bsT.toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      }
    }

    // 8 — Tall corner cabinet columns (floor-to-ceiling, drawn on top)
    function drawTallCol(tx) {
      out += `<rect x="${tx.toFixed(1)}" y="${ceilY.toFixed(1)}" width="${tallW.toFixed(1)}" height="${(flY - ceilY).toFixed(1)}" fill="${C.cab}" stroke="${C.cabStr}" stroke-width="0.8"/>`;
      // Toe kick on tall column
      out += `<rect x="${tx.toFixed(1)}" y="${toeT.toFixed(1)}" width="${tallW.toFixed(1)}" height="${toePx.toFixed(1)}" fill="${C.toekick}"/>`;
      out += `<line x1="${tx.toFixed(1)}" y1="${toeT.toFixed(1)}" x2="${(tx + tallW).toFixed(1)}" y2="${toeT.toFixed(1)}" stroke="${C.cabStr}" stroke-width="0.6"/>`;
    }
    if (hasL) drawTallCol(boxX);
    if (hasR) drawTallCol(boxX + boxW - tallW);

    // 9 — Floor line (on top of everything)
    out += `<line x1="${boxX}" y1="${flY.toFixed(1)}" x2="${(boxX + boxW).toFixed(1)}" y2="${flY.toFixed(1)}" stroke="${C.head}" stroke-width="2"/>`;

    // 10 — Right-side dimension bracket + callouts (mm)
    const drX = boxX + boxW + 8;
    const ctrHtMm = Math.round((toeIn + baseIn + ctrIn) * 25.4); // ≈914
    const upHtMm  = Math.round(upIn  * 25.4);                    // ≈762
    const bsHtMm  = Math.round(bsIn  * 25.4);                    // ≈457
    const hMm     = Math.round(hFt * 304.8);

    // Short horizontal ticks
    const tickLen = 8;
    [[flY], [ctrT], [upT], [bsT], [ceilY]].forEach(([yy]) => {
      out += `<line x1="${(boxX + boxW).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(drX + tickLen).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="${C.dimLine}" stroke-width="0.6"/>`;
    });
    // Vertical bracket spine
    out += `<line x1="${(drX + tickLen).toFixed(1)}" y1="${ceilY.toFixed(1)}" x2="${(drX + tickLen).toFixed(1)}" y2="${flY.toFixed(1)}" stroke="${C.dimLine}" stroke-width="0.6"/>`;

    // Labels
    out += `<text x="${(drX + tickLen + 4).toFixed(1)}" y="${((ctrT + flY) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7.5" fill="${C.dimText}" dominant-baseline="middle" font-weight="600">${ctrHtMm}mm</text>`;
    out += `<text x="${(drX + tickLen + 4).toFixed(1)}" y="${((upT + bsT) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7.5" fill="${C.dimText}" dominant-baseline="middle" font-weight="600">${upHtMm}mm</text>`;
    out += `<text x="${(drX + tickLen + 4).toFixed(1)}" y="${((bsT + ctrT) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7" fill="${C.dimText}" dominant-baseline="middle">${bsHtMm}mm</text>`;
    out += `<text x="${(drX + tickLen + 4).toFixed(1)}" y="${((ceilY + flY) / 2).toFixed(1)}" font-family="Arial,sans-serif" font-size="7.5" fill="${C.dimText}" dominant-baseline="middle" font-weight="600">${hMm}mm H</text>`;

    // 11 — Wall label header row: badge + wall id + dimensions
    const lblY   = ySlot + 21;
    const wallMm = (wid === "A" || wid === "C") ? Math.round(wFt * 304.8)
                 : (wid === "C-partial")         ? Math.round(wFt * 152.4)
                 : Math.round(dFt * 304.8);

    // Badge pill
    out += `<rect x="${boxX}" y="${(lblY - 10).toFixed(1)}" width="20" height="14" rx="2" fill="${C.accent}"/>`;
    out += `<text x="${(boxX + 10).toFixed(1)}" y="${(lblY - 3).toFixed(1)}" font-family="Arial,sans-serif" font-size="9" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" font-weight="800">${esc(wid.replace("-partial", ""))}</text>`;
    // Wall ID text
    out += `<text x="${(boxX + 27).toFixed(1)}" y="${(lblY - 3).toFixed(1)}" font-family="Arial,sans-serif" font-size="9.5" fill="${C.accent}" font-weight="700" dominant-baseline="middle">${esc(`WALL ${wid.replace("-partial", " (partial)")}`)}</text>`;
    // Dimension text
    out += `<text x="${(boxX + 27 + 120).toFixed(1)}" y="${(lblY - 3).toFixed(1)}" font-family="Arial,sans-serif" font-size="8.5" fill="${C.dimText}" dominant-baseline="middle" font-weight="500">${wallMm} mm × ${hMm} mm H</text>`;
  });

  return `<g transform="translate(601,40)">
  <text x="0" y="14" font-family="Arial,sans-serif" font-size="10.5" fill="${C.accent}" font-weight="800" letter-spacing="1.5">CABINET PLAN  (ELEVATION VIEWS)</text>
  ${out}
</g>`;
}

// ── Dimensions legend (bottom table) ──────────────────────────────────────
function buildDimensionsLegend(wFt, dFt, hFt) {
  const wMm = Math.round(wFt * 304.8);
  const dMm = Math.round(dFt * 304.8);
  const hMm = Math.round(hFt * 304.8);

  const cells = [
    ["KITCHEN SIZE",         `${wMm} × ${dMm} mm`],
    ["CEILING HEIGHT",       `${hMm} mm`],
    ["BASE CABINET DEPTH",   "610 mm"],
    ["UPPER CABINET DEPTH",  "305 mm"],
    ["COUNTER HEIGHT",       "914 mm"],
    ["UPPER CABINET HEIGHT", "762 mm"],
    ["TOE KICK HEIGHT",      "89 mm"],
  ];

  const cw = Math.floor(1160 / cells.length); // ~165px per cell
  let g = "";
  cells.forEach(([lbl, val], i) => {
    const cx = 20 + i * cw;
    const highlight = i === 0;
    g += `<rect x="${cx}" y="6" width="${cw - 4}" height="46" fill="${highlight ? "#F0EAE4" : "#F5F2EC"}" stroke="${highlight ? C.accent : C.divider}" stroke-width="${highlight ? "1" : "0.5"}"/>`;
    g += `<text x="${cx + 9}" y="20" font-family="Arial,sans-serif" font-size="7" fill="#8A8480" font-weight="700" letter-spacing="0.5">${esc(lbl)}</text>`;
    g += `<text x="${cx + 9}" y="40" font-family="Arial,sans-serif" font-size="12" fill="${highlight ? C.accent : C.head}" font-weight="700">${esc(val)}</text>`;
  });

  return `<g transform="translate(0,820)">
  <line x1="0" y1="0" x2="1200" y2="0" stroke="${C.divider}" stroke-width="1.5"/>
  ${g}
  <text x="1190" y="50" font-family="Arial,sans-serif" font-size="7" fill="#C0BCB8" text-anchor="end" font-style="italic">Scale: Approximate</text>
</g>`;
}

// ── POST handler ──────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return unauthorized();
    if (!hasRole(ctx, "admin")) return forbidden();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { width, depth, height, cabinet_style, layout } = body;

    if (!width || !depth || !height)
      return NextResponse.json(
        { error: "width, depth, and height are required" },
        { status: 400 }
      );

    const wFt = parseFloat(width);
    const dFt = parseFloat(depth);
    const hFt = parseFloat(height);

    // ── Fetch catalog products ─────────────────────────────────────────
    const admin = createAdminClient();
    const [linesRes, productsRes] = await Promise.all([
      admin
        .from("catalog_lines")
        .select("id, name, slug")
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "published"),
      admin
        .from("products")
        .select("sku, name, catalog_line_id, width_in, height_in, depth_in")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true)
        .limit(100),
    ]);

    const styleKey     = (cabinet_style || "").toLowerCase();
    const styleLineIds = styleKey
      ? (linesRes.data || []).filter((l) => l.name.toLowerCase().includes(styleKey)).map((l) => l.id)
      : [];
    const styleProds =
      styleLineIds.length > 0
        ? (productsRes.data || []).filter((p) => styleLineIds.includes(p.catalog_line_id))
        : productsRes.data || [];

    // ── Layout → active walls ──────────────────────────────────────────
    const layoutNorm = normalize(layout || "lshaped");
    const { walls: wallIds, hasIsland } = getWallLayout(layoutNorm);

    const s  = fpScale(wFt, dFt);
    const sx = elevScaleX(wallIds, wFt, dFt);

    // ── Server-side product selection per wall ─────────────────────────
    const wallProds          = {};
    const product_selections = [];
    const selCorners         = getActiveCorners(wallIds);

    const baseC = styleProds.filter((p) => (p.depth_in || 0) >= 18);
    const upC   = styleProds.filter((p) => (p.depth_in || 0) < 18 && (p.depth_in || 0) >= 8);

    for (const wid of wallIds) {
      // Determine which ends of this wall have a 24" corner tall cabinet.
      let hasWL = false, hasWR = false;
      if      (wid === "A")                        { hasWL = selCorners.has("TL"); hasWR = selCorners.has("TR"); }
      else if (wid === "B")                        { hasWL = selCorners.has("TR"); hasWR = selCorners.has("BR"); }
      else if (wid === "C" || wid === "C-partial") { hasWL = selCorners.has("BL"); hasWR = selCorners.has("BR"); }
      else if (wid === "D")                        { hasWL = selCorners.has("TL"); hasWR = selCorners.has("BL"); }

      // Usable cabinet run = wall interior length minus each 24" corner block.
      const cabRunIn = Math.max(
        0,
        wallLengthIn(wid, wFt, dFt) - (hasWL ? 24 : 0) - (hasWR ? 24 : 0)
      );

      wallProds[wid] = {
        base:  selectProductsForWall(cabRunIn, baseC, wid, "base"),
        upper: selectProductsForWall(cabRunIn, upC,   wid, "upper"),
      };
      product_selections.push(...wallProds[wid].base, ...wallProds[wid].upper);
    }

    // ── Assemble SVG ───────────────────────────────────────────────────
    const wMm = Math.round(wFt * 304.8);
    const dMm = Math.round(dFt * 304.8);
    const layoutLabel = esc(
      `${(layout || "Kitchen").replace(/\b\w/g, (c) => c.toUpperCase())} Layout  ·  ${wMm} × ${dMm} mm`
    );

    const svg = [
      `<svg viewBox="0 0 1200 920" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">`,
      `<rect width="1200" height="920" fill="${C.bg}"/>`,
      // Thin accent border top
      `<rect width="1200" height="3" fill="${C.accent}"/>`,
      // Title
      `<text x="600" y="26" font-family="Arial,sans-serif" font-size="14" font-weight="800" fill="${C.head}" text-anchor="middle" letter-spacing="1">KITCHEN DESIGN PLAN</text>`,
      `<text x="600" y="38" font-family="Arial,sans-serif" font-size="10" fill="#8A8480" text-anchor="middle">${layoutLabel}</text>`,
      buildFloorPlanSection(wFt, dFt, s, wallIds, hasIsland, wallProds),
      `<line x1="591" y1="40" x2="591" y2="820" stroke="${C.divider}" stroke-width="1"/>`,
      buildElevationSection(wallIds, wFt, dFt, hFt, sx, wallProds),
      buildDimensionsLegend(wFt, dFt, hFt),
      `</svg>`,
    ].join("\n");

    return NextResponse.json({ svg, product_selections });
  } catch (err) {
    console.error("floor-plan route error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
