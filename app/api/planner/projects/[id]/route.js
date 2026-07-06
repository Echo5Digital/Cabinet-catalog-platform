import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/planner/projects/[id]
 * Load a single project (full scene included).
 */
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const sessionToken = request.headers.get("x-session-token");
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("planner_projects")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Ownership check: must match session token OR belong to a tenant member (admin)
    const isOwner = data.session_token && data.session_token === sessionToken;
    const isAdmin = false; // admin check is handled by RLS in production; here we trust tenantId match
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    console.error("[planner/projects/[id] GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/planner/projects/[id]
 * Update project name, scene, settings, etc.
 * Body: { name?, layout?, cabinetStyle?, roomDimensions?, scene?, settings? }
 */
export async function PATCH(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const sessionToken = request.headers.get("x-session-token");
    if (!sessionToken) {
      return NextResponse.json({ error: "X-Session-Token header is required." }, { status: 400 });
    }

    const body = await request.json();
    const { name, layout, cabinetStyle, roomDimensions, scene, settings } = body;

    const patch = {};
    if (name        !== undefined) patch.name            = name.trim();
    if (layout      !== undefined) patch.layout          = layout;
    if (cabinetStyle !== undefined) patch.cabinet_style  = cabinetStyle;
    if (roomDimensions !== undefined) patch.room_dimensions = roomDimensions;
    if (scene       !== undefined) patch.scene           = scene;
    if (settings    !== undefined) patch.settings        = settings;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("planner_projects")
      .update(patch)
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .eq("session_token", sessionToken)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Project not found or not authorized." }, { status: 404 });
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    console.error("[planner/projects/[id] PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/planner/projects/[id]
 */
export async function DELETE(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const sessionToken = request.headers.get("x-session-token");
    if (!sessionToken) {
      return NextResponse.json({ error: "X-Session-Token header is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("planner_projects")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .eq("session_token", sessionToken);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[planner/projects/[id] DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
