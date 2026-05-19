"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function StatusBadge({ status }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Draft
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function SavedDesignTable() {
  const router = useRouter();
  const [quotes,     setQuotes]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [confirmId,  setConfirmId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sendingId,  setSendingId]  = useState(null);
  const [notify,     setNotify]     = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuotes = quotes.filter((q) => {
    if (searchQuery.trim() && !q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(null), 3000);
    return () => clearTimeout(t);
  }, [notify]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/design-quotes");
        if (!res.ok) throw new Error("Failed to load saved designs");
        const data = await res.json();
        setQuotes(data.quotes || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/design-quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  async function handleDownloadOrSend(quote) {
    if (quote.pdf_url) {
      window.open(quote.pdf_url, "_blank");
      return;
    }
    setSendingId(quote.id);
    try {
      const res = await fetch("/api/design-quotes/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ designQuoteId: quote.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate PDF");
      setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, pdf_url: data.pdfUrl, status: "sent" } : q));
      if (data.pdfUrl) window.open(data.pdfUrl, "_blank");
    } catch (e) {
      setNotify({ type: "error", message: e.message });
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Designs</h1>
          <p className="text-sm text-gray-500 mt-1">
            All design quotes created for your customers.
          </p>
        </div>
        <Link
          href="/admin/design/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Design
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
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
          Loading designs…
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredQuotes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No designs yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a new design to get started.</p>
          <Link
            href="/admin/design/new"
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Create Design
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredQuotes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Customer", "Email", "Dimensions", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">{q.customer_name}</td>
                    <td className="px-5 py-4 text-gray-600">{q.customer_email}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap tabular-nums">
                      {q.room_width ?? "—"}×{q.room_depth ?? "—"}×{q.room_height ?? "—"} ft
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => router.push(`/admin/design/new?edit=${q.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit design"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Download / Generate PDF */}
                        <button
                          onClick={() => handleDownloadOrSend(q)}
                          disabled={sendingId === q.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 transition"
                          title={q.pdf_url ? "Download PDF" : "Generate & send PDF"}
                        >
                          {sendingId === q.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                        </button>

                        {/* Delete */}
                        {confirmId === q.id ? (
                          <span className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(q.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 transition px-1"
                            >
                              {deletingId === q.id ? "…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition px-1"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(q.id)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                            title="Delete design"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredQuotes.map((q) => (
              <div key={q.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{q.customer_name}</p>
                    <p className="text-xs text-gray-500">{q.customer_email}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <p className="text-xs text-gray-500 tabular-nums">
                  {q.room_width ?? "—"}×{q.room_depth ?? "—"}×{q.room_height ?? "—"} ft  ·  Created {formatDate(q.created_at)}
                </p>
                <div className="flex justify-end gap-2 pt-1.5 border-t border-gray-50 mt-1">
                  <button
                    onClick={() => router.push(`/admin/design/new?edit=${q.id}`)}
                    className="text-xs text-blue-600 hover:text-blue-800 transition py-1 px-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDownloadOrSend(q)}
                    disabled={sendingId === q.id}
                    className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50 transition py-1 px-2"
                  >
                    {sendingId === q.id ? "Generating…" : q.pdf_url ? "Download PDF" : "Generate PDF"}
                  </button>
                  {confirmId === q.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-xs font-semibold text-red-600 py-1 px-2"
                      >
                        {deletingId === q.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400 py-1 px-2">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmId(q.id)}
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

      {/* Toast notification */}
      {notify && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-[calc(100vw-2rem)] sm:max-w-xs ${
            notify.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {notify.message}
        </div>
      )}
    </div>
  );
}
