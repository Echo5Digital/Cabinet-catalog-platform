"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";

import usePlannerStore from "@/store/plannerStore";
import { buildSceneGraph } from "@/lib/planner/sceneBuilder";
import { selectProjectedItems } from "@/lib/planner/selectors";

import Scene3DRoom          from "./Scene3DRoom";
import Scene3DCabinet       from "./Scene3DCabinet";
import Scene3DFixture       from "./Scene3DFixture";
import Scene3DLighting      from "./Scene3DLighting";
import Scene3DControls      from "./Scene3DControls";
import WalkthroughControls  from "./WalkthroughControls";

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
  // Item-level selector: only re-renders when items array reference changes,
  // not on any other scene sub-key change (Feature 6 perf optimization).
  const sceneItems      = usePlannerStore((s) => s.scene.items);
  const setSceneGraph   = usePlannerStore((s) => s.setSceneGraph);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);

  // Selection/style values resolved once here and passed down as plain props
  // so each Scene3DCabinet's memo comparator can actually skip re-rendering
  // unrelated cabinets when only the selection or a style changes.
  const selectedItemId      = usePlannerStore((s) => s.selectedItemId);
  const upperCabinetColor   = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor   = usePlannerStore((s) => s.lowerCabinetColor);
  const selectedCountertop  = usePlannerStore((s) => s.selectedCountertop);
  const selectedHardware    = usePlannerStore((s) => s.selectedHardware);
  const selectedDoorStyle   = usePlannerStore((s) => s.selectedDoorStyle);
  const selectedDrawerStyle = usePlannerStore((s) => s.selectedDrawerStyle);

  const doorStyleId   = selectedDoorStyle?.id   ?? "Shaker";
  const drawerStyleId = selectedDrawerStyle?.id ?? "Shaker";
  const hardwareType  = selectedHardware?.type  ?? "bar";
  const countertopHex = selectedCountertop?.hex ?? "#c8c0b4";

  // Walkthrough mode toggle (first-person vs orbit)
  const [walkthrough, setWalkthrough] = useState(false);

  // Rebuild scene graph from authoritative scene.items via the 2D projection
  // selector — keeps buildSceneGraph's existing API fully unchanged.
  const sceneGraph = useMemo(
    () => buildSceneGraph(layout, dims, selectProjectedItems({ items: sceneItems })),
    [layout, dims, sceneItems]
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
        {layout} · {dims.width}ft × {dims.length}ft · {walkthrough ? "Walkthrough" : "3D View"}
      </div>

      {/* Walkthrough toggle button — desktop only (top-right) */}
      <div className="absolute top-3 right-3 z-10 hidden sm:flex gap-2">
        <button
          onClick={() => setWalkthrough((v) => !v)}
          title={walkthrough ? "Exit walkthrough (Escape)" : "Enter first-person walkthrough"}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all duration-150",
            walkthrough
              ? "bg-stone-900 text-white border-stone-700 hover:bg-stone-700"
              : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50 hover:border-stone-400",
          ].join(" ")}
        >
          {walkthrough ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit Walkthrough
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Walkthrough
            </>
          )}
        </button>
      </div>

      {/* Hints — change based on mode */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        {walkthrough ? (
          <p className="text-[10px] text-white bg-stone-900/70 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm font-medium">
            W/A/S/D to move · Click+drag to look · Exit button to return
          </p>
        ) : (
          <p className="text-[10px] text-stone-600 bg-white px-3 py-1 rounded-full border border-stone-300 shadow-sm font-medium">
            <span className="hidden sm:inline">Drag to orbit · Scroll to zoom · Right-click to pan</span>
            <span className="sm:hidden">Drag to orbit · Pinch to zoom</span>
          </p>
        )}
      </div>

      {/* Drag hint — only shown when no products placed yet */}
      {sceneItems.length === 0 && !walkthrough && (
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
          fov:      walkthrough ? 80 : 55,
          near:     0.1,
          far:      200,
          position: sceneGraph.camera.position,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#e8e5e1", touchAction: "none", cursor: walkthrough ? "crosshair" : "grab" }}
        // raycaster.params tune: larger points/line threshold helps mobile touch
        raycaster={{ params: { Points: { threshold: 0.1 }, Line: { threshold: 0.1 } } }}
        onPointerMissed={() => !walkthrough && setSelectedItem(null)}
      >
        <Suspense fallback={null}>
          <Scene3DLighting sceneGraph={sceneGraph} />

          {/* Swap controls based on mode */}
          {walkthrough ? (
            <WalkthroughControls
              roomWidthFt={W}
              roomLengthFt={L}
              active={walkthrough}
            />
          ) : (
            <Scene3DControls sceneGraph={sceneGraph} />
          )}

          {/* Room shell + layout placeholder runs (hidden once real items are placed) */}
          <Scene3DRoom
            room={sceneGraph.room}
            layout={sceneGraph.meta?.layoutType}
            hasItems={sceneItems.length > 0}
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
            cab.category === "Sink" || cab.category === "Range" || cab.category === "Refrigerator"
              ? <Scene3DFixture key={cab.id} fixture={cab} primaryColor={primaryColor} />
              : <Scene3DCabinet
                  key={cab.id}
                  cabinet={cab}
                  roomWidthFt={sceneGraph.room.widthFt}
                  roomLengthFt={sceneGraph.room.lengthFt}
                  primaryColor={primaryColor}
                  isSelected={selectedItemId === cab.id}
                  setSelectedItem={setSelectedItem}
                  cabinetColorHex={
                    cab.category === "Wall Cabinets"
                      ? (upperCabinetColor?.hex ?? null)
                      : (lowerCabinetColor?.hex ?? null)
                  }
                  countertopHex={countertopHex}
                  doorStyleId={doorStyleId}
                  drawerStyleId={drawerStyleId}
                  hardwareType={hardwareType}
                />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
