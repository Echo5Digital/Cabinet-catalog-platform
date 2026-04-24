"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  archived: "bg-red-50 text-red-400",
};

const STATUS_LABELS = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
  archived: "Archived",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className={`text-2xl font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Add Product drawer ────────────────────────────────────────────────────────

function AddProductDrawer({ open, onClose, lineId, categories, onAdded }) {
  const [form, setForm] = useState({
    sku: "", name: "", category_id: "", description: "",
    width_in: "", height_in: "", depth_in: "",
    door_count: "", drawer_count: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);

  function handleChange(field, value) {
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (field === "sku") {
        next.sku = value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
        if (!p.name || p.name === p.sku) next.name = next.sku;
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        catalog_line_id: lineId,
        sku: form.sku,
        name: form.name || form.sku,
        category_id: form.category_id || null,
        description: form.description || null,
        width_in: form.width_in ? Number(form.width_in) : null,
        height_in: form.height_in ? Number(form.height_in) : null,
        depth_in: form.depth_in ? Number(form.depth_in) : null,
        door_count: form.door_count ? Number(form.door_count) : null,
        drawer_count: form.drawer_count ? Number(form.drawer_count) : null,
      };
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");
      setForm({ sku: "", name: "", category_id: "", description: "", width_in: "", height_in: "", depth_in: "", door_count: "", drawer_count: "" });
      onAdded(data.product);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Add Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SKU <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="B24"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='Base Cabinet 24"'
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => handleChange("category_id", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dimensions (inches)</p>
            <div className="grid grid-cols-3 gap-2">
              {[["Width", "width_in", "24"], ["Height", "height_in", "34.5"], ["Depth", "depth_in", "24"]].map(([label, field, ph]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={ph}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[["Doors", "door_count"], ["Drawers", "drawer_count"]].map(([label, field]) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </form>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={saving || !form.sku}
            className="flex-1 py-2.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add Product"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Edit line drawer ──────────────────────────────────────────────────────────

function EditLineDrawer({ open, onClose, line, onSaved }) {
  const [form, setForm] = useState({ name: line.name || "", slug: line.slug || "", description: line.description || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setForm({ name: line.name || "", slug: line.slug || "", description: line.description || "" });
  }, [open, line]);

  function handleNameChange(value) {
    setForm((p) => ({
      ...p,
      name: value,
      slug: p.slug === p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : p.slug,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/catalog/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, slug: form.slug, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved({ ...line, ...form });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Edit Line Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Line Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Public URL: /catalog/{form.slug || "…"}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Marketing copy shown on the catalog line overview page…"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.slug}
            className="flex-1 py-2.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Products tab ─────────────────────────────────────────────────────────────

function ProductsTab({ lineId, categories }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ catalog_line_id: lineId });
    if (catFilter) params.set("category_id", catFilter);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [lineId, catFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function toggleActive(product) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
      );
    }
  }

  const displayed = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.sku?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search SKU or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">
              {search || catFilter ? "No products match the filter." : "No products yet — add one above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">W×H×D</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-700">{p.name}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-400 text-xs">{p.category?.name || "—"}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-400 text-xs font-mono">
                      {[p.width_in, p.height_in, p.depth_in].map((v) => v ?? "?").join("×")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${
                          p.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                        title={p.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditProduct(p)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-right">
        {displayed.length} product{displayed.length !== 1 ? "s" : ""}
        {search || catFilter ? " (filtered)" : ""}
      </p>

      {/* Add product drawer */}
      <AddProductDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        lineId={lineId}
        categories={categories}
        onAdded={(product) => { setProducts((prev) => [product, ...prev]); setShowAdd(false); }}
      />

      {/* Inline edit panel */}
      {editProduct && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setEditProduct(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-900 text-sm">{editProduct.sku}</p>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <QuickEditFields
                product={editProduct}
                categories={categories}
                onSaved={(updated) => {
                  setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
                  setEditProduct(null);
                }}
                onClose={() => setEditProduct(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Quick edit inline ────────────────────────────────────────────────────────

function QuickEditFields({ product, categories, onSaved, onClose }) {
  const [form, setForm] = useState({
    name: product.name || "",
    description: product.description || "",
    category_id: product.category_id || "",
    width_in: product.width_in ?? "",
    height_in: product.height_in ?? "",
    depth_in: product.depth_in ?? "",
    door_count: product.door_count ?? "",
    drawer_count: product.drawer_count ?? "",
    is_active: product.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = { ...form };
      for (const f of ["width_in", "height_in", "depth_in", "door_count", "drawer_count"]) {
        body[f] = body[f] === "" ? null : Number(body[f]);
      }
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved({ ...product, ...body });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
        <select
          value={form.category_id}
          onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={3}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Dimensions</p>
        <div className="grid grid-cols-3 gap-2">
          {[["W", "width_in", "24"], ["H", "height_in", "34.5"], ["D", "depth_in", "24"]].map(([l, f, ph]) => (
            <div key={f}>
              <label className="block text-xs text-gray-400 mb-1">{l}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={ph}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[["Doors", "door_count"], ["Drawers", "drawer_count"]].map(([l, f]) => (
          <div key={f}>
            <label className="block text-xs text-gray-400 mb-1">{l}</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form[f]}
              onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="qa_active"
          checked={form.is_active}
          onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="qa_active" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

// ─── Finishes tab ─────────────────────────────────────────────────────────────

function FinishesTab({ lineId }) {
  const [finishes, setFinishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", code: "", finish_family: "", description: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finishes?line=${lineId}`);
    const data = await res.json();
    setFinishes(data.finishes || []);
    setLoading(false);
  }, [lineId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function handleNameChange(value) {
    setAddForm((p) => ({
      ...p,
      name: value,
      code: p.code === p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : p.code,
    }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAddSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/finishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, catalog_line_id: lineId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setFinishes((prev) => [...prev, data.finish]);
      setAddForm({ name: "", code: "", finish_family: "", description: "" });
      setShowAdd(false);
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
  }

  async function toggleActive(finish) {
    const res = await fetch(`/api/finishes/${finish.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !finish.is_active }),
    });
    if (res.ok) {
      setFinishes((prev) =>
        prev.map((f) => (f.id === finish.id ? { ...f, is_active: !f.is_active } : f))
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{finishes.length} finish{finishes.length !== 1 ? "es" : ""}</p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + Add Finish
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          {addError && <p className="text-xs text-red-700">{addError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="White Shaker"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={addForm.code}
                onChange={(e) => setAddForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="white-shaker"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Family</label>
              <input
                type="text"
                value={addForm.finish_family}
                onChange={(e) => setAddForm((p) => ({ ...p, finish_family: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="painted"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddError(""); }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addSaving || !addForm.name || !addForm.code}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {addSaving ? "Adding…" : "Add Finish"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : finishes.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No finishes yet — add the first one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {finishes.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{f.name}</p>
                    <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f.code}</code>
                    {f.finish_family && (
                      <span className="text-xs text-gray-400">{f.finish_family}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(f)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition shrink-0 ${
                    f.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {f.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Checklist tab ────────────────────────────────────────────────────────────

function ChecklistTab({ lineId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/catalog/${lineId}/checklist`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lineId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-red-500">Failed to load checklist.</p>;
  }

  const blockers = data.blockers || [];
  const warnings = data.warnings || [];
  const summary = data.summary || {};
  const ready = data.ready;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        ready ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
      }`}>
        <span className="text-xl">{ready ? "✓" : "⚠"}</span>
        <div>
          <p className={`text-sm font-semibold ${ready ? "text-green-800" : "text-amber-800"}`}>
            {ready ? "Ready to publish" : `${blockers.length} blocker${blockers.length !== 1 ? "s" : ""} to resolve`}
          </p>
          <p className={`text-xs ${ready ? "text-green-600" : "text-amber-600"}`}>
            {summary.active_products} active products · {summary.active_finishes} finishes · {summary.lifestyle_images} lifestyle image{summary.lifestyle_images !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Blockers</p>
          {blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-red-50 border-red-200">
              <span className="text-sm mt-0.5 shrink-0 text-red-500">✗</span>
              <p className="text-sm text-red-800 flex-1">{b.message}</p>
              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium shrink-0">Blocker</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Warnings</p>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-amber-50 border-amber-200">
              <span className="text-sm mt-0.5 shrink-0 text-amber-500">⚠</span>
              <p className="text-sm text-amber-800 flex-1">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {blockers.length === 0 && warnings.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-green-600 font-medium">All checks passed.</p>
          <p className="text-xs text-gray-400 mt-1">You can publish this line from the header above.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = ["Products", "Finishes", "Checklist"];

export default function LineManagePage() {
  const { id } = useParams();

  const [line, setLine] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Products");
  const [showEdit, setShowEdit] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const fetchLine = useCallback(async () => {
    try {
      const [lineRes, catsRes, productsRes, finishesRes] = await Promise.all([
        fetch(`/api/catalog/${id}`),
        fetch("/api/categories"),
        fetch(`/api/products?catalog_line_id=${id}`),
        fetch(`/api/finishes?line=${id}`),
      ]);
      const [lineData, catsData, productsData, finishesData] = await Promise.all([
        lineRes.json(),
        catsRes.json(),
        productsRes.ok ? productsRes.json() : Promise.resolve({}),
        finishesRes.ok ? finishesRes.json() : Promise.resolve({}),
      ]);
      if (!lineRes.ok) { setError(lineData.error || "Line not found."); return; }
      setLine(lineData.line);
      setCategories(catsData.categories || []);
      const products = productsData.products || [];
      const finishes = finishesData.finishes || [];
      setStats({
        product_count: products.length,
        active_product_count: products.filter((p) => p.is_active).length,
        finish_count: finishes.length,
      });
    } catch {
      setError("Failed to load line.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLine(); }, [fetchLine]);

  async function handlePublish() {
    if (!confirm(`Publish "${line.name}"? This will run the pre-publish checklist.`)) return;
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/catalog/${id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.blockers?.length) {
          alert(`Cannot publish. Blockers:\n\n${data.blockers.map((b) => `• ${b.message ?? b.type}`).join("\n")}`);
        } else {
          alert(data.error || "Publish failed");
        }
        return;
      }
      setLine((prev) => ({ ...prev, status: "published", published_at: new Date().toISOString() }));
    } finally {
      setPublishLoading(false);
    }
  }

  async function handleUnpublish() {
    if (!confirm(`Unpublish "${line.name}"?`)) return;
    setPublishLoading(true);
    try {
      await fetch(`/api/catalog/${id}/unpublish`, { method: "POST" });
      setLine((prev) => ({ ...prev, status: "draft" }));
    } finally {
      setPublishLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !line) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/admin/catalog/lines" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
          ← Catalog Lines
        </Link>
        <p className="text-red-600">{error || "Line not found."}</p>
      </div>
    );
  }

  const statusClass = STATUS_COLORS[line.status] || STATUS_COLORS.draft;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link href="/admin/catalog/lines" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
        ← Catalog Lines
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{line.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
              {STATUS_LABELS[line.status] || line.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono">/{line.slug}</p>
          {line.description && (
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-xl">{line.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Edit Settings
          </button>
          <Link
            href={`/admin/catalog/${id}/versions`}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-500"
          >
            History
          </Link>
          {line.status === "published" ? (
            <>
              <button
                onClick={handlePublish}
                disabled={publishLoading}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {publishLoading ? "…" : "Republish"}
              </button>
              <button
                onClick={handleUnpublish}
                disabled={publishLoading}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {publishLoading ? "…" : "Unpublish"}
              </button>
            </>
          ) : line.status !== "archived" ? (
            <button
              onClick={handlePublish}
              disabled={publishLoading}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {publishLoading ? "…" : "Publish"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Pending changes banner */}
      {line.status === "published" &&
        line.last_published_product_count !== null &&
        stats !== null &&
        stats.product_count !== line.last_published_product_count && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-amber-800 text-sm flex-1">
              <span className="font-semibold">Public catalog is out of date.</span>{" "}
              The live snapshot has{" "}
              <span className="font-semibold">{line.last_published_product_count} product{line.last_published_product_count !== 1 ? "s" : ""}</span>
              {" "}but this line now has{" "}
              <span className="font-semibold">{stats.product_count}</span>.
              {" "}Click <span className="font-semibold">Republish</span> to push the latest changes to the public view.
            </p>
            <button
              onClick={handlePublish}
              disabled={publishLoading}
              className="shrink-0 px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition disabled:opacity-50"
            >
              {publishLoading ? "Publishing…" : "Republish Now"}
            </button>
          </div>
        )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Products"
          value={stats?.product_count ?? "—"}
          sub={stats?.active_product_count != null ? `${stats.active_product_count} active` : undefined}
        />
        <StatCard
          label="Finishes"
          value={stats?.finish_count ?? "—"}
        />
        <StatCard
          label="Status"
          value={STATUS_LABELS[line.status] || line.status}
          sub={line.published_at ? `Published ${new Date(line.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : undefined}
          color={line.status === "published" ? "text-green-700" : "text-gray-700"}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Products" && (
          <ProductsTab lineId={id} categories={categories} />
        )}
        {activeTab === "Finishes" && (
          <FinishesTab lineId={id} />
        )}
        {activeTab === "Checklist" && (
          <ChecklistTab lineId={id} />
        )}
      </div>

      {/* Edit line drawer */}
      <EditLineDrawer
        open={showEdit}
        onClose={() => setShowEdit(false)}
        line={line}
        onSaved={(updated) => { setLine(updated); setShowEdit(false); }}
      />
    </div>
  );
}
