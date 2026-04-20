import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

/**
 * POST /api/ai/session/[token]/message
 *
 * Placeholder — full Claude API integration is built in Module 10.
 * Stores the user message and returns a stub response.
 */
export async function POST(request, { params }) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: session } = await admin
      .from("ai_sessions")
      .select("id")
      .eq("session_token", params.token)
      .eq("tenant_id", TENANT_ID)
      .single();

    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    // Store user message
    await admin.from("ai_messages").insert({
      session_id: session.id,
      tenant_id: TENANT_ID,
      actor: "user",
      content: message.trim(),
    });

    // Update session activity
    await admin
      .from("ai_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id);

    // Placeholder response — replace with Claude API call in Module 10
    const reply = "AI assistant coming soon. Please use the quote form to request a consultation.";

    const { data: assistantMsg } = await admin
      .from("ai_messages")
      .insert({
        session_id: session.id,
        tenant_id: TENANT_ID,
        actor: "assistant",
        content: reply,
      })
      .select("id")
      .single();

    return NextResponse.json({ reply, recommendations: [], message_id: assistantMsg?.id });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
