"use client";

import { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import PlannerHeader from "./PlannerHeader";
import LayoutSelector from "./LayoutSelector";
import RoomDimensionForm from "./RoomDimensionForm";
import ProductSidebar from "./ProductSidebar";
import PlannerToolbar from "./PlannerToolbar";
import AiPreviewPanel from "./AiPreviewPanel";
import usePlannerStore from "@/store/plannerStore";

// Dynamically import the Konva canvas to avoid SSR issues
const PlannerCanvas = dynamic(() => import("./PlannerCanvas"), { ssr: false });

/** Droppable wrapper for the canvas area — dnd-kit hook must be inside DndContext */
function CanvasDropArea({ canvasDropRef, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "planner-canvas-drop" });
  return (
    <div
      ref={setNodeRef}
      className={[
        "flex-1 flex flex-col overflow-hidden min-w-0 relative transition-colors duration-100",
        isOver ? "ring-2 ring-inset ring-blue-300/50" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Generate a unique placement id */
function newId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PlannerShell({ tenant, initialProducts = [] }) {
  const primaryColor = tenant?.primary_color || "#1C1917";

  const step        = usePlannerStore((s) => s.step);
  const layout      = usePlannerStore((s) => s.layout);
  const dims        = usePlannerStore((s) => s.roomDimensions);
  const addItem     = usePlannerStore((s) => s.addItem);
  const showAiPanel = usePlannerStore((s) => s.showAiPanel);
  const openAiPanel = usePlannerStore((s) => s.openAiPanel);
  const closeAiPanel = usePlannerStore((s) => s.closeAiPanel);
  const setAiState  = usePlannerStore((s) => s.setAiState);
  const placedItems = usePlannerStore((s) => s.placedItems);
  const aiLoading   = usePlannerStore((s) => s.aiLoading);

  // Sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Ref to canvas drop resolver (set by PlannerCanvas via onDropRef)
  const canvasDropRef = useRef(null);

  // Active drag state (for DragOverlay ghost)
  const [activeDrag, setActiveDrag] = useState(null);

  // dnd-kit sensors — support both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  // Handle drag start: record which product is being dragged
  const handleDragStart = useCallback((event) => {
    if (event.active?.data?.current?.type === "product") {
      setActiveDrag(event.active.data.current.product);
    }
  }, []);

  // Handle drag end: if dropped over the canvas, place the item
  const handleDragEnd = useCallback((event) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || over.id !== "planner-canvas-drop" || !active?.data?.current?.product) return;

    const product  = active.data.current.product;
    const { clientX, clientY } = event.activatorEvent;
    // Walk up to find final pointer position (for touch, use activatorEvent or nativeEvent)
    const pointerX = event.delta
      ? clientX + event.delta.x
      : clientX;
    const pointerY = event.delta
      ? clientY + event.delta.y
      : clientY;

    // Use canvas resolver to convert pointer position → room coordinates
    const pos = canvasDropRef.current
      ? canvasDropRef.current(pointerX, pointerY, product)
      : { x: 0, y: 0 };

    addItem({
      id:        newId(),
      productId: product.id,
      sku:       product.sku,
      name:      product.name,
      category:  product.category,
      widthFt:   product.widthFt  || 2,
      depthFt:   product.depthFt  || 2,
      imageUrl:  product.imageUrl || null,
      x:         pos?.x ?? 0,
      y:         pos?.y ?? 0,
    });
  }, [addItem]);

  // AI generation handler
  const handleGenerateAI = useCallback(async () => {
    if (aiLoading || placedItems.length === 0) return;

    setAiState({ aiLoading: true, aiError: null, aiImageUrl: null });
    openAiPanel();

    try {
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout,
          roomWidth:     dims.width,
          roomLength:    dims.length,
          ceilingHeight: dims.height,
          items:         placedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setAiState({
        aiLoading:  false,
        aiImageUrl: data.imageUrl,
        aiPrompt:   data.prompt,
        aiError:    null,
      });
    } catch (err) {
      setAiState({
        aiLoading:  false,
        aiError:    err.message || "An error occurred. Please try again.",
      });
    }
  }, [aiLoading, placedItems, layout, dims, setAiState, openAiPanel]);

  // ─── Step 1 — Layout Selection ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col">
        <PlannerHeader tenant={tenant} />
        <div className="flex-1 pt-[64px] sm:pt-[76px]">
          <LayoutSelector primaryColor={primaryColor} />
        </div>
      </div>
    );
  }

  // ─── Step 2 — Room Dimensions ─────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col">
        <PlannerHeader tenant={tenant} />
        <div className="flex-1 pt-[64px] sm:pt-[76px]">
          <RoomDimensionForm primaryColor={primaryColor} />
        </div>
      </div>
    );
  }

  // ─── Step 3 — Canvas + AI ────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PlannerHeader tenant={tenant} />

      {/* Main body below fixed header */}
      <div className="flex-1 flex overflow-hidden pt-[64px] sm:pt-[76px]">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left: Product Sidebar */}
          <ProductSidebar
            products={initialProducts}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />

          {/* Center: Canvas area (droppable — fills remaining space) */}
          <CanvasDropArea canvasDropRef={canvasDropRef}>
            {/* Sidebar toggle button — desktop */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-5 h-10 bg-white border border-stone-200 rounded-r-lg shadow-sm text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition"
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg
                className={`w-3 h-3 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Canvas (Konva — dynamically imported, no SSR) */}
            <PlannerCanvas onDropRef={canvasDropRef} />

            {/* Bottom toolbar */}
            <PlannerToolbar
              onGenerateAI={handleGenerateAI}
              primaryColor={primaryColor}
            />
          </CanvasDropArea>

          {/* Right: AI Preview Panel (conditional) */}
          {showAiPanel && (
            <AiPreviewPanel
              onRegenerate={handleGenerateAI}
              onClose={closeAiPanel}
            />
          )}

          {/* DragOverlay — ghost preview while dragging from sidebar */}
          <DragOverlay>
            {activeDrag ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-stone-200 shadow-xl opacity-90 pointer-events-none w-48">
                {activeDrag.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeDrag.imageUrl} alt="" className="w-10 h-10 object-contain rounded-lg bg-stone-50" draggable={false} />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-800 truncate">{activeDrag.name}</p>
                  <p className="text-[10px] text-stone-500">{activeDrag.widthFt}ft × {activeDrag.depthFt}ft</p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
