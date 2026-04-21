"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Icon Components ──────────────────────────────────────────────────────────

function IconImage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconPalette() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ href, Icon, label, value, sub, accent }) {
  const accents = {
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200 hover:border-amber-300",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      valuColor: "text-amber-700",
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200 hover:border-indigo-300",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      valuColor: "text-indigo-700",
    },
    default: {
      bg: "bg-white",
      border: "border-gray-200 hover:border-gray-300",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-500",
      valuColor: "text-gray-900",
    },
  };

  const a = accents[accent] || accents.default;

  return (
    <Link
      href={href}
      className={`group relative rounded-2xl border p-5 ${a.bg} ${a.border} shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-4 overflow-hidden`}
    >
      {/* Subtle background pattern */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 opacity-[0.06] bg-current" />

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${a.iconBg} ${a.iconColor} flex items-center justify-center shrink-0`}>
        <Icon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1">{label}</p>
        <p className={`text-3xl font-bold tabular-nums leading-none ${a.valuColor}`}>
          {value ?? <span className="text-gray-300 text-2xl font-normal">—</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>

      {/* Arrow on hover */}
      <span className={`shrink-0 mt-1 ${a.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
        <IconArrowRight />
      </span>
    </Link>
  );
}

// ─── Quick Access Card ────────────────────────────────────────────────────────

function QuickCard({ href, Icon, label, description }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 p-5 border border-gray-200 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-md shadow-sm transition-all duration-200"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
        <Icon />
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </Link>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({ href, Icon, message, cta, color }) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100",
  };
  const ctaColors = {
    amber: "text-amber-600",
    indigo: "text-indigo-600",
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-sm transition-colors ${colors[color]}`}
    >
      <span className="shrink-0"><Icon /></span>
      <span className="flex-1">{message}</span>
      <span className={`shrink-0 font-semibold flex items-center gap-1 ${ctaColors[color]}`}>
        {cta} <IconArrowRight />
      </span>
    </Link>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

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

  const hasAlerts = stats.pending_assets > 0 || stats.new_leads > 0;

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Cabinet &amp; Remodeling Depot — Admin</p>
      </div>

      {/* Alert banners */}
      {hasAlerts && (
        <div className="space-y-2">
          {stats.pending_assets > 0 && (
            <AlertBanner
              href="/admin/assets"
              Icon={IconImage}
              message={<><strong>{stats.pending_assets}</strong> asset{stats.pending_assets !== 1 ? "s" : ""} waiting for review</>}
              cta="Review"
              color="amber"
            />
          )}
          {stats.new_leads > 0 && (
            <AlertBanner
              href="/admin/leads"
              Icon={IconInbox}
              message={<><strong>{stats.new_leads}</strong> new quote request{stats.new_leads !== 1 ? "s" : ""}</>}
              cta="View"
              color="indigo"
            />
          )}
        </div>
      )}

      {/* Stats section */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Overview</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            href="/admin/assets"
            Icon={IconImage}
            label="Pending Review"
            value={stats.pending_assets}
            sub="Assets awaiting confirmation"
            accent={stats.pending_assets > 0 ? "amber" : "default"}
          />
          <StatCard
            href="/admin/leads"
            Icon={IconInbox}
            label="New Leads"
            value={stats.new_leads}
            sub="Uncontacted requests"
            accent={stats.new_leads > 0 ? "indigo" : "default"}
          />
          <StatCard
            href="/admin/leads"
            Icon={IconBarChart}
            label="Total Leads"
            value={stats.total_leads}
            sub="All time"
            accent="default"
          />
        </div>
      </div>

      {/* Quick Access section */}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickCard
            href="/admin/catalog/lines"
            Icon={IconLayers}
            label="Catalog Lines"
            description="Manage product lines"
          />
          <QuickCard
            href="/admin/catalog/products"
            Icon={IconBox}
            label="Products"
            description="Browse & edit SKUs"
          />
          <QuickCard
            href="/admin/catalog/finishes"
            Icon={IconPalette}
            label="Finishes"
            description="Colors & materials"
          />
          <QuickCard
            href="/admin/settings"
            Icon={IconSettings}
            label="Settings"
            description="Branding & config"
          />
        </div>
      </div>

    </div>
  );
}
