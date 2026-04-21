"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ACTION_LABELS = {
  publish: "Published",
  unpublish: "Unpublished",
  version_rollback: "Rolled back",
  create: "Created draft",
  archive: "Archived",
};

// ─── Diff display ─────────────────────────────────────────────────────────────

function DiffSection({ label, added, removed, modified }) {
  const total = (added?.length || 0) + (removed?.length || 0) + (modified?.length || 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</h4>
      {(added || []).length > 0 && (
        <div className="space-y-1">
          {added.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">+</span>
              <span className="text-gray-800">{item.sku || item.code} — {item.name}</span>
            </div>
          ))}
        </div>
      )}
      {(removed || []).length > 0 && (
        <div className="space-y-1">
          {removed.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">−</span>
              <span className="text-gray-500 line-through">{item.sku || item.code} — {item.name}</span>
            </div>
          ))}
        </div>
      )}
      {(modified || []).length > 0 && (
        <div className="space-y-2">
          {modified.map((item, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
              <p className="font-mono font-semibold text-amber-800 mb-1">{item.sku}</p>
              {Object.entries(item.changes).map(([field, { from, to }]) => (
                <p key={field} className="text-amber-700">
                  {field}: <span className="line-through">{from}</span> → <strong>{to}</strong>
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compare panel ────────────────────────────────────────────────────────────

function ComparePanel({ lineId, versions }) {
  const published = versions.filter((v) => v.status !== "draft");

  const [v1, setV1] = useState(published[1]?.version_number || "");
  const [v2, setV2] = useState(published[0]?.version_number || "");
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  async function runCompare() {
    if (!v1 || !v2 || v1 === v2) return;
    setLoading(true);
    setDiff(null);
    setAiExplanation("");
    setError("");
    try {
      const res = await fetch(`/api/catalog/${lineId}/versions/compare?v1=${v1}&v2=${v2}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Compare failed"); return; }
      setDiff(data.diff);
    } catch {
      setError("Failed to load diff.");
    } finally {
      setLoading(false);
    }
  }

  async function explainWithAI() {
    setAiLoading(true);
    setAiExplanation("");
    try {
      const res = await fetch("/api/ai/explain/version-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog_line_id: lineId, v1: Number(v1), v2: Number(v2) }),
      });
      const data = await res.json();
      if (res.ok) setAiExplanation(data.explanation || "");
    } catch {
      setAiExplanation("AI explanation unavailable.");
    } finally {
      setAiLoading(false);
    }
  }

  const hasChanges = diff && (
    diff.products.added.length + diff.products.removed.length + diff.products.modified.length +
    diff.finishes.added.length + diff.finishes.removed.length > 0
  );

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Compare Versions</h3>

      {/* Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={v1}
          onChange={(e) => setV1(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">From version…</option>
          {published.map((v) => (
            <option key={v.id} value={v.version_number}>
              v{v.version_number}{v.label ? ` — ${v.label}` : ""} ({fmtDate(v.published_at)})
            </option>
          ))}
        </select>

        <span className="text-gray-400 text-sm">→</span>

        <select
          value={v2}
          onChange={(e) => setV2(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">To version…</option>
          {published.map((v) => (
            <option key={v.id} value={v.version_number}>
              v{v.version_number}{v.label ? ` — ${v.label}` : ""} ({fmtDate(v.published_at)})
            </option>
          ))}
        </select>

        <button
          onClick={runCompare}
          disabled={!v1 || !v2 || v1 === v2 || loading}
          className="px-4 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-40"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Results */}
      {diff && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {diff.products.added.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                +{diff.products.added.length} products
              </span>
            )}
            {diff.products.removed.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                −{diff.products.removed.length} products
              </span>
            )}
            {diff.products.modified.length > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                ~{diff.products.modified.length} modified
              </span>
            )}
            {diff.finishes.added.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                +{diff.finishes.added.length} finishes
              </span>
            )}
            {diff.finishes.removed.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                −{diff.finishes.removed.length} finishes
              </span>
            )}
            {!hasChanges && (
              <span className="text-gray-400 italic">No differences detected.</span>
            )}

            {hasChanges && (
              <button
                onClick={explainWithAI}
                disabled={aiLoading}
                className="ml-auto px-3 py-1 text-xs bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {aiLoading ? "Thinking…" : "✦ Explain with AI"}
              </button>
            )}
          </div>

          {/* AI explanation */}
          {aiExplanation && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 leading-relaxed">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">AI Summary</p>
              {aiExplanation}
            </div>
          )}

          {/* Detail */}
          {hasChanges && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <DiffSection
                label="Products"
                added={diff.products.added}
                removed={diff.products.removed}
                modified={diff.products.modified}
              />
              <DiffSection
                label="Finishes"
                added={diff.finishes.added}
                removed={diff.finishes.removed}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rollback modal ───────────────────────────────────────────────────────────

function RollbackModal({ version, lineId, onClose, onRolledBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/catalog/${lineId}/versions/${version.id}/rollback`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Rollback failed."); return; }
      onRolledBack(data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Roll back to v{version.version_number}?
        </h2>
        {version.label && (
          <p className="text-sm text-gray-500">&quot;{version.label}&quot;</p>
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 leading-relaxed space-y-1">
          <p>This will create a <strong>new version</strong> using the v{version.version_number} snapshot. The current live version will be archived.</p>
          <p className="text-amber-600 text-xs mt-2">Your live product edits in the database remain unchanged — only the public snapshot reverts. You can roll forward at any time.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? "Rolling back…" : "Confirm Rollback →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Version row ──────────────────────────────────────────────────────────────

function VersionRow({ version, isLive, isDraft, lineId, onApprove, onDiscard, onRollback }) {
  const [approveLoading, setApproveLoading] = useState(false);
  const [discardLoading, setDiscardLoading] = useState(false);

  async function handleApprove() {
    if (!confirm("Approve this draft and publish it as the live version?")) return;
    setApproveLoading(true);
    try {
      const res = await fetch(`/api/catalog/${lineId}/versions/${version.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) onApprove(data);
      else alert(data.error || "Approve failed.");
    } finally {
      setApproveLoading(false);
    }
  }

  async function handleDiscard() {
    if (!confirm("Discard this draft? This cannot be undone.")) return;
    setDiscardLoading(true);
    try {
      const res = await fetch(`/api/catalog/${lineId}/versions/${version.id}`, {
        method: "DELETE",
      });
      if (res.ok) onDiscard(version.id);
      else {
        const data = await res.json();
        alert(data.error || "Discard failed.");
      }
    } finally {
      setDiscardLoading(false);
    }
  }

  const badge = isDraft
    ? "bg-yellow-100 text-yellow-700"
    : isLive
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-500";

  const badgeLabel = isDraft ? "DRAFT" : isLive ? "LIVE" : "Archived";

  return (
    <div
      className={`border rounded-xl p-4 ${
        isDraft
          ? "border-yellow-300 bg-yellow-50"
          : isLive
          ? "border-green-300 bg-green-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge}`}>
              {badgeLabel}
            </span>
            <span className="font-semibold text-gray-900">
              v{version.version_number}
              {version.label && ` — ${version.label}`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>{version.product_count} products</span>
            <span>·</span>
            <span>{version.finish_count} finishes</span>
            {version.published_by?.full_name && (
              <>
                <span>·</span>
                <span>by {version.published_by.full_name}</span>
              </>
            )}
            <span>·</span>
            <span>{fmtDate(version.published_at)}</span>
            {version.archived_at && (
              <>
                <span>·</span>
                <span className="text-gray-400">archived {fmtDate(version.archived_at)}</span>
              </>
            )}
          </div>
          {version.notes && (
            <p className="text-xs text-gray-400 mt-1 italic">{version.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isDraft && (
            <>
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {approveLoading ? "Publishing…" : "Approve & Publish"}
              </button>
              <button
                onClick={handleDiscard}
                disabled={discardLoading}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {discardLoading ? "…" : "Discard"}
              </button>
            </>
          )}
          {!isDraft && !isLive && (
            <button
              onClick={() => onRollback(version)}
              className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition"
            >
              Roll back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audit trail ──────────────────────────────────────────────────────────────

function AuditTrail({ logs }) {
  if (!logs.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Audit Trail</h3>
      <div className="space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
            <div className="w-32 shrink-0 text-xs text-gray-400">{fmtDateTime(log.created_at)}</div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-700">
                {log.performed_by?.full_name || log.performed_by?.email || "System"}
              </span>
              <span className="text-xs text-gray-500 ml-1.5">
                {ACTION_LABELS[log.action] || log.action}
                {log.new_values?.version_number && ` v${log.new_values.version_number}`}
                {log.new_values?.product_count != null && ` (${log.new_values.product_count} products)`}
                {log.old_values?.restored_from_version && ` from v${log.old_values.restored_from_version}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CatalogVersionsPage({ params }) {
  const lineId = params.id;

  const [line, setLine] = useState(null);
  const [versions, setVersions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draftLoading, setDraftLoading] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lineRes, versionsRes, logsRes] = await Promise.all([
        fetch(`/api/catalog/${lineId}`),
        fetch(`/api/catalog/${lineId}/versions`),
        fetch(`/api/audit-logs?table_name=catalog_lines&record_id=${lineId}&limit=20`),
      ]);

      const [lineData, versionsData, logsData] = await Promise.all([
        lineRes.json(),
        versionsRes.json(),
        logsRes.json(),
      ]);

      if (lineData.line) setLine(lineData.line);
      setVersions(versionsData.versions || []);
      setAuditLogs(logsData.logs || []);
    } catch {
      setError("Failed to load version history.");
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDraftSnapshot() {
    const label = prompt("Label for this draft snapshot (optional):");
    if (label === null) return; // cancelled
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/catalog/${lineId}/versions/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || "Draft" }),
      });
      const data = await res.json();
      if (res.status === 409) {
        alert(`A draft already exists (v${data.existing_draft?.version_number}). Discard it first.`);
        return;
      }
      if (!res.ok) {
        alert(data.error || "Failed to create draft.");
        return;
      }
      if (data.blockers?.length > 0) {
        const blockerList = data.blockers.map((b) => `• ${b.type}${b.sku ? `: ${b.sku}` : ""}`).join("\n");
        alert(`Draft created with warnings:\n\n${blockerList}\n\nReview and fix before approving.`);
      }
      await fetchData();
    } finally {
      setDraftLoading(false);
    }
  }

  function handleApprove() {
    fetchData();
  }

  function handleDiscard(versionId) {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  }

  function handleRolledBack() {
    fetchData();
  }

  const draft = versions.find((v) => v.status === "draft");
  const live = versions.find((v) => v.status === "published");
  const archived = versions.filter((v) => v.status === "archived");
  const nonDraftVersions = versions.filter((v) => v.status !== "draft");

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading version history…
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/catalog/lines"
            className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1 mb-1"
          >
            ← Catalog Lines
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {line?.name || "…"} — Version History
          </h1>
          {line && (
            <p className="text-xs text-gray-400 font-mono mt-0.5">/{line.slug}</p>
          )}
        </div>
        <button
          onClick={handleDraftSnapshot}
          disabled={draftLoading || !!draft}
          title={draft ? "Discard the current draft before creating a new one" : ""}
          className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-40"
        >
          {draftLoading ? "Snapshotting…" : draft ? "Draft exists" : "+ Draft Snapshot"}
        </button>
      </div>

      {/* Draft section */}
      {draft && (
        <div>
          <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mb-2">
            Pending Review
          </p>
          <VersionRow
            version={draft}
            isDraft
            lineId={lineId}
            onApprove={handleApprove}
            onDiscard={handleDiscard}
          />
        </div>
      )}

      {/* Live version */}
      {live && (
        <div>
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-2">
            Currently Live
          </p>
          <VersionRow version={live} isLive lineId={lineId} />
        </div>
      )}

      {/* Compare panel toggle */}
      {nonDraftVersions.length >= 2 && (
        <div>
          <button
            onClick={() => setCompareOpen((v) => !v)}
            className="text-sm text-indigo-600 hover:text-indigo-800 transition font-medium flex items-center gap-1"
          >
            <span>{compareOpen ? "▾" : "▸"}</span>
            Compare versions
          </button>
          {compareOpen && (
            <div className="mt-3">
              <ComparePanel lineId={lineId} versions={nonDraftVersions} />
            </div>
          )}
        </div>
      )}

      {/* Archived versions */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Past Versions
          </p>
          {archived.map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              lineId={lineId}
              onRollback={setRollbackTarget}
            />
          ))}
        </div>
      )}

      {versions.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <p className="text-sm">No versions yet.</p>
          <p className="text-xs mt-1">Publish the catalog line to create the first version.</p>
        </div>
      )}

      {/* Audit trail */}
      {auditLogs.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <AuditTrail logs={auditLogs} />
        </div>
      )}

      {/* Rollback modal */}
      {rollbackTarget && (
        <RollbackModal
          version={rollbackTarget}
          lineId={lineId}
          onClose={() => setRollbackTarget(null)}
          onRolledBack={() => {
            setRollbackTarget(null);
            handleRolledBack();
          }}
        />
      )}
    </div>
  );
}
