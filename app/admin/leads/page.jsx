"use client";

import { useState, useEffect, useCallback } from "react";

// ── Parse the structured project_description from design_ai submissions ───────
function parseDesignDescription(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const f = {};
  let inItems = false;
  const itemLines = [];

  for (const line of lines) {
    if (line.startsWith("AI Kitchen Design — ")) {
      f.conceptName = line.replace("AI Kitchen Design — ", "").trim();
      inItems = false;
    } else if (line.startsWith("Style: ")) {
      inItems = false;
      line.split(" | ").forEach((part) => {
        const idx = part.indexOf(": ");
        if (idx === -1) return;
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 2).trim();
        if (key === "Style") f.style = val;
        else if (key === "Layout") f.layout = val;
        else if (key === "Budget Style") f.budgetStyle = val;
      });
    } else if (line.startsWith("Upper: ")) {
      inItems = false;
      line.split(" | ").forEach((part) => {
        const idx = part.indexOf(": ");
        if (idx === -1) return;
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 2).trim();
        if (key === "Upper") f.upperColor = val;
        else if (key === "Lower") f.lowerColor = val;
        else if (key === "Countertop") f.countertop = val;
        else if (key === "Flooring") f.flooring = val;
      });
    } else if (line.startsWith("Project Type: ")) {
      inItems = false;
      f.projectType = line.replace("Project Type: ", "").trim();
    } else if (line.startsWith("Address: ")) {
      inItems = false;
      f.address = line.replace("Address: ", "").trim();
    } else if (line.startsWith("Items Requested:")) {
      inItems = true;
    } else if (line.startsWith("Comments: ")) {
      inItems = false;
      f.comments = line.replace("Comments: ", "").trim();
    } else if (line.startsWith("Render URL: ")) {
      inItems = false;
      f.renderUrl = line.replace("Render URL: ", "").trim();
    } else if (inItems && line.trim()) {
      itemLines.push(line.trim());
    }
  }

  f.itemsList = itemLines;
  return f;
}

