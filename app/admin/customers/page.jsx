"use client";
import { useState, useEffect, useRef } from "react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "quoted" | "not_quoted"
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    }
    if (showDownloadMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDownloadMenu]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/customers");
        if (!res.ok) throw new Error("Failed to load customers");
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = customers.filter((c) => {
    if (filter === "quoted")     return c.has_quoted;
    if (filter === "not_quoted") return !c.has_quoted;
    return true;
  });

  const counts = {
    all:        customers.length,
    quoted:     customers.filter((c) =>  c.has_quoted).length,
    not_quoted: customers.filter((c) => !c.has_quoted).length,
  };

  const FILTERS = [
    { id: "all",        label: "All Customers" },
    { id: "quoted",     label: "Quoted" },
    { id: "not_quoted", label: "Not Quoted" },
  ];

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function downloadCSV(subset) {
    const data =
      subset === "quoted"     ? customers.filter((c) =>  c.has_quoted) :
      subset === "not_quoted" ? customers.filter((c) => !c.has_quoted) :
      customers;
    const headers = ["Name", "Email", "Phone", "Address", "Verified", "Status"];
    const rows = data.map((c) => [
      c.name,
      c.email,
      c.phone || "",
      c.address || "",
      formatDate(c.email_verified_at),
      c.has_quoted ? "Quoted" : "Not Quoted",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `customers-${subset}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customers who verified their email to view an AI kitchen design.
          </p>
        </div>
        {!loading && customers.length > 0 && (
          <div className="relative shrink-0" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Download</span>
              <span className="sm:hidden">Export</span>
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                {[
                  { key: "all",        label: "All Customers",  count: counts.all },
                  { key: "quoted",     label: "Quoted Only",    count: counts.quoted },
                  { key: "not_quoted", label: "Not Quoted",     count: counts.not_quoted },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => downloadCSV(opt.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <span>{opt.label}</span>
                    <span className="text-xs text-gray-400 font-medium tabular-nums">{opt.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === f.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs font-bold tabular-nums ${filter === f.id ? "text-gray-600" : "text-gray-400"}`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading customers…
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No customers yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter === "all"
              ? "Customers who verify their email on the design page will appear here."
              : filter === "quoted"
              ? "No customers have submitted a quote request yet."
              : "All customers have submitted a quote request."}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 w-14" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                    <td className="px-5 py-4 text-gray-600">{c.email}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{c.phone || "—"}</td>
                    <td className="px-5 py-4 text-gray-500 max-w-xs truncate">{c.address || "—"}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(c.email_verified_at)}</td>
                    <td className="px-5 py-4">
                      {c.has_quoted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Quoted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          Not Quoted
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right">
                      {confirmId === c.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition"
                          >
                            {deletingId === c.id ? "…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 transition"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(c.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                          title="Delete customer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map((c) => (
              <div key={c.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                  {c.has_quoted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Quoted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      Not Quoted
                    </span>
                  )}
                </div>
                {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                {c.address && <p className="text-xs text-gray-400 truncate">{c.address}</p>}
                <p className="text-[11px] text-gray-400">Verified {formatDate(c.email_verified_at)}</p>
                {/* Delete row */}
                <div className="flex justify-end pt-1.5 border-t border-gray-50 mt-1">
                  {confirmId === c.id ? (
                    <span className="flex items-center gap-3">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs font-semibold text-red-600 py-1 px-2"
                      >
                        {deletingId === c.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-gray-400 py-1 px-2"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmId(c.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition py-1 px-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
