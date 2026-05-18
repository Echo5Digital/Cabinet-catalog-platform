import nodemailer from "nodemailer";

export async function sendDesignQuoteEmail({
  to, customerName, tenantName, tenantEmail,
  pdfUrl, pdfBuffer,
  // Full quote data for the email body
  quoteItems, taxRate, quoteNotes,
  roomWidth, roomDepth, roomHeight, styleNotes,
  designImageUrl, svgFloorPlan, designParams,
}) {
  // HTML-safe helpers
  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function safeImgUrl(url) {
    const s = String(url ?? "").trim();
    return (s.startsWith("https://") || s.startsWith("http://")) ? s.replace(/"/g, "%22") : "";
  }
  // Only embed SVG if it is a well-formed SVG element (prevents script injection)
  const safeSvgFloorPlan = (svgFloorPlan && String(svgFloorPlan).trim().startsWith("<svg")) ? svgFloorPlan : "";

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = `"${tenantName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  const escapedTenantName   = esc(tenantName);
  const escapedCustomerName = esc(customerName);
  const safeDesignImageUrl  = safeImgUrl(designImageUrl);
  const safePdfUrl          = safeImgUrl(pdfUrl);

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename:    "kitchen-quote.pdf",
      content:     pdfBuffer,
      contentType: "application/pdf",
    });
  }

  // ── Compute totals ──────────────────────────────────────────────────────────
  const items  = Array.isArray(quoteItems) ? quoteItems : [];
  const rate   = parseFloat(taxRate) || 0;
  const sub    = items.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.unit_price) || 0), 0);
  const taxAmt = sub * (rate / 100);
  const total  = sub + taxAmt;
  const dp     = designParams || {};
  const fmt    = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  // ── Design summary rows (skip empties) ─────────────────────────────────────
  const summaryRows = [
    ["Room Size",       roomWidth && roomDepth ? `${roomWidth} ft × ${roomDepth} ft × ${roomHeight} ft ceiling` : null],
    ["Layout",          dp.layout],
    ["Cabinet Style",   dp.cabinetStyle],
    ["Upper Color",     dp.upperColor],
    ["Lower Color",     dp.lowerColor],
    ["Countertop",      dp.countertop],
    ["Flooring",        dp.flooring],
    ["Hardware",        dp.hardware],
    ["Appliance Color", dp.applianceColor],
    ["Budget Style",    dp.budgetStyle],
    ["Hood Style",      dp.hoodStyle],
    ["Style Notes",     styleNotes],
    ["Design Comments", dp.designComments],
  ].filter(([, v]) => v && String(v).trim());

  const summaryHtml = summaryRows.length > 0 ? `
    <div style="background:#F8F6F3;border-radius:8px;padding:16px 20px;margin:20px 0">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px">Design Specifications</p>
      <table style="width:100%;border-collapse:collapse">
        ${summaryRows.map(([label, value], i) => `
          <tr style="border-top:${i === 0 ? "none" : "1px solid #e7e5e4"}">
            <td style="padding:6px 0;font-size:12px;color:#78716c;width:40%;vertical-align:top">${esc(label)}</td>
            <td style="padding:6px 0;font-size:12px;color:#1c1917;font-weight:500">${esc(value)}</td>
          </tr>`).join("")}
      </table>
    </div>` : "";

  // ── Kitchen render ──────────────────────────────────────────────────────────
  const renderHtml = safeDesignImageUrl ? `
    <div style="margin:20px 0">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px">Kitchen Render</p>
      <img src="${safeDesignImageUrl}" alt="AI Kitchen Render" style="width:100%;max-width:560px;border-radius:8px;border:1px solid #e7e5e4;display:block">
    </div>` : "";

  // ── Floor plan (inline SVG — renders in Apple Mail, Outlook.com; degrades in Gmail) ──
  const floorPlanHtml = safeSvgFloorPlan ? `
    <div style="margin:20px 0">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px">Floor Plan</p>
      <div style="background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:12px;overflow:auto;max-width:560px">
        ${safeSvgFloorPlan}
      </div>
    </div>` : "";

  // ── Quote items table ───────────────────────────────────────────────────────
  const quoteTableHtml = items.length > 0 ? `
    <div style="margin:20px 0">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px">Quote Items</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1C1917;color:#fff">
            <th style="padding:8px 10px;text-align:left;font-weight:600">SKU</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600">Product</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600">Finish</th>
            <th style="padding:8px 10px;text-align:right;font-weight:600">Qty</th>
            <th style="padding:8px 10px;text-align:right;font-weight:600">Unit</th>
            <th style="padding:8px 10px;text-align:right;font-weight:600">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => {
            const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);
            return `<tr style="background:${i % 2 === 0 ? "#fff" : "#F8F6F3"};border-bottom:1px solid #e7e5e4">
              <td style="padding:8px 10px;color:#57534e;font-family:monospace">${esc(item.sku)}</td>
              <td style="padding:8px 10px;color:#1c1917">${esc(item.product)}</td>
              <td style="padding:8px 10px;color:#57534e">${esc(item.finish)}</td>
              <td style="padding:8px 10px;text-align:right;color:#1c1917">${esc(String(item.qty ?? ""))}</td>
              <td style="padding:8px 10px;text-align:right;color:#1c1917">${fmt(item.unit_price)}</td>
              <td style="padding:8px 10px;text-align:right;color:#1c1917;font-weight:500">${fmt(lineTotal)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <tr>
          <td style="padding:6px 10px;text-align:right;color:#57534e" colspan="5">Subtotal</td>
          <td style="padding:6px 10px;text-align:right;min-width:80px;color:#1c1917">${fmt(sub)}</td>
        </tr>
        ${rate > 0 ? `<tr>
          <td style="padding:4px 10px;text-align:right;color:#57534e" colspan="5">Tax (${rate}%)</td>
          <td style="padding:4px 10px;text-align:right;color:#1c1917">${fmt(taxAmt)}</td>
        </tr>` : ""}
        <tr style="border-top:2px solid #1C1917">
          <td style="padding:8px 10px;text-align:right;font-weight:700;color:#1c1917" colspan="5">Total</td>
          <td style="padding:8px 10px;text-align:right;font-weight:700;font-size:14px;color:#6E1020">${fmt(total)}</td>
        </tr>
      </table>
    </div>` : "";

  // ── Notes ───────────────────────────────────────────────────────────────────
  const notesHtml = quoteNotes ? `
    <div style="margin:20px 0;background:#F8F6F3;border-radius:8px;padding:14px 16px">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px">Notes</p>
      <p style="font-size:13px;color:#475569;margin:0;line-height:1.6">${esc(quoteNotes)}</p>
    </div>` : "";

  // ── Plain-text fallback ─────────────────────────────────────────────────────
  const plainItems = items.map((r) => {
    const lt = (parseFloat(r.qty) || 0) * (parseFloat(r.unit_price) || 0);
    return `  ${r.sku || ""} — ${r.product || ""} | Qty: ${r.qty || 0} | Unit: ${fmt(r.unit_price)} | Total: ${fmt(lt)}`;
  }).join("\n");
  const plainText = [
    `Hi ${customerName},`,
    "",
    "Your personalized kitchen design quote is ready. Full details are below and the quote PDF is attached.",
    "",
    roomWidth ? `Room: ${roomWidth} ft × ${roomDepth} ft × ${roomHeight} ft ceiling` : "",
    dp.layout ? `Layout: ${dp.layout}` : "",
    dp.cabinetStyle ? `Cabinet Style: ${dp.cabinetStyle}` : "",
    "",
    items.length > 0 ? "QUOTE ITEMS:" : "",
    plainItems,
    items.length > 0 ? `\nSubtotal: ${fmt(sub)}` : "",
    rate > 0 ? `Tax (${rate}%): ${fmt(taxAmt)}` : "",
    items.length > 0 ? `Total: ${fmt(total)}` : "",
    quoteNotes ? `\nNotes: ${quoteNotes}` : "",
    "",
    pdfUrl ? `Download PDF: ${pdfUrl}` : "",
    "",
    `Thank you for choosing ${tenantName}.`,
    tenantEmail ? `Questions? Contact us at ${tenantEmail}` : "",
  ].filter((l) => l !== undefined && l !== null).join("\n");

  await transporter.sendMail({
    from,
    to,
    subject: `Your Kitchen Design Quote — ${tenantName}`,
    attachments,
    text: plainText,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">

        <!-- Header -->
        <div style="background:#6E1020;padding:24px;border-radius:8px 8px 0 0">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:.1em;text-transform:uppercase">Kitchen Design Quote</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${escapedTenantName}</p>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 8px 8px">

          <p style="color:#475569;margin:0 0 6px">Hi <strong>${escapedCustomerName}</strong>,</p>
          <p style="color:#475569;margin:0 0 20px;line-height:1.6">
            Your personalized kitchen design quote is ready. Full details are below and the quote PDF is attached to this email.
          </p>

          ${summaryHtml}
          ${renderHtml}
          ${floorPlanHtml}
          ${quoteTableHtml}
          ${notesHtml}

          ${safePdfUrl ? `
          <div style="margin:24px 0 20px">
            <a href="${safePdfUrl}" style="display:inline-block;background:#6E1020;color:#fff;padding:11px 28px;border-radius:24px;font-weight:600;font-size:13px;text-decoration:none">
              Download PDF Quote
            </a>
          </div>` : ""}

          <div style="border-top:1px solid #e7e5e4;padding-top:16px;margin-top:24px">
            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6">
              Thank you for choosing <strong style="color:#57534e">${escapedTenantName}</strong>.${tenantEmail ? `<br>Questions? Email us at <a href="mailto:${esc(tenantEmail)}" style="color:#6E1020">${esc(tenantEmail)}</a>` : ""}
            </p>
          </div>

        </div>
      </div>
    `,
  });
}

export async function sendOTPEmail({ to, otp, tenantName }) {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = `"${tenantName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Your verification code — ${tenantName}`,
    text: `Your verification code is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;color:#1c1917;margin-bottom:8px">Verify your email</h2>
        <p style="color:#57534e;margin-bottom:24px">Enter this code to view your AI kitchen design:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1c1917;background:#f5f5f4;border-radius:8px;padding:16px 24px;text-align:center;margin-bottom:24px">${otp}</div>
        <p style="color:#78716c;font-size:13px">This code expires in 10 minutes. If you didn't request a kitchen design, you can ignore this email.</p>
      </div>
    `,
  });
}
