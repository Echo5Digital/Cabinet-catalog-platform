"use client";

import { useState } from "react";

const CONFIDENCE_COLORS = {
  mapped: "bg-green-100 text-green-700",
  partially_matched: "bg-yellow-100 text-yellow-700",
  unmatched: "bg-red-100 text-red-700",
};

export default function AssetMappingRow({ asset, tenantId, onRefresh }) {
  const [confirming, setConfirming] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isActionable = asset.status === "pending_review" || asset.status === "flagged";

  async function confirmAsset() {
    // Basic integrity check: all required fields must be present
    if (asset.resolved_asset_type === "product" && !asset.resolved_product_id) {
      setError("Cannot confirm: product_id is not resolved. Please correct before confirming.");
      return;
    }
    if (asset.resolved_asset_type === "finish" && !asset.resolved_finish_id) {
      setError("Cannot confirm: finish_id is not resolved.");
      return;
    }
    if (asset.resolved_asset_type === "lifestyle" && !asset.resolved_line_id) {
      setError("Cannot confirm: catalog_line_id is not resolved.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolvedAssetType: asset.resolved_asset_type,
          resolvedProductId: asset.resolved_product_id,
          resolvedFinishId: asset.resolved_finish_id,
          resolvedLineId: asset.resolved_line_id,
          variant: asset.parsed_variant,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirm failed.");
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function flagAsset() {
    if (!flagReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: flagReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Flag failed.");
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setFlagging(false);
      setFlagReason("");
    }
  }

  async function rejectAsset() {
    if (!confirm(`Reject "${asset.original_filename}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className={busy ? "opacity-50" : ""}>
        {/* Filename */}
        <td className="px-4 py-3 max-w-[180px]">
          <p className="font-mono text-xs text-gray-700 truncate" title={asset.original_filename}>
            {asset.original_filename}
          </p>
        </td>

        {/* Detected type */}
        <td className="px-4 py-3">
          <span className="capitalize text-gray-700">
            {asset.resolved_asset_type || asset.parsed_asset_type || "—"}
          </span>
        </td>

        {/* Line */}
        <td className="px-4 py-3 text-gray-600">
          {asset.parsed_line_slug || "—"}
        </td>

        {/* Category / finish code */}
        <td className="px-4 py-3 text-gray-600">
          {asset.parsed_category_slug || asset.parsed_finish_code || "—"}
        </td>

        {/* SKU or finish */}
        <td className="px-4 py-3 font-mono text-gray-700">
          {asset.parsed_sku || asset.parsed_finish_code || "—"}
        </td>

        {/* Confidence badge */}
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLORS[asset.confidence] || "bg-gray-100 text-gray-500"}`}>
            {asset.confidence?.replace("_", " ") || "—"}
          </span>
        </td>

        {/* Notes */}
        <td className="px-4 py-3 max-w-[200px]">
          {asset.flag_reason ? (
            <span className="text-xs text-amber-600">{asset.flag_reason}</span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          {isActionable && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={confirmAsset}
                disabled={busy}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setFlagging(true)}
                disabled={busy}
                className="text-xs bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600 disabled:opacity-50 transition"
              >
                Flag
              </button>
              <button
                onClick={rejectAsset}
                disabled={busy}
                className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 transition"
              >
                Reject
              </button>
            </div>
          )}
          {asset.status === "mapped" && (
            <span className="text-xs text-green-600 font-medium">✓ Mapped</span>
          )}
          {asset.status === "rejected" && (
            <span className="text-xs text-gray-400">Rejected</span>
          )}
        </td>
      </tr>

      {/* Error row */}
      {error && (
        <tr>
          <td colSpan={8} className="px-4 pb-2">
            <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          </td>
        </tr>
      )}

      {/* Flag reason input row */}
      {flagging && (
        <tr>
          <td colSpan={8} className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Reason for flagging (required)"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={flagAsset}
                disabled={!flagReason.trim() || busy}
                className="text-sm bg-amber-500 text-white px-4 py-1.5 rounded hover:bg-amber-600 disabled:opacity-50"
              >
                Submit Flag
              </button>
              <button
                onClick={() => { setFlagging(false); setFlagReason(""); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
