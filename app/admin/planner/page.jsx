"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  new:       { label: "New",       dot: "bg-indigo-500",  badge: "bg-indigo-50 text-indigo-700 border-indigo-200"  },
  contacted: { label: "Contacted", dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200"    },
  closed:    { label: "Closed",    dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDim(w, l, h) {
  if (!w && !l) return "—";
  const parts = [w && `${w}ft`, l && `${l}ft`, h && `${h}ft`].filter(Boolean);
  return parts.join(" × ");
}

// ─── Lead detail drawer ───────────────────────────────────────────────────────

function LeadDrawer({ lead, onClose, onStatusChange, onViewDesign }) {
  const [status,   setStatus]   = useState(lead.status);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState(null);

  const items = Array.isArray(lead.items_json) ? lead.items_json : [];
  const settings = lead.settings_json || {};

  async function handleSaveStatus(newStatus) {
    setSaving(true);
    setSaveErr(null);
    try {
      const res  = await fetch("/api/admin/planner-leads", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: lead.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update.");
      setStatus(newStatus);
      onStatusChange(lead.id, newStatus);
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Count items by category
  const catCounts = {};
  for (const item of items) {
    const cat = item.category || "Cabinet";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Centered modal */}
      <div
        className="w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-900 text-base leading-tight">{lead.customer_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(lead.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Contact info */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: "Name",    value: lead.customer_name  },
                { label: "Email",   value: lead.customer_email },
                { label: "Phone",   value: lead.customer_phone || "—" },
                { label: "Address", value: lead.customer_address || "—" },
                { label: "Project", value: lead.project_name   || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-gray-900 font-medium mt-0.5 break-all">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Status */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleSaveStatus(key)}
                  disabled={saving || status === key}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                    status === key
                      ? `${cfg.badge} cursor-default`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700",
                  ].join(" ")}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
            {saveErr && <p className="text-xs text-red-500 mt-1.5">{saveErr}</p>}
          </section>

          {/* Room + layout */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Kitchen Plan</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Layout</p>
                <p className="text-sm text-gray-900 font-medium mt-0.5">{lead.layout || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Room Size</p>
                <p className="text-sm text-gray-900 font-medium mt-0.5">{fmtDim(lead.room_width, lead.room_length, lead.room_height)}</p>
              </div>
            </div>
          </section>

          {/* Materials */}
          {(settings.upperCabinetColor || settings.selectedCountertop || settings.selectedFlooring) && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Materials & Finishes</p>
              <div className="space-y-1.5">
                {[
                  { label: "Upper Cabinets", value: settings.upperCabinetColor?.name },
                  { label: "Lower Cabinets", value: settings.lowerCabinetColor?.name },
                  { label: "Door Style",     value: settings.selectedDoorStyle?.name },
                  { label: "Hardware",       value: settings.selectedHardware?.name },
                  { label: "Countertop",     value: settings.selectedCountertop?.name },
                  { label: "Flooring",       value: settings.selectedFlooring?.name },
                ].filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-xs">{label}</span>
                    <span className="font-medium text-gray-800 text-xs text-right">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cabinet summary */}
          {items.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Cabinet &amp; Fixture Summary ({items.length} items)
              </p>
              <div className="space-y-1">
                {Object.entries(catCounts).map(([cat, cnt]) => (
                  <div key={cat} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{cat}</span>
                    <span className="font-semibold text-gray-800">{cnt} unit{cnt > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI Image */}
          {lead.ai_image_url && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">AI Visualization</p>
              <div className="relative w-full" style={{ height: 220 }}>
                <Image
                  src={lead.ai_image_url}
                  alt="AI kitchen visualization"
                  fill
                  sizes="(max-width: 640px) 100vw, 512px"
                  className="rounded-xl border border-gray-100 object-cover"
                />
              </div>
            </section>
          )}

          {/* Notes */}
          {lead.notes && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Design Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex flex-col sm:flex-row gap-2">
          {lead.scene_json && (
            <button
              onClick={() => onViewDesign(lead.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-indigo-700 border border-indigo-200 text-sm font-semibold hover:bg-indigo-50 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              View 2D/3D Design
            </button>
          )}
          <a
            href={`mailto:${lead.customer_email}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Email {lead.customer_name.split(" ")[0]}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlannerLeadsPage() {
  const router = useRouter();
  const [leads,       setLeads]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [statusFilter,setStatusFilter]= useState("");
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected,    setSelected]    = useState(null); // lead detail drawer

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (statusFilter) params.set("status", statusFilter);
      if (search)       params.set("q", search);
      const res  = await fetch(`/api/admin/planner-leads?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load.");
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleStatusChange(id, newStatus) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    if (selected?.id === id) setSelected((s) => ({ ...s, status: newStatus }));
  }

  function handleViewDesign(id) {
    router.push(`/admin/planner/${id}`);
  }

  // Stats
  const byStatus = { new: 0, contacted: 0, closed: 0 };
  for (const l of leads) if (byStatus[l.status] !== undefined) byStatus[l.status]++;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Planner Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Customers who saved a kitchen design and requested a quote from the planner.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",     value: total,             color: "text-gray-900"   },
          { label: "New",       value: byStatus.new,       color: "text-indigo-600" },
          { label: "Contacted", value: byStatus.contacted, color: "text-amber-600"  },
          { label: "Closed",    value: byStatus.closed,    color: "text-emerald-600"},
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone, project…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-300"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition shrink-0"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-gray-400 transition shrink-0"
            >
              Clear
            </button>
          )}
        </form>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden sm:grid grid-cols-[1fr_1.2fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Layout</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading leads…
          </div>
        )}

        {!loading && error && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-red-600 bg-red-50 inline-block px-4 py-2 rounded-lg border border-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && leads.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">No planner leads yet</p>
            <p className="text-xs text-gray-400 mt-1">Leads appear here when customers save a design and request a quote.</p>
          </div>
        )}

        {!loading && !error && leads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => setSelected(lead)}
            className="w-full text-left border-b border-gray-50 last:border-0 hover:bg-gray-50 transition focus:outline-none focus:bg-indigo-50"
          >
            {/* Mobile card */}
            <div className="sm:hidden px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{lead.customer_name}</p>
                <p className="text-xs text-gray-400 truncate">{lead.customer_email}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lead.layout || "—"} · {fmtDim(lead.room_width, lead.room_length, lead.room_height)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={lead.status} />
                <p className="text-[10px] text-gray-400">{fmtDate(lead.created_at).split(",")[0]}</p>
              </div>
            </div>

            {/* Desktop row */}
            <div className="hidden sm:grid grid-cols-[1fr_1.2fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-4 px-5 py-3.5 items-center">
              <span className="font-medium text-gray-900 text-sm truncate">{lead.customer_name}</span>
              <span className="text-gray-500 text-sm truncate">{lead.customer_email}</span>
              <span className="text-gray-500 text-sm truncate">{lead.customer_phone || "—"}</span>
              <span className="text-gray-500 text-sm truncate">{lead.layout || "—"}</span>
              <span><StatusBadge status={lead.status} /></span>
              <span className="text-gray-400 text-xs">{new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:border-gray-400 transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:border-gray-400 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Lead detail drawer */}
      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onViewDesign={handleViewDesign}
        />
      )}
    </div>
  );
}
