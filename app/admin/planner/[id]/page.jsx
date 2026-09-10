"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PlannerDesignViewer from "@/components/planner/PlannerDesignViewer";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PlannerLeadDesignPage() {
  const { id }   = useParams();
  const router   = useRouter();

  const [lead,    setLead]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res  = await fetch(`/api/admin/planner-leads/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load design.");
        if (!cancelled) setLead(data.lead);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="flex flex-col min-h-0" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Page header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white">
        <div className="min-w-0">
          <button
            onClick={() => router.push("/admin/planner")}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition mb-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Planner Leads
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            {lead?.project_name || "Kitchen Design"}
          </h1>
          {lead && (
            <p className="text-xs text-gray-400 mt-0.5">
              Saved {fmtDate(lead.created_at)} by {lead.customer_name}
            </p>
          )}
        </div>

        {lead && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-xs shrink-0">
            <div className="bg-gray-50 rounded-lg px-3 py-2 sm:bg-transparent sm:p-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Email</p>
              <p className="text-gray-800 font-medium truncate max-w-[160px]">{lead.customer_email}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 sm:bg-transparent sm:p-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Phone</p>
              <p className="text-gray-800 font-medium">{lead.customer_phone || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 sm:bg-transparent sm:p-0 col-span-2 sm:col-span-1 sm:max-w-[220px]">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Address</p>
              <p className="text-gray-800 font-medium truncate">{lead.customer_address || "—"}</p>
            </div>
            <a
              href={`mailto:${lead.customer_email}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition col-span-2 sm:col-span-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Email Customer
            </a>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {loading && (
          <div className="h-full flex items-center justify-center text-gray-400">
            <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading design…
          </div>
        )}

        {!loading && error && (
          <div className="h-full flex items-center justify-center px-4">
            <p className="text-sm text-red-600 bg-red-50 inline-block px-4 py-3 rounded-lg border border-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && lead && (
          lead.scene_json ? (
            <PlannerDesignViewer lead={lead} />
          ) : (
            <div className="h-full flex items-center justify-center px-4 text-center">
              <p className="text-sm text-gray-400 max-w-sm">
                No saved 2D/3D design snapshot is available for this lead
                (it was created before design snapshots were captured).
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
