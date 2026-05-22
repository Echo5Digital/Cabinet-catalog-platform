import { create } from "zustand";

/**
 * Isolated planner store — does NOT interact with any existing app state.
 * All planner state lives here and is reset on page navigation.
 */
const usePlannerStore = create((set, get) => ({
  // ─── Step navigation ─────────────────────────────────────────────────────────
  step: 1, // 1 = layout, 2 = room dimensions, 3 = canvas + AI

  setStep: (step) => set({ step }),

  // ─── Layout selection ─────────────────────────────────────────────────────────
  layout: null, // 'Straight' | 'L-Shape' | 'U-Shape' | 'Parallel' | 'Island' | 'G-Shape'

  setLayout: (layout) => set({ layout }),

  // ─── Room dimensions (in feet) ───────────────────────────────────────────────
  roomDimensions: { width: 14, length: 11, height: 9 },

  setDimensions: (dims) =>
    set((state) => ({ roomDimensions: { ...state.roomDimensions, ...dims } })),

  // ─── Placed items on canvas ───────────────────────────────────────────────────
  // Each item: { id, productId, sku, name, category, widthFt, depthFt, x, y, imageUrl }
  // x, y are in feet from top-left of room
  placedItems: [],

  addItem: (item) =>
    set((state) => ({
      placedItems: [...state.placedItems, item],
    })),

  removeItem: (id) =>
    set((state) => ({
      placedItems: state.placedItems.filter((item) => item.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    })),

  moveItem: (id, x, y) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) =>
        item.id === id ? { ...item, x, y } : item
      ),
    })),

  clearCanvas: () => set({ placedItems: [], selectedItemId: null }),

  // ─── Selection ────────────────────────────────────────────────────────────────
  selectedItemId: null,

  setSelectedItem: (id) => set({ selectedItemId: id }),

  // ─── Zoom ─────────────────────────────────────────────────────────────────────
  zoomLevel: 1.0,

  setZoom: (zoom) => set({ zoomLevel: Math.min(3.0, Math.max(0.4, zoom)) }),

  // ─── AI visualization ─────────────────────────────────────────────────────────
  showAiPanel: false,
  aiImageUrl: null,
  aiLoading: false,
  aiError: null,
  aiPrompt: null,

  setAiState: (updates) => set(updates),

  openAiPanel: () => set({ showAiPanel: true }),
  closeAiPanel: () => set({ showAiPanel: false }),

  // ─── View mode (2D Konva canvas vs 3D React Three Fiber scene) ───────────────
  viewMode: "3D",             // "2D" | "3D" — default 3D so layout is shown immediately
  setViewMode: (mode) => set({ viewMode: mode }),

  // ─── Scene graph (derived 3D representation of the current planner state) ────
  // Rebuilt via buildSceneGraph() whenever placedItems or room dims change.
  sceneGraph: null,
  setSceneGraph: (graph) => set({ sceneGraph: graph }),
  updateCabinetInScene: (id, patch) =>
    set((state) => {
      if (!state.sceneGraph) return {};
      return {
        sceneGraph: {
          ...state.sceneGraph,
          cabinets: state.sceneGraph.cabinets.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        },
      };
    }),

  // ─── Camera state (saved for AI conditioning + scene restore) ────────────────
  cameraState: { position: [7, 8, 14], target: [7, 0, 5.5], mode: "perspective" },
  setCameraState: (cs) => set({ cameraState: cs }),

  // ─── Item rotation (degrees, Y-axis — 0 / 90 / 180 / 270) ───────────────────
  rotateItem: (id, yDeg) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) =>
        item.id === id ? { ...item, rotation: yDeg } : item
      ),
    })),

  // ─── Convenience getters ──────────────────────────────────────────────────────
  getPlacedCount: () => get().placedItems.length,
}));

export default usePlannerStore;
