import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runChat } from "@/lib/ai/chat";
import { getTenantIdFromRequest } from "@/lib/utils/tenant-context";

/**
 * POST /api/ai/session/[token]/message
 *
 * Runs one turn of the AI conversation:
 *  1. Load session + message history
 *  2. Build quote context from ai_recommendations for this session
 *  3. Call runChat() — Claude API with tool-use loop
 *  4. Persist assistant message + token usage
 *  5. Return reply + product suggestions + quote additions
 */
export async function POST(request, { params }) {
  const startTime = Date.now();

  try {
    const tenantId = await getTenantIdFromRequest(request);
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Load session
    const { data: session } = await admin
      .from("ai_sessions")
      .select("id, escalated")
      .eq("session_token", params.token)
      .eq("tenant_id", tenantId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Refuse further messages if already escalated
    if (session.escalated) {
      return NextResponse.json({
        reply: "Your request has been flagged for our team. We'll be in touch shortly.",
        suggestions: [],
        quoteAdditions: [],
        escalated: true,
      });
    }

    // 2. Load message history (last 20 messages to keep context manageable)
    const { data: historyRows } = await admin
      .from("ai_messages")
      .select("actor, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // 3. Build quote context from ai_recommendations for this session
    const { data: recRows } = await admin
      .from("ai_recommendations")
      .select("product_sku, quantity, finish_id, finishes!finish_id(name)")
      .eq("session_id", session.id)
      .eq("action", "add_to_quote")
      .order("created_at", { ascending: true });

    // Aggregate by SKU+finish (sum quantities)
    const quoteMap = {};
    for (const r of recRows || []) {
      const key = `${r.product_sku}::${r.finish_id || ""}`;
      if (quoteMap[key]) {
        quoteMap[key].quantity += r.quantity;
      } else {
        quoteMap[key] = {
          sku: r.product_sku,
          quantity: r.quantity,
          finish_name: r.finishes?.name || null,
        };
      }
    }
    const quoteItems = Object.values(quoteMap);

    // 4. Store user message
    await admin.from("ai_messages").insert({
      session_id: session.id,
      tenant_id: tenantId,
      actor: "user",
      content: message.trim(),
    });

    // 5. Run Claude
    const result = await runChat({
      userMessage: message.trim(),
      history: historyRows || [],
      tenantId: tenantId,
      sessionId: session.id,
      quoteItems,
    });

    const latencyMs = Date.now() - startTime;

    // 6. Persist assistant message
    const { data: assistantMsg } = await admin
      .from("ai_messages")
      .insert({
        session_id: session.id,
        tenant_id: tenantId,
        actor: "assistant",
        content: result.text,
        model: "claude-haiku-4-5-20251001",
        input_tokens: null, // tokens_used is combined
        output_tokens: null,
        latency_ms: latencyMs,
      })
      .select("id")
      .single();

    // 7. Update session activity + message count (fire-and-forget)
    admin
      .from("ai_sessions")
      .update({
        last_activity_at: new Date().toISOString(),
        total_messages: (historyRows?.length || 0) + 2, // +user +assistant
        escalated: result.escalated || false,
        escalation_reason: result.escalationReason || null,
      })
      .eq("id", session.id)
      .then(() => {});

    return NextResponse.json({
      reply: result.text,
      suggestions: result.suggestions || [],
      quoteAdditions: result.quoteAdditions || [],
      escalated: result.escalated || false,
      escalationContact: result.escalationContact || null,
      message_id: assistantMsg?.id,
      tokens_used: result.tokensUsed,
    });
  } catch (err) {
    console.error("[message route]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
