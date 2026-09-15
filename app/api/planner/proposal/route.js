import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/planner/proposal
 *
 * Generates a professional kitchen design proposal PDF and returns it
 * as a base64-encoded data URI for client-side download.
 *
 * Body: {
 *   clientName, projectName, layout, roomDimensions,
 *   items, upperCabinetColor, lowerCabinetColor,
 *   selectedDoorStyle, selectedHardware, selectedCountertop, selectedFlooring,
 *   aiImageUrl, notes
 * }
 */
export async function POST(request) {
  let tenantId;
  try {
    tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const body = await request.json();
    const {
      // OTP verification token (required)
      verifyToken       = null,
      // Contact fields
      clientName        = "Valued Client",
      clientEmail       = null,
      clientPhone       = null,
      projectName       = "Kitchen Design",
      layout            = "Custom",
      roomDimensions    = { width: 14, length: 11, height: 9 },
      items             = [],
      upperCabinetColor = null,
      lowerCabinetColor = null,
      selectedDoorStyle = null,
      selectedHardware  = null,
      selectedCountertop = null,
      selectedFlooring  = null,
      aiImageUrl        = null,
      notes             = "",
    } = body;

    // ── Verify the OTP token ───────────────────────────────────────────────────
    if (!verifyToken || !clientEmail) {
      return NextResponse.json(
        { error: "Email verification is required before downloading the proposal." },
        { status: 401 }
      );
    }

    // Decode and validate token payload
    let tokenPayload;
    try {
      tokenPayload = JSON.parse(Buffer.from(verifyToken, "base64").toString("utf8"));
    } catch {
      return NextResponse.json({ error: "Invalid verification token." }, { status: 401 });
    }

    if (
      !tokenPayload?.email ||
      tokenPayload.email !== clientEmail.toLowerCase() ||
      !tokenPayload.ts ||
      Date.now() - tokenPayload.ts > 30 * 60 * 1000  // token expires after 30 min
    ) {
      return NextResponse.json({ error: "Verification token expired. Please verify your email again." }, { status: 401 });
    }

    // Cross-check: ensure a verified OTP record exists in the DB for this email
    const admin = createAdminClient();
    const { data: otpRecord } = await admin
      .from("email_otps")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", clientEmail.toLowerCase())
      .not("verified_at", "is", null)
      .order("verified_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return NextResponse.json({ error: "Email not verified. Please complete OTP verification." }, { status: 401 });
    }

    // Load tenant info for branding
    let tenantName = "Cabinet Design Studio";
    try {
      const { data: tenant } = await admin
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single();
      if (tenant?.name) tenantName = tenant.name;
    } catch {
      // Non-critical — continue with default
    }

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const helveticaBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica       = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaObliq  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // If an AI image URL (public URL or base64) was provided, embed it
    let embeddedImage = null;
    if (aiImageUrl) {
      try {
        if (aiImageUrl.startsWith("data:image/png;base64,")) {
          const b64 = aiImageUrl.replace("data:image/png;base64,", "");
          embeddedImage = await pdfDoc.embedPng(Buffer.from(b64, "base64"));
        } else if (aiImageUrl.startsWith("data:image/jpeg;base64,")) {
          const b64 = aiImageUrl.replace("data:image/jpeg;base64,", "");
          embeddedImage = await pdfDoc.embedJpg(Buffer.from(b64, "base64"));
        } else if (aiImageUrl.startsWith("http")) {
          const imgRes  = await fetch(aiImageUrl);
          const imgBuf  = Buffer.from(await imgRes.arrayBuffer());
          const ct      = imgRes.headers.get("content-type") || "";
          embeddedImage = ct.includes("png")
            ? await pdfDoc.embedPng(imgBuf)
            : await pdfDoc.embedJpg(imgBuf);
        }
      } catch {
        // Non-critical — skip image if fetch/embed fails
      }
    }

    // ── Colour palette ─────────────────────────────────────────────────────────
    const DARK   = rgb(0.11, 0.09, 0.07);
    const STONE  = rgb(0.44, 0.40, 0.37);
    const LIGHT  = rgb(0.95, 0.94, 0.92);
    const ACCENT = rgb(0.11, 0.09, 0.07);
    const WHITE  = rgb(1, 1, 1);

    // ── Page 1: Cover ──────────────────────────────────────────────────────────
    const cover = pdfDoc.addPage([612, 792]); // US Letter
    const { width: W, height: H } = cover.getSize();

    // Dark header band
    cover.drawRectangle({ x: 0, y: H - 160, width: W, height: 160, color: DARK });

    // Studio name
    cover.drawText(tenantName.toUpperCase(), {
      x: 48, y: H - 50, size: 10, font: helveticaBold, color: WHITE, characterSpacing: 2,
    });

    // Title
    cover.drawText("Kitchen Design", { x: 48, y: H - 80, size: 28, font: helveticaBold, color: WHITE });
    cover.drawText("Proposal", { x: 48, y: H - 112, size: 28, font: helveticaObliq, color: rgb(0.80, 0.76, 0.70) });

    // Project name
    cover.drawText(projectName, { x: 48, y: H - 200, size: 18, font: helveticaBold, color: DARK });
    cover.drawText(`Prepared for: ${clientName}`, { x: 48, y: H - 224, size: 11, font: helvetica, color: STONE });

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    cover.drawText(today, { x: 48, y: H - 244, size: 10, font: helvetica, color: STONE });

    // Separator
    cover.drawRectangle({ x: 48, y: H - 256, width: 80, height: 2, color: ACCENT });

    // AI visualization image (if available)
    if (embeddedImage) {
      const imgDims = embeddedImage.scaleToFit(W - 96, 280);
      cover.drawImage(embeddedImage, {
        x: (W - imgDims.width) / 2,
        y: H - 560,
        width:  imgDims.width,
        height: imgDims.height,
        opacity: 0.97,
      });
      // Caption
      cover.drawText("AI Kitchen Visualization", {
        x: 48, y: H - 580, size: 8, font: helveticaObliq, color: STONE,
      });
    }

    // Footer
    cover.drawText(`${tenantName}  ·  Confidential`, {
      x: 48, y: 28, size: 8, font: helvetica, color: STONE,
    });
    cover.drawText("1", { x: W - 48, y: 28, size: 8, font: helvetica, color: STONE });

    // ── Page 2: Specifications ─────────────────────────────────────────────────
    const spec = pdfDoc.addPage([612, 792]);

    // Header band
    spec.drawRectangle({ x: 0, y: H - 56, width: W, height: 56, color: DARK });
    spec.drawText("KITCHEN SPECIFICATIONS", {
      x: 48, y: H - 36, size: 11, font: helveticaBold, color: WHITE, characterSpacing: 1.5,
    });

    let curY = H - 90;

    function section(page, title) {
      page.drawText(title.toUpperCase(), {
        x: 48, y: curY, size: 8, font: helveticaBold, color: ACCENT, characterSpacing: 1.5,
      });
      curY -= 4;
      page.drawRectangle({ x: 48, y: curY, width: W - 96, height: 1, color: LIGHT });
      curY -= 16;
    }

    function row(page, label, value) {
      page.drawText(label, { x: 48, y: curY, size: 10, font: helveticaBold, color: DARK });
      page.drawText(String(value || "—"), { x: 240, y: curY, size: 10, font: helvetica, color: STONE });
      curY -= 18;
    }

    // Room
    section(spec, "Room Dimensions");
    row(spec, "Layout Type",    layout);
    row(spec, "Room Width",     `${roomDimensions.width} ft`);
    row(spec, "Room Length",    `${roomDimensions.length} ft`);
    row(spec, "Ceiling Height", `${roomDimensions.height || 9} ft`);
    curY -= 8;

    // Materials
    section(spec, "Materials & Finishes");
    row(spec, "Upper Cabinet Color",  upperCabinetColor?.name);
    row(spec, "Lower Cabinet Color",  lowerCabinetColor?.name);
    row(spec, "Door Style",           selectedDoorStyle?.name);
    row(spec, "Hardware / Pull",      selectedHardware?.name);
    row(spec, "Countertop",           selectedCountertop?.name);
    row(spec, "Flooring",             selectedFlooring?.name);
    curY -= 8;

    // Cabinet / items summary
    section(spec, "Cabinet & Fixture Summary");
    const catCounts = {};
    for (const item of items) {
      const cat = item.category || "Cabinet";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    row(spec, "Total Items", items.length);
    for (const [cat, cnt] of Object.entries(catCounts)) {
      row(spec, cat, `${cnt} unit${cnt > 1 ? "s" : ""}`);
    }
    curY -= 8;

    // Notes
    if (notes && notes.trim()) {
      section(spec, "Design Notes");
      // Wrap long notes
      const words    = notes.split(" ");
      let   line     = "";
      const maxW     = 65;
      const noteLines = [];
      for (const w of words) {
        if ((line + " " + w).length > maxW) { noteLines.push(line.trim()); line = w; }
        else line += " " + w;
      }
      if (line.trim()) noteLines.push(line.trim());

      for (const nl of noteLines.slice(0, 6)) {
        spec.drawText(nl, { x: 48, y: curY, size: 10, font: helvetica, color: DARK });
        curY -= 16;
      }
    }

    // Disclaimer
    spec.drawRectangle({ x: 48, y: 50, width: W - 96, height: 1, color: LIGHT });
    spec.drawText(
      "This proposal is for planning purposes only. Actual product availability and pricing may vary. Contact your dealer for a formal quote.",
      { x: 48, y: 34, size: 7.5, font: helveticaObliq, color: STONE, maxWidth: W - 96, lineHeight: 12 }
    );

    // Footer
    spec.drawText(`${tenantName}  ·  Confidential`, { x: 48, y: 18, size: 8, font: helvetica, color: STONE });
    spec.drawText("2", { x: W - 48, y: 18, size: 8, font: helvetica, color: STONE });

    // ── Serialise to base64 ────────────────────────────────────────────────────
    const pdfBytes  = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // ── Store lead in DB (non-blocking — don't fail the PDF if this errors) ────
    try {
      await admin.from("planner_leads").insert({
        tenant_id:      tenantId,
        customer_name:  clientName,
        customer_email: clientEmail.toLowerCase(),
        customer_phone: clientPhone || null,
        layout:         layout || null,
        room_width:     roomDimensions?.width  || null,
        room_length:    roomDimensions?.length || null,
        room_height:    roomDimensions?.height || null,
        items_json:     items || [],
        settings_json: {
          upperCabinetColor,
          lowerCabinetColor,
          selectedDoorStyle,
          selectedHardware,
          selectedCountertop,
          selectedFlooring,
        },
        ai_image_url:   typeof aiImageUrl === "string" && aiImageUrl.startsWith("http") ? aiImageUrl : null,
        project_name:   projectName || null,
        notes:          notes || null,
        status:         "new",
      });
    } catch (leadErr) {
      console.error("[planner/proposal] lead store error (non-fatal):", leadErr);
    }

    return NextResponse.json({ pdfBase64, filename: `${projectName.replace(/\s+/g, "_")}_Proposal.pdf` });

  } catch (err) {
    console.error("[planner/proposal] error:", err);
    return NextResponse.json(
      { error: "Failed to generate proposal PDF." },
      { status: 500 }
    );
  }
}
