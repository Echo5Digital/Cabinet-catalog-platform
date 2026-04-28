import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantIdFromRequest(request);
    const admin = createAdminClient();
    const { data: session, error } = await admin
      .from("ai_sessions")
      .select(`
        id, session_token, customer_name, customer_email,
        total_messages, resolved, started_at, last_activity_at,
        catalog_line:catalog_lines!catalog_line_id(name, slug)
      `)
      .eq("session_token", params.token)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    const { data: messages } = await admin
      .from("ai_messages")
      .select("id, actor, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ session: { ...session, messages: messages ?? [] } });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
