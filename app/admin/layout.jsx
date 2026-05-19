"use client";

import "./admin.css";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ─── SVG Icon Components ──────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconLines() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  );
}

function IconCategories() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconProducts() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconFinishes() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function IconColors() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

function IconStructures() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

function IconAssets() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconLeads() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function IconCustomers() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconDesign() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 shrink-0 ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Group icons (one per section header) ─────────────────────────────────────

function IconSetup() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M3 20h.01M3 12h.01M3 4h.01"/>
      <path d="M8 20h.01M8 12h.01M8 4h.01"/>
      <rect x="12" y="4" width="9" height="5" rx="1"/>
      <rect x="12" y="12" width="9" height="5" rx="1"/>
    </svg>
  );
}

function IconCatalog() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

function IconAssetsGroup() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function IconLeadsGroup() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}

function IconDesignGroup() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Setup",
    GroupIcon: IconSetup,
    items: [
      { href: "/admin/settings", label: "Branding & Settings", Icon: IconSettings },
    ],
  },
  {
    label: "Catalog",
    GroupIcon: IconCatalog,
    items: [
      { href: "/admin/catalog/lines",       label: "Catalog Lines",  Icon: IconLines },
      { href: "/admin/catalog/categories",  label: "Categories",     Icon: IconCategories },
      { href: "/admin/catalog/products",    label: "Products",       Icon: IconProducts },
      { href: "/admin/catalog/finishes",    label: "Finishes",       Icon: IconFinishes },
      { href: "/admin/catalog/colors",      label: "Colors & Tiles", Icon: IconColors },
      { href: "/admin/catalog/structures",  label: "Structures",     Icon: IconStructures },
    ],
  },
  {
    label: "Assets",
    GroupIcon: IconAssetsGroup,
    items: [
      { href: "/admin/assets", label: "Asset Review", Icon: IconAssets, badgeKey: "pending" },
    ],
  },
  {
    label: "Leads",
    GroupIcon: IconLeadsGroup,
    items: [
      { href: "/admin/leads",     label: "Quote Requests", Icon: IconLeads,     badgeKey: "new_leads" },
      { href: "/admin/customers", label: "Customers",      Icon: IconCustomers },
    ],
  },
  {
    label: "Design",
    GroupIcon: IconDesignGroup,
    items: [
      { href: "/admin/design/new",   label: "New Design",    Icon: IconDesign },
      { href: "/admin/design/saved", label: "Saved Designs", Icon: IconDesign },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ tenantName, badges, signingOut, pathname, onSignOut }) {
  function isActive(href) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  // Initialise: auto-open any group that has an active item
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(
      NAV_GROUPS.map((g) => [
        g.label,
        g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/")),
      ])
    )
  );

  // When navigating to a new section, auto-open its group
  useEffect(() => {
    NAV_GROUPS.forEach((g) => {
      if (g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        setOpenGroups((prev) => ({ ...prev, [g.label]: true }));
      }
    });
  }, [pathname]);

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const dashboardActive = pathname === "/admin";

  return (
    <aside className="w-64 bg-[#0F1117] text-gray-100 flex flex-col shrink-0 h-full">
      {/* Brand header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.07]">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 leading-none mb-0.5">Admin Panel</p>
            <p className="font-semibold text-sm text-white leading-tight truncate">{tenantName}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-0.5">

        {/* Dashboard — standalone top link */}
        <Link
          href="/admin"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-3 ${
            dashboardActive
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
              : "text-slate-100 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <span className={`transition-colors ${dashboardActive ? "text-indigo-200" : "text-slate-400"}`}>
            <IconDashboard />
          </span>
          <span>Dashboard</span>
        </Link>

        {/* Collapsible groups */}
        {NAV_GROUPS.map((group) => {
          const isOpen   = !!openGroups[group.label];
          const hasActive = group.items.some((item) => isActive(item.href));
          const totalBadge = group.items.reduce((s, item) => s + (item.badgeKey ? (badges[item.badgeKey] || 0) : 0), 0);

          return (
            <div key={group.label} className="mb-1">
              {/* Group header / toggle */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  hasActive && !isOpen
                    ? "bg-slate-700 text-white"
                    : "text-slate-100 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`transition-colors ${hasActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"}`}>
                    <group.GroupIcon />
                  </span>
                  <span>{group.label}</span>
                  {totalBadge > 0 && !isOpen && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums leading-none">
                      {totalBadge > 99 ? "99+" : totalBadge}
                    </span>
                  )}
                </span>
                <span className={`transition-colors ${hasActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                  <IconChevron open={isOpen} />
                </span>
              </button>

              {/* Items */}
              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="mt-0.5 ml-3 pl-3 border-l border-slate-600 space-y-0.5 pb-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const badge  = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group/item ${
                          active
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-100 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`transition-colors ${active ? "text-indigo-200" : "text-slate-400 group-hover/item:text-slate-200"}`}>
                            <item.Icon />
                          </span>
                          <span className="font-medium leading-tight">{item.label}</span>
                        </span>
                        {badge > 0 && (
                          <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums leading-none ${
                            active ? "bg-white/20 text-white" : "bg-indigo-600 text-white"
                          }`}>
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 py-3 border-t border-white/[0.07] space-y-0.5">
        <Link
          href="/catalog"
          className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-xl hover:bg-slate-700 transition group"
        >
          <span className="text-slate-500 group-hover:text-slate-300 transition-colors"><IconExternalLink /></span>
          View Public Catalog
        </Link>
        <button
          onClick={onSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-red-400 rounded-xl hover:bg-red-900/40 transition text-left group"
        >
          <span className="text-slate-500 group-hover:text-red-400 transition-colors"><IconLogout /></span>
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [badges,      setBadges]      = useState({ pending: 0, new_leads: 0 });
  const [tenantName,  setTenantName]  = useState("Cabinet Catalog");
  const [signingOut,  setSigningOut]  = useState(false);
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
  }, [loadBadges]);

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

  // Current page label for the header breadcrumb
  const currentLabel = (() => {
    if (pathname === "/admin") return "Dashboard";
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
