"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Confidence badge ────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence }) {
  const map = {
    matched: { cls: "bg-green-100 text-green-700", label: "Auto-matched" },
    partial: { cls: "bg-yellow-100 text-yellow-700", label: "Partial match" },
    unmatched: { cls: "bg-red-100 text-red-700", label: "Unmatched" },
  };
  const { cls, label } = map[confidence] || { cls: "bg-gray-100 text-gray-500", label: confidence || "—" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  );
}

// ─── Row-level confidence color ───────────────────────────────────────────────
function rowBg(confidence) {
  if (confidence === "matched") return "bg-green-50/30";
  if (confidence === "partial") return "bg-yellow-50/30";
  return "";
}

// ─── Uploader ────────────────────────────────────────────────────────────────
function AssetUploader({ onComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files || []));
    setResults(null);
  }

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const f of files) formData.append("files", f);
      const res = await fetch("/api/assets/ingest", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResults(data.ingested || []);
      setFiles([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 mb-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Assets</h3>
      <p className="text-xs text-gray-400 mb-3">
        Name files using the pattern: <code className="bg-gray-100 px-1 rounded">line-category-SKU.png</code> or <code className="bg-gray-100 px-1 rounded">finish-line-code.png</code>. The system will auto-detect the type.
      </p>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition"
      >
        <p className="text-sm text-gray-500">
          Drag & drop images here, or <span className="text-blue-600 font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP supported • Multiple files OK</p>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => { setFiles(Array.from(e.target.files || [])); setResults(null); }} />
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block shrink-0" />
              {f.name}
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {uploading ? `Uploading ${files.length} file(s)…` : `Upload ${files.length} file(s)`}
        </button>
      )}

      {results && (
        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {results.length} file(s) processed — they now appear in the review queue below.
          </p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2 text-xs">
              <span className="text-gray-700 truncate max-w-xs">{r.filename}</span>
              {r.error
                ? <span className="text-red-500 shrink-0">{r.error}</span>
                : <ConfidenceBadge confidence={r.asset?.confidence} />
              }
            </div>
          ))}
          <button onClick={onComplete} className="mt-2 text-xs text-blue-600 hover:underline">
            Refresh review queue →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Single asset row ─────────────────────────────────────────────────────────
