"use client";

import { useEffect, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";

import usePlannerStore from "@/store/plannerStore";
import { buildSceneGraph } from "@/lib/planner/sceneBuilder";
import { selectProjectedItems } from "@/lib/planner/selectors";

import Scene3DRoom     from "./Scene3DRoom";
import Scene3DCabinet  from "./Scene3DCabinet";
import Scene3DFixture  from "./Scene3DFixture";
import Scene3DLighting from "./Scene3DLighting";
import Scene3DControls from "./Scene3DControls";

/**
 * PlannerScene3D — React Three Fiber canvas for the kitchen planner.
 *
 * Dynamically imported in PlannerShell to avoid SSR issues (same pattern as
 * the existing PlannerCanvas Konva component).
 *
 * Reads from the same Zustand store as the 2D canvas so any cabinet placed
 * in 2D mode appears immediately here when the user switches to 3D.
 */
export default function PlannerScene3D({ primaryColor = "#1C1917" }) {
  const layout      = usePlannerStore((s) => s.layout);
  const dims        = usePlannerStore((s) => s.roomDimensions);
  const scene       = usePlannerStore((s) => s.scene);
  const setSceneGraph   = usePlannerStore((s) => s.setSceneGraph);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);

  // Rebuild scene graph from authoritative scene.items via the 2D projection
  // selector — keeps buildSceneGraph's existing API fully unchanged.
  const sceneGraph = useMemo(
    () => buildSceneGraph(layout, dims, selectProjectedItems(scene)),
    [layout, dims, scene]
  );

  // Sync derived scene graph into the store (for AI conditioning, export, etc.)
  useEffect(() => {
    setSceneGraph(sceneGraph);
  }, [sceneGraph, setSceneGraph]);

  const { widthFt: W, lengthFt: L } = sceneGraph.room;

  return (
    <div className="flex-1 relative overflow-hidden bg-stone-200" style={{ minHeight: 0, touchAction: "none" }}>
      {/* Layout + room badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-300 text-xs text-stone-800 font-semibold shadow-md pointer-events-none">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        {layout} · {dims.width}ft × {dims.length}ft · 3D View
      </div>

      {/* Hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-[10px] text-stone-600 bg-white px-3 py-1 rounded-full border border-stone-300 shadow-sm font-medium">
          <span className="hidden sm:inline">Drag to orbit · Scroll to zoom · Right-click to pan</span>
          <span className="sm:hidden">Drag to orbit · Pinch to zoom</span>
        </p>
      </div>

      {/* Drag hint — only shown when no products placed yet */}
      {scene.items.length === 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800/70 backdrop-blur-sm text-stone-200 text-xs font-medium shadow">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Drag products from the sidebar to place them in your kitchen
          </div>
        </div>
      )}

      <Canvas
        shadows
        camera={{
          fov:      55,
          near:     0.1,
          far:      200,
          position: sceneGraph.camera.position,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#e8e5e1" }}
        onClick={(e) => {
          // Deselect when clicking empty space
          if (e.object?.type === undefined || e.object === undefined) {
            setSelectedItem(null);
          }
        }}
        onPointerMissed={() => setSelectedItem(null)}
      >
        <Suspense fallback={null}>
          <Scene3DLighting sceneGraph={sceneGraph} />
          <Scene3DControls sceneGraph={sceneGraph} />

          {/* Room shell + layout placeholder runs (hidden once real items are placed) */}
          <Scene3DRoom
            room={sceneGraph.room}
            layout={sceneGraph.meta?.layoutType}
            hasItems={scene.items.length > 0}
          />

          {/* Contact shadows on the floor */}
          <ContactShadows
            position={[W / 2, 0.01, L / 2]}
            width={Math.max(W, L) * 1.5}
            height={Math.max(W, L) * 1.5}
            far={6}
            blur={1.5}
            opacity={0.35}
            color="#292524"
          />

          {/* All placed cabinets and fixtures */}
          {sceneGraph.cabinets.map((cab) =>
            cab.category === "Sink" || cab.category === "Range"
              ? <Scene3DFixture key={cab.id} fixture={cab} primaryColor={primaryColor} />
              : <Scene3DCabinet
                  key={cab.id}
                  cabinet={cab}
                  roomWidthFt={sceneGraph.room.widthFt}
                  roomLengthFt={sceneGraph.room.lengthFt}
                  primaryColor={primaryColor}
                />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
