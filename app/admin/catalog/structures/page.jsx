"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

function toCode(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ─── Single structure row ──────────────────────────────────────────────────────

function StructureRow({ structure, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: structure.name, description: structure.description || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/structures/${structure.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onUpdated({ ...structure, name: data.structure.name });
    setEditing(false);
  }

  async function handleToggleActive() {
    const res = await fetch(`/api/structures/${structure.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !structure.is_active }),
    });
    if (res.ok) onUpdated({ ...structure, is_active: !structure.is_active });
  }

  async function handleDelete() {
    if (!confirm(`Deactivate "${structure.name}"?`)) return;
    const res = await fetch(`/api/structures/${structure.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(structure.id);
  }

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50">
      <td className="px-4 py-3">
        {editing ? (
          <input
            className="border border-stone-300 rounded px-2 py-1 text-sm w-full"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        ) : (
          <span className="text-sm font-medium text-stone-900">{structure.name}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-stone-500">{structure.code}</span>
      </td>
      <td className="px-4 py-3">
        {structure.swatch_asset ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={structure.swatch_asset.public_url}
              alt={structure.name}
              className="w-8 h-8 rounded object-cover border border-stone-200"
            />
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        ) : (
          <Link href="/admin/assets" className="text-xs text-amber-600 hover:underline">
            No image
          </Link>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleToggleActive}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            structure.is_active
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {structure.is_active ? "Active" : "Inactive"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-3 py-1 rounded bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-stone-500 hover:text-stone-900">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-stone-500 hover:text-stone-900">
              Edit
            </button>
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">
              Deactivate
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Add structure form ────────────────────────────────────────────────────────

function AddStructureForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [autoCode, setAutoCode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleNameChange(e) {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, code: autoCode ? toCode(name) : f.code }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.code) { setError("Name and code are required."); return; }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/structures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onAdded(data.structure);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-900">Add Structure</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Name *</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="e.g. Shaker Door"
              value={form.name}
              onChange={handleNameChange}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Code (filename key) *</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="e.g. shaker-door"
              value={form.code}
              onChange={(e) => { setAutoCode(false); setForm((f) => ({ ...f, code: e.target.value })); }}
              required
            />
            <p className="text-xs text-stone-400 mt-1">
              Used in asset filename: <span className="font-mono">structure-{form.code || "…"}.png</span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-sm text-stone-500 hover:text-stone-900 px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-5 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add Structure"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StructuresPage() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [noImageCount, setNoImageCount] = useState(0);

  const loadStructures = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/structures");
    if (res.ok) {
      const data = await res.json();
      setStructures(data.structures || []);
      setNoImageCount((data.structures || []).filter((s) => !s.swatch_asset).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStructures(); }, [loadStructures]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Structures</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage structure names. Upload images in Asset Review matching the filename convention.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 transition"
        >
          <span className="text-lg leading-none">+</span> Add Structure
        </button>
      </div>

      {/* No image warning */}
      {noImageCount > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <span className="font-medium">{noImageCount} structure{noImageCount !== 1 ? "s" : ""} without an image.</span>
          <Link href="/admin/assets" className="underline hover:no-underline">
            Upload in Asset Review →
          </Link>
        </div>
      )}

      {/* Filename hint */}
      <div className="mb-5 px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-500">
        <strong className="text-stone-700">Filename convention:</strong>{" "}
        <span className="font-mono">structure-shaker-door.png</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-stone-400">Loading…</div>
        ) : structures.length === 0 ? (
          <div className="py-16 text-center text-sm text-stone-400">
            No structures yet.{" "}
            <button onClick={() => setShowAdd(true)} className="underline hover:no-underline">
              Add one
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Image</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {structures.map((structure) => (
                <StructureRow
                  key={structure.id}
                  structure={structure}
                  onUpdated={(updated) =>
                    setStructures((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                  }
                  onDeleted={(id) => setStructures((prev) => prev.filter((s) => s.id !== id))}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddStructureForm
          onAdded={(newStructure) => {
            setStructures((prev) => [...prev, { ...newStructure, swatch_asset: null, is_active: true }]);
            setNoImageCount((n) => n + 1);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
