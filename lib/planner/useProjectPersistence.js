"use client";

import { useState, useCallback, useEffect } from "react";
import usePlannerStore from "@/store/plannerStore";

const SESSION_TOKEN_KEY  = "planner_session_token";
const CURRENT_PROJECT_KEY = "planner_current_project_id";

// ── Session token ─────────────────────────────────────────────────────────────

function getOrCreateSessionToken() {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    // Generate a UUID v4-like token
    token = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

function plannerFetch(url, options = {}) {
  const sessionToken = getOrCreateSessionToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Session-Token": sessionToken,
      ...(options.headers ?? {}),
    },
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useProjectPersistence
 *
 * Manages project save/load/version lifecycle for the kitchen planner.
 * Uses localStorage for sessionToken + currentProjectId.
 * Exposes saveProject, loadProject, listProjects, deleteProject,
 * saveVersion, listVersions, restoreVersion.
 */
export function useProjectPersistence() {
  // These values are only ever read inside the async callbacks below (at
  // click-time, not during render), so they're pulled from getState() there
  // instead of being subscribed to reactively — otherwise every cabinet
  // drag/color change would re-render whatever component calls this hook.
  const getSettings = useCallback(() => {
    const s = usePlannerStore.getState();
    return {
      viewMode:            s.viewMode,
      planLayer:           s.planLayer,
      upperCabinetColor:   s.upperCabinetColor,
      lowerCabinetColor:   s.lowerCabinetColor,
      selectedDoorStyle:   s.selectedDoorStyle,
      selectedDrawerStyle: s.selectedDrawerStyle,
      selectedHardware:    s.selectedHardware,
      selectedCountertop:  s.selectedCountertop,
      selectedFlooring:    s.selectedFlooring,
      lifestyleProfile:    s.lifestyleProfile,
      doorWindows:         s.doorWindows,
    };
  }, []);

  const [currentProjectId, setCurrentProjectIdState] = useState(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CURRENT_PROJECT_KEY) ?? null;
  });
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Keep localStorage in sync
  function setCurrentProjectId(id) {
    setCurrentProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(CURRENT_PROJECT_KEY, id);
      else    localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  }

  // ── Save / Update project ────────────────────────────────────────────────────

  const saveProject = useCallback(async (name) => {
    setSaving(true);
    setError(null);
    try {
      const { scene, layout, cabinetStyle, roomDimensions } = usePlannerStore.getState();
      const payload = {
        name:           name || "My Kitchen",
        layout,
        cabinetStyle,
        roomDimensions,
        scene,
        settings:       getSettings(),
      };

      let res;
      if (currentProjectId) {
        // Update existing
        res = await plannerFetch(`/api/planner/projects/${currentProjectId}`, {
          method: "PATCH",
          body:   JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await plannerFetch("/api/planner/projects", {
          method: "POST",
          body:   JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save project.");

      const saved = data.project;
      setCurrentProjectId(saved.id);
      return saved;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentProjectId, getSettings]);

  // ── List projects ────────────────────────────────────────────────────────────

  const listProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await plannerFetch("/api/planner/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load projects.");
      return data.projects ?? [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load project (returns the raw project for the caller to apply to store) ─

  const loadProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await plannerFetch(`/api/planner/projects/${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load project.");
      setCurrentProjectId(projectId);
      return data.project;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Delete project ───────────────────────────────────────────────────────────

  const deleteProject = useCallback(async (projectId) => {
    setError(null);
    try {
      const res  = await plannerFetch(`/api/planner/projects/${projectId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete project.");
      if (projectId === currentProjectId) setCurrentProjectId(null);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentProjectId]);

  // ── Save version ─────────────────────────────────────────────────────────────

  const saveVersion = useCallback(async (label) => {
    if (!currentProjectId) throw new Error("No project saved yet.");
    setError(null);
    try {
      const { scene } = usePlannerStore.getState();
      const res  = await plannerFetch(`/api/planner/projects/${currentProjectId}/versions`, {
        method: "POST",
        body:   JSON.stringify({ scene, settings: getSettings(), label: label || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save version.");
      return data.version;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentProjectId, getSettings]);

  // ── List versions ────────────────────────────────────────────────────────────

  const listVersions = useCallback(async () => {
    if (!currentProjectId) return [];
    setError(null);
    try {
      const res  = await plannerFetch(`/api/planner/projects/${currentProjectId}/versions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load versions.");
      return data.versions ?? [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [currentProjectId]);

  // ── Restore version (returns project with restored scene for caller to apply) ─

  const restoreVersion = useCallback(async (versionId) => {
    if (!currentProjectId) throw new Error("No project saved yet.");
    setLoading(true);
    setError(null);
    try {
      const res  = await plannerFetch(
        `/api/planner/projects/${currentProjectId}/versions/${versionId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore version.");
      return data.project;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  return {
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
  };
}
