"use client";

import { useState, useEffect, useCallback } from "react";
import usePlannerStore from "@/store/plannerStore";
import { useProjectPersistence } from "@/lib/planner/useProjectPersistence";
import { COMMANDS } from "@/lib/planner/engine/SpatialEngine";

/**
 * ProjectPanel — slide-in panel for save / load / version history.
 *
 * Mounted alongside AiPreviewPanel in PlannerShell when showProjectPanel = true.
 * Mirrors the visual structure of AiPreviewPanel for consistency.
 */
export default function ProjectPanel({ onClose, primaryColor = "#1C1917" }) {
  const applyCommand       = usePlannerStore((s) => s.applyCommand);
  const setLayout          = usePlannerStore((s) => s.setLayout);
  const setCabinetStyle    = usePlannerStore((s) => s.setCabinetStyle);
  const setDimensions      = usePlannerStore((s) => s.setDimensions);
  const setUpperCabinetColor = usePlannerStore((s) => s.setUpperCabinetColor);
  const setLowerCabinetColor = usePlannerStore((s) => s.setLowerCabinetColor);

  const {
    currentProjectId,
    saving,
    loading,
    error,
    saveProject,
    listProjects,
    loadProject,
    deleteProject,
    saveVersion,
    listVersions,
    restoreVersion,
  } = useProjectPersistence();

  const [tab,          setTab]          = useState("projects"); // "projects" | "versions"
  const [projects,     setProjects]     = useState([]);
  const [versions,     setVersions]     = useState([]);
  const [projectName,  setProjectName]  = useState("My Kitchen");
  const [versionLabel, setVersionLabel] = useState("");
  const [successMsg,   setSuccessMsg]   = useState(null);

  // ── Load project list on mount ───────────────────────────────────────────────
  useEffect(() => {
    listProjects().then(setProjects);
  }, [listProjects]);

  // ── Load version list when tab switches to versions ──────────────────────────
  useEffect(() => {
    if (tab === "versions" && currentProjectId) {
      listVersions().then(setVersions);
    }
  }, [tab, currentProjectId, listVersions]);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // ── Apply a loaded project to the Zustand store ─────────────────────────────

  function applyProjectToStore(project) {
    if (project.layout)      setLayout(project.layout);
    if (project.cabinet_style) setCabinetStyle(project.cabinet_style);
    if (project.room_dimensions) setDimensions(project.room_dimensions);
    if (project.settings?.upperCabinetColor) setUpperCabinetColor(project.settings.upperCabinetColor);
    if (project.settings?.lowerCabinetColor) setLowerCabinetColor(project.settings.lowerCabinetColor);
    if (project.scene) {
      applyCommand({
        type:  COMMANDS.SET_ITEMS,
        items: project.scene.items ?? [],
        zones: project.scene.zones ?? [],
      });
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    try {
      const saved = await saveProject(projectName);
      showSuccess(`"${saved.name}" saved.`);
      listProjects().then(setProjects);
    } catch {
      // error already set in hook
    }
  }, [saveProject, projectName, listProjects]);

  const handleLoad = useCallback(async (projectId) => {
    try {
      const project = await loadProject(projectId);
      applyProjectToStore(project);
      setProjectName(project.name);
      showSuccess(`"${project.name}" loaded.`);
    } catch {
      // error already set in hook
    }
  }, [loadProject]);

  const handleDelete = useCallback(async (projectId, projectName) => {
    if (!window.confirm(`Delete "${projectName}"?`)) return;
    try {
      await deleteProject(projectId);
      listProjects().then(setProjects);
      showSuccess("Project deleted.");
    } catch {
      // error already set in hook
    }
  }, [deleteProject, listProjects]);

  const handleSaveVersion = useCallback(async () => {
    try {
      await saveVersion(versionLabel || null);
      setVersionLabel("");
      listVersions().then(setVersions);
      showSuccess("Version saved.");
    } catch {
      // error already set in hook
    }
  }, [saveVersion, versionLabel, listVersions]);

  const handleRestoreVersion = useCallback(async (versionId, label, created) => {
    const displayName = label || new Date(created).toLocaleString();
    if (!window.confirm(`Restore version "${displayName}"? Current scene will be replaced.`)) return;
    try {
      const project = await restoreVersion(versionId);
      applyProjectToStore(project);
      showSuccess("Version restored.");
    } catch {
      // error already set in hook
    }
  }, [restoreVersion]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      <div className="fixed top-[64px] sm:top-[76px] right-0 bottom-0 z-50 md:relative md:top-auto md:right-auto md:bottom-auto md:z-auto w-[min(320px,92vw)] md:w-80 xl:w-96 shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 21V13h8v8M8 5v4h6" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-stone-800">Projects</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close project panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          {["projects", "versions"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 py-2 text-xs font-medium capitalize transition border-b-2",
                tab === t
                  ? "text-stone-900 border-stone-700"
                  : "text-stone-400 border-transparent hover:text-stone-600",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Feedback messages */}
        {successMsg && (
          <div className="mx-3 mt-2 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mx-3 mt-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* ── Projects tab ──────────────────────────────────────────────────────── */}
        {tab === "projects" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Save section */}
            <div className="p-4 border-b border-stone-100">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
                {currentProjectId ? "Update project" : "Save new project"}
              </p>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300 mb-2"
              />
              <button
                onClick={handleSave}
                disabled={saving || !projectName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>{currentProjectId ? "Update Project" : "Save Project"}</>
                )}
              </button>
            </div>

            {/* Saved projects list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-5 h-5 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <svg className="w-8 h-8 text-stone-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <p className="text-xs text-stone-400">No saved projects yet.</p>
                  <p className="text-[10px] text-stone-300 mt-1">Save your kitchen to load it later.</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {projects.map((p) => (
                    <li
                      key={p.id}
                      className={[
                        "flex items-center gap-2 px-4 py-3 hover:bg-stone-50 transition",
                        p.id === currentProjectId ? "bg-stone-50" : "",
                      ].join(" ")}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {p.layout} · {p.room_dimensions?.width}ft × {p.room_dimensions?.length}ft
                        </p>
                        <p className="text-[10px] text-stone-300">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleLoad(p.id)}
                          disabled={loading}
                          className="px-2 py-1 text-[10px] font-medium text-stone-600 border border-stone-200 rounded-md hover:bg-stone-100 transition disabled:opacity-50"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1 text-stone-300 hover:text-red-500 transition rounded-md hover:bg-red-50"
                          aria-label="Delete project"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── Versions tab ──────────────────────────────────────────────────────── */}
        {tab === "versions" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!currentProjectId ? (
              <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
                <svg className="w-8 h-8 text-stone-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-stone-400">Save a project first to enable version history.</p>
              </div>
            ) : (
              <>
                {/* Save version */}
                <div className="p-4 border-b border-stone-100">
                  <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Save current version</p>
                  <input
                    type="text"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder='Optional label e.g. "After island move"'
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300 mb-2"
                  />
                  <button
                    onClick={handleSaveVersion}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {saving ? "Saving..." : "Save Version"}
                  </button>
                </div>

                {/* Version list */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="w-5 h-5 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <p className="text-xs text-stone-400">No versions saved yet.</p>
                      <p className="text-[10px] text-stone-300 mt-1">Save a version to track your design history.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {versions.map((v) => (
                        <li key={v.id} className="flex items-center gap-2 px-4 py-3 hover:bg-stone-50 transition">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-stone-700 truncate">
                              {v.label || "Untitled version"}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {new Date(v.created_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(v.id, v.label, v.created_at)}
                            disabled={loading}
                            className="px-2 py-1 text-[10px] font-medium text-stone-600 border border-stone-200 rounded-md hover:bg-stone-100 transition disabled:opacity-50 shrink-0"
                          >
                            Restore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
