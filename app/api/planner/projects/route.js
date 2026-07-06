import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/planner/projects
 * List all projects for this tenant that belong to the given session token.
 * Header: X-Session-Token: <uuid>
 */
export async function GET(request) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const sessionToken = request.headers.get("x-session-token");
    if (!sessionToken) {
      return NextResponse.json({ projects: [] });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("planner_projects")
      .select("id, name, layout, cabinet_style, room_dimensions, settings, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("session_token", sessionToken)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ projects: data ?? [] });
  } catch (err) {
    console.error("[planner/projects GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/planner/projects
 * Create a new project.
 * Header: X-Session-Token: <uuid>
 * Body: { name, layout, cabinetStyle, roomDimensions, scene, settings }
 */
export async function POST(request) {
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

    if (!name?.trim()) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("planner_projects")
      .insert({
        tenant_id:       tenantId,
        session_token:   sessionToken,
        name:            name.trim(),
        layout:          layout ?? null,
        cabinet_style:   cabinetStyle ?? null,
        room_dimensions: roomDimensions ?? null,
        scene:           scene ?? null,
        settings:        settings ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    console.error("[planner/projects POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
