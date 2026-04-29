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
    <div className="space-y-3">
      {/* Render image + download */}
      {d.renderUrl && (
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
      )}

      {/* Structured detail rows */}
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
  );
}

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-purple-100 text-purple-700",
  closed: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-400",
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
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="font-semibold text-gray-900">{lead.name}</p>
            <p className="text-sm text-gray-500">{lead.email}</p>
            {lead.phone && <p className="text-sm text-gray-500">{lead.phone}</p>}
            {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}
            {lead.source !== "design_ai" && lead.project_description && (
              <p className="text-sm text-gray-600 pt-2 border-t border-gray-200 mt-2">
                {lead.project_description}
              </p>
            )}
            {lead.notes && (
              <p className="text-sm text-gray-500 italic">{lead.notes}</p>
            )}
            <p className="text-xs text-gray-400 pt-1">
              Submitted {new Date(lead.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-gray-400 capitalize">Source: {lead.source?.replace("_", " ") || "—"}</p>
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
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400">No items listed.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">SKU</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Product</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Finish</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold text-gray-800">{item.product_sku}</td>
                        <td className="px-3 py-2 text-gray-600">{item.product_name}</td>
                        <td className="px-3 py-2 text-gray-500">{item.finish_name || "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-700 font-medium">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-xl p-5 bg-white hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-semibold text-gray-800">{lead.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
              {lead.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">{lead.email}</p>
          {lead.source && (
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              via {lead.source.replace("_", " ")}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400">
            {new Date(lead.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric",
            })}
          </p>
          {lead.item_count > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
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
            className={`border rounded-lg p-2.5 sm:p-3 text-center transition ${
              statusFilter === s
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-base sm:text-lg font-bold text-gray-900">{stats[s] ?? 0}</p>
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
