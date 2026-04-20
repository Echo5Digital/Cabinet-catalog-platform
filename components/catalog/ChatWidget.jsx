"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useQuote } from "@/lib/context/quote";

const SESSION_KEY = "ai_session_token";

// ─── Product suggestion card ──────────────────────────────────────────────────
function SuggestionCard({ product, onAdd }) {
  const dims = [
    product.width_in && `${product.width_in}"W`,
    product.height_in && `${product.height_in}"H`,
    product.depth_in && `${product.depth_in}"D`,
  ].filter(Boolean).join(" × ");

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden flex gap-3 p-3 shadow-sm">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg bg-stone-100 shrink-0 overflow-hidden">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-stone-400 leading-none mb-0.5">{product.sku}</p>
        <p className="text-sm font-medium text-stone-900 leading-snug truncate">{product.name}</p>
        {dims && <p className="text-xs text-stone-400 mt-0.5">{dims}</p>}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onAdd(product)}
            className="text-xs font-medium px-2.5 py-1 bg-stone-900 text-white rounded-full hover:bg-stone-700 transition"
          >
            Add to quote
          </button>
          {product.sku && (
            <Link
              href={`/catalog/${product.catalog_line?.toLowerCase().replace(/\s+/g, "-") || ""}/${product.sku}`}
              className="text-xs text-stone-400 hover:text-stone-700 transition"
              target="_blank"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Escalation notice ────────────────────────────────────────────────────────
function EscalationBanner({ contact }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-medium text-amber-900 mb-1">Connecting you to our team</p>
      <p className="text-amber-700 text-xs leading-relaxed mb-2">
        We&apos;ll follow up shortly. You can also reach us directly:
      </p>
      <div className="space-y-1">
        {contact?.email && (
          <a href={`mailto:${contact.email}`} className="block text-xs text-amber-800 underline">
            {contact.email}
          </a>
        )}
        {contact?.phone && (
          <a href={`tel:${contact.phone}`} className="block text-xs text-amber-800 underline">
            {contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-7 h-7 rounded-full bg-stone-200 shrink-0 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l.342 2.053A9.75 9.75 0 0112 18.75a9.75 9.75 0 01-7.142-1.697L5 14.5" />
        </svg>
      </div>
      <div className="bg-stone-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onAddSuggestion }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-2 items-end ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-stone-200 shrink-0 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l.342 2.053A9.75 9.75 0 0112 18.75a9.75 9.75 0 01-7.142-1.697L5 14.5" />
          </svg>
        </div>
      )}

      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Text bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-stone-900 text-white rounded-br-sm"
              : "bg-stone-100 text-stone-800 rounded-bl-sm"
          }`}
        >
          {msg.content}
        </div>

        {/* Suggestion cards */}
        {!isUser && msg.suggestions?.length > 0 && (
          <div className="space-y-2 w-full">
            {msg.suggestions.map((product) => (
              <SuggestionCard
                key={product.sku}
                product={product}
                onAdd={onAddSuggestion}
              />
            ))}
          </div>
        )}

        {/* Escalation banner */}
        {!isUser && msg.escalated && (
          <EscalationBanner contact={msg.escalationContact} />
        )}
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function ChatWidget({ tenant }) {
  const [open, setOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const { addItem } = useQuote();

  const primaryColor = tenant?.primary_color || "#1C1917";

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Init or restore session
  const initSession = useCallback(async () => {
    if (sessionToken) return; // Already have one

    setSessionLoading(true);

    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      // Try to load existing session
      try {
        const res = await fetch(`/api/ai/session/${stored}`);
        if (res.ok) {
          const { session } = await res.json();
          setSessionToken(stored);
          // Restore message history
          const restored = (session.messages || []).map((m) => ({
            role: m.actor === "user" ? "user" : "assistant",
            content: m.content,
          }));
          setMessages(restored);
          setSessionLoading(false);
          return;
        }
      } catch {
        // Fall through to create new
      }
      localStorage.removeItem(SESSION_KEY);
    }

    // Create new session
    try {
      const res = await fetch("/api/ai/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const { session_token } = await res.json();
        setSessionToken(session_token);
        localStorage.setItem(SESSION_KEY, session_token);
        // Welcome message
        setMessages([{
          role: "assistant",
          content: "Hi! I'm here to help you find the right cabinets for your project. What room are you working on?",
        }]);
      }
    } catch {
      // Silent fail — widget still shows but messages won't send
    }
    setSessionLoading(false);
  }, [sessionToken]);

  const handleOpen = () => {
    setOpen(true);
    setHasUnread(false);
    initSession();
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading || !sessionToken) return;

    const userMsg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/ai/session/${sessionToken}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      const assistantMsg = {
        role: "assistant",
        content: data.reply || "I'm sorry, I had trouble with that. Could you try again?",
        suggestions: data.suggestions || [],
        escalated: data.escalated || false,
        escalationContact: data.escalationContact || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Sync quote additions to the quote context
      for (const addition of data.quoteAdditions || []) {
        addItem({
          sku: addition.sku,
          name: addition.name,
          finish_code: addition.finish_code || null,
          finish_name: addition.finish_name || null,
          quantity: addition.quantity || 1,
        });
      }

      // Mark unread if panel is closed
      if (!open) setHasUnread(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAddSuggestion = (product) => {
    addItem({
      sku: product.sku,
      name: product.name,
      quantity: 1,
    });
    // Acknowledge in chat
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `I'd like to add ${product.sku} to my quote.` },
    ]);
    sendMessage(`Please add ${product.sku} × 1 to my quote.`);
  };

  const startNewChat = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setMessages([]);
    initSession();
  };

  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(380px,calc(100vw-2rem))] flex flex-col rounded-2xl shadow-2xl border border-stone-200 bg-white overflow-hidden"
          style={{ height: "min(520px, calc(100dvh - 120px))" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l.342 2.053A9.75 9.75 0 0112 18.75a9.75 9.75 0 01-7.142-1.697L5 14.5" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium leading-none">Cabinet Assistant</p>
                <p className="text-white/50 text-xs mt-0.5">Powered by AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={startNewChat}
                title="New conversation"
                className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
            {sessionLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    msg={msg}
                    onAddSuggestion={handleAddSuggestion}
                  />
                ))}
                {loading && <TypingIndicator />}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-stone-100 px-3 py-3 flex items-end gap-2 bg-white"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about cabinets…"
              rows={1}
              disabled={loading || sessionLoading}
              className="flex-1 resize-none text-sm text-stone-800 placeholder-stone-400 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-stone-400 focus:bg-white transition disabled:opacity-50"
              style={{ maxHeight: "96px", overflowY: "auto" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || sessionLoading}
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── Floating button ─────────────────────────────────────────────── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: primaryColor }}
        aria-label={open ? "Close chat" : "Open AI assistant"}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}

        {/* Unread dot */}
        {hasUnread && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
