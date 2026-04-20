import Link from "next/link";

const NAV = [
  { href: "/admin/assets", label: "Assets" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-700">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Admin</p>
          <p className="font-semibold text-sm">Cabinet Catalog</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-700">
          <Link
            href="/catalog"
            className="text-xs text-gray-400 hover:text-gray-200 transition"
          >
            ← View Public Catalog
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </div>
    </div>
  );
}
