"use client";

import { useState, useEffect, useCallback } from "react";
import AssetIngestUploader from "@/components/admin/AssetIngestUploader";
import AssetMappingTable from "@/components/admin/AssetMappingTable";

const STATUS_TABS = [
  { key: "pending_review", label: "Pending Review" },
  { key: "flagged", label: "Flagged" },
  { key: "mapped", label: "Mapped" },
  { key: "rejected", label: "Rejected" },
];

// TODO: Replace with session-based tenant resolution
const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "";

export default function AdminAssetsPage() {
  const [activeTab, setActiveTab] = useState("pending_review");
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showUploader, setShowUploader] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId: TENANT_ID,
        status: activeTab,
        page: String(page),
        limit: "50",
      });
      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Ingestion & Mapping</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review auto-detected metadata, confirm or correct mappings before assets go live.
          </p>
        </div>
        <button
          onClick={() => setShowUploader((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          {showUploader ? "Hide Uploader" : "+ Upload Assets"}
        </button>
      </div>

      {/* Uploader */}
      {showUploader && (
        <div className="mb-6">
          <AssetIngestUploader
            tenantId={TENANT_ID}
            onComplete={() => {
              setShowUploader(false);
              fetchAssets();
            }}
          />
        </div>
      )}

      {/* Status tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Total count */}
      <p className="text-sm text-gray-500 mb-3">
        {loading ? "Loading..." : `${total} asset${total !== 1 ? "s" : ""}`}
      </p>

      {/* Table */}
      <AssetMappingTable
        assets={assets}
        loading={loading}
        tenantId={TENANT_ID}
        onRefresh={fetchAssets}
      />
    </div>
  );
}