async function downloadRender(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kitchen-design-render.png";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

// ── Rich design detail view (design_ai source only) ───────────────────────────
function DesignDetails({ description }) {
  const d = parseDesignDescription(description);
  const [imgError, setImgError] = useState(false);
  if (!d) return null;

  const detailRows = [
    { label: "Concept", value: d.conceptName },
    { label: "Project Type", value: d.projectType },
    { label: "Layout", value: d.layout },
    { label: "Cabinet Style", value: d.style },
    { label: "Budget Style", value: d.budgetStyle },
    { label: "Upper Cabinets", value: d.upperColor },
    { label: "Lower Cabinets", value: d.lowerColor },
    { label: "Countertop", value: d.countertop },
    { label: "Flooring", value: d.flooring },
  ].filter((r) => r.value && r.value !== "—");

  return (
    <div className="space-y-5">
      {/* AI Generated Image */}
      {d.renderUrl && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Generated Image</p>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            {imgError ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3l18 18M9.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <p className="text-xs text-gray-400">Render URL has expired (DALL·E links expire after 1 hour).</p>
                <a
                  href={d.renderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  Try opening directly ↗
                </a>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={d.renderUrl}
                alt="AI Kitchen Render"
                className="w-full object-cover"
                style={{ maxHeight: 260 }}
                onError={() => setImgError(true)}
              />
            )}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
              <p className="text-xs text-gray-400 font-medium">AI Render (DALL·E 3)</p>
              {!imgError && (
                <button
                  onClick={() => downloadRender(d.renderUrl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Details */}
      {(detailRows.length > 0 || d.itemsList?.length > 0 || d.comments) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Selected Details</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {detailRows.map(({ label, value }) => (
              <div key={label} className="flex items-start px-4 py-2.5 gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-800 flex-1">{value}</span>
              </div>
            ))}
            {d.itemsList?.length > 0 && (
              <div className="flex items-start px-4 py-2.5 gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Items Needed</span>
                <ul className="flex-1 space-y-0.5">
                  {d.itemsList.map((item, i) => (
                    <li key={i} className="text-sm text-gray-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.comments && (
              <div className="flex items-start px-4 py-2.5 gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">Comments</span>
                <span className="text-sm text-gray-700 flex-1 italic">{d.comments}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-purple-100 text-purple-700",
  closed: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-400",
};

const STATUS_LEFT_BORDER = {
  new: "border-l-blue-400",
  contacted: "border-l-amber-400",
  quoted: "border-l-purple-400",
  closed: "border-l-green-400",
  lost: "border-l-gray-300",
};

const STATUS_CARD_ACTIVE = {
  new: "border-blue-400 bg-blue-50",
  contacted: "border-amber-400 bg-amber-50",
  quoted: "border-purple-400 bg-purple-50",
  closed: "border-green-400 bg-green-50",
  lost: "border-gray-400 bg-gray-100",
};

const STATUS_COUNT_COLOR = {
  new: "text-blue-600",
  contacted: "text-amber-600",
  quoted: "text-purple-600",
  closed: "text-green-600",
  lost: "text-gray-500",
};

const STATUS_OPTIONS = ["new", "contacted", "quoted", "closed", "lost"];

const PIPELINE_NEXT = {
  new: "contacted",
  contacted: "quoted",
  quoted: "closed",
};

function LeadDetail({ lead, onClose, onUpdate }) {
  const [status, setStatus] = useState(lead.status);
  const [internalNotes, setInternalNotes] = useState(lead.internal_notes || "");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`/api/leads/${lead.id}`)
      .then((r) => r.json())
      .then((d) => setItems(d.lead?.items || []));
  }, [lead.id]);

  async function save(updates) {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onUpdate({ ...lead, ...updates });
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setStatus(newStatus);
    await save({ status: newStatus });
  }

  async function handleNotesSave() {
    await save({ internal_notes: internalNotes });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col pointer-events-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-gray-900">Quote Request Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Customer info */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {/* Name + submitted date inline */}
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-gray-900 leading-tight">{lead.name}</p>
                <p className="text-xs text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
                  {new Date(lead.created_at).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}{" "}
                  <span className="text-gray-300">·</span>{" "}
                  {new Date(lead.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Contact cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Email */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <p className="text-xs text-gray-600 truncate">{lead.email}</p>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <p className="text-xs text-gray-600 truncate">{lead.phone || <span className="text-gray-300 italic">—</span>}</p>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {lead.source === "design_ai" && lead.project_description ? (() => {
                    const d = parseDesignDescription(lead.project_description);
                    return <p className="text-xs text-gray-600 truncate">{d?.address || <span className="text-gray-300 italic">—</span>}</p>;
                  })() : (
                    <p className="text-xs text-gray-300 italic">—</p>
                  )}
                </div>
              </div>

              {/* Non-AI source extras */}
              {lead.source !== "design_ai" && lead.company && (
                <p className="text-sm text-gray-500">{lead.company}</p>
              )}
              {lead.source !== "design_ai" && lead.project_description && (
                <p className="text-sm text-gray-600 pt-2 border-t border-gray-200 mt-1">
                  {lead.project_description}
                </p>
              )}
              {lead.notes && (
                <p className="text-xs text-gray-400 italic">{lead.notes}</p>
              )}
            </div>
          </div>

          {/* Design AI structured details */}
          {lead.source === "design_ai" && lead.project_description && (
            <DesignDetails description={lead.project_description} />
          )}

          {/* Status pipeline */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                    status === s
                      ? STATUS_COLORS[s] + " border-current"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {PIPELINE_NEXT[status] && (
              <button
                onClick={() => handleStatusChange(PIPELINE_NEXT[status])}
                disabled={saving}
                className="mt-2 w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Move to {PIPELINE_NEXT[status].charAt(0).toUpperCase() + PIPELINE_NEXT[status].slice(1)} →
              </button>
            )}
          </div>

          {/* Requested items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requested Products</p>
            {items === null ? (
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400">No items listed.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3l18 18M9.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.product_sku}</p>
                      {item.finish_name && <p className="text-xs text-gray-400">{item.finish_name}</p>}
                      {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                    </div>
                    <p className="text-xs font-medium text-gray-600 shrink-0">×{item.quantity}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal notes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Internal Notes</p>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              placeholder="Notes visible only to your team…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={handleNotesSave}
              disabled={saving}
              className="mt-2 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Notes"}
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

function LeadCard({ lead, onClick }) {
  const statusClass = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
  const borderAccent = STATUS_LEFT_BORDER[lead.status] || "border-l-gray-200";
  const projectType = lead.source === "design_ai" && lead.project_description
    ? parseDesignDescription(lead.project_description)?.projectType
    : null;
  return (
    <div
      onClick={onClick}
      className={`border border-l-4 ${borderAccent} border-gray-200 rounded-xl px-5 py-3.5 bg-white hover:shadow-md hover:bg-gray-50/50 transition-all cursor-pointer`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="font-semibold text-gray-800 shrink-0">{lead.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass}`}>
            {lead.status}
          </span>
          <span className="text-gray-300 text-xs shrink-0">·</span>
          <p className="text-sm text-gray-500 truncate">{lead.email}</p>
          {projectType && (
            <>
              <span className="text-gray-300 text-xs shrink-0">·</span>
              <p className="text-xs text-gray-400 shrink-0">{projectType}</p>
            </>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(lead.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric",
            })}
          </p>
          {lead.item_count > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
              {lead.item_count} product{lead.item_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [stats, setStats] = useState({});

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeads();
    fetch("/api/leads/stats").then((r) => r.json()).then((d) => setStats(d.by_status || {}));
  }, [fetchLeads]);

  function handleUpdate(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    if (selectedLead?.id === updated.id) {
      setSelectedLead((prev) => ({ ...prev, ...updated }));
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-3 xs:grid-cols-5 sm:grid-cols-5 gap-2 mb-5">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
            className={`border rounded-xl p-2.5 sm:p-3 text-center transition-all ${
              statusFilter === s
                ? STATUS_CARD_ACTIVE[s] || "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <p className={`text-base sm:text-lg font-bold ${statusFilter === s ? (STATUS_COUNT_COLOR[s] || "text-gray-900") : "text-gray-900"}`}>
              {stats[s] ?? 0}
            </p>
            <p className="text-xs text-gray-500 capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter("")} className="text-xs text-gray-400 hover:text-gray-600">
            Clear filter ×
          </button>
        )}
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && leads.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">
            {statusFilter ? `No ${statusFilter} leads.` : "No quote requests yet."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
        ))}
      </div>

      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
