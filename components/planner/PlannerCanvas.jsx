"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";
import usePlannerStore from "@/store/plannerStore";
import { ftToPx, pxToFt } from "@/lib/planner/dimensionConverter";
import { snapItem } from "@/lib/planner/snap";

/** Color mapping by cabinet category */
const CATEGORY_COLORS = {
  "Base Cabinets":  { fill: "#d6d3d1", stroke: "#78716c", label: "#57534e" },
  "Wall Cabinets":  { fill: "#bfdbfe", stroke: "#3b82f6", label: "#1d4ed8" },
  "Tall Units":     { fill: "#d1fae5", stroke: "#10b981", label: "#065f46" },
  Appliances:       { fill: "#fde68a", stroke: "#f59e0b", label: "#92400e" },
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
  const containerRef = useRef(null);
  const [size, setSize]   = useState({ width: 800, height: 600 });

  const layout         = usePlannerStore((s) => s.layout);
  const dims           = usePlannerStore((s) => s.roomDimensions);
  const placedItems    = usePlannerStore((s) => s.placedItems);
  const selectedItemId = usePlannerStore((s) => s.selectedItemId);
  const zoomLevel      = usePlannerStore((s) => s.zoomLevel);
  const moveItem       = usePlannerStore((s) => s.moveItem);
  const removeItem     = usePlannerStore((s) => s.removeItem);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);
  const setZoom        = usePlannerStore((s) => s.setZoom);

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
  const handleDragEnd = useCallback((e, item) => {
    const node   = e.target;
    const rawX   = pxToFt(node.x(), 1) / (zoomLevel * autoZoom);
    const rawY   = pxToFt(node.y(), 1) / (zoomLevel * autoZoom);
    const { x, y } = snapItem(rawX, rawY, item.widthFt, item.depthFt, roomW, roomL);
    // Snap node back to grid position
    node.x(ftToPx(x) * zoomLevel * autoZoom);
    node.y(ftToPx(y) * zoomLevel * autoZoom);
    moveItem(item.id, x, y);
  }, [moveItem, roomW, roomL, zoomLevel, autoZoom]);

  // Keyboard delete
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        removeItem(selectedItemId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedItemId, removeItem]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const delta     = e.evt.deltaY > 0 ? -0.08 : 0.08;
    const newZoom   = Math.min(3.0, Math.max(0.4, zoomLevel + delta));
    setZoom(newZoom);
  }, [zoomLevel, setZoom]);

  const handleStageClick = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      setSelectedItem(null);
    }
  }, [setSelectedItem]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-stone-100"
      style={{ minHeight: 0 }}
    >
      {/* Layout badge */}
      {layout && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-stone-200 text-xs text-stone-600 font-medium shadow-sm">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
          </svg>
          {layout} · {roomW}ft × {roomL}ft
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-14 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom(Math.min(3.0, zoomLevel + 0.15))}
          className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-stone-200 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-stone-900 transition text-lg font-light"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(Math.max(0.4, zoomLevel - 0.15))}
          className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-stone-200 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-stone-900 transition text-lg font-light"
          aria-label="Zoom out"
        >−</button>
      </div>

      {/* Empty state */}
      {placedItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-2 text-stone-400">
            <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm font-medium opacity-60">Drag cabinets from the sidebar to place them</p>
          </div>
        </div>
      )}

      {/* Konva Stage */}
      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onWheel={handleWheel}
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

            {/* Placed items */}
            {placedItems.map((item) => {
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
                  x={itemX}
                  y={itemY}
                  draggable
                  onClick={(e) => { e.cancelBubble = true; setSelectedItem(item.id); }}
                  onTap={(e)   => { e.cancelBubble = true; setSelectedItem(item.id); }}
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
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>

      {/* Selected item hint */}
      {selectedItemId && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800/80 backdrop-blur-sm text-white text-xs font-medium shadow">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Drag to move · Press Delete to remove
        </div>
      )}
    </div>
  );
}
