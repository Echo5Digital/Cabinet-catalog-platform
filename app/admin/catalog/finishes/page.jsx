"use client";

import { useState, useEffect, useCallback } from "react";

const FINISH_FAMILIES = [
  { value: "", label: "All families" },
  { value: "painted", label: "Painted" },
  { value: "stained", label: "Stained" },
  { value: "thermofoil", label: "Thermofoil" },
  { value: "veneer", label: "Veneer" },
  { value: "laminate", label: "Laminate" },
];

function SwatchImage({ url, name }) {
  if (!url) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300 text-lg shrink-0">
        ○
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
    />
  );
}

function FinishRow({ finish, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: finish.name,
    finish_family: finish.finish_family || "",
    description: finish.description || "",
    is_active: finish.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/finishes/${finish.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onUpdate({ ...finish, ...form });
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete finish "${finish.name}"? This will fail if any products reference this finish.`)) return;
    const res = await fetch(`/api/finishes/${finish.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Delete failed"); return; }
    onDelete(finish.id);
  }

  const swatchAsset = finish.swatch_asset;

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <SwatchImage url={swatchAsset?.public_url} name={finish.name} />

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Finish name"
                autoFocus
              />
              <select
                value={form.finish_family}
                onChange={(e) => setForm((p) => ({ ...p, finish_family: e.target.value }))}
                className="border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FINISH_FAMILIES.slice(1).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Short description"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`active-${finish.id}`}
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor={`active-${finish.id}`} className="text-xs text-gray-600">Active</label>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-800 text-sm">{finish.name}</p>
              <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{finish.code}</code>
              {finish.finish_family && (
                <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">
                  {finish.finish_family}
                </span>
              )}
              {!finish.is_active && (
                <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Inactive</span>
              )}
            </div>
            {finish.description && (
              <p className="text-xs text-gray-400 mt-0.5">{finish.description}</p>
            )}
            {finish.catalog_line?.name && (
              <p className="text-xs text-gray-400 mt-0.5">Line: {finish.catalog_line.name}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {swatchAsset ? (
                <span className="text-xs text-green-600">✓ Swatch image confirmed</span>
              ) : (
                <span className="text-xs text-amber-500">⚠ No swatch image — go to Assets to upload one</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "…" : "Save"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AddFinishForm({ lines, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", finish_family: "", catalog_line_id: "", description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value) {
    setForm((prev) => ({
      ...prev,
      name: value,
      code: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/finishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, catalog_line_id: form.catalog_line_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      onAdded(data.finish);
      setForm({ name: "", code: "", finish_family: "", catalog_line_id: "", description: "" });
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition"
      >
        + Add Finish
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="White Shaker"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
            required
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="white-shaker"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Family</label>
          <select
            value={form.finish_family}
            onChange={(e) => setForm((p) => ({ ...p, finish_family: e.target.value }))}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">—</option>
            {FINISH_FAMILIES.slice(1).map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Catalog Line</label>
          <select
            value={form.catalog_line_id}
            onChange={(e) => setForm((p) => ({ ...p, catalog_line_id: e.target.value }))}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All lines</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Short description"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.name || !form.code}
          className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add Finish"}
        </button>
      </div>
    </form>
  );
}

export default function FinishesPage() {
  const [finishes, setFinishes] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lineFilter, setLineFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");

  const fetchFinishes = useCallback(async () => {
    const params = new URLSearchParams();
    if (lineFilter) params.set("line", lineFilter);
    const res = await fetch(`/api/finishes?${params}`);
    const data = res.ok ? await res.json() : {};
    setFinishes(data.finishes || []);
    setLoading(false);
  }, [lineFilter]);

  useEffect(() => {
    fetchFinishes();
  }, [fetchFinishes]);

  useEffect(() => {
    fetch("/api/catalog").then((r) => r.json()).then((d) => setLines(d.lines || []));
  }, []);

  function handleUpdate(updated) {
    setFinishes((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  function handleDelete(id) {
    setFinishes((prev) => prev.filter((f) => f.id !== id));
  }

  function handleAdded(finish) {
    setFinishes((prev) => [...prev, finish]);
  }

  const displayed = familyFilter
    ? finishes.filter((f) => f.finish_family === familyFilter)
    : finishes;

  const noSwatchCount = finishes.filter((f) => !f.swatch_asset).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Finishes</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Finish options available across your catalog lines. Each finish needs a swatch image.
      </p>

      {noSwatchCount > 0 && (
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          {noSwatchCount} finish{noSwatchCount !== 1 ? "es" : ""} missing a swatch image.
          Go to <a href="/admin/assets" className="underline hover:text-amber-900">Asset Review</a> to upload and confirm swatch images.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={lineFilter}
          onChange={(e) => setLineFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All lines</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FINISH_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400 self-center">
          {displayed.length} finish{displayed.length !== 1 ? "es" : ""}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm">No finishes found.</p>
          </div>
        ) : (
          <div className="px-5">
            {displayed.map((finish) => (
              <FinishRow
                key={finish.id}
                finish={finish}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && (
        <div className="mt-4">
          <AddFinishForm lines={lines} onAdded={handleAdded} />
        </div>
      )}
    </div>
  );
}
