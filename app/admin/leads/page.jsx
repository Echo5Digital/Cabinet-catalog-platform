"use client";

import { useState, useEffect, useCallback } from "react";

const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-purple-100 text-purple-700",
  closed: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
};

const STATUS_OPTIONS = ["new", "contacted", "quoted", "closed", "lost"];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId: TENANT_ID });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function updateStatus(leadId, newStatus) {
    setUpdating(leadId);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLeads();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total lead{total !== 1 ? "s" : ""}</p>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && leads.length === 0 && (
        <p className="text-gray-400 text-sm py-10 text-center">No leads found.</p>
      )}

      <div className="space-y-3">
        {leads.map((lead) => (
          <div key={lead.id} className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              {/* Contact info */}
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{lead.name}</p>
                <p className="text-sm text-gray-500">{lead.email}</p>
                {lead.phone && <p className="text-sm text-gray-500">{lead.phone}</p>}
              </div>

              {/* Product/finish */}
              <div className="flex-1 text-sm text-gray-600">
                {lead.product && (
                  <p>
                    <span className="font-medium">{lead.product.sku}</span>
                    {" — "}
                    {lead.product.name}
                  </p>
                )}
                {lead.finish && <p className="text-gray-500">Finish: {lead.finish.name}</p>}
                {lead.quantity && <p className="text-gray-500">Qty: {lead.quantity}</p>}
              </div>

              {/* Status badge + updater */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || ""}`}>
                  {lead.status}
                </span>
                <select
                  value={lead.status}
                  disabled={updating === lead.id}
                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {lead.notes && (
              <p className="mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3">
                {lead.notes}
              </p>
            )}

            <p className="mt-2 text-xs text-gray-400">
              Submitted {new Date(lead.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