function AssetRow({ asset, lines, finishes, products, onRefresh, selected, onSelect }) {
  const [correcting, setCorrecting] = useState(false);
  const [form, setForm] = useState({
    asset_type: asset.asset_type || "",
    parsed_line_slug: asset.parsed_line_slug || "",
    parsed_sku: asset.parsed_sku || "",
    parsed_finish_code: asset.parsed_finish_code || "",
    catalog_line_id: asset.catalog_line_id || "",
    finish_id: asset.finish_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState(null);

  async function handleCorrectSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setCorrecting(false);
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function action(type) {
    setActioning(type);
    try {
      let url = `/api/assets/${asset.id}/${type}`;
      let body = null;
      if (type === "flag") {
        const reason = prompt("Reason for flagging this asset:");
        if (!reason) { setActioning(null); return; }
        body = JSON.stringify({ reason });
      }
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `${type} failed`); }
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setActioning(null); }
  }

  const isActioning = !!actioning;
  const bg = rowBg(asset.confidence);

  return (
    <tr className={`border-b border-gray-100 last:border-0 ${bg}`}>
      {/* Checkbox */}
      {asset.status === "pending_review" && (
        <td className="px-3 py-3 text-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(asset.id, e.target.checked)}
            className="rounded"
          />
        </td>
      )}
      {asset.status !== "pending_review" && <td className="px-3 py-3" />}

      {/* Thumbnail */}
      <td className="px-3 py-3">
        {asset.status === "confirmed" && asset.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.public_url} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
        ) : (
          <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300 text-xl">
            🖼
          </div>
        )}
      </td>

      {/* Filename + parsed metadata */}
      <td className="px-3 py-3 min-w-[180px]">
        <p className="text-xs font-mono text-gray-700 truncate max-w-[200px]" title={asset.original_filename}>
          {asset.original_filename}
        </p>
        {asset.parse_notes?.length > 0 && (
          <p className="text-xs text-amber-500 mt-0.5">{asset.parse_notes[0]}</p>
        )}
      </td>

      {/* Type */}
      <td className="px-3 py-3">
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">
          {asset.asset_type?.replace("_", " ") || "—"}
        </span>
      </td>

      {/* Parsed info */}
      <td className="px-3 py-3 text-xs text-gray-600 space-y-0.5">
        {asset.parsed_line_slug && <div>Line: <strong>{asset.parsed_line_slug}</strong></div>}
        {asset.parsed_sku && <div>SKU: <strong>{asset.parsed_sku}</strong></div>}
        {asset.parsed_finish_code && <div>Finish: <strong>{asset.parsed_finish_code}</strong></div>}
        {asset.parsed_category_slug && <div>Cat: <strong>{asset.parsed_category_slug}</strong></div>}
        {!asset.parsed_line_slug && !asset.parsed_sku && !asset.parsed_finish_code && (
          <span className="text-gray-300">No metadata</span>
        )}
      </td>

      {/* Confidence */}
      <td className="px-3 py-3">
        <ConfidenceBadge confidence={asset.confidence} />
      </td>

      {/* Flag reason */}
      {asset.status === "flagged" && (
        <td className="px-3 py-3 text-xs text-amber-700 max-w-[150px]">
          {asset.flag_reason || "—"}
        </td>
      )}
      {asset.status !== "flagged" && <td className="px-3 py-3" />}

      {/* Actions */}
      <td className="px-3 py-3">
        {correcting ? (
          <div className="space-y-1.5 min-w-[200px]">
            <select value={form.asset_type} onChange={(e) => setForm((p) => ({ ...p, asset_type: e.target.value }))}
              className="w-full border border-gray-300 rounded text-xs px-2 py-1">
              <option value="">— Type —</option>
              <option value="product_diagram">Product Diagram</option>
              <option value="finish_swatch">Finish Swatch</option>
              <option value="lifestyle">Lifestyle</option>
            </select>

            {(form.asset_type === "product_diagram" || !form.asset_type) && (
              <>
                <input value={form.parsed_line_slug} onChange={(e) => setForm((p) => ({ ...p, parsed_line_slug: e.target.value }))}
                  placeholder="Line slug" className="w-full border border-gray-300 rounded text-xs px-2 py-1" />
                <input value={form.parsed_sku} onChange={(e) => setForm((p) => ({ ...p, parsed_sku: e.target.value }))}
                  placeholder="SKU" className="w-full border border-gray-300 rounded text-xs px-2 py-1 font-mono" />
              </>
            )}

            {form.asset_type === "finish_swatch" && (
              <select value={form.finish_id} onChange={(e) => setForm((p) => ({ ...p, finish_id: e.target.value }))}
                className="w-full border border-gray-300 rounded text-xs px-2 py-1">
                <option value="">— Select finish —</option>
                {finishes.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
              </select>
            )}

            {form.asset_type === "lifestyle" && (
              <select value={form.catalog_line_id} onChange={(e) => setForm((p) => ({ ...p, catalog_line_id: e.target.value }))}
                className="w-full border border-gray-300 rounded text-xs px-2 py-1">
                <option value="">— Select line —</option>
                {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}

            <div className="flex gap-1">
              <button onClick={() => setCorrecting(false)} className="flex-1 text-xs py-1 border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCorrectSave} disabled={saving}
                className="flex-1 text-xs py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {asset.status === "pending_review" && (
              <>
                <button onClick={() => action("confirm")} disabled={isActioning}
                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  {actioning === "confirm" ? "…" : "Confirm"}
                </button>
                <button onClick={() => setCorrecting(true)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                  Correct
                </button>
                <button onClick={() => action("flag")} disabled={isActioning}
                  className="text-xs px-2 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-50 disabled:opacity-50">
                  {actioning === "flag" ? "…" : "Flag"}
                </button>
                <button onClick={() => action("reject")} disabled={isActioning}
                  className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 disabled:opacity-50">
                  {actioning === "reject" ? "…" : "Reject"}
                </button>
              </>
            )}
            {asset.status === "flagged" && (
              <>
                <button onClick={() => action("confirm")} disabled={isActioning}
                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  {actioning === "confirm" ? "…" : "Confirm"}
                </button>
                <button onClick={() => setCorrecting(true)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                  Correct
                </button>
              </>
            )}
            {asset.status === "confirmed" && (
              <span className="text-xs text-green-600">✓ Live</span>
            )}
            {asset.status === "rejected" && (
              <span className="text-xs text-gray-400">Rejected</span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "pending_review", label: "Pending Review" },
  { key: "flagged", label: "Flagged" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminAssetsPage() {
  const [activeTab, setActiveTab] = useState("pending_review");
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [stats, setStats] = useState({});

  // Metadata for correction dropdowns
  const [lines, setLines] = useState([]);
  const [finishes, setFinishes] = useState([]);

  useEffect(() => {
    Promise.all([fetch("/api/catalog"), fetch("/api/finishes")]).then(async ([lRes, fRes]) => {
      const lData = lRes.ok ? await lRes.json() : {};
      const fData = fRes.ok ? await fRes.json() : {};
      setLines(lData.lines || []);
      setFinishes(fData.finishes || []);
    });
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ status: activeTab, limit: "100" });
      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/assets/stats");
    if (res.ok) {
      const d = await res.json();
      setStats(d.by_status || {});
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, [fetchAssets, fetchStats]);

  function handleSelect(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked) {
    if (checked) {
      const matchedIds = assets
        .filter((a) => a.confidence === "matched")
        .map((a) => a.id);
      setSelected(new Set(matchedIds));
    } else {
      setSelected(new Set());
    }
  }

  async function bulkConfirm() {
    if (selected.size === 0) return;
    if (!confirm(`Confirm ${selected.size} asset(s)? Only auto-matched assets will succeed.`)) return;
    setBulkConfirming(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      const res = await fetch(`/api/assets/${id}/confirm`, { method: "POST" });
      res.ok ? ok++ : fail++;
    }
    setBulkConfirming(false);
    alert(`Confirmed: ${ok}  Failed: ${fail}`);
    fetchAssets();
    fetchStats();
  }

  const matchedCount = assets.filter((a) => a.confidence === "matched").length;
  const pendingCount = stats.pending_review ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review auto-detected metadata, confirm or correct before assets go live.
          </p>
        </div>
        <button
          onClick={() => setShowUploader((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          {showUploader ? "Hide Uploader" : "+ Upload Assets"}
        </button>
      </div>

      {/* Uploader */}
      {showUploader && (
        <AssetUploader onComplete={() => { setShowUploader(false); fetchAssets(); fetchStats(); }} />
      )}

      {/* Status tabs with counts */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {stats[tab.key] > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {stats[tab.key]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bulk confirm bar (only on pending_review tab) */}
      {activeTab === "pending_review" && matchedCount > 0 && (
        <div className="mb-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
          <p className="text-sm text-green-800">
            <strong>{matchedCount}</strong> auto-matched asset{matchedCount !== 1 ? "s" : ""} ready to confirm
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="text-xs text-green-700 underline hover:text-green-900"
            >
              Select all matched
            </button>
            {selected.size > 0 && (
              <button
                onClick={bulkConfirm}
                disabled={bulkConfirming}
                className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {bulkConfirming ? "Confirming…" : `Confirm ${selected.size} selected`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-gray-400 mb-2">
        {loading ? "Loading…" : `${total} asset${total !== 1 ? "s" : ""}`}
      </p>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">No assets in this status.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 w-8">
                    {activeTab === "pending_review" && (
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={selected.size > 0 && selected.size === matchedCount}
                        className="rounded"
                      />
                    )}
                  </th>
                  <th className="px-3 py-3 w-14" />
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">File</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Detected Metadata</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Confidence</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {assets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    lines={lines}
                    finishes={finishes}
                    products={[]}
                    onRefresh={() => { fetchAssets(); fetchStats(); }}
                    selected={selected.has(asset.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" />
          Auto-matched (safe to bulk confirm)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" />
          Partial match (verify before confirming)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />
          Unmatched (requires correction)
        </span>
      </div>
    </div>
  );
}
