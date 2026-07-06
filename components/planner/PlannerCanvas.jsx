"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import usePlannerStore from "@/store/plannerStore";
import { ftToPx, pxToFt } from "@/lib/planner/dimensionConverter";
import { snapItem } from "@/lib/planner/snap";
import { buildLayoutRuns } from "@/lib/planner/layoutPresets";
import { selectProjectedItems } from "@/lib/planner/selectors";

/** Color mapping by cabinet category */
const CATEGORY_COLORS = {
  "Base Cabinets":  { fill: "#d6d3d1", stroke: "#78716c", label: "#57534e" },
  "Wall Cabinets":  { fill: "#bfdbfe", stroke: "#3b82f6", label: "#1d4ed8" },
  "Tall Units":     { fill: "#d1fae5", stroke: "#10b981", label: "#065f46" },
  Appliances:       { fill: "#fde68a", stroke: "#f59e0b", label: "#92400e" },
  Sink:             { fill: "#bae6fd", stroke: "#0284c7", label: "#075985" },
  Range:            { fill: "#fed7aa", stroke: "#ea580c", label: "#9a3412" },
  default:          { fill: "#e7e5e4", stroke: "#a8a29e", label: "#57534e" },
};

const GRID_COLOR    = "#e7e5e4";
const ROOM_FILL     = "#fafaf9";
const ROOM_STROKE   = "#78716c";
const SELECTED_RING = "#0ea5e9";

/** Padding around the room in pixels */
const CANVAS_PADDING = 40;

function getColors(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
}

