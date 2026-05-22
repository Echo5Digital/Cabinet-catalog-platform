"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { buildLayoutRuns, COUNTER_THICK } from "@/lib/planner/layoutPresets";

/**
 * Scene3DRoom — renders the room shell (floor, ceiling, walls) AND the
 * rough layout cabinet runs (placeholder boxes + countertops) so the
 * customer immediately sees their chosen layout upon entering Step 3.
 *
 * All dimensions in feet (1 Three.js unit = 1 foot).
 *
 * Props:
 *   room   — room object from sceneGraph.room
 *   layout — layout id string (e.g. "L-Shape") from sceneGraph.meta.layoutType
 */
export default function Scene3DRoom({ room, layout, hasItems = false }) {
  // Hooks must run unconditionally — derive safe defaults when room is null
  const W = room?.widthFt  ?? 0;
  const L = room?.lengthFt ?? 0;
  const H = room?.heightFt ?? 0;
  const walls = room?.walls ?? [];

  const runs = useMemo(
    () => (layout && room ? buildLayoutRuns(layout, { width: W, length: L }) : []),
    [layout, room, W, L]
  );

  if (!room) return null;

  return (
    <group name="room">
      {/* ── Floor ─────────────────────────────────────────────────────────── */}
      <mesh
        position={[W / 2, 0, L / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color="#d4c9b8" roughness={0.75} metalness={0} />
      </mesh>

      {/* Floor grid — 1 ft cells */}
      <gridHelper
        args={[Math.max(W, L) * 2, Math.max(W, L) * 2, "#c8c4c0", "#dbd7d4"]}
        position={[W / 2, 0.001, L / 2]}
      />

      {/* ── Ceiling ───────────────────────────────────────────────────────── */}
      <mesh
        position={[W / 2, H, L / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial
          color="#f5f4f2"
          roughness={1}
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

      {/* ── Layout cabinet run placeholders — hidden once real items are placed */}
      {!hasItems && runs.map((run) => (
        <LayoutRun key={run.id} run={run} />
      ))}
    </group>
  );
}

// ─── Individual wall segment ──────────────────────────────────────────────────

function WallSegment({ wall, roomHeight: H }) {
  const [sx, sz] = wall.startFt;
  const [ex, ez] = wall.endFt;

  const len   = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2);
  const cx    = (sx + ex) / 2;
  const cz    = (sz + ez) / 2;
  const angle = Math.atan2(ex - sx, ez - sz);

  return (
    <mesh
      position={[cx, H / 2, cz]}
      rotation={[0, angle, 0]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[wall.thicknessFt ?? 0.5, H, len]} />
      <meshStandardMaterial color="#f0ece8" roughness={0.9} metalness={0} />
    </mesh>
  );
}

// ─── Cabinet run placeholder ──────────────────────────────────────────────────
//
// Visual-only placeholder showing where cabinet runs sit in this layout.
// Renders: carcass box + countertop slab + edge lines + toe-kick.

function LayoutRun({ run }) {
  const { x2d, y2d, widthFt, depthFt, heightFt, elevFt = 0, type } = run;

  const isUpper     = type === "upper";
  const isIsland    = type === "island";
  const isPeninsula = type === "peninsula";

  // Box centre: x2d → Three.js X, y2d → Three.js Z
  const cx = x2d + widthFt / 2;
  const cy = elevFt + heightFt / 2;
  const cz = y2d  + depthFt  / 2;

  const bodyColor = isUpper ? "#eeece8" : "#f2ede7";

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
          roughness={0.68}
          metalness={0.02}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Cabinet panel / door edge lines */}
      <lineSegments geometry={edgesGeo} position={[cx, cy, cz]}>
        <lineBasicMaterial color="#cdc8c1" transparent opacity={0.55} />
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

      {/* Toe-kick strip at floor level */}
      {!isUpper && (
        <ToeKick cx={cx} cz={cz} widthFt={widthFt} depthFt={depthFt} />
      )}
    </group>
  );
}

// Countertop slab with slight overhang
function CountertopSlab({ cx, topY, cz, widthFt, depthFt, isIsland }) {
  const thick    = COUNTER_THICK;
  const overhang = isIsland ? 0.1 : 0.08;

  return (
    <mesh position={[cx, topY + thick / 2, cz + overhang / 2]} castShadow>
      <boxGeometry args={[widthFt + 0.04, thick, depthFt + overhang]} />
      <meshStandardMaterial
        color="#dbd5cd"
        roughness={0.22}
        metalness={0.06}
      />
    </mesh>
  );
}

// Toe-kick strip at the base of each run
function ToeKick({ cx, cz, widthFt, depthFt }) {
  const tkH    = 0.13;
  const tkD    = 0.06;
  const frontZ = cz + depthFt / 2 - tkD / 2;

  return (
    <mesh position={[cx, tkH / 2, frontZ]}>
      <boxGeometry args={[widthFt, tkH, tkD]} />
      <meshStandardMaterial color="#c4bfb9" roughness={0.8} metalness={0} />
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
      <lineBasicMaterial color="#b8b0a8" opacity={0.45} transparent />
    </line>
  );
}
