import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { sendDesignQuoteEmail } from "@/lib/email";

const PW = 960;
const PH = 540;
const MG = 44;
const CW = PW - MG * 2;

function hex(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function buildPDF({ quote, tenant }) {
  const pdfDoc  = await PDFDocument.create();
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const dp = quote.design_params || {};

  // ── Color constants ────────────────────────────────────────────────────────
  const BURGUNDY_C = hex("#6E1020");
  const DARK_C     = hex("#1C1917");
  const MID_C      = hex("#57534e");
  const LIGHT_C    = hex("#94a3b8");
  const CREAM_C    = hex("#FAFAF8");
  const RULE_C     = hex("#e2e8f0");
  const WHITE_C    = hex("#ffffff");
  const STRIPE_C   = hex("#F8F6F3");

  // ── Tenant logo ────────────────────────────────────────────────────────────
  let logoEmbed = null;
  if (tenant?.logo_url) {
    try {
      const lr = await fetch(tenant.logo_url);
      if (lr.ok) {
        const lb = await lr.arrayBuffer();
        logoEmbed = tenant.logo_url.toLowerCase().includes(".png")
          ? await pdfDoc.embedPng(lb)
          : await pdfDoc.embedJpg(lb);
      }
    } catch { /* skip */ }
  }

  function trunc(str, n) {
    const s = String(str ?? "");
    return s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
  }

  // ── Layout helpers ─────────────────────────────────────────────────────────
  function layoutTitle(layout) {
    const l = (layout || "").toLowerCase().replace(/[\s\-_]/g, "");
    const map = {
      singlewall: "Single Wall Kitchen",
      galley:     "Galley Kitchen",
      lshaped:    "L-Shaped Kitchen",
      ushaped:    "U-Shaped Kitchen",
      island:     "Kitchen with Island",
      gshaped:    "G-Shaped Kitchen",
    };
    return map[l] || (layout ? `${layout} Kitchen` : "Kitchen Design");
  }

  function layoutWalls(layout) {
    const l = (layout || "").toLowerCase().replace(/[\s\-_]/g, "");
    const map = {
      singlewall: "Wall A (back)",
      galley:     "Wall A (back), Wall C (front)",
      lshaped:    "Wall A (back), Wall B (right)",
      ushaped:    "Wall A (back), Wall B (right), Wall D (left)",
      island:     "Wall A (back), Wall B (right) + Center Island",
      gshaped:    "Wall A (back), Wall B (right), Wall D (left)",
    };
    return map[l] || "Wall A (back)";
  }

  function getActiveWalls(layout) {
    const l = (layout || "").toLowerCase().replace(/[\s\-_]/g, "");
    const map = {
      singlewall: ["A"],
      galley:     ["A", "C"],
      lshaped:    ["A", "B"],
      ushaped:    ["A", "B", "D"],
      island:     ["A", "B"],
      gshaped:    ["A", "B", "D"],
    };
    return map[l] || ["A", "B"];
  }

  function cabinetRowsData() {
    const fps  = Array.isArray(dp.floorPlanProducts) ? dp.floorPlanProducts : [];
    const qi   = Array.isArray(quote.quote_items)    ? quote.quote_items    : [];
    const seen = new Set();
    if (fps.length > 0) {
      return fps
        .filter((p) => {
          const key = p.product_name || p.sku;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 12)
        .map((p) => ({
          type:   p.placement === "base" ? "Base Cabinet" : "Upper Cabinet",
          style:  p.product_name || p.sku || "",
          finish: dp.cabinetStyle || "",
        }));
    }
    return qi
      .filter((r) => {
        if (seen.has(r.product)) return false;
        seen.add(r.product);
        return true;
      })
      .slice(0, 12)
      .map((r) => ({
        type:   "Cabinet",
        style:  r.product || "",
        finish: r.finish  || "",
      }));
  }

  // ── Wall elevation drawing helper ──────────────────────────────────────────
  function drawWallElevation(page, wallId, wallLenFt, ceilingFt, elX, elBotY, elW, elH) {
    const ceiling_in = (ceilingFt || 9) * 12;
    const sy = elH / ceiling_in;

    // Standard cabinet heights in inches
    const TOE_H    = 3.5;
    const BASE_H   = 31;    // base cabinet body
    const CTR_H    = 1.5;   // counter slab
    const SPLASH_H = 18;    // backsplash
    const UPPER_H  = 30;    // upper cabinet

    // Y positions bottom-up (pdf-lib origin = bottom-left)
    const toeTopY    = elBotY + TOE_H    * sy;
    const baseTopY   = toeTopY   + BASE_H   * sy;
    const ctrTopY    = baseTopY  + CTR_H    * sy;
    const splashTopY = ctrTopY   + SPLASH_H * sy;
    const upperTopY  = splashTopY + UPPER_H * sy;
    const ceilY      = elBotY + ceiling_in * sy;

    // Door line spacing: every ~28 wall-inches mapped to px
    const wallLen_in = wallLenFt * 12;
    const doorPx     = Math.max(18, Math.floor(28 / wallLen_in * elW));

    // Floor line
    page.drawLine({
      start: { x: elX, y: elBotY }, end: { x: elX + elW, y: elBotY },
      thickness: 1.5, color: DARK_C,
    });

    // Toe kick
    const toeH = Math.max(toeTopY - elBotY, 1);
    page.drawRectangle({ x: elX, y: elBotY, width: elW, height: toeH, color: hex("#2A2A2A") });

    // Base cabinet body
    const baseBodyH = baseTopY - toeTopY;
    if (baseBodyH >= 2) {
      page.drawRectangle({
        x: elX, y: toeTopY, width: elW, height: baseBodyH,
        color: hex("#D8D0C8"), borderColor: hex("#555555"), borderWidth: 0.5,
      });
      // Cabinet door lines
      for (let dx = doorPx; dx < elW - 5; dx += doorPx) {
        page.drawLine({
          start: { x: elX + dx, y: toeTopY + 3 },
          end:   { x: elX + dx, y: baseTopY - 3 },
          thickness: 0.5, color: hex("#8A8582"),
        });
      }
    }

    // Counter
    const ctrH = Math.max(ctrTopY - baseTopY, 1.5);
    page.drawRectangle({ x: elX, y: baseTopY, width: elW, height: ctrH, color: hex("#1C1917") });

    // Backsplash
    const splashH = splashTopY - ctrTopY;
    if (splashH >= 2) {
      page.drawRectangle({
        x: elX, y: ctrTopY, width: elW, height: splashH,
        color: hex("#EDE8E0"), borderColor: hex("#C8C3BA"), borderWidth: 0.5,
      });
    }

    // Upper cabinets
    const upperH = upperTopY - splashTopY;
    if (upperH >= 2) {
      page.drawRectangle({
        x: elX, y: splashTopY, width: elW, height: upperH,
        color: hex("#EDEBE3"), borderColor: hex("#555555"), borderWidth: 0.5,
      });
      // Cabinet door lines
      for (let dx = doorPx; dx < elW - 5; dx += doorPx) {
        page.drawLine({
          start: { x: elX + dx, y: splashTopY + 3 },
          end:   { x: elX + dx, y: upperTopY - 3 },
          thickness: 0.5, color: hex("#8A8582"),
        });
      }
    }

    // Ceiling line
    page.drawLine({
      start: { x: elX, y: ceilY }, end: { x: elX + elW, y: ceilY },
      thickness: 0.75, color: RULE_C,
    });

    // Wall label above ceiling
    const wLabel  = `WALL ${wallId}`;
    const wLabelW = bold.widthOfTextAtSize(wLabel, 6);
    page.drawText(wLabel, {
      x: elX + Math.round((elW - wLabelW) / 2), y: ceilY + 5,
      size: 6, font: bold, color: BURGUNDY_C,
    });

    // Wall length below floor
    const lenStr = `${wallLenFt.toFixed(0)}'`;
    const lenW   = regular.widthOfTextAtSize(lenStr, 6);
    page.drawText(lenStr, {
      x: elX + Math.round((elW - lenW) / 2), y: elBotY - 13,
      size: 6, font: regular, color: LIGHT_C,
    });
  }

  // ── PAGE 1 — Cover ─────────────────────────────────────────────────────────
  {
    const page = pdfDoc.addPage([PW, PH]);
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: CREAM_C });

    // Full-bleed kitchen render (top 350pt)
    const imgH  = 350;
    let rendered = false;
    if (quote.design_image_url) {
      try {
        const imgResp = await fetch(quote.design_image_url);
        if (imgResp.ok) {
          const imgBytes = await imgResp.arrayBuffer();
          const isPng    = quote.design_image_url.toLowerCase().includes(".png");
          const embImg   = isPng
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);
          page.drawImage(embImg, { x: 0, y: PH - imgH, width: PW, height: imgH });
          rendered = true;
        }
      } catch { /* skip */ }
    }
    if (!rendered) {
      page.drawRectangle({ x: 0, y: PH - imgH, width: PW, height: imgH, color: hex("#F0EDE8") });
      const ph  = "KITCHEN RENDER";
      const phW = regular.widthOfTextAtSize(ph, 10);
      page.drawText(ph, { x: (PW - phW) / 2, y: PH - imgH / 2 - 5, size: 10, font: regular, color: LIGHT_C });
    }

    // Separator below render
    page.drawLine({
      start: { x: 0, y: PH - imgH - 2 }, end: { x: PW, y: PH - imgH - 2 },
      thickness: 1, color: RULE_C,
    });

    // Title text (left side of title block)
    let ty = PH - imgH - 28;
    page.drawText("KITCHEN DESIGN CONCEPT", { x: MG, y: ty, size: 20, font: bold, color: DARK_C });
    ty -= 22;
    page.drawText(trunc(String(quote.customer_name || ""), 50), { x: MG, y: ty, size: 12, font: regular, color: MID_C });
    ty -= 18;
    page.drawText(layoutTitle(dp.layout), { x: MG, y: ty, size: 10, font: regular, color: BURGUNDY_C });

    // Tenant logo — right side of title block, vertically centered
    if (logoEmbed) {
      const maxW  = 100;
      const maxH  = 44;
      const ratio = Math.min(maxW / logoEmbed.width, maxH / logoEmbed.height);
      const lW    = Math.round(logoEmbed.width  * ratio);
      const lH    = Math.round(logoEmbed.height * ratio);
      // Center vertically between separator (y = PH-imgH-2 = 188) and footer (y = 26)
      const midY  = Math.round((26 + (PH - imgH - 2)) / 2);
      page.drawImage(logoEmbed, {
        x: PW - MG - lW,
        y: midY - Math.round(lH / 2),
        width: lW, height: lH,
      });
    }

    // Date bottom-left
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    page.drawText(dateStr, { x: MG, y: 32, size: 8, font: regular, color: LIGHT_C });

    // Tenant name bottom-right
    const tName = trunc(String(tenant?.name || ""), 50);
    if (tName) {
      const tW = regular.widthOfTextAtSize(tName, 8);
      page.drawText(tName, { x: PW - MG - tW, y: 32, size: 8, font: regular, color: LIGHT_C });
    }

    // Burgundy footer strip
    page.drawRectangle({ x: 0, y: 0, width: PW, height: 26, color: BURGUNDY_C });
    if (tName) {
      const tW2 = bold.widthOfTextAtSize(tName, 9);
      page.drawText(tName, { x: (PW - tW2) / 2, y: 9, size: 9, font: bold, color: WHITE_C });
    }
  }

  // ── PAGE 2 — Floor Plan & Cabinet Elevations ───────────────────────────────
  {
    const page = pdfDoc.addPage([PW, PH]);
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: hex("#ffffff") });
    page.drawRectangle({ x: 0, y: PH - 3, width: PW, height: 3, color: BURGUNDY_C });

    let y = PH - MG;

    page.drawText("FLOOR PLAN & CABINET ELEVATIONS", { x: MG, y, size: 13, font: bold, color: BURGUNDY_C });
    y -= 14;
    page.drawLine({ start: { x: MG, y }, end: { x: PW - MG, y }, thickness: 0.75, color: RULE_C });
    y -= 20;

    // Column boundaries
    const leftX   = MG;
    const divX    = MG + Math.round(CW * 0.44);   // left col ~44% of CW
    const rightX  = divX + 14;
    const rightColW = PW - MG - rightX;

    // Vertical divider
    page.drawLine({ start: { x: divX, y: y + 14 }, end: { x: divX, y: 30 }, thickness: 0.75, color: RULE_C });

    const activeWalls = getActiveWalls(dp.layout);
    const wFt = parseFloat(quote.room_width)  || 12;
    const dFt = parseFloat(quote.room_depth)  || 10;
    const hFt = parseFloat(quote.room_height) || 9;

    // ── Left: Floor Plan (top-view) ───────────────────────────────────────────
    {
      page.drawText("FLOOR PLAN", { x: leftX, y, size: 7.5, font: bold, color: LIGHT_C });

      const colW = divX - leftX - 8;
      const pad  = 10;
      const aW   = colW - pad * 2;
      const topY = y - 14;
      const botY = 50;
      const aH   = topY - botY;

      if (aW > 40 && aH > 40) {
        const scale = Math.min(aW / wFt, aH / dFt, 50);
        const rW    = Math.round(wFt * scale);
        const rD    = Math.round(dFt * scale);
        const ox    = leftX + pad + Math.round((aW - rW) / 2);
        const oy    = botY + Math.round((aH - rD) / 2);
        const WT    = 8;
        const cabD  = Math.min(Math.round(scale * 2), 38);

        const hasIsland = (dp.layout || "").toLowerCase().replace(/[\s\-_]/g, "") === "island";

        // Room interior
        page.drawRectangle({ x: ox, y: oy, width: rW, height: rD, color: hex("#F7F5F2") });

        // Cabinet footprints on active walls
        const cabFill   = hex("#D3CBC0");
        const cabBorder = hex("#8A8582");
        for (const wall of activeWalls) {
          if (wall === "A")
            page.drawRectangle({ x: ox + WT, y: oy + rD - WT - cabD, width: rW - WT * 2, height: cabD, color: cabFill, borderColor: cabBorder, borderWidth: 0.5 });
          if (wall === "B")
            page.drawRectangle({ x: ox + rW - WT - cabD, y: oy + WT, width: cabD, height: rD - WT * 2, color: cabFill, borderColor: cabBorder, borderWidth: 0.5 });
          if (wall === "C")
            page.drawRectangle({ x: ox + WT, y: oy + WT, width: rW - WT * 2, height: cabD, color: cabFill, borderColor: cabBorder, borderWidth: 0.5 });
          if (wall === "D")
            page.drawRectangle({ x: ox + WT, y: oy + WT, width: cabD, height: rD - WT * 2, color: cabFill, borderColor: cabBorder, borderWidth: 0.5 });
        }

        // SKU labels inside base cabinet footprints
        const fps   = Array.isArray(dp.floorPlanProducts) ? dp.floorPlanProducts : [];
        const sklSz = 5.5;
        for (const wall of activeWalls) {
          const wallProds = fps.filter(p => p.wall === wall && p.placement === "base");
          if (wallProds.length === 0) continue;
          let fpX, fpY, fpW, fpH;
          if      (wall === "A") { fpX = ox + WT; fpY = oy + rD - WT - cabD; fpW = rW - WT * 2; fpH = cabD; }
          else if (wall === "B") { fpX = ox + rW - WT - cabD; fpY = oy + WT; fpW = cabD; fpH = rD - WT * 2; }
          else if (wall === "C") { fpX = ox + WT; fpY = oy + WT; fpW = rW - WT * 2; fpH = cabD; }
          else if (wall === "D") { fpX = ox + WT; fpY = oy + WT; fpW = cabD; fpH = rD - WT * 2; }
          else { continue; }
          const isVert = (wall === "B" || wall === "D");
          if (!isVert && fpH > sklSz + 2) {
            const spacing = fpW / wallProds.length;
            wallProds.forEach((p, i) => {
              const label = trunc(p.sku || p.product_name || "", 8);
              const lW    = regular.widthOfTextAtSize(label, sklSz);
              const lx    = fpX + spacing * i + Math.round((spacing - lW) / 2);
              if (lx >= fpX && lx + lW <= fpX + fpW) {
                page.drawText(label, { x: lx, y: fpY + Math.round((fpH - sklSz) / 2), size: sklSz, font: regular, color: DARK_C });
              }
            });
          } else if (isVert && fpW > sklSz) {
            const spacing = fpH / wallProds.length;
            wallProds.forEach((p, i) => {
              const label = trunc(p.sku || "", 5);
              const ly    = fpY + spacing * i + Math.round((spacing - sklSz) / 2);
              if (ly >= fpY && ly + sklSz <= fpY + fpH) {
                page.drawText(label, { x: fpX + 1, y: ly, size: Math.min(sklSz, fpW - 2), font: regular, color: DARK_C });
              }
            });
          }
        }

        if (hasIsland) {
          const isW = Math.min(Math.round(rW * 0.36), 70);
          const isD = Math.min(Math.round(rD * 0.28), 30);
          page.drawRectangle({
            x: ox + Math.round((rW - isW) / 2), y: oy + Math.round((rD - isD) / 2),
            width: isW, height: isD,
            color: hex("#C0B8B0"), borderColor: cabBorder, borderWidth: 0.5,
          });
        }

        // Walls (drawn on top)
        page.drawRectangle({ x: ox,            y: oy + rD - WT, width: rW, height: WT, color: DARK_C });
        page.drawRectangle({ x: ox,            y: oy,           width: rW, height: WT, color: DARK_C });
        page.drawRectangle({ x: ox,            y: oy,           width: WT, height: rD, color: DARK_C });
        page.drawRectangle({ x: ox + rW - WT,  y: oy,           width: WT, height: rD, color: DARK_C });

        // Wall labels
        const lb = 6;
        const aLW = bold.widthOfTextAtSize("A", lb);
        page.drawText("A", { x: ox + Math.round((rW - aLW) / 2), y: oy + rD + 4,                size: lb, font: bold, color: BURGUNDY_C });
        const cLW = bold.widthOfTextAtSize("C", lb);
        page.drawText("C", { x: ox + Math.round((rW - cLW) / 2), y: oy - 11,                    size: lb, font: bold, color: BURGUNDY_C });
        page.drawText("B", { x: ox + rW + 5,                     y: oy + Math.round(rD / 2) - 3, size: lb, font: bold, color: BURGUNDY_C });
        const dLW = bold.widthOfTextAtSize("D", lb);
        page.drawText("D", { x: ox - dLW - 5,                    y: oy + Math.round(rD / 2) - 3, size: lb, font: bold, color: BURGUNDY_C });


      }
    }

    // ── Right: Cabinet Elevations ─────────────────────────────────────────────
    {
      page.drawText("CABINET PLAN (ELEVATIONS)", { x: rightX, y, size: 7.5, font: bold, color: LIGHT_C });

      const numWalls = activeWalls.length;
      const elGap    = 8;
      const totalGap = (numWalls - 1) * elGap;
      const elW      = Math.floor((rightColW - totalGap) / numWalls);
      const elBotY   = 48;
      const elTopY   = y - 20;
      const elH      = elTopY - elBotY;

      for (let i = 0; i < activeWalls.length; i++) {
        const wallId    = activeWalls[i];
        const isWidthW  = (wallId === "A" || wallId === "C");
        const wallLenFt = isWidthW ? Math.max(wFt - 1, 1) : Math.max(dFt - 1, 1);
        const elX       = rightX + i * (elW + elGap);

        drawWallElevation(page, wallId, wallLenFt, hFt, elX, elBotY, elW, elH);
      }
    }

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: PW, height: 22, color: BURGUNDY_C });
    const tName2 = trunc(String(tenant?.name || ""), 50);
    if (tName2) {
      const nW = bold.widthOfTextAtSize(tName2, 9);
      page.drawText(tName2, { x: (PW - nW) / 2, y: 7, size: 9, font: bold, color: WHITE_C });
    }
    const pg2  = "Page 2 of 3";
    const pg2W = regular.widthOfTextAtSize(pg2, 8);
    page.drawText(pg2, { x: PW - MG - pg2W, y: 7, size: 8, font: regular, color: WHITE_C });
  }

  // ── PAGE 3 — Design Specifications & Cabinet Details ───────────────────────
  {
    const page = pdfDoc.addPage([PW, PH]);
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: hex("#ffffff") });
    page.drawRectangle({ x: 0, y: PH - 3, width: PW, height: 3, color: BURGUNDY_C });

    let y = PH - MG;

    page.drawText("DESIGN SPECIFICATIONS & CABINET DETAILS", { x: MG, y, size: 13, font: bold, color: BURGUNDY_C });
    y -= 14;
    page.drawLine({ start: { x: MG, y }, end: { x: PW - MG, y }, thickness: 0.75, color: RULE_C });
    y -= 20;

    // Column boundaries
    const leftX  = MG;
    const divX   = MG + Math.round(CW * 0.44);
    const rightX = divX + 14;
    const rightColW = PW - MG - rightX;

    // Vertical divider
    page.drawLine({ start: { x: divX, y: y + 14 }, end: { x: divX, y: 30 }, thickness: 0.75, color: RULE_C });

    // ── Left: Design Specifications + Room Info ───────────────────────────────
    {
      let ly = y;
      const lSpec = (label, value) => {
        if (!value || !String(value).trim()) return;
        page.drawText(label,                     { x: leftX,       y: ly, size: 9, font: bold,    color: LIGHT_C });
        page.drawText(trunc(String(value), 30),  { x: leftX + 118, y: ly, size: 9, font: regular, color: DARK_C  });
        ly -= 16;
      };

      page.drawText("DESIGN SPECIFICATIONS", { x: leftX, y: ly, size: 7.5, font: bold, color: LIGHT_C });
      ly -= 7.5 + 9;

      lSpec("Cabinet Style:",   dp.cabinetStyle);
      lSpec("Upper Finish:",    dp.upperColor);
      lSpec("Lower Finish:",    dp.lowerColor);
      lSpec("Countertop:",      dp.countertop);
      lSpec("Flooring:",        dp.flooring);
      lSpec("Hardware:",        dp.hardware);
      lSpec("Appliance Color:", dp.applianceColor);
      lSpec("Hood Style:",      dp.hoodStyle);

      if (ly > 70) {
        ly -= 10;
        page.drawText("ROOM & LAYOUT", { x: leftX, y: ly, size: 7.5, font: bold, color: LIGHT_C });
        ly -= 7.5 + 9;
        lSpec("Dimensions:", `${quote.room_width}' \u00D7 ${quote.room_depth}' \u00D7 ${quote.room_height}' ceiling`);
        lSpec("Layout:",     dp.layout || "Custom");
        lSpec("Walls:",      layoutWalls(dp.layout));
        if (quote.style_notes) lSpec("Notes:", trunc(quote.style_notes, 28));
      }
    }

    // ── Right: Cabinet Details + Material Notes ───────────────────────────────
    {
      let ry = y;
      const cabRows = cabinetRowsData();

      page.drawText("SUGGESTED CABINET DETAILS", { x: rightX, y: ry, size: 7.5, font: bold, color: LIGHT_C });
      ry -= 7.5 + 9;

      // Table columns
      const tblCols = [
        { label: "Cabinet Type", x: rightX,                           w: Math.round(rightColW * 0.30) },
        { label: "Style",        x: rightX + Math.round(rightColW * 0.31), w: Math.round(rightColW * 0.40) },
        { label: "Finish",       x: rightX + Math.round(rightColW * 0.72), w: Math.round(rightColW * 0.28) },
      ];

      // Header row
      const hdrH = 18;
      page.drawRectangle({ x: rightX, y: ry - hdrH, width: rightColW, height: hdrH, color: DARK_C });
      for (const col of tblCols) {
        page.drawText(col.label, { x: col.x + 4, y: ry - hdrH + 5, size: 8, font: bold, color: WHITE_C });
      }
      ry -= hdrH;

      // Data rows
      const rowH = 16;
      if (cabRows.length > 0) {
        for (let i = 0; i < cabRows.length; i++) {
          if (ry < 50) break;
          const row = cabRows[i];
          const bg  = i % 2 === 0 ? hex("#ffffff") : STRIPE_C;
          page.drawRectangle({ x: rightX, y: ry - rowH, width: rightColW, height: rowH, color: bg });
          const vals = [trunc(row.type, 20), trunc(row.style, 36), trunc(row.finish, 20)];
          for (let c = 0; c < tblCols.length; c++) {
            page.drawText(vals[c], { x: tblCols[c].x + 4, y: ry - rowH + 4, size: 8, font: regular, color: DARK_C });
          }
          ry -= rowH;
        }
      } else {
        page.drawText("No cabinet suggestions available.", { x: rightX + 4, y: ry - 13, size: 8, font: regular, color: LIGHT_C });
        ry -= 20;
      }

      // Material & Style Notes
      if (ry > 60) {
        ry -= 10;
        page.drawLine({ start: { x: rightX, y: ry }, end: { x: PW - MG, y: ry }, thickness: 0.5, color: RULE_C });
        ry -= 12;
        page.drawText("MATERIAL & STYLE NOTES", { x: rightX, y: ry, size: 7, font: bold, color: LIGHT_C });
        ry -= 7 + 8;
        const matRows = [
          ["Cabinet Finish", dp.cabinetStyle],
          ["Countertop",     dp.countertop],
          ["Flooring",       dp.flooring],
        ].filter(([, v]) => v && String(v).trim());
        for (const [label, value] of matRows) {
          if (ry < 50) break;
          page.drawText(`${label}:`,               { x: rightX,       y: ry, size: 8, font: bold,    color: MID_C  });
          page.drawText(trunc(String(value), 36),   { x: rightX + 110, y: ry, size: 8, font: regular, color: DARK_C });
          ry -= 14;
        }
      }
    }

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: PW, height: 22, color: BURGUNDY_C });
    const tName3 = trunc(String(tenant?.name || ""), 50);
    if (tName3) {
      const nW = bold.widthOfTextAtSize(tName3, 9);
      page.drawText(tName3, { x: (PW - nW) / 2, y: 7, size: 9, font: bold, color: WHITE_C });
    }
    const pg3  = "Page 3 of 3";
    const pg3W = regular.widthOfTextAtSize(pg3, 8);
    page.drawText(pg3, { x: PW - MG - pg3W, y: 7, size: 8, font: regular, color: WHITE_C });
  }

  return pdfDoc.save();
}

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

    const { designQuoteId } = body;
    if (!designQuoteId) {
      return NextResponse.json({ error: "designQuoteId is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the design quote
    const { data: quote, error: qErr } = await admin
      .from("design_quotes")
      .select("*")
      .eq("id", designQuoteId)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (qErr || !quote) {
      return NextResponse.json({ error: "Design quote not found." }, { status: 404 });
    }

    // Fetch tenant branding
    const { data: tenant } = await admin
      .from("tenants")
      .select("name, logo_url, contact_email, contact_phone")
      .eq("id", ctx.tenantId)
      .single();

    // Generate PDF
    const pdfBytes = await buildPDF({ quote, tenant: tenant || {} });
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload to Supabase storage
    const storagePath = `${ctx.tenantId}/${designQuoteId}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from("design-pdfs")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("design-pdfs").getPublicUrl(storagePath);
    const pdfUrl = urlData?.publicUrl ?? null;

    // Update DB record
    await admin
      .from("design_quotes")
      .update({ pdf_url: pdfUrl, status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", designQuoteId)
      .eq("tenant_id", ctx.tenantId);

    // Send email
    try {
      await sendDesignQuoteEmail({
        to:            quote.customer_email,
        customerName:  quote.customer_name,
        tenantName:    tenant?.name || "Cabinet Co.",
        tenantEmail:   tenant?.contact_email || null,
        pdfUrl,
        pdfBuffer,
        // Full quote data for rich email body
        quoteItems:    quote.quote_items     || [],
        taxRate:       quote.tax_rate        ?? 0,
        quoteNotes:    quote.quote_notes     || "",
        roomWidth:     quote.room_width,
        roomDepth:     quote.room_depth,
        roomHeight:    quote.room_height,
        styleNotes:    quote.style_notes     || "",
        designImageUrl: quote.design_image_url || "",
        svgFloorPlan:  quote.svg_floor_plan   || "",
        designParams:  quote.design_params    || {},
      });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      // Don't fail the request; PDF was generated and saved
    }

    return NextResponse.json({ success: true, pdfUrl });
  } catch (err) {
    console.error("design-quotes/send error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
