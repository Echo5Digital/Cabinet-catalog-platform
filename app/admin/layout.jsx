"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "Setup",
    items: [
      { href: "/admin/settings", label: "Branding & Settings", icon: "⚙" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/catalog/lines", label: "Catalog Lines", icon: "📋" },
      { href: "/admin/catalog/categories", label: "Categories", icon: "🗂" },
      { href: "/admin/catalog/products", label: "Products", icon: "📦" },
      { href: "/admin/catalog/finishes", label: "Finishes", icon: "🎨" },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/admin/assets", label: "Asset Review", icon: "🖼", badgeKey: "pending" },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/admin/leads", label: "Quote Requests", icon: "📥", badgeKey: "new_leads" },
    ],
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [badges, setBadges] = useState({ pending: 0, new_leads: 0 });
  const [tenantName, setTenantName] = useState("Cabinet Catalog");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Load badge counts
    async function loadBadges() {
      try {
        const [assetRes, leadRes] = await Promise.all([
          fetch("/api/assets/stats"),
          fetch("/api/leads/stats"),
        ]);
        if (assetRes.ok) {
          const a = await assetRes.json();
          setBadges((prev) => ({
            ...prev,
            pending: a.by_status?.pending_review ?? 0,
          }));
        }
        if (leadRes.ok) {
          const l = await leadRes.json();
          setBadges((prev) => ({
            ...prev,
            new_leads: l.by_status?.new ?? 0,
          }));
        }
      } catch {
        // Badge counts are non-critical — fail silently
      }
    }

    // Load tenant name
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

    loadBadges();
    loadTenant();
  }, [pathname]); // Refresh on route change

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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col shrink-0">
        {/* Tenant header */}
        <div className="px-5 py-4 border-b border-gray-700">
          <Link href="/admin" className="block">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">Admin Panel</p>
            <p className="font-semibold text-sm text-white leading-tight truncate">{tenantName}</p>
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 px-2 mb-1">
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
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition ${
                        active
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{item.icon}</span>
                        {item.label}
                      </span>
                      {badge > 0 && (
                        <span
                          className={`text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
                            active ? "bg-white text-blue-600" : "bg-blue-600 text-white"
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
        <div className="px-3 py-4 border-t border-gray-700 space-y-1">
          <Link
            href="/catalog"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition"
          >
            <span>↗</span> View Public Catalog
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-red-300 rounded-lg hover:bg-gray-800 transition text-left"
          >
            <span>→</span> {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 bg-gray-50 overflow-auto min-w-0">
        {children}
      </div>
    </div>
  );
}
