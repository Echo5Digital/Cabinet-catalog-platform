import { create } from "zustand";
import {
  applyCommand as engineApplyCommand,
  COMMANDS,
} from "@/lib/planner/engine/SpatialEngine";
import { generateLayout as engineGenerateLayout } from "@/lib/planner/engine/commands/generateLayout";

/**
 * plannerStore.js  — Zustand store for the kitchen planner.
 *
 * v2 architecture: the authoritative spatial state lives in `scene.items[]`
 * (SceneItem objects) instead of the old flat `placedItems[]`.
 *
 * All mutations go through `applyCommand()` → SpatialEngine (pure functions).
 * Both the 2D Konva canvas and the 3D React Three Fiber scene read from the
 * same `scene` via lib/planner/selectors.js — they are both projection views.
 *
 * Backward-compatible wrappers (addItem / moveItem / removeItem / clearCanvas /
 * rotateItem) are preserved so PlannerShell and PlannerCanvas need only minimal
 * changes to their call sites.
 *
 * Feature additions:
 *  - undoStack / redoStack  — scene-snapshot undo/redo (capped at 50 each)
 *  - validationResults      — advisory design rule results
 */

const EMPTY_SCENE = { items: [], zones: [] };

const usePlannerStore = create((set, get) => ({
  // ─── Step navigation ─────────────────────────────────────────────────────────
  step: 1,                  // 1 = layout selector, 2 = room dims, 3 = canvas+AI
  setStep: (step) => set({ step }),

  // ─── Layout selection ─────────────────────────────────────────────────────────
  layout: null,             // "Straight" | "L-Shape" | "U-Shape" | "Parallel" | "Island" | "G-Shape"
  setLayout: (layout) => set({ layout }),

  // ─── Cabinet style selection ──────────────────────────────────────────────────
  cabinetStyle: null,       // "American" | "Euro"
  setCabinetStyle: (style) => set({ cabinetStyle: style }),

  // ─── Room dimensions (feet) ───────────────────────────────────────────────────
  roomDimensions: { width: 14, length: 11, height: 9 },
  setDimensions: (dims) =>
    set((state) => ({ roomDimensions: { ...state.roomDimensions, ...dims } })),

  // ─── Authoritative spatial scene ──────────────────────────────────────────────
  // scene.items  = SceneItem[]        — single source of truth for placements
  // scene.zones  = ZoneDescriptor[]   — cabinet-run zones (set by generator)
  scene: EMPTY_SCENE,

  // ─── Undo / Redo stacks (scene snapshots, capped at 50 each) ─────────────────
  undoStack: [],  // Array<scene>  — snapshots before each mutation
  redoStack: [],  // Array<scene>  — snapshots that were undone

  // ─── Catalog products (stored for procedural generator access) ────────────────
  catalogProducts: [],
  setCatalogProducts: (products) => set({ catalogProducts: products ?? [] }),

  // ─── Apply spatial command (with undo snapshot) ───────────────────────────────
  // All item mutations go through SpatialEngine.applyCommand (pure functions).
  // Pushes prevScene onto undoStack before mutation; clears redoStack on new action.
  applyCommand: (command) =>
    set((state) => {
      const prevScene = state.scene;
      const newScene = engineApplyCommand(prevScene, command, state.roomDimensions);
      // Guard: if engine returned the same scene reference (e.g. collision reject), skip snapshot
      if (newScene === prevScene) return {};
      return {
        scene: newScene,
        undoStack: [...state.undoStack.slice(-49), prevScene],
        redoStack: [],
      };
    }),

  // ─── Procedural layout generation ────────────────────────────────────────────
  // Triggered automatically when entering step 3 with an empty scene.
  generateLayout: () =>
    set((state) => {
      if (!state.layout) return {};
      const result = engineGenerateLayout(
        state.layout,
        state.roomDimensions,
        state.catalogProducts,
      );
      const newScene = {
        ...state.scene,
        items: result.items,
        zones: result.zones,
      };
      return {
        scene: newScene,
        undoStack: [...state.undoStack.slice(-49), state.scene],
        redoStack: [],
      };
    }),

  // ─── Undo ─────────────────────────────────────────────────────────────────────
  undo: () =>
    set((state) => {
      if (!state.undoStack.length) return {};
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        scene: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [state.scene, ...state.redoStack.slice(0, 49)],
      };
    }),

  // ─── Redo ─────────────────────────────────────────────────────────────────────
  redo: () =>
    set((state) => {
      if (!state.redoStack.length) return {};
      const next = state.redoStack[0];
      return {
        scene: next,
        undoStack: [...state.undoStack.slice(-49), state.scene],
        redoStack: state.redoStack.slice(1),
      };
    }),

  // ─── Backward-compatible item actions ────────────────────────────────────────
  // These delegate to applyCommand so existing call sites need minimal changes.

  addItem: (item) =>
    get().applyCommand({
      type:    COMMANDS.PLACE_ITEM,
      id:      item.id,
      product: {
        id:       item.productId,
        sku:      item.sku,
        name:     item.name,
        category: item.category,
        widthFt:  item.widthFt,
        depthFt:  item.depthFt,
        imageUrl:    item.imageUrl    ?? null,
        gltfUrl:     item.gltfUrl     ?? null,
        doorCount:   item.doorCount   ?? null,
        drawerCount: item.drawerCount ?? null,
      },
      position: { xFt: item.x, yFt: 0, zFt: item.y },
    }),

  removeItem: (id) =>
    get().applyCommand({ type: COMMANDS.REMOVE_ITEM, id }),

  moveItem: (id, x, y) =>
    get().applyCommand({
      type:     COMMANDS.MOVE_ITEM,
      id,
      position: { xFt: x, yFt: 0, zFt: y },
    }),

  clearCanvas: () => {
    get().applyCommand({ type: COMMANDS.CLEAR_SCENE });
    set({ selectedItemId: null });
  },

  // ─── Selection ────────────────────────────────────────────────────────────────
  selectedItemId: null,
  setSelectedItem: (id) => set({ selectedItemId: id }),

  // ─── Zoom ─────────────────────────────────────────────────────────────────────
  zoomLevel: 1.0,
  setZoom: (zoom) => set({ zoomLevel: Math.min(3.0, Math.max(0.4, zoom)) }),

  // ─── AI visualization ─────────────────────────────────────────────────────────
  showAiPanel: false,
  aiImageUrl:  null,
  aiLoading:   false,
  aiError:     null,
  aiPrompt:    null,
  setAiState:   (updates) => set(updates),
  openAiPanel:  () => set({ showAiPanel: true }),
  closeAiPanel: () => set({ showAiPanel: false }),

  // ─── View mode (2D Konva canvas vs 3D React Three Fiber scene) ───────────────
  viewMode: "3D",
  setViewMode: (mode) => set({ viewMode: mode }),

  // ─── 2D plan layer — Lower (base/tall) or Upper (wall cabs) ──────────────────
  planLayer: "lower",
  setPlanLayer: (layer) => set({ planLayer: layer }),

  // ─── Cabinet color selection ──────────────────────────────────────────────────
  // Each value: { id, name, code, finishFamily, swatchUrl, hex } | null
  upperCabinetColor: null,
  lowerCabinetColor: null,
  setUpperCabinetColor: (color) => set({ upperCabinetColor: color }),
  setLowerCabinetColor: (color) => set({ lowerCabinetColor: color }),

  // ─── Door style selection ─────────────────────────────────────────────────────
  // Value: { id, name, code, swatchUrl } | null  (from structures table)
  selectedDoorStyle:    null,
  setSelectedDoorStyle: (style) => set({ selectedDoorStyle: style }),

  // ─── Drawer style selection ───────────────────────────────────────────────────
  // Same structures list, stored independently so door ≠ drawer choices are separate
  selectedDrawerStyle:    null,
  setSelectedDrawerStyle: (style) => set({ selectedDrawerStyle: style }),

  // ─── Hardware / pull style selection ─────────────────────────────────────────
  // Value: { id, name, type } | null  (hardcoded in-memory list — no DB table needed)
  selectedHardware:    null,
  setSelectedHardware: (hw) => set({ selectedHardware: hw }),

  // ─── Countertop selection ─────────────────────────────────────────────────────
  // Value: { id, name, code, description, swatchUrl, hex } | null  (from colors table)
  selectedCountertop:    null,
  setSelectedCountertop: (ct) => set({ selectedCountertop: ct }),

  // ─── Flooring selection ───────────────────────────────────────────────────────
  // Value: { id, name, code, description, swatchUrl, hex } | null  (from colors table)
  selectedFlooring:    null,
  setSelectedFlooring: (fl) => set({ selectedFlooring: fl }),

  // ─── Scene graph (derived — synced by PlannerScene3D for AI/export use) ──────
  // Rebuilt from scene.items by PlannerScene3D via selectProjectedItems().
  sceneGraph: null,
  setSceneGraph: (graph) => set({ sceneGraph: graph }),
  updateCabinetInScene: (id, patch) =>
    set((state) => {
      if (!state.sceneGraph) return {};
      return {
        sceneGraph: {
          ...state.sceneGraph,
          cabinets: state.sceneGraph.cabinets.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        },
      };
    }),

  // ─── Camera state (saved for AI conditioning + scene restore) ────────────────
  cameraState: { position: [7, 8, 14], target: [7, 0, 5.5], mode: "perspective" },
  setCameraState: (cs) => set({ cameraState: cs }),

  // ─── Item rotation ────────────────────────────────────────────────────────────
  rotateItem: (id, yDeg) =>
    get().applyCommand({ type: COMMANDS.ROTATE_ITEM, id, yDeg }),

  // ─── Validation results (design rules — advisory only, never blocks actions) ─
  validationResults: [],
  setValidationResults: (results) => set({ validationResults: results }),

  // ─── Convenience getters ──────────────────────────────────────────────────────
  getPlacedCount: () => get().scene.items.length,
}));

export default usePlannerStore;
