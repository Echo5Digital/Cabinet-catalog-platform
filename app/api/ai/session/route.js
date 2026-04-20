import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

export async function POST(request) {
  try {
    const { catalog_line_slug } = await request.json().catch(() => ({}));

    const admin = createAdminClient();

    let catalogLineId = null;
    if (catalog_line_slug) {
      const { data: line } = await admin
        .from("catalog_lines")
        .select("id")
        .eq("tenant_id", TENANT_ID)
        .eq("slug", catalog_line_slug)
        .eq("status", "published")
        .single();
      catalogLineId = line?.id ?? null;
    }

    const sessionToken = `sess_${randomBytes(16).toString("hex")}`;

    const { data: session, error } = await admin
      .from("ai_sessions")
      .insert({
        tenant_id: TENANT_ID,
        catalog_line_id: catalogLineId,
        session_token: sessionToken,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .select("id, session_token, started_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session_token: session.session_token, started_at: session.started_at }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
