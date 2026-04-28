/**
 * AI Chat Engine
 *
 * Assembles the system prompt from DB context, runs the OpenAI API
 * with tool use, executes tool calls against the DB, and returns
 * the final text response.
 *
 * The AI never sees raw DB IDs — only human-readable names/codes.
 * All facts returned to the user come from tool results.
 */

import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOOL_DEFINITIONS, executeTool } from "./tools";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4o-mini"; // Fast + cheap for chat
const MAX_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 5; // Prevent infinite loops

// ─── System prompt assembly ───────────────────────────────────────────────────

async function buildSystemPrompt(tenantId, quoteItems) {
  const admin = createAdminClient();

  const [{ data: tenant }, { data: lines }, { data: categories }] = await Promise.all([
    admin.from("tenants").select("name, contact_email, contact_phone").eq("id", tenantId).single(),
    admin.from("catalog_lines").select("name, slug, description").eq("tenant_id", tenantId).eq("status", "published").order("sort_order"),
    admin.from("categories").select("name, slug").eq("tenant_id", tenantId).order("sort_order"),
  ]);

  const tenantName = tenant?.name || "Cabinet & Remodeling Depot";
  const contactEmail = tenant?.contact_email || "";
  const contactPhone = tenant?.contact_phone || "";

  const linesText = (lines || [])
    .map((l) => `  - ${l.name} (slug: "${l.slug}")${l.description ? ": " + l.description : ""}`)
    .join("\n") || "  (none published yet)";

  const categoriesText = (categories || [])
    .map((c) => `  - ${c.name} (slug: "${c.slug}")`)
    .join("\n") || "  (none configured)";

  const quoteText = (quoteItems || []).length > 0
    ? (quoteItems || []).map((i) => `  - ${i.sku} × ${i.quantity}${i.finish_name ? ` (${i.finish_name})` : ""}`).join("\n")
    : "  (empty)";

  return `You are the catalog assistant for ${tenantName}.
Your role is to help customers find the right cabinets for their project and build a quote for our team to follow up on.

WHAT YOU CAN DO:
- Ask qualifying questions to understand the project
- Search for products using the search_products tool
- Explain real products using data from get_product_detail
- Compare 2–3 options using only data returned by tools
- Help the customer add products to their quote via add_to_quote
- Summarize the quote and guide toward submission

CRITICAL RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
- Never state a SKU, product name, dimension, or finish that was not returned by a tool call
- Never invent a measurement — width, height, depth must come from tool results only
- Never claim a finish is available without confirming via get_product_detail
- If add_to_quote returns ok: false, do NOT retry the same combination — tell the customer and offer alternatives
- Never mention pricing — say pricing is provided by our team in the quote follow-up
- Never claim products are "in stock" or give lead times — you don't have that information

QUALIFYING APPROACH:
- Ask 1–2 short questions before searching, never more than 3 in a row
- Once you have: room type + any size or style signal → search and show options
- Lead with options, not more questions

ESCALATE TO HUMAN when:
- Customer uses words like "speak to someone", "call me", "human", "representative"
- 3 consecutive searches return no results
- Customer needs custom sizing or non-standard dimensions
- Customer explicitly asks about pricing or delivery times (offer to build quote instead; if they insist → escalate)
Always call escalate_to_human tool, then provide contact info

CONTACT INFORMATION (for escalations):
- Email: ${contactEmail || "(not configured)"}
- Phone: ${contactPhone || "(not configured)"}

AVAILABLE CATALOG LINES:
${linesText}

AVAILABLE CATEGORIES:
${categoriesText}

CURRENT QUOTE:
${quoteText}

TONE:
- Professional and warm — like a knowledgeable showroom consultant
- Concise: 2–4 short sentences per response, never long paragraphs
- When showing product options, list SKU + name + key dimension
- Never use markdown headers in responses — plain conversational text only`;
}

// ─── Message history formatter ────────────────────────────────────────────────

function formatHistory(dbMessages) {
  // OpenAI needs alternating user/assistant — merge consecutive same-role messages
  const messages = [];
  for (const msg of dbMessages) {
    const role = msg.actor === "user" ? "user" : "assistant";
    if (messages.length > 0 && messages[messages.length - 1].role === role) {
      // Merge — shouldn't happen in normal flow but guard it
      messages[messages.length - 1].content += "\n\n" + msg.content;
    } else {
      messages.push({ role, content: msg.content });
    }
  }
  return messages;
}

// ─── Main chat function ───────────────────────────────────────────────────────

