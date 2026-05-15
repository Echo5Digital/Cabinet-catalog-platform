import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

const BEFORE_PHOTO_BUCKET = "before-photos";
const BEFORE_PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/public/design-quote
 *
 * Accepts a design AI quote submission. Unlike /api/public/quotes, this endpoint
 * does NOT enforce strict product SKU validation — AI recommendations are saved
 * best-effort. All design details are captured in project_description.
 *
 * Body:
 *   name*, email*, phone, address, project_description, notes
 *   products: [{ sku, name, type, dimensions }]  — from AI result, best-effort
 *   before_photo: URL string or base64 data URL of the original kitchen photo
 */

/** Upload a base64 data URL to Supabase storage, return the public URL. */
async function uploadBeforePhoto(admin, tenantId, dataUrl) {
  try {
    // Parse "data:<mime>;base64,<data>"
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const [, mimeType, b64] = match;
    const buffer = Buffer.from(b64, "base64");
    if (buffer.byteLength > BEFORE_PHOTO_MAX_BYTES) return null;
    const ext = mimeType.split("/")[1]?.split("+")[0] || "jpg";
    const path = `${tenantId}/${Date.now()}.${ext}`;
    const { error } = await admin.storage
      .from(BEFORE_PHOTO_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: false });
    if (error) return null;
    const { data: urlData } = admin.storage.from(BEFORE_PHOTO_BUCKET).getPublicUrl(path);
    return urlData?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      project_description,
      notes,
      products = [],
      before_photo,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── Resolve before photo URL ───────────────────────────────────────────────
    let before_image_url = null;
    if (before_photo) {
      if (before_photo.startsWith("http://") || before_photo.startsWith("https://")) {
        before_image_url = before_photo;
      } else if (before_photo.startsWith("data:")) {
        before_image_url = await uploadBeforePhoto(admin, tenantId, before_photo);
      }
    }

    // ── Insert lead_request ────────────────────────────────────────────────────
    const { data: lead, error: leadError } = await admin
      .from("lead_requests")
      .insert({
        tenant_id: tenantId,
        source: "design_ai",
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() ?? null,
        project_description: project_description?.trim() ?? null,
        notes: notes?.trim() ?? null,
        status: "new",
        before_image_url,
      })
      .select("id")
      .single();

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    // ── Best-effort product item lookup (no violations, just skip unknowns) ────
    if (Array.isArray(products) && products.length > 0) {
      const skuList = products
        .map((p) => String(p.sku || "").trim().toUpperCase())
        .filter(Boolean);

      if (skuList.length > 0) {
        const { data: matchedProducts } = await admin
          .from("products")
          .select("id, sku, name")
          .eq("tenant_id", tenantId)
          .in("sku", skuList);

        if (matchedProducts && matchedProducts.length > 0) {
          const productMap = Object.fromEntries(
            matchedProducts.map((p) => [p.sku.toUpperCase(), p])
          );

          const itemRows = products
            .map((p, i) => {
              const matched = productMap[String(p.sku || "").toUpperCase()];
              return {
                lead_request_id: lead.id,
                product_id: matched?.id ?? null,
                product_sku: String(p.sku || "").toUpperCase(),
                product_name: matched?.name ?? p.name ?? null,
                quantity: 1,
                notes: p.dimensions ?? null,
                sort_order: i,
              };
            })
            .filter((r) => r.product_sku);

          if (itemRows.length > 0) {
            await admin.from("lead_request_items").insert(itemRows);
          }
        }
      }
    }

    return NextResponse.json(
      { lead_id: lead.id, message: "Your quote request has been received. We will contact you within 1 business day." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[design-quote]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
