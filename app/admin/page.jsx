import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Cabinet & Remodeling Depot — Admin</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/assets" className="border border-gray-200 rounded-xl p-6 bg-white hover:border-blue-400 hover:shadow transition">
          <p className="text-3xl mb-2">🗂</p>
          <p className="font-semibold text-gray-800">Asset Ingestion</p>
          <p className="text-sm text-gray-500 mt-1">Upload and map catalog images</p>
        </Link>
        <Link href="/admin/catalog" className="border border-gray-200 rounded-xl p-6 bg-white hover:border-blue-400 hover:shadow transition">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-semibold text-gray-800">Catalog</p>
          <p className="text-sm text-gray-500 mt-1">Manage lines, SKUs, and finishes</p>
        </Link>
        <Link href="/admin/leads" className="border border-gray-200 rounded-xl p-6 bg-white hover:border-blue-400 hover:shadow transition">
          <p className="text-3xl mb-2">📥</p>
          <p className="font-semibold text-gray-800">Leads</p>
          <p className="text-sm text-gray-500 mt-1">Review quote requests</p>
        </Link>
      </div>
    </div>
  );
}
