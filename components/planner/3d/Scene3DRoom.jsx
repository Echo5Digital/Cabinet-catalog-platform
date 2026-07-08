"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { buildLayoutRuns, COUNTER_THICK } from "@/lib/planner/layoutPresets";
import usePlannerStore from "@/store/plannerStore";

/**
 * Scene3DRoom — room shell (floor, ceiling, walls) + layout placeholder runs.
 * All dimensions in feet (1 Three.js unit = 1 foot).
 */
export default function Scene3DRoom({ room, layout, hasItems = false }) {
  const W = room?.widthFt  ?? 0;
  const L = room?.lengthFt ?? 0;
  const H = room?.heightFt ?? 0;
  const walls = room?.walls ?? [];

  const selectedFlooring = usePlannerStore((s) => s.selectedFlooring);
  const floorHex = selectedFlooring?.hex ?? "#c8bfae";   // richer warm oak default

  const runs = useMemo(
    () => (layout && room ? buildLayoutRuns(layout, { width: W, length: L }) : []),
    [layout, room, W, L]
  );

  if (!room) return null;

  return (
    <group name="room">
      {/* ── Floor — warm engineered wood / stone tile ──────────────────────── */}
      <mesh position={[W / 2, 0, L / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial
          color={floorHex}
          roughness={0.55}
          metalness={0.02}
          envMapIntensity={0.6}
        />
      </mesh>

      {/* Subtle 1 ft grid overlay — only faint lines, doesn't compete with floor */}
      <gridHelper
        args={[Math.max(W, L) * 2, Math.max(W, L) * 2, "#c0bab2", "#ddd8d2"]}
        position={[W / 2, 0.001, L / 2]}
      />

      {/* ── Ceiling — bright white plaster ────────────────────────────────── */}
      <mesh position={[W / 2, H, L / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial
          color="#f8f6f4"
          roughness={0.95}
          metalness={0}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Walls ─────────────────────────────────────────────────────────── */}
      {walls.map((wall) => (
        <WallSegment key={wall.id} wall={wall} roomHeight={H} />
      ))}

      {/* ── Room boundary edges ───────────────────────────────────────────── */}
      <RoomEdges W={W} L={L} H={H} />

      {/* ── Layout placeholder runs — hidden once real items are placed ─────── */}
      {!hasItems && runs.map((run) => (
        <LayoutRun key={run.id} run={run} />
      ))}
    </group>
  );
}

// ─── Wall segment ─────────────────────────────────────────────────────────────

function WallSegment({ wall, roomHeight: H }) {
  const [sx, sz] = wall.startFt;
  const [ex, ez] = wall.endFt;

  const len   = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2);
  const cx    = (sx + ex) / 2;
  const cz    = (sz + ez) / 2;
  const angle = Math.atan2(ex - sx, ez - sz);

  return (
    <mesh position={[cx, H / 2, cz]} rotation={[0, angle, 0]} receiveShadow castShadow>
      <boxGeometry args={[wall.thicknessFt ?? 0.5, H, len]} />
      {/* Warm white plaster with very slight warm cast */}
      <meshStandardMaterial color="#f2eee8" roughness={0.88} metalness={0} envMapIntensity={0.2} />
    </mesh>
  );
}

// ─── Layout cabinet run placeholder ──────────────────────────────────────────

function LayoutRun({ run }) {
  const { x2d, y2d, widthFt, depthFt, heightFt, elevFt = 0, type } = run;

  const isUpper     = type === "upper";
  const isIsland    = type === "island";
  const isPeninsula = type === "peninsula";

  const cx = x2d + widthFt / 2;
  const cy = elevFt + heightFt / 2;
  const cz = y2d  + depthFt  / 2;

  // Upper cabs: lighter, slightly transparent. Lower: warm stone, slightly opaque.
  const bodyColor   = isUpper ? "#f0ede8" : "#ede8e2";
  const bodyOpacity = isUpper ? 0.88 : 0.94;

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(widthFt, heightFt, depthFt)),
    [widthFt, heightFt, depthFt]
  );

  return (
    <group name={`layout-run-${run.id}`}>
      {/* Cabinet carcass body */}
      <mesh position={[cx, cy, cz]} castShadow receiveShadow>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.32}
          metalness={0.02}
          envMapIntensity={0.6}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>

      {/* Edge lines — warm grey, semi-transparent */}
      <lineSegments geometry={edgesGeo} position={[cx, cy, cz]}>
        <lineBasicMaterial color="#c0b8b0" transparent opacity={0.50} />
      </lineSegments>

      {/* Countertop slab — base + island/peninsula only */}
      {!isUpper && (
        <CountertopSlab
          cx={cx}
          topY={elevFt + heightFt}
          cz={cz}
          widthFt={widthFt}
          depthFt={depthFt}
          isIsland={isIsland || isPeninsula}
        />
      )}

      {/* Toe-kick */}
      {!isUpper && (
        <ToeKick cx={cx} cz={cz} widthFt={widthFt} depthFt={depthFt} />
      )}
    </group>
  );
}

// Countertop slab on placeholder cabinet run
function CountertopSlab({ cx, topY, cz, widthFt, depthFt, isIsland }) {
  const thick    = COUNTER_THICK;
  const overhang = isIsland ? 0.10 : 0.08;

  return (
    <mesh position={[cx, topY + thick / 2, cz + overhang / 2]} castShadow>
      <boxGeometry args={[widthFt + 0.04, thick, depthFt + overhang]} />
      <meshStandardMaterial
        color="#d8d0c4"
        roughness={0.18}
        metalness={0.05}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

// Toe-kick strip at base of each placeholder run
function ToeKick({ cx, cz, widthFt, depthFt }) {
  const tkH    = 0.13;
  const tkD    = 0.066;
  const frontZ = cz + depthFt / 2 - tkD / 2;

  return (
    <mesh position={[cx, tkH / 2, frontZ]}>
      <boxGeometry args={[widthFt, tkH, tkD]} />
      <meshStandardMaterial color="#1a1714" roughness={0.95} metalness={0} />
    </mesh>
  );
}

// ─── Room boundary edge lines ─────────────────────────────────────────────────

function RoomEdges({ W, L, H }) {
  const points = useMemo(() => [
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(W, 0, 0),
    new THREE.Vector3(W, 0, L), new THREE.Vector3(0, 0, L),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, H, 0), new THREE.Vector3(W, H, 0),
    new THREE.Vector3(W, 0, 0), new THREE.Vector3(W, H, 0),
    new THREE.Vector3(W, H, L), new THREE.Vector3(W, 0, L),
    new THREE.Vector3(W, H, L), new THREE.Vector3(0, H, L),
    new THREE.Vector3(0, 0, L), new THREE.Vector3(0, H, L),
    new THREE.Vector3(0, H, 0),
  ], [W, L, H]);

  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points]
  );

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#a8a098" opacity={0.40} transparent />
    </line>
  );
}
