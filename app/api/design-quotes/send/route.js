import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext, hasRole, unauthorized, forbidden } from "@/lib/utils/api-auth";
import { sendDesignQuoteEmail } from "@/lib/email";

const A4_W = 595;
const A4_H = 842;
const MARGIN = 50;
const COL_W = A4_W - MARGIN * 2;

function hex(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function buildPDF({ quote, tenant }) {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([A4_W, A4_H]);
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = A4_H - MARGIN;

  function text(str, x, fontSize, font, color) {
    page.drawText(String(str ?? ""), {
      x,
      y,
      size: fontSize,
      font: font ?? regular,
      color: color ?? hex("#1e293b"),
    });
  }

  function line(x1, y1, x2, y2, color, thickness) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end:   { x: x2, y: y2 },
      thickness: thickness ?? 1,
      color: color ?? hex("#e2e8f0"),
    });
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  text(tenant.name || "Cabinet Design Quote", MARGIN, 22, bold, hex("#1e293b"));
  y -= 20;

  const contactLine = [tenant.contact_email, tenant.contact_phone].filter(Boolean).join("  |  ");
  if (contactLine) {
    text(contactLine, MARGIN, 10, regular, hex("#64748b"));
    y -= 14;
  }

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  text(`Date: ${dateStr}`, MARGIN, 10, regular, hex("#64748b"));
  y -= 6;
  line(MARGIN, y, A4_W - MARGIN, y, hex("#e2e8f0"), 1);
  y -= 18;

  // ── Customer ────────────────────────────────────────────────────────────────
  text("Prepared For", MARGIN, 9, bold, hex("#94a3b8"));
  y -= 14;
  text(quote.customer_name, MARGIN, 13, bold);
  y -= 16;
  text(quote.customer_email, MARGIN, 10, regular, hex("#475569"));
  y -= 18;
  line(MARGIN, y, A4_W - MARGIN, y, hex("#e2e8f0"), 1);
  y -= 18;

  // ── Room Dimensions ─────────────────────────────────────────────────────────
  text("Room Dimensions", MARGIN, 9, bold, hex("#94a3b8"));
  y -= 14;
  text(
    `${quote.room_width} ft wide  ×  ${quote.room_depth} ft deep  ×  ${quote.room_height} ft ceiling`,
    MARGIN, 11, regular
  );
  if (quote.style_notes) {
    y -= 14;
    text(`Style notes: ${quote.style_notes}`, MARGIN, 10, regular, hex("#475569"));
  }
  y -= 18;
  line(MARGIN, y, A4_W - MARGIN, y, hex("#e2e8f0"), 1);
  y -= 18;

  // ── Design Image ────────────────────────────────────────────────────────────
  if (quote.design_image_url) {
    try {
      const imgResp = await fetch(quote.design_image_url);
      if (imgResp.ok) {
        const imgBytes = await imgResp.arrayBuffer();
        const imgExt = quote.design_image_url.toLowerCase();
        let embeddedImg;
        if (imgExt.includes(".png")) {
          embeddedImg = await pdfDoc.embedPng(imgBytes);
        } else {
          embeddedImg = await pdfDoc.embedJpg(imgBytes);
        }
        const maxW = COL_W;
        const maxH = 220;
        const ratio = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height);
        const iW = embeddedImg.width * ratio;
        const iH = embeddedImg.height * ratio;
        y -= iH;
        page.drawImage(embeddedImg, { x: MARGIN, y, width: iW, height: iH });
        y -= 18;
        line(MARGIN, y, A4_W - MARGIN, y, hex("#e2e8f0"), 1);
        y -= 18;
      }
    } catch {
      // Skip image if fetch fails
    }
  }

  // ── Floor Plan Note ─────────────────────────────────────────────────────────
  if (quote.svg_floor_plan) {
    text("Floor Plan", MARGIN, 9, bold, hex("#94a3b8"));
    y -= 14;
    text(
      `Room: ${quote.room_width} ft × ${quote.room_depth} ft  |  Ceiling: ${quote.room_height} ft`,
      MARGIN, 10, regular, hex("#475569")
    );
    y -= 18;
    line(MARGIN, y, A4_W - MARGIN, y, hex("#e2e8f0"), 1);
    y -= 18;
  }

  // ── Quote Table ─────────────────────────────────────────────────────────────
  text("Quote Items", MARGIN, 9, bold, hex("#94a3b8"));
  y -= 14;

  const items = Array.isArray(quote.quote_items) ? quote.quote_items : [];

  // Table header
  const cols = [
    { label: "SKU",     x: MARGIN,       w: 70 },
    { label: "Product", x: MARGIN + 75,  w: 150 },
    { label: "Finish",  x: MARGIN + 230, w: 90 },
    { label: "Qty",     x: MARGIN + 325, w: 35 },
    { label: "Unit",    x: MARGIN + 365, w: 55 },
    { label: "Total",   x: MARGIN + 425, w: 70 },
  ];

  page.drawRectangle({
    x: MARGIN,
    y: y - 16,
    width: COL_W,
    height: 18,
    color: hex("#f1f5f9"),
  });

  for (const col of cols) {
    page.drawText(col.label, {
      x: col.x + 2,
      y: y - 12,
      size: 8,
      font: bold,
      color: hex("#64748b"),
    });
  }
  y -= 20;
  line(MARGIN, y, A4_W - MARGIN, y, hex("#cbd5e1"), 0.5);

  let subtotal = 0;
  for (const item of items) {
    y -= 16;
    if (y < MARGIN + 80) break; // Prevent overflow off page
    const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
    subtotal += lineTotal;

    const rowValues = [
      item.sku       || "",
      item.product   || "",
      item.finish    || "",
      String(item.qty        ?? ""),
      `$${parseFloat(item.unit_price || 0).toFixed(2)}`,
      `$${lineTotal.toFixed(2)}`,
    ];
    for (let i = 0; i < cols.length; i++) {
      page.drawText(rowValues[i], {
        x: cols[i].x + 2,
        y,
        size: 9,
        font: regular,
        color: hex("#1e293b"),
      });
    }
    line(MARGIN, y - 4, A4_W - MARGIN, y - 4, hex("#f1f5f9"), 0.5);
  }

  y -= 20;
  line(MARGIN, y, A4_W - MARGIN, y, hex("#cbd5e1"), 1);
  y -= 18;

  // Totals
  const taxRate = parseFloat(quote.tax_rate) || 0;
  const tax     = subtotal * (taxRate / 100);
  const total   = subtotal + tax;

  const totalsX = A4_W - MARGIN - 200;

  function totalRow(label, amount, isBold) {
    page.drawText(label, {
      x: totalsX,
      y,
      size: 10,
      font: isBold ? bold : regular,
      color: isBold ? hex("#1e293b") : hex("#475569"),
    });
    page.drawText(`$${amount.toFixed(2)}`, {
      x: A4_W - MARGIN - 65,
      y,
      size: 10,
      font: isBold ? bold : regular,
      color: isBold ? hex("#1e293b") : hex("#475569"),
    });
    y -= 16;
  }

  totalRow("Subtotal", subtotal, false);
  if (taxRate > 0) totalRow(`Tax (${taxRate}%)`, tax, false);
  totalRow("Total", total, true);

  // Quote Notes
  if (quote.quote_notes) {
    y -= 8;
    line(MARGIN, y, A4_W - MARGIN, y, hex("#e2e8f0"), 1);
    y -= 16;
    text("Notes", MARGIN, 9, bold, hex("#94a3b8"));
    y -= 14;
    // Simple word-wrapped note (split at ~80 chars)
    const words = quote.quote_notes.split(" ");
    let line_ = "";
    for (const word of words) {
      if ((line_ + word).length > 90) {
        text(line_.trim(), MARGIN, 10, regular, hex("#475569"));
        y -= 13;
        line_ = word + " ";
      } else {
        line_ += word + " ";
      }
    }
    if (line_.trim()) {
      text(line_.trim(), MARGIN, 10, regular, hex("#475569"));
      y -= 13;
    }
  }

  // Footer
  y = MARGIN + 20;
  line(MARGIN, y + 10, A4_W - MARGIN, y + 10, hex("#e2e8f0"), 1);
  page.drawText(
    `${tenant.name || ""}${tenant.contact_email ? "  |  " + tenant.contact_email : ""}${tenant.contact_phone ? "  |  " + tenant.contact_phone : ""}`,
    { x: MARGIN, y: y - 2, size: 8, font: regular, color: hex("#94a3b8") }
  );

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
        to:           quote.customer_email,
        customerName: quote.customer_name,
        tenantName:   tenant?.name || "Cabinet Co.",
        tenantEmail:  tenant?.contact_email || null,
        pdfUrl,
        pdfBuffer,
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
