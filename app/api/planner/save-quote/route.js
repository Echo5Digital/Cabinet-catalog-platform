import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";
import { sendStaffQuoteNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/planner/save-quote
 *
 * Saves the customer's contact details together with a full snapshot of
 * their kitchen planner design (layout, room dimensions, scene, style
 * selections) as a planner_leads row, and notifies staff by email.
 *
 * Triggered by the "Save and Get Quote" button in Step 3 of the planner.
 *
 * Body: {
 *   name*, email*, phone*, address*, projectName, notes,
 *   layout, cabinetStyle, roomDimensions, scene, doorWindows,
 *   items, upperCabinetColor, lowerCabinetColor, selectedDoorStyle,
 *   selectedDrawerStyle, selectedHardware, selectedCountertop,
 *   selectedFlooring, aiImageUrl,
 * }
 */
export async function POST(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      projectName        = "Kitchen Design",
      notes              = "",
      layout             = null,
      cabinetStyle       = null,
      roomDimensions     = {},
      scene              = null,
      doorWindows        = [],
      items              = [],
      upperCabinetColor  = null,
      lowerCabinetColor  = null,
      selectedDoorStyle  = null,
      selectedDrawerStyle = null,
      selectedHardware   = null,
      selectedCountertop = null,
      selectedFlooring   = null,
      aiImageUrl         = null,
    } = body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim()) {
      return NextResponse.json(
        { error: "Name, email, phone, and address are all required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: lead, error } = await admin
      .from("planner_leads")
      .insert({
        tenant_id:         tenantId,
        customer_name:     name.trim(),
        customer_email:    email.trim().toLowerCase(),
        customer_phone:    phone.trim(),
        customer_address:  address.trim(),
        layout:            layout || null,
        cabinet_style:     cabinetStyle || null,
        room_width:        roomDimensions?.width  || null,
        room_length:       roomDimensions?.length || null,
        room_height:       roomDimensions?.height || null,
        items_json:        items || [],
        scene_json:        scene || null,
        door_windows_json: doorWindows || [],
        settings_json: {
          upperCabinetColor,
          lowerCabinetColor,
          selectedDoorStyle,
          selectedDrawerStyle,
          selectedHardware,
          selectedCountertop,
          selectedFlooring,
        },
        ai_image_url:  typeof aiImageUrl === "string" && aiImageUrl.startsWith("http") ? aiImageUrl : null,
        project_name:  projectName?.trim() || "Kitchen Design",
        notes:         notes?.trim() || null,
        status:        "new",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Notify staff — non-blocking, don't fail the save if email delivery fails.
    try {
      await sendStaffQuoteNotification({
        name:  name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        projectDescription: `Kitchen planner design: ${layout || "Custom"} layout, ${roomDimensions?.width || "?"}ft x ${roomDimensions?.length || "?"}ft.`,
        notes: notes?.trim() || null,
        products: [],
        beforePhotoUrl: null,
      });
    } catch (emailErr) {
      console.error("[planner/save-quote] staff notification email failed:", emailErr);
    }

    return NextResponse.json({ id: lead.id }, { status: 201 });
  } catch (err) {
    console.error("[planner/save-quote] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save your design. Please try again." },
      { status: 500 }
    );
  }
}
