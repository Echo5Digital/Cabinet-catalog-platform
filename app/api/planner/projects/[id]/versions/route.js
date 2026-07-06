import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/planner/projects/[id]/versions
 * List version history for a project (metadata only, no full scene).
 */
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const sessionToken = request.headers.get("x-session-token");

    // Verify project ownership before listing versions
    const admin = createAdminClient();
    const { data: project, error: projErr } = await admin
      .from("planner_projects")
      .select("id, session_token")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.session_token !== sessionToken) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("planner_project_versions")
      .select("id, label, created_at")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ versions: data ?? [] });
  } catch (err) {
    console.error("[planner/projects/[id]/versions GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/planner/projects/[id]/versions
 * Save a new version snapshot of the current project state.
 * Body: { scene, settings?, label? }
 */
export async function POST(request, { params }) {
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
    const { scene, settings, label } = body;

    if (!scene) {
      return NextResponse.json({ error: "scene is required." }, { status: 400 });
    }

    // Verify project ownership
    const admin = createAdminClient();
    const { data: project, error: projErr } = await admin
      .from("planner_projects")
      .select("id, session_token")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (projErr || !project || project.session_token !== sessionToken) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("planner_project_versions")
      .insert({
        project_id: params.id,
        tenant_id:  tenantId,
        scene,
        settings:   settings ?? null,
        label:      label ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ version: data }, { status: 201 });
  } catch (err) {
    console.error("[planner/projects/[id]/versions POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
