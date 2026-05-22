"use client";

import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import usePlannerStore from "@/store/plannerStore";
import { COUNTER_THICK } from "@/lib/planner/layoutPresets";

/**
 * Scene3DCabinet — renders a single cabinet as a colored box with edge lines.
 *
 * Phase 1: BoxGeometry + EdgesGeometry (no GLTF).
 * Phase 2: swap inner box for <useGLTF> when cabinet.gltfUrl is set.
 *
 * Props: cabinet — a cabinet node from sceneGraph.cabinets[]
 */
export default function Scene3DCabinet({ cabinet }) {
  const meshRef  = useRef(null);
  const [hovered, setHovered] = useState(false);

  const selectedItemId  = usePlannerStore((s) => s.selectedItemId);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);
  const removeItem      = usePlannerStore((s) => s.removeItem);

  const isSelected = selectedItemId === cabinet.id;

  const { widthFt, depthFt, heightFt } = cabinet.dimensions;
  const { xFt, yFt, zFt }             = cabinet.position;

  // Three.js BoxGeometry is centred; offset so origin = bottom-north-west corner
  const cx = xFt + widthFt / 2;
  const cy = yFt + heightFt / 2;
  const cz = zFt + depthFt  / 2;

  // Countertop + toe-kick only for floor-level cabinets (not wall or tall units)
  const isFloorCabinet =
    cabinet.category !== "Wall Cabinets" && cabinet.category !== "Tall Units";

  const fillColor = isSelected ? "#0ea5e9" : hovered ? "#a8a29e" : cabinet.fallbackColor;
  const edgeColor = isSelected ? "#0284c7" : "#57534e";

  // Build edge geometry once per cabinet dimensions
  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(widthFt, heightFt, depthFt)),
    [widthFt, heightFt, depthFt]
  );

  return (
    <group
      position={[cx, cy, cz]}
      rotation={[0, (cabinet.rotation?.yDeg ?? 0) * (Math.PI / 180), 0]}
      onClick={(e) => { e.stopPropagation(); setSelectedItem(cabinet.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); removeItem(cabinet.id); }}
    >
      {/* Cabinet body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        <meshStandardMaterial
          color={fillColor}
          roughness={cabinet.material?.roughness ?? 0.45}
          metalness={cabinet.material?.metalness ?? 0.0}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Edge lines — door grid visual cue */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>

      {/* Selection outline — slightly larger wireframe box */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[widthFt + 0.06, heightFt + 0.06, depthFt + 0.06]} />
          <meshBasicMaterial color="#0ea5e9" wireframe />
        </mesh>
      )}

      {/* Label overlay — only when selected or hovered */}
      {(isSelected || hovered) && (
        <Html
          position={[0, heightFt / 2 + 0.25, 0]}
          center
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <div
            className="px-2 py-0.5 rounded-full text-white text-[10px] font-semibold shadow-md"
            style={{ backgroundColor: isSelected ? "#0ea5e9" : "#44403c", opacity: 0.95 }}
          >
            {cabinet.name}
            {isSelected && (
              <span className="ml-1 opacity-70 text-[9px]">
                · dbl-click to remove
              </span>
            )}
          </div>
        </Html>
      )}

      {/* Countertop slab — base / island / peninsula only */}
      {isFloorCabinet && (
        <mesh
          position={[0, heightFt / 2 + COUNTER_THICK / 2, depthFt * 0.04]}
          castShadow
        >
          <boxGeometry args={[widthFt + 0.04, COUNTER_THICK, depthFt + 0.08]} />
          <meshStandardMaterial color="#dbd5cd" roughness={0.22} metalness={0.06} />
        </mesh>
      )}

      {/* Toe-kick strip — 1.5" tall × 0.75" deep at front-bottom */}
      {isFloorCabinet && (
        <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.03125]}>
          <boxGeometry args={[widthFt, 0.13, 0.0625]} />
          <meshStandardMaterial color="#c4bfb9" roughness={0.8} metalness={0} />
        </mesh>
      )}
    </group>
  );
}
