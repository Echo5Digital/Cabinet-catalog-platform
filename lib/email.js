import nodemailer from "nodemailer";

export async function sendDesignQuoteEmail({
  to, customerName, tenantName, tenantEmail,
  pdfUrl, pdfBuffer,
  // Design data for the email body
  quoteItems, quoteNotes,
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

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename:    "kitchen-design-concept.pdf",
      content:     pdfBuffer,
      contentType: "application/pdf",
    });
  }

  const dp  = designParams || {};
  const fps = Array.isArray(dp.floorPlanProducts) ? dp.floorPlanProducts : [];
  const qi  = Array.isArray(quoteItems)           ? quoteItems           : [];

  // ── Design highlights (skip empties) ─────────────────────────────────────
  const highlightRows = [
    ["Room Size",       roomWidth && roomDepth ? `${roomWidth} ft × ${roomDepth} ft × ${roomHeight} ft ceiling` : null],
    ["Layout",          dp.layout],
    ["Cabinet Style",   dp.cabinetStyle],
    ["Upper Finish",    dp.upperColor],
    ["Lower Finish",    dp.lowerColor],
    ["Countertop",      dp.countertop],
    ["Flooring",        dp.flooring],
    ["Hardware",        dp.hardware],
    ["Appliance Color", dp.applianceColor],
    ["Hood Style",      dp.hoodStyle],
    ["Style Notes",     styleNotes],
    ["Design Comments", dp.designComments],
  ].filter(([, v]) => v && String(v).trim());

  const highlightsHtml = highlightRows.length > 0 ? `
    <div style="background:#F8F6F3;border-radius:8px;padding:18px 20px;margin:20px 0">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.09em;text-transform:uppercase;margin:0 0 12px">Design Highlights</p>
      ${highlightRows.map(([label, value]) => `
        <p style="margin:0 0 7px;font-size:13px;color:#1c1917;line-height:1.5">
          <span style="color:#78716c;font-size:12px">&#8226; ${esc(label)}:&nbsp;</span>${esc(value)}
        </p>`).join("")}
    </div>` : "";

  // ── Kitchen render ────────────────────────────────────────────────────────
  const renderHtml = safeDesignImageUrl ? `
    <div style="margin:20px 0">
      <img src="${safeDesignImageUrl}" alt="Kitchen Render" style="width:100%;max-width:560px;border-radius:10px;border:1px solid #e7e5e4;display:block">
    </div>` : "";

  // ── Brief cabinet list — no prices, max 8 rows ────────────────────────────
  function buildCabinetRows() {
    if (fps.length > 0) {
      const seen = new Set();
      return fps.filter((p) => {
        const key = p.product_name || p.sku;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8).map((p) => ({
        type:   p.placement === "base" ? "Base Cabinet" : "Upper Cabinet",
        style:  p.product_name || p.sku || "",
        finish: dp.cabinetStyle || dp.upperColor || "—",
      }));
    }
    const seen = new Set();
    return qi.filter((r) => {
      if (seen.has(r.product)) return false;
      seen.add(r.product);
      return true;
    }).slice(0, 8).map((r) => ({
      type:   "Cabinet",
      style:  r.product || "",
      finish: r.finish  || "—",
    }));
  }

  const cabRows = buildCabinetRows();
  const cabinetHtml = cabRows.length > 0 ? `
    <div style="margin:20px 0">
      <p style="font-size:11px;font-weight:700;color:#6E1020;letter-spacing:.09em;text-transform:uppercase;margin:0 0 8px">Cabinet Selection</p>
      <table style="width:100%;max-width:560px;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1C1917;color:#fff">
            <th style="padding:9px 12px;text-align:left;font-weight:600;font-size:11px">Cabinet Type</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;font-size:11px">Style</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;font-size:11px">Finish</th>
          </tr>
        </thead>
        <tbody>
          ${cabRows.map((row, i) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#F8F6F3"};border-bottom:1px solid #e7e5e4">
              <td style="padding:8px 12px;color:#57534e">${esc(row.type)}</td>
              <td style="padding:8px 12px;color:#1c1917">${esc(row.style)}</td>
              <td style="padding:8px 12px;color:#1c1917">${esc(row.finish)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  // ── Plain text fallback ───────────────────────────────────────────────────
  const plainHighlights = highlightRows.map(([l, v]) => `  • ${l}: ${v}`).join("\n");
  const plainCabinets   = cabRows.length > 0
    ? "\nCABINET SELECTION:\n" + cabRows.map((r) => `  ${r.type} | ${r.style} | ${r.finish}`).join("\n")
    : "";
  const plainText = [
    `Hi ${customerName},`,
    "",
    "Your personalized kitchen design concept is ready.",
    "The full design document is attached to this email.",
    "",
    highlightRows.length > 0 ? "DESIGN HIGHLIGHTS:\n" + plainHighlights : "",
    plainCabinets,
    "",
    "Your design PDF is attached to this email.",
    "",
    `Thank you for choosing ${tenantName}.`,
    tenantEmail ? `Questions? Contact us at ${tenantEmail}` : "",
  ].filter((l) => l !== undefined && l !== null).join("\n");

  await transporter.sendMail({
    from,
    to,
    subject: `Your Kitchen Design Concept — ${tenantName}`,
    attachments,
    text: plainText,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">

        <!-- Header -->
        <div style="background:#6E1020;padding:28px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;font-size:10px;font-weight:600;color:rgba(255,255,255,0.55);letter-spacing:.12em;text-transform:uppercase">Kitchen Design Concept</p>
          <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-.3px">${escapedTenantName}</p>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 8px 8px">

          <p style="color:#475569;margin:0 0 4px;font-size:15px">Hi <strong style="color:#1c1917">${escapedCustomerName}</strong>,</p>
          <p style="color:#64748b;margin:0 0 6px;line-height:1.7;font-size:13px">
            Your personalized kitchen design concept is ready. The full design document &mdash; including your floor plan, cabinet elevations, and specifications &mdash; is attached to this email.
          </p>

          ${renderHtml}
          ${highlightsHtml}
          ${cabinetHtml}

          <div style="margin:20px 0;padding:14px 16px;background:#F8F6F3;border-radius:6px;border-left:3px solid #6E1020">
            <p style="margin:0;color:#57534e;font-size:13px;line-height:1.5">
              Your design PDF is attached to this email.
            </p>
          </div>

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
