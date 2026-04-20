"use client";

import { useState } from "react";
import AssetMappingRow from "./AssetMappingRow";

export default function AssetMappingTable({ assets, loading, tenantId, onRefresh }) {
  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">Loading assets…</div>
    );
  }

  if (!assets.length) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        No assets in this status.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">File</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Detected Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Line</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Category / Code</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">SKU / Finish</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Confidence</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Notes</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wide text-xs">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {assets.map((asset) => (
            <AssetMappingRow
              key={asset.id}
              asset={asset}
              tenantId={tenantId}
              onRefresh={onRefresh}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
