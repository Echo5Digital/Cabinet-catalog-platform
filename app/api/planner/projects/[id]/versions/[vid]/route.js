import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/planner/projects/[id]/versions/[vid]
 * Fetch a single version's full scene data.
 */
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured." }, { status: 500 });
    }

    const sessionToken = request.headers.get("x-session-token");

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
      .select("*")
      .eq("id", params.vid)
      .eq("project_id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    return NextResponse.json({ version: data });
  } catch (err) {
    console.error("[planner/projects/[id]/versions/[vid] GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/planner/projects/[id]/versions/[vid]/restore
 * Restore a version: copies the version's scene/settings back onto the parent project.
 * (Reached via POST to the version URL — the client sends { action: "restore" }.)
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

    // Fetch the version to restore
    const { data: version, error: verErr } = await admin
      .from("planner_project_versions")
      .select("scene, settings")
      .eq("id", params.vid)
      .eq("project_id", params.id)
      .single();

    if (verErr || !version) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    // Apply version's scene/settings back onto the project
    const patch = { scene: version.scene };
    if (version.settings) patch.settings = version.settings;

    const { data: updated, error: updateErr } = await admin
      .from("planner_projects")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[planner/projects/[id]/versions/[vid] POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
