"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function StatCard({ href, icon, label, value, sub, highlight }) {
  return (
    <Link
      href={href}
      className={`border rounded-xl p-5 bg-white hover:shadow-sm transition flex items-start gap-4 ${
        highlight ? "border-blue-200 hover:border-blue-400" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${highlight ? "text-blue-600" : "text-gray-900"}`}>
          {value ?? "—"}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pending_assets: null,
    new_leads: null,
    total_leads: null,
  });

  useEffect(() => {
    async function load() {
      try {
        const [assetRes, leadRes] = await Promise.all([
          fetch("/api/assets/stats"),
          fetch("/api/leads/stats"),
        ]);
        const assetData = assetRes.ok ? await assetRes.json() : {};
        const leadData = leadRes.ok ? await leadRes.json() : {};
        setStats({
          pending_assets: assetData.by_status?.pending_review ?? 0,
          new_leads: leadData.by_status?.new ?? 0,
          total_leads: leadData.total ?? 0,
        });
      } catch {
        // Stats are non-critical
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Cabinet & Remodeling Depot — Admin</p>

      {/* Action items */}
      {(stats.pending_assets > 0 || stats.new_leads > 0) && (
        <div className="mb-6 space-y-2">
          {stats.pending_assets > 0 && (
            <Link
              href="/admin/assets"
              className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition"
            >
              <span className="text-base">🖼</span>
              <span>
                <strong>{stats.pending_assets}</strong> asset{stats.pending_assets !== 1 ? "s" : ""} waiting for review
              </span>
              <span className="ml-auto text-amber-500">Review →</span>
            </Link>
          )}
          {stats.new_leads > 0 && (
            <Link
              href="/admin/leads"
              className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 hover:bg-blue-100 transition"
            >
              <span className="text-base">📥</span>
              <span>
                <strong>{stats.new_leads}</strong> new quote request{stats.new_leads !== 1 ? "s" : ""}
              </span>
              <span className="ml-auto text-blue-500">View →</span>
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          href="/admin/assets"
          icon="🖼"
          label="Pending Review"
          value={stats.pending_assets}
          sub="assets awaiting confirmation"
          highlight={stats.pending_assets > 0}
        />
        <StatCard
          href="/admin/leads"
          icon="📥"
          label="New Leads"
          value={stats.new_leads}
          sub="uncontacted requests"
          highlight={stats.new_leads > 0}
        />
        <StatCard
          href="/admin/leads"
          icon="📊"
          label="Total Leads"
          value={stats.total_leads}
          sub="all time"
        />
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/catalog/lines", icon: "📋", label: "Catalog Lines" },
            { href: "/admin/catalog/products", icon: "📦", label: "Products" },
            { href: "/admin/catalog/finishes", icon: "🎨", label: "Finishes" },
            { href: "/admin/settings", icon: "⚙", label: "Settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-sm transition text-center"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
