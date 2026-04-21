"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

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

function CreateLineDrawer({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from name
      if (field === "name") {
        next.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setForm({ name: "", slug: "", description: "" });
      onCreated(data.line);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Catalog Line</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Line Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="American Collection"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
            <p className="text-xs text-gray-400 mb-1.5">
              Auto-generated from name. Used in catalog URLs: /catalog/<strong>{form.slug || "american"}</strong>
            </p>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="american"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-xs text-gray-400 mb-1.5">
              Optional marketing copy shown on the catalog line overview page.
            </p>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Our flagship American Collection features…"
            />
          </div>

          <div className="pt-2 bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Next steps after creating:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
              <li>Add categories (Base, Wall, Tall, Vanity)</li>
              <li>Import or enter products (SKUs)</li>
              <li>Upload images and assign finishes</li>
              <li>Run QA checklist, then publish</li>
            </ol>
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
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
            disabled={saving || !form.name || !form.slug}
            className="flex-1 py-2.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Line"}
          </button>
        </div>
      </div>
    </>
  );
}

function LineCard({ line, onPublish, onUnpublish }) {
  const [actionLoading, setActionLoading] = useState(false);

  async function handlePublish() {
    if (!confirm(`Publish "${line.name}"? This will run the pre-publish checklist first.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/catalog/${line.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.blockers?.length) {
          alert(`Cannot publish. Blockers:\n\n${data.blockers.map((b) => `• ${b}`).join("\n")}`);
        } else {
          alert(data.error || "Publish failed");
        }
        return;
      }
      onPublish(line.id);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnpublish() {
    if (!confirm(`Unpublish "${line.name}"? It will no longer be visible to customers.`)) return;
    setActionLoading(true);
    try {
      await fetch(`/api/catalog/${line.id}/unpublish`, { method: "POST" });
      onUnpublish(line.id);
    } finally {
      setActionLoading(false);
    }
  }

  const statusClass = STATUS_COLORS[line.status] || STATUS_COLORS.draft;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex items-start justify-between gap-3 sm:gap-4 hover:shadow-sm transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold text-gray-900 text-base">{line.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
            {STATUS_LABELS[line.status] || line.status}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-mono mb-2">/{line.slug}</p>
        {line.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{line.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          {line.manufacturer?.name && (
            <span>Mfr: {line.manufacturer.name}</span>
          )}
          {line.status === "published" && line.published_at && (
            <span>
              Published {new Date(line.published_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
          <span>Created {new Date(line.created_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          })}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Link
          href={`/admin/catalog/lines/${line.id}`}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Manage →
        </Link>
        <Link
          href={`/admin/catalog/${line.id}/versions`}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-500"
        >
          History
        </Link>

        {line.status === "draft" || line.status === "review" ? (
          <button
            onClick={handlePublish}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {actionLoading ? "…" : "Publish"}
          </button>
        ) : line.status === "published" ? (
          <button
            onClick={handleUnpublish}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            {actionLoading ? "…" : "Unpublish"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function CatalogLinesPage() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [error, setError] = useState("");

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      setLines(data.lines || []);
    } catch {
      setError("Failed to load catalog lines.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  function handleCreated(newLine) {
    setLines((prev) => [newLine, ...prev]);
    setShowDrawer(false);
  }

  function handlePublish(id) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "published", published_at: new Date().toISOString() } : l))
    );
  }

  function handleUnpublish(id) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "draft" } : l))
    );
  }

  const published = lines.filter((l) => l.status === "published");
  const draft = lines.filter((l) => l.status !== "published" && l.status !== "archived");
  const archived = lines.filter((l) => l.status === "archived");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog Lines</h1>
          <p className="text-sm text-gray-500 mt-1">
            Each catalog line is a distinct collection of products (e.g. American Collection, Euro Collection).
          </p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + New Line
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-lg mb-1">No catalog lines yet</p>
          <p className="text-sm text-gray-400 mb-5">
            Create your first catalog line to start adding products.
          </p>
          <button
            onClick={() => setShowDrawer(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            + Create First Line
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Published */}
          {published.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">
                Published ({published.length})
              </p>
              <div className="space-y-3">
                {published.map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    onPublish={handlePublish}
                    onUnpublish={handleUnpublish}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Draft / In Review */}
          {draft.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">
                Draft / In Progress ({draft.length})
              </p>
              <div className="space-y-3">
                {draft.map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    onPublish={handlePublish}
                    onUnpublish={handleUnpublish}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1">
                Archived ({archived.length})
              </p>
              <div className="space-y-3">
                {archived.map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    onPublish={handlePublish}
                    onUnpublish={handleUnpublish}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateLineDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