/**
 * runChat — runs one turn of the conversation with tool use loop.
 *
 * @param {string} userMessage - The new user message
 * @param {Array} history - Previous messages from DB [{actor, content}]
 * @param {string} tenantId
 * @param {string} sessionId
 * @param {Array} quoteItems - Current quote items [{sku, quantity, finish_name}]
 * @returns {{ text, suggestions, quoteAdditions, escalated, escalationReason, escalationContact, tokensUsed }}
 */
export async function runChat({ userMessage, history, tenantId, sessionId, quoteItems = [] }) {
  const systemPrompt = await buildSystemPrompt(tenantId, quoteItems);

  // Build messages array: system + history + new user message
  const messages = [
    { role: "system", content: systemPrompt },
    ...formatHistory(history),
    { role: "user", content: userMessage },
  ];

  const toolContext = { sessionId, tenantId, quoteItems };

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const suggestions = []; // Product cards to show in the UI
  const quoteAdditions = []; // Items added this turn
  let escalated = false;
  let escalationReason = null;
  let escalationContact = null;

  // Tool use loop — runs until the model stops calling tools
  let currentMessages = messages;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: currentMessages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    totalInputTokens += response.usage?.prompt_tokens || 0;
    totalOutputTokens += response.usage?.completion_tokens || 0;

    // If the model is done (no tool calls), return the text
    if (choice.finish_reason === "stop") {
      return {
        text: choice.message.content || "",
        suggestions,
        quoteAdditions,
        escalated,
        escalationReason,
        escalationContact,
        tokensUsed: totalInputTokens + totalOutputTokens,
      };
    }

    // Process tool calls
    if (choice.finish_reason === "tool_calls") {
      const toolCalls = choice.message.tool_calls || [];
      const toolMessages = [];

      for (const toolCall of toolCalls) {
        const name = toolCall.function.name;
        const input = JSON.parse(toolCall.function.arguments);
        const toolResult = await executeTool(name, input, toolContext);

        // Collect side-effects
        if (name === "search_products" && toolResult.products?.length) {
          suggestions.push(...toolResult.products);
        }
        if (name === "add_to_quote" && toolResult.ok) {
          quoteAdditions.push(toolResult);
        }
        if (name === "escalate_to_human") {
          escalated = toolResult.escalated;
          escalationReason = toolResult.reason;
          escalationContact = {
            email: toolResult.contact_email,
            phone: toolResult.contact_phone,
          };
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Continue the loop: append assistant message + all tool results
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: choice.message.content, tool_calls: choice.message.tool_calls },
        ...toolMessages,
      ];
      continue;
    }

    // Unexpected finish reason — break
    break;
  }

  // Fallback if loop exhausted without stop
  return {
    text: "I'm having trouble processing that. Could you try rephrasing?",
    suggestions: [],
    quoteAdditions: [],
    escalated: false,
    escalationReason: null,
    escalationContact: null,
    tokensUsed: totalInputTokens + totalOutputTokens,
  };
}

// ─── One-shot admin AI calls ──────────────────────────────────────────────────

const ADMIN_MODEL = "gpt-4o-mini";

export async function summarizeLead(leadData) {
  const prompt = `Summarize this cabinet quote request for a sales rep. Be concise (3–5 sentences max).
Note any: mixed finishes, unusual quantities, project signals, or follow-up questions the rep should ask.

${JSON.stringify(leadData, null, 2)}`;

  const response = await client.chat.completions.create({
    model: ADMIN_MODEL,
    max_tokens: 300,
    messages: [
      { role: "system", content: "You are a helpful assistant for a cabinet company sales team. Be concise, professional, and practical." },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content || "";
}

export async function explainVersionDiff(diff) {
  const prompt = `Explain these cabinet catalog changes in plain English for a non-technical user.
Focus on what this means for customers and sales. Keep it under 80 words.

${JSON.stringify(diff, null, 2)}`;

  const response = await client.chat.completions.create({
    model: ADMIN_MODEL,
    max_tokens: 200,
    messages: [
      { role: "system", content: "You are a helpful assistant for a cabinet company. Explain technical catalog changes in simple, plain English." },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content || "";
}

export async function draftProductDescription(productData) {
  const prompt = `Write a 1–2 sentence product description for a cabinet catalog listing.
Factual, professional, no fluff or marketing language. Based only on the specs provided.
Do not invent any feature not listed.

${JSON.stringify(productData, null, 2)}`;

  const response = await client.chat.completions.create({
    model: ADMIN_MODEL,
    max_tokens: 150,
    messages: [
      { role: "system", content: "You write concise, accurate product descriptions for a cabinet catalog. Never invent specs." },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content || "";
}
