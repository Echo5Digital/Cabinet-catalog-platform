"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_CATEGORIES = [
  { name: "Base", slug: "base", description: "Floor-mounted cabinets" },
  { name: "Wall", slug: "wall", description: "Wall-mounted upper cabinets" },
  { name: "Tall", slug: "tall", description: "Full-height pantry and utility cabinets" },
  { name: "Vanity", slug: "vanity", description: "Bathroom vanity cabinets" },
  { name: "Specialty", slug: "specialty", description: "Corner, blind, and specialty configurations" },
];

function CategoryRow({ category, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: category.name, description: category.description || "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onUpdate({ ...category, ...form });
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete category "${category.name}"? This will fail if any products are assigned to it.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      onDelete(category.id);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Category name"
              autoFocus
            />
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description (optional)"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-800 text-sm">{category.name}</p>
              <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{category.slug}</code>
            </div>
            {category.description && (
              <p className="text-xs text-gray-400 mt-0.5">{category.description}</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
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
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AddCategoryForm({ onAdded }) {
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function handleNameChange(value) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      onAdded(data.category);
      setForm({ name: "", slug: "", description: "" });
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
        + Add Category
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Base"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="base"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Floor-mounted cabinets"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.name || !form.slug}
          className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add Category"}
        </button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function seedDefaults() {
    if (!confirm("Add the 5 standard cabinet categories (Base, Wall, Tall, Vanity, Specialty)? Existing categories will not be overwritten.")) return;
    setSeeding(true);
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cat),
        }).catch(() => {}); // Ignore duplicates
      }
      await fetchCategories();
    } finally {
      setSeeding(false);
    }
  }

  function handleAdded(cat) {
    setCategories((prev) => [...prev, cat]);
  }

  function handleUpdate(updated) {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleDelete(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        {categories.length === 0 && !loading && (
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            {seeding ? "Adding…" : "Add standard categories"}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Categories organize products across all catalog lines (Base, Wall, Tall, Vanity, Specialty).
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm mb-4">
              No categories yet. Add categories to organize your products.
            </p>
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {seeding ? "Adding…" : "Add Standard Categories"}
            </button>
          </div>
        ) : (
          <div className="px-5 divide-y divide-gray-100">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-4">
          <AddCategoryForm onAdded={handleAdded} />
        </div>
      )}
    </div>
  );
}
