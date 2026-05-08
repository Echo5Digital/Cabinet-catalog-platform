import nodemailer from "nodemailer";

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