export default function PlannerCanvas({ onDropRef }) {
  const containerRef  = useRef(null);
  const lastPinchDist = useRef(0);
  const [size, setSize]   = useState({ width: 800, height: 600 });

  const layout         = usePlannerStore((s) => s.layout);
  const dims           = usePlannerStore((s) => s.roomDimensions);
  // Item-level selector: only re-renders when items array reference changes,
  // not on any other scene sub-key change (Feature 6 perf optimization).
  const sceneItems     = usePlannerStore((s) => s.scene.items);
  const placedItems    = useMemo(() => selectProjectedItems({ items: sceneItems }), [sceneItems]);
  const selectedItemId = usePlannerStore((s) => s.selectedItemId);
  const zoomLevel      = usePlannerStore((s) => s.zoomLevel);
  const moveItem       = usePlannerStore((s) => s.moveItem);
  const removeItem     = usePlannerStore((s) => s.removeItem);
  const rotateItem     = usePlannerStore((s) => s.rotateItem);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);
  const setZoom        = usePlannerStore((s) => s.setZoom);
  const planLayer      = usePlannerStore((s) => s.planLayer);
  const setPlanLayer   = usePlannerStore((s) => s.setPlanLayer);

  // Currently-selected item (for rotation value)
  const selectedItem = useMemo(
    () => placedItems.find((i) => i.id === selectedItemId),
    [placedItems, selectedItemId]
  );

  // Filter to the active plan layer for 2D display only
  const visibleItems = useMemo(() => {
    if (planLayer === "upper") {
      return placedItems.filter((item) => item.category === "Wall Cabinets");
    }
    return placedItems.filter((item) => item.category !== "Wall Cabinets");
  }, [placedItems, planLayer]);

  const roomW = dims.width;
  const roomL = dims.length;

  // Responsive canvas sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.max(width, 200), height: Math.max(height, 200) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-fit: compute zoom so the room fills the canvas nicely
  const autoZoom = useMemo(() => {
    const roomPxW = roomW * 60 + CANVAS_PADDING * 2;
    const roomPxL = roomL * 60 + CANVAS_PADDING * 2;
    const fitZoom = Math.min(
      size.width  / roomPxW,
      size.height / roomPxL,
      1.5
    );
    return Math.max(fitZoom, 0.3);
  }, [size.width, size.height, roomW, roomL]);

  // Scale: canvas px per foot
  const scale = 60 * zoomLevel * autoZoom;

  // Room rect in pixels
  const roomPxW = roomW * scale;
  const roomPxL = roomL * scale;

  // Offset to center room on canvas
  const offsetX = Math.max((size.width  - roomPxW) / 2, CANVAS_PADDING);
  const offsetY = Math.max((size.height - roomPxL) / 2, CANVAS_PADDING);

  // Expose drop handler to parent (PlannerShell) via ref
  const handleExternalDrop = useCallback((pointerX, pointerY, product) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX  = pointerX - rect.left  - offsetX;
    const relY  = pointerY - rect.top   - offsetY;
    const rawX  = pxToFt(relX, 1) / (zoomLevel * autoZoom);
    const rawY  = pxToFt(relY, 1) / (zoomLevel * autoZoom);
    const { x, y } = snapItem(rawX - product.widthFt / 2, rawY - product.depthFt / 2, product.widthFt, product.depthFt, roomW, roomL);
    return { x, y };
  }, [offsetX, offsetY, zoomLevel, autoZoom, roomW, roomL]);

  useEffect(() => {
    if (onDropRef) onDropRef.current = handleExternalDrop;
  }, [handleExternalDrop, onDropRef]);

  // Grid lines — horizontal and vertical
  const gridLines = useMemo(() => {
    const lines = [];
    for (let gx = 0; gx <= roomW; gx++) {
      lines.push(
        <Line
          key={`vg-${gx}`}
          points={[gx * scale, 0, gx * scale, roomPxL]}
          stroke={gx === 0 || gx === roomW ? ROOM_STROKE : GRID_COLOR}
          strokeWidth={gx === 0 || gx === roomW ? 1.5 : 0.5}
          listening={false}
        />
      );
    }
    for (let gy = 0; gy <= roomL; gy++) {
      lines.push(
        <Line
          key={`hg-${gy}`}
          points={[0, gy * scale, roomPxW, gy * scale]}
          stroke={gy === 0 || gy === roomL ? ROOM_STROKE : GRID_COLOR}
          strokeWidth={gy === 0 || gy === roomL ? 1.5 : 0.5}
          listening={false}
        />
      );
    }
    return lines;
  }, [roomW, roomL, roomPxW, roomPxL, scale]);

  // Grid ft labels on edges
  const gridLabels = useMemo(() => {
    const labels = [];
    const step = Math.ceil(1 / autoZoom / zoomLevel); // skip labels when zoomed out
    for (let gx = 0; gx <= roomW; gx += step) {
      labels.push(
        <Text
          key={`xl-${gx}`}
          x={gx * scale - 8}
          y={-14}
          text={`${gx}ft`}
          fontSize={9}
          fill="#a8a29e"
          listening={false}
        />
      );
    }
    for (let gy = 0; gy <= roomL; gy += step) {
      labels.push(
        <Text
          key={`yl-${gy}`}
          x={-24}
          y={gy * scale - 6}
          text={`${gy}ft`}
          fontSize={9}
          fill="#a8a29e"
          listening={false}
        />
      );
    }
    return labels;
  }, [roomW, roomL, scale, autoZoom, zoomLevel]);

  // Handle drag end of placed items
  // node.x()/node.y() is the group center (due to center-pivot offsetX/offsetY)
  const handleDragEnd = useCallback((e, item) => {
    const node     = e.target;
    const centerX  = pxToFt(node.x(), 1) / (zoomLevel * autoZoom);
    const centerY  = pxToFt(node.y(), 1) / (zoomLevel * autoZoom);
    const rawX     = centerX - item.widthFt  / 2;
    const rawY     = centerY - item.depthFt  / 2;
    const { x, y } = snapItem(rawX, rawY, item.widthFt, item.depthFt, roomW, roomL);
    // Snap node center back to snapped position
    node.x(ftToPx(x + item.widthFt  / 2) * zoomLevel * autoZoom);
    node.y(ftToPx(y + item.depthFt  / 2) * zoomLevel * autoZoom);
    moveItem(item.id, x, y);
  }, [moveItem, roomW, roomL, zoomLevel, autoZoom]);

  // Keyboard: Delete = remove selected · R = rotate selected 90°
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        removeItem(selectedItemId);
      }
      if ((e.key === "r" || e.key === "R") && selectedItemId) {
        const state    = usePlannerStore.getState();
        const items    = selectProjectedItems(state.scene);
        const current  = items.find((i) => i.id === selectedItemId)?.rotation || 0;
        rotateItem(selectedItemId, (current + 90) % 360);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedItemId, removeItem, rotateItem]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const delta     = e.evt.deltaY > 0 ? -0.08 : 0.08;
    const newZoom   = Math.min(3.0, Math.max(0.4, zoomLevel + delta));
    setZoom(newZoom);
  }, [zoomLevel, setZoom]);

  // Pinch-to-zoom (two-finger gesture on mobile)
  const handleTouchMove = useCallback((e) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) { lastPinchDist.current = 0; return; }
    e.evt.preventDefault();
    const dx   = touches[0].clientX - touches[1].clientX;
    const dy   = touches[0].clientY - touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastPinchDist.current > 0) {
      const delta = (dist - lastPinchDist.current) * 0.005;
      setZoom(Math.min(3.0, Math.max(0.4, zoomLevel + delta)));
    }
    lastPinchDist.current = dist;
  }, [zoomLevel, setZoom]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = 0;
  }, []);

  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      setSelectedItem(null);
    }
  }, [setSelectedItem]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-stone-100"
      style={{ minHeight: 0, touchAction: "none" }}
    >
      {/* Layout badge + plan layer toggle */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {layout && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-stone-200 text-xs text-stone-600 font-medium shadow-sm">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
            </svg>
            {layout} · {roomW}ft × {roomL}ft
          </div>
        )}
        {/* Lower / Upper plan layer toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white border border-stone-200 shadow-sm">
          {["lower", "upper"].map((id) => (
            <button
              key={id}
              onClick={() => setPlanLayer(id)}
              className={[
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all",
                planLayer === id
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700",
              ].join(" ")}
            >
              {id === "lower" ? "Lower" : "Upper"}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-16 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom(Math.min(3.0, zoomLevel + 0.15))}
          className="w-11 h-11 rounded-lg bg-white/90 backdrop-blur-sm border border-stone-200 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-stone-900 transition text-lg font-light"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(Math.max(0.4, zoomLevel - 0.15))}
          className="w-11 h-11 rounded-lg bg-white/90 backdrop-blur-sm border border-stone-200 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-stone-900 transition text-lg font-light"
          aria-label="Zoom out"
        >−</button>
      </div>

      {/* Empty state */}
      {visibleItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-2 text-stone-400">
            <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium opacity-60">
              {planLayer === "upper"
                ? "No wall cabinets placed — drag from the sidebar"
                : "Drag cabinets from the sidebar to place them"}
            </p>
          </div>
        </div>
      )}

      {/* Konva Stage */}
      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Layer>
          {/* Room background + grid */}
          <Group x={offsetX} y={offsetY}>
            <Rect
              x={0}
              y={0}
              width={roomPxW}
              height={roomPxL}
              fill={ROOM_FILL}
              stroke={ROOM_STROKE}
              strokeWidth={2}
              shadowBlur={8}
              shadowColor="rgba(0,0,0,0.08)"
              shadowOffset={{ x: 2, y: 2 }}
            />
            {gridLines}
            {gridLabels}

            {/* Layout cabinet run zones — visual background showing the chosen layout */}
            {buildLayoutRuns(layout, { width: roomW, length: roomL })
              .filter((run) =>
                planLayer === "upper" ? run.type === "upper" : run.type !== "upper"
              )
              .map((run) => {
              const isUpper = run.type === "upper";
              const rx = run.x2d * scale;
              const ry = run.y2d * scale;
              const rw = run.widthFt * scale;
              const rh = run.depthFt * scale;
              return (
                <Group key={run.id} listening={false}>
                  <Rect
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={isUpper ? "rgba(147,197,253,0.18)" : "rgba(180,168,155,0.28)"}
                    stroke={isUpper ? "#93c4fd" : "#c0b4a8"}
                    strokeWidth={1}
                    dash={[5, 4]}
                    cornerRadius={2}
                  />
                  {rw > 48 && rh > 14 && (
                    <Text
                      x={rx + 5}
                      y={ry + rh / 2 - 5}
                      text={
                        run.type === "island"    ? "Island"     :
                        run.type === "peninsula" ? "Peninsula"  :
                        run.type === "upper"     ? "Upper Cabs" :
                        "Base Run"
                      }
                      fontSize={9}
                      fill={isUpper ? "#60a5fa" : "#a09080"}
                    />
                  )}
                </Group>
              );
            })}

            {/* Placed items (filtered to active plan layer) */}
            {visibleItems.map((item) => {
              const colors   = getColors(item.category);
              const isSelected = selectedItemId === item.id;
              const itemPxW  = ftToPx(item.widthFt) * zoomLevel * autoZoom;
              const itemPxH  = ftToPx(item.depthFt) * zoomLevel * autoZoom;
              const itemX    = ftToPx(item.x) * zoomLevel * autoZoom;
              const itemY    = ftToPx(item.y) * zoomLevel * autoZoom;
              const fontSize = Math.max(8, Math.min(11, itemPxW / 6));

              return (
                <Group
                  key={item.id}
                  x={itemX + itemPxW / 2}
                  y={itemY + itemPxH / 2}
                  offsetX={itemPxW / 2}
                  offsetY={itemPxH / 2}
                  rotation={item.rotation || 0}
                  draggable
                  onClick={(e)    => { e.cancelBubble = true; setSelectedItem(item.id); }}
                  onTap={(e)      => { e.cancelBubble = true; setSelectedItem(item.id); }}
                  onDblClick={(e) => { e.cancelBubble = true; removeItem(item.id); }}
                  onDblTap={(e)   => { e.cancelBubble = true; removeItem(item.id); }}
                  onDragEnd={(e) => handleDragEnd(e, item)}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <Rect
                      x={-2}
                      y={-2}
                      width={itemPxW + 4}
                      height={itemPxH + 4}
                      fill="transparent"
                      stroke={SELECTED_RING}
                      strokeWidth={2}
                      cornerRadius={3}
                      listening={false}
                    />
                  )}
                  {/* Cabinet box */}
                  <Rect
                    width={itemPxW}
                    height={itemPxH}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={1.5}
                    cornerRadius={2}
                  />
                  {/* Name label */}
                  {itemPxW > 28 && itemPxH > 16 && (
                    <Text
                      x={4}
                      y={itemPxH / 2 - fontSize * 0.7}
                      width={itemPxW - 8}
                      text={item.name}
                      fontSize={fontSize}
                      fill={colors.label}
                      ellipsis
                      wrap="none"
                      listening={false}
                    />
                  )}
                  {/* Dimension label */}
                  {itemPxW > 36 && itemPxH > 28 && (
                    <Text
                      x={4}
                      y={itemPxH / 2 + fontSize * 0.4}
                      width={itemPxW - 8}
                      text={`${item.widthFt}×${item.depthFt}ft`}
                      fontSize={Math.max(7, fontSize - 2)}
                      fill={colors.label}
                      opacity={0.65}
                      ellipsis
                      wrap="none"
                      listening={false}
                    />
                  )}
                  {/* Sink: basin outline + faucet dot */}
                  {item.category === "Sink" && itemPxW > 24 && itemPxH > 18 && (
                    <>
                      <Rect
                        x={itemPxW * 0.15} y={itemPxH * 0.15}
                        width={itemPxW * 0.7} height={itemPxH * 0.55}
                        fill="transparent" stroke={colors.stroke} strokeWidth={1}
                        cornerRadius={2} listening={false}
                      />
                      {itemPxW > 40 && (
                        <Circle
                          x={itemPxW / 2} y={itemPxH * 0.06}
                          radius={2.5} fill={colors.stroke} listening={false}
                        />
                      )}
                    </>
                  )}
                  {/* Range: 4 burner circles */}
                  {item.category === "Range" && itemPxW > 28 && itemPxH > 24 && (
                    <>
                      {[[0.28, 0.3],[0.72, 0.3],[0.28, 0.72],[0.72, 0.72]].map(([rx, ry], i) => (
                        <Circle
                          key={i}
                          x={itemPxW * rx} y={itemPxH * ry}
                          radius={Math.min(itemPxW, itemPxH) * 0.12}
                          fill="transparent" stroke={colors.stroke} strokeWidth={1}
                          listening={false}
                        />
                      ))}
                    </>
                  )}
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>

      {/* Selected item hint + rotate button */}
      {selectedItemId && (
        <div className="absolute bottom-20 sm:bottom-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800/80 backdrop-blur-sm text-white text-xs font-medium shadow">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">Drag to move · Dbl-click or Delete to remove</span>
          <span className="sm:hidden">Drag · Double-tap to remove</span>
          <span className="text-stone-400 hidden sm:inline">·</span>
          <button
            onClick={() => rotateItem(selectedItemId, ((selectedItem?.rotation || 0) + 90) % 360)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 transition text-white text-xs font-semibold"
            title="Rotate 90° (R)"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.83-4.83M20 15a9 9 0 01-14.83 4.83" />
            </svg>
            <span className="hidden sm:inline">Rotate</span>
          </button>
        </div>
      )}
    </div>
  );
}
