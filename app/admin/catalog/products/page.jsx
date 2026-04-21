"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Inline Edit Panel ──────────────────────────────────────────────────────

function EditPanel({ product, onClose, onSaved, lines, categories }) {
  const [form, setForm] = useState({
    name: product.name || "",
    description: product.description || "",
    width_in: product.width_in || "",
    height_in: product.height_in || "",
    depth_in: product.depth_in || "",
    door_count: product.door_count || "",
    drawer_count: product.drawer_count || "",
    notes: product.notes || "",
    is_active: product.is_active ?? true,
    category_id: product.category_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = { ...form };
      // Convert numeric fields
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
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function field(label, key, type = "text", props = {}) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          {...props}
        />
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{product.sku}</p>
          <p className="text-xs text-gray-400">{product.catalog_line?.name}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
        )}

        {field("Product Name", "name")}

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

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dimensions (inches)</p>
          <div className="grid grid-cols-3 gap-2">
            {field("Width", "width_in", "number", { step: "0.01", min: "0", placeholder: "24" })}
            {field("Height", "height_in", "number", { step: "0.01", min: "0", placeholder: "34.5" })}
            {field("Depth", "depth_in", "number", { step: "0.01", min: "0", placeholder: "24" })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {field("Doors", "door_count", "number", { step: "1", min: "0" })}
          {field("Drawers", "drawer_count", "number", { step: "1", min: "0" })}
        </div>

        {field("Internal Notes", "notes")}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible in catalog when published)</label>
        </div>
      </div>

      <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
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
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── CSV Import Modal ────────────────────────────────────────────────────────

function CSVImportModal({ open, onClose, lines, categories, onImported }) {
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [csvText, setCsvText] = useState("");
  const [lineId, setLineId] = useState("");
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
    }).filter((r) => r.sku);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target.result);
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!lineId) return alert("Please select a catalog line.");
    setImporting(true);
    const ok = [], fail = [];
    for (const row of rows) {
      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalog_line_id: lineId,
            category_id: categories.find((c) => c.slug === row.category?.toLowerCase())?.id || null,
            sku: row.sku?.toUpperCase(),
            name: row.name || row.sku?.toUpperCase(),
            width_in: row.width_in ? Number(row.width_in) : null,
            height_in: row.height_in ? Number(row.height_in) : null,
            depth_in: row.depth_in ? Number(row.depth_in) : null,
            door_count: row.door_count ? Number(row.door_count) : null,
            drawer_count: row.drawer_count ? Number(row.drawer_count) : null,
          }),
        });
        if (res.ok) ok.push(row.sku);
        else {
          const d = await res.json();
          fail.push({ sku: row.sku, error: d.error });
        }
      } catch {
        fail.push({ sku: row.sku, error: "Network error" });
      }
    }
    setResults({ ok, fail });
    setStep("done");
    setImporting(false);
    if (ok.length > 0) onImported();
  }

  function reset() {
    setStep("upload");
    setCsvText("");
    setRows([]);
    setResults(null);
    setLineId("");
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Import Products from CSV</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === "upload" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload a CSV file to import products in bulk. Your CSV should have these columns:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto">
                  sku, name, category, width_in, height_in, depth_in, door_count, drawer_count
                </div>
                <p className="text-xs text-gray-400">
                  Only <strong>sku</strong> is required. All other fields are optional.
                  The <strong>category</strong> column should match a category slug (e.g. <em>base</em>, <em>wall</em>).
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Line *</label>
                  <select
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a catalog line…</option>
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 transition"
                >
                  <p className="text-gray-400 text-sm">Click to select a CSV file</p>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  <strong>Example CSV row:</strong><br />
                  <code>B24, &quot;Base Cabinet 24\&quot;&quot;, base, 24, 34.5, 24, 1, 0</code>
                </div>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    <strong>{rows.length}</strong> products found in CSV
                  </p>
                  <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
                    ← Choose different file
                  </button>
                </div>

                {!lineId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    Please select a catalog line above before importing.
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {["SKU", "Name", "Category", "W×H×D", "Doors", "Drawers"].map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-mono font-medium text-gray-800">{r.sku}</td>
                            <td className="px-3 py-1.5 text-gray-600">{r.name || "—"}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.category || "—"}</td>
                            <td className="px-3 py-1.5 text-gray-500">
                              {[r.width_in, r.height_in, r.depth_in].filter(Boolean).join("×") || "—"}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500">{r.door_count || "—"}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.drawer_count || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {step === "done" && results && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{results.ok.length}</p>
                    <p className="text-xs text-green-600 mt-0.5">Imported successfully</p>
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{results.fail.length}</p>
                    <p className="text-xs text-red-600 mt-0.5">Failed</p>
                  </div>
                </div>
                {results.fail.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Failures:</p>
                    <div className="space-y-1">
                      {results.fail.map((f, i) => (
                        <div key={i} className="text-xs bg-red-50 border border-red-100 rounded px-3 py-1.5 text-red-700">
                          <strong>{f.sku}:</strong> {f.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
            {step === "done" ? (
              <>
                <button onClick={reset} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Import More
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Done
                </button>
              </>
            ) : step === "preview" ? (
              <>
                <button onClick={reset} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !lineId}
                  className="flex-1 py-2.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? `Importing… (${rows.length} products)` : `Import ${rows.length} Products`}
                </button>
              </>
            ) : (
              <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showImport, setShowImport] = useState(false);

  // Filters
  const [lineFilter, setLineFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (lineFilter) params.set("catalog_line_id", lineFilter);
    if (catFilter) params.set("category_id", catFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [lineFilter, catFilter, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    async function loadMeta() {
      const [lRes, cRes] = await Promise.all([fetch("/api/catalog"), fetch("/api/categories")]);
      const lData = lRes.ok ? await lRes.json() : {};
      const cData = cRes.ok ? await cRes.json() : {};
      setLines(lData.lines || []);
      setCategories(cData.categories || []);
    }
    loadMeta();
  }, []);

  function handleSaved(updated) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const displayed = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      return p.sku?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Import CSV
          </button>
          <button
            onClick={() => {
              // Navigate to create form — for now open import
              setShowImport(true);
            }}
            className="px-3 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search SKU or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">
              {search || lineFilter || catFilter
                ? "No products match the current filters."
                : "No products yet. Import a CSV or add products manually."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Line</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">W×H×D</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 transition cursor-pointer ${
                      selectedProduct?.id === product.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-xs">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {product.catalog_line?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {product.category?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {[product.width_in, product.height_in, product.depth_in]
                        .map((v) => v ?? "?")
                        .join("×")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
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

      {/* Edit panel */}
      {selectedProduct && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setSelectedProduct(null)} />
          <EditPanel
            product={selectedProduct}
            lines={lines}
            categories={categories}
            onClose={() => setSelectedProduct(null)}
            onSaved={handleSaved}
          />
        </>
      )}

      {/* CSV Import modal */}
      <CSVImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        lines={lines}
        categories={categories}
        onImported={fetchProducts}
      />
    </div>
  );
}
