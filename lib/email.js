import nodemailer from "nodemailer";

export async function sendDesignQuoteEmail({ to, customerName, tenantName, tenantEmail, pdfUrl, pdfBuffer }) {
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

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename:    "kitchen-quote.pdf",
      content:     pdfBuffer,
      contentType: "application/pdf",
    });
  }

  await transporter.sendMail({
    from,
    to,
    subject: `Your Kitchen Design Quote — ${tenantName}`,
    attachments,
    text: `Hi ${customerName},\n\nPlease find your kitchen design quote attached.\n\n${pdfUrl ? "You can also view it online: " + pdfUrl + "\n\n" : ""}Thank you for choosing ${tenantName}.\n\n${tenantEmail ? "Questions? Contact us at " + tenantEmail : ""}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1e293b">
        <h2 style="font-size:20px;margin-bottom:8px">Your Kitchen Design Quote</h2>
        <p style="color:#475569;margin-bottom:16px">Hi ${customerName},</p>
        <p style="color:#475569;margin-bottom:16px">
          Please find your personalized kitchen design quote attached to this email.
          It includes your AI-generated kitchen render, room dimensions, and itemized pricing.
        </p>
        ${pdfUrl ? `<p style="margin-bottom:24px"><a href="${pdfUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Quote PDF</a></p>` : ""}
        <p style="color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px">
          Thank you for choosing <strong>${tenantName}</strong>.${tenantEmail ? `<br>Questions? Email us at <a href="mailto:${tenantEmail}" style="color:#2563eb">${tenantEmail}</a>` : ""}
        </p>
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
