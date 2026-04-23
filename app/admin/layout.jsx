"use client";

import "./admin.css";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ─── SVG Icon Components ──────────────────────────────────────────────────────

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconLines() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  );
}

function IconCategories() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconProducts() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconFinishes() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function IconAssets() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconLeads() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Setup",
    items: [
      { href: "/admin/settings", label: "Branding & Settings", Icon: IconSettings },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/catalog/lines", label: "Catalog Lines", Icon: IconLines },
      { href: "/admin/catalog/categories", label: "Categories", Icon: IconCategories },
      { href: "/admin/catalog/products", label: "Products", Icon: IconProducts },
      { href: "/admin/catalog/finishes", label: "Finishes", Icon: IconFinishes },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/admin/assets", label: "Asset Review", Icon: IconAssets, badgeKey: "pending" },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/admin/leads", label: "Quote Requests", Icon: IconLeads, badgeKey: "new_leads" },
    ],
  },
];

// ─── Sidebar (stable component outside layout to prevent remount on re-render) ─

function Sidebar({ tenantName, badges, signingOut, pathname, onSignOut }) {
  function isActive(href) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 bg-gray-950 text-gray-100 flex flex-col shrink-0 h-full">
      {/* Brand header */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-none mb-0.5">Admin Panel</p>
            <p className="font-semibold text-sm text-white leading-tight truncate">{tenantName}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 px-3 mb-2 font-semibold">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-150 group ${
                      active
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`transition-colors ${active ? "text-indigo-200" : "text-gray-500 group-hover:text-gray-300"}`}>
                        <item.Icon />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </span>
                    {badge > 0 && (
                      <span
                        className={`text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center tabular-nums ${
                          active ? "bg-indigo-400/40 text-white" : "bg-indigo-600 text-white"
                        }`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-0.5">
        <Link
          href="/catalog"
          className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition group"
        >
          <span className="text-gray-600 group-hover:text-gray-300 transition-colors"><IconExternalLink /></span>
          View Public Catalog
        </Link>
        <button
          onClick={onSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800/80 transition text-left group"
        >
          <span className="text-gray-600 group-hover:text-red-400 transition-colors"><IconLogout /></span>
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [badges, setBadges] = useState({ pending: 0, new_leads: 0 });
  const [tenantName, setTenantName] = useState("Cabinet Catalog");
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadBadges = useCallback(async () => {
    try {
      const [assetRes, leadRes] = await Promise.all([
        fetch("/api/assets/stats"),
        fetch("/api/leads/stats"),
      ]);
      if (assetRes.ok) {
        const a = await assetRes.json();
        setBadges((prev) => ({ ...prev, pending: a.by_status?.pending_review ?? 0 }));
      }
      if (leadRes.ok) {
        const l = await leadRes.json();
        setBadges((prev) => ({ ...prev, new_leads: l.by_status?.new ?? 0 }));
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetch("/api/tenant");
        if (res.ok) {
          const data = await res.json();
          if (data.tenant?.name) setTenantName(data.tenant.name);
        }
      } catch {
        // Non-critical
      }
    }

    loadTenant();
    loadBadges();
  }, [loadBadges]); // runs once on mount only

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  }

  function isActive(href) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  // Current page label for the header
  const currentLabel = (() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (isActive(item.href)) return item.label;
      }
    }
    return "Dashboard";
  })();

  const sidebarProps = { tenantName, badges, signingOut, pathname, onSignOut: handleSignOut };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen shrink-0">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-4 shrink-0 sticky top-0 z-30">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-gray-400 hidden sm:inline truncate">{tenantName}</span>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="font-semibold text-gray-800 truncate">{currentLabel}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notification dots */}
            {(badges.pending > 0 || badges.new_leads > 0) && (
              <div className="flex items-center gap-1.5">
                {badges.pending > 0 && (
                  <Link href="/admin/assets" className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full hover:bg-amber-100 transition font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    {badges.pending} pending
                  </Link>
                )}
                {badges.new_leads > 0 && (
                  <Link href="/admin/leads" className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-full hover:bg-indigo-100 transition font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                    {badges.new_leads} new
                  </Link>
                )}
              </div>
            )}

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
