"use client";

import React, { useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import usePlannerStore from "@/store/plannerStore";
import { COUNTER_THICK } from "@/lib/planner/layoutPresets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFrontDir(xFt, zFt, widthFt, depthFt, roomW, roomL) {
  const T = 0.6;
  if (zFt <= T)                         return "z+";  // north wall → face south
  if (xFt <= T)                         return "x+";  // west wall  → face east
  if (xFt + widthFt >= roomW - T)       return "x-";  // east wall  → face west
  if (zFt + depthFt >= roomL - T)       return "z-";  // south wall → face north (inward)
  return "z+";
}

function getFacePlane(widthFt, depthFt, heightFt, dir) {
  switch (dir) {
    case "x+":
      return { pos: [widthFt  / 2 + 0.005, 0, 0],  rot: [0,  Math.PI / 2, 0], faceW: depthFt,  faceH: heightFt };
    case "x-":
      return { pos: [-widthFt / 2 - 0.005, 0, 0],  rot: [0, -Math.PI / 2, 0], faceW: depthFt,  faceH: heightFt };
    case "z-":
      return { pos: [0, 0, -depthFt / 2 - 0.005],  rot: [0,  Math.PI, 0],     faceW: widthFt,  faceH: heightFt };
    default: // "z+"
      return { pos: [0, 0,  depthFt / 2 + 0.005],  rot: [0, 0, 0],            faceW: widthFt,  faceH: heightFt };
  }
}

// ─── Visual constants (all in feet) ──────────────────────────────────────────

const GAP          = 0.012;   // gap between adjacent panels — tighter, more precise
const MARG         = 0.016;   // perimeter margin inset from cabinet edge
const DOOR_D       = 0.052;   // door slab depth — solid 5/8" thickness
const GROOVE_D     = 0.010;   // shadow groove depth
const GROOVE_W     = 0.007;   // shadow groove width (crisp shadow line)
const PANEL_RAISE  = 0.010;   // raised-panel protrusion
const FRAME_W      = 0.068;   // shaker stile/rail width — precise cabinet-maker proportion
const HDL_R        = 0.010;   // bar handle radius — slender modern pull
const HDL_LEN      = 0.42;    // max bar length
const HDL_GAP      = 0.030;   // handle stand-off from door face
const POST_R       = 0.013;   // mount post radius
const POST_LEN     = 0.022;   // mount post length
const SHELF_GAP    = 0.095;   // tall-unit mid-shelf band height
const DRAWER_DEPTH = 0.55;    // drawer slide-out depth
const PANEL_T      = 0.022;   // cabinet carcass panel thickness

// ── Material constants — modern painted lacquer finish ────────────────────────
// Body: warm white with very slight greige — contemporary painted kitchen
const BODY_CLR    = "#e8e3dc";  // warm off-white carcass — richer than flat white
const FRAME_CLR   = "#e8e3dc";  // door frame — matches carcass
const PANEL_CLR   = "#f0ece6";  // shaker centre panel — slightly lighter
const GROOVE_CLR  = "#7a7470";  // deep shadow groove — darker, more depth
const DRAWER_CLR  = "#e8e3dc";  // drawer front — matches body for cohesion
const METAL_CLR   = "#b8c0c8";  // brushed nickel — slightly warmer silver
const SHELF_CLR   = "#c8c4bc";  // shelf divider band
const TOEKICK_CLR = "#141210";  // near-black matte recess
const INTERIOR_CLR = "#f5f2ee"; // birch/maple interior — clean light wood
const ORGANIZER_CLR = "#c8b89a"; // light maple/bamboo organizer tray

// PBR roughness/metalness for cabinet body panels
const BODY_ROUGH  = 0.28;   // semi-gloss lacquer
const BODY_METAL  = 0.02;
const BODY_ENV    = 0.8;    // higher env map intensity for lacquer reflection

// ─── BarHandle ────────────────────────────────────────────────────────────────
// Slim modern bar pull on two cylindrical posts.
function BarHandle({ x = 0, y = 0, len, horizontal }) {
  const barZ    = DOOR_D + PANEL_RAISE + HDL_GAP + HDL_R;
  const postZ   = DOOR_D + PANEL_RAISE + POST_LEN / 2;
  const halfOff = Math.max(0, len / 2 - POST_R);
  const showPosts = len >= 2 * (POST_R + 0.010);

  const [p1, p2] = horizontal
    ? [[x + halfOff, y, postZ], [x - halfOff, y, postZ]]
    : [[x, y + halfOff, postZ], [x, y - halfOff, postZ]];

  const barRot = horizontal ? [0, 0, Math.PI / 2] : [0, 0, 0];

  return (
    <>
      <mesh castShadow position={[x, y, barZ]} rotation={barRot}>
        <cylinderGeometry args={[HDL_R, HDL_R, len, 20]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.05} metalness={0.97} envMapIntensity={1.6} />
      </mesh>
      {showPosts && [p1, p2].map(([px, py, pz], k) => (
        <mesh key={k} castShadow position={[px, py, pz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[POST_R, POST_R * 0.80, POST_LEN, 12]} />
          <meshStandardMaterial color={METAL_CLR} roughness={0.08} metalness={0.95} envMapIntensity={1.4} />
        </mesh>
      ))}
    </>
  );
}

// ─── KnobHandle ───────────────────────────────────────────────────────────────
// Round cabinet knob — 1.25" diameter sphere on a turned stem.
function KnobHandle({ x = 0, y = 0 }) {
  const knobR   = 0.052;   // 1.25" diameter knob — true to scale
  const stemR   = 0.014;
  const collarR = 0.018;   // decorative collar at base
  const stemLen = 0.022;
  const collarH = 0.008;
  const baseZ   = DOOR_D + PANEL_RAISE;

  return (
    <>
      {/* Decorative collar at door face */}
      <mesh position={[x, y, baseZ + collarH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[collarR, collarR * 1.1, collarH, 16]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.10} metalness={0.94} envMapIntensity={1.3} />
      </mesh>
      {/* Stem */}
      <mesh position={[x, y, baseZ + collarH + stemLen / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[stemR, collarR * 0.85, stemLen, 14]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.08} metalness={0.95} envMapIntensity={1.4} />
      </mesh>
      {/* Knob sphere */}
      <mesh castShadow position={[x, y, baseZ + collarH + stemLen + knobR * 0.82]}>
        <sphereGeometry args={[knobR, 24, 24]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.05} metalness={0.97} envMapIntensity={1.8} />
      </mesh>
    </>
  );
}

// ─── CupHandle ────────────────────────────────────────────────────────────────
// U-shaped cup pull — half-torus arc on two flush mount posts.
function CupHandle({ x = 0, y = 0, len }) {
  const arcR     = Math.max(len * 0.20, 0.038);   // arc radius — proportional to cabinet
  const tubeR    = 0.010;                          // tube cross-section
  const baseZ    = DOOR_D + PANEL_RAISE + arcR;
  const halfSpan = arcR;

  return (
    <>
      {/* U-shaped arc (half torus, open at bottom) */}
      <mesh castShadow position={[x, y, baseZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[arcR, tubeR, 18, 28, Math.PI]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.05} metalness={0.97} envMapIntensity={1.6} />
      </mesh>
      {/* Left flush mount post */}
      <mesh position={[x - halfSpan, y, DOOR_D + PANEL_RAISE + POST_LEN / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[POST_R, POST_R * 0.80, POST_LEN, 12]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.08} metalness={0.95} envMapIntensity={1.3} />
      </mesh>
      {/* Right flush mount post */}
      <mesh position={[x + halfSpan, y, DOOR_D + PANEL_RAISE + POST_LEN / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[POST_R, POST_R * 0.80, POST_LEN, 12]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.08} metalness={0.95} envMapIntensity={1.3} />
      </mesh>
    </>
  );
}

// ─── HardwareHandle ───────────────────────────────────────────────────────────
// Dispatcher: routes to the correct geometry based on hardwareType.
// "bar" → BarHandle, "knob" → KnobHandle, "cup" → CupHandle, "hidden"/null → nothing.
function HardwareHandle({ hardwareType = "bar", x = 0, y = 0, len, horizontal }) {
  if (!hardwareType || hardwareType === "hidden") return null;
  if (hardwareType === "knob")  return <KnobHandle  x={x} y={y} />;
  if (hardwareType === "cup")   return <CupHandle   x={x} y={y} len={len} />;
  return <BarHandle x={x} y={y} len={len} horizontal={horizontal} />;
}

// ─── AdjustableShelf ──────────────────────────────────────────────────────────
// Realistic adjustable shelf: solid slab with front lip detail + pin holes.
function AdjustableShelf({ width, depth }) {
  const lipH  = 0.025;   // front lip height
  const slabH = 0.022;   // main shelf thickness

  return (
    <group>
      {/* Main slab — slightly undersized to show side walls */}
      <mesh receiveShadow>
        <boxGeometry args={[width - 0.04, slabH, depth - 0.04]} />
        <meshStandardMaterial color={INTERIOR_CLR} roughness={0.60} metalness={0.0} />
      </mesh>
      {/* Front edge lip — slightly proud of slab face */}
      <mesh position={[0, lipH / 2, (depth - 0.04) / 2 - 0.012]}>
        <boxGeometry args={[width - 0.04, lipH, 0.016]} />
        <meshStandardMaterial color={INTERIOR_CLR} roughness={0.55} metalness={0.0} />
      </mesh>
    </group>
  );
}

// ─── CabinetInterior ──────────────────────────────────────────────────────────
// Visible when any door is open — back panel, floor, adjustable shelves.
function CabinetInterior({ widthFt, heightFt, depthFt, category, frontDir }) {
  const backPanel = (() => {
    switch (frontDir) {
      case "x+": return { pos: [-widthFt / 2 + 0.016, 0, 0], size: [0.014, heightFt - 0.04, depthFt - 0.04] };
      case "x-": return { pos: [ widthFt / 2 - 0.016, 0, 0], size: [0.014, heightFt - 0.04, depthFt - 0.04] };
      case "z-": return { pos: [0, 0,  depthFt / 2 - 0.016], size: [widthFt - 0.04, heightFt - 0.04, 0.014] };
      default:   return { pos: [0, 0, -depthFt / 2 + 0.016], size: [widthFt - 0.04, heightFt - 0.04, 0.014] };
    }
  })();

  const shelfW = widthFt  - 0.05;
  const shelfD = depthFt  - 0.06;

  const shelfYs = (() => {
    if (category === "Tall Units") {
      return [0.22, 0.42, 0.62].map((f) => f * heightFt - heightFt / 2);
    }
    if (category === "Wall Cabinets") {
      return [heightFt * 0.08];
    }
    return [-heightFt / 2 + heightFt * 0.46];
  })();

  return (
    <group>
      {/* Back panel — light birch interior */}
      <mesh position={backPanel.pos}>
        <boxGeometry args={backPanel.size} />
        <meshStandardMaterial color={INTERIOR_CLR} roughness={0.60} metalness={0.0} />
      </mesh>

      {/* Side walls — visible interior side panels */}
      {(frontDir === "z+" || frontDir === "z-") && (
        <>
          <mesh position={[-(widthFt / 2 - 0.011), 0, 0]}>
            <boxGeometry args={[0.014, heightFt - 0.04, depthFt - 0.04]} />
            <meshStandardMaterial color={INTERIOR_CLR} roughness={0.60} metalness={0.0} />
          </mesh>
          <mesh position={[(widthFt / 2 - 0.011), 0, 0]}>
            <boxGeometry args={[0.014, heightFt - 0.04, depthFt - 0.04]} />
            <meshStandardMaterial color={INTERIOR_CLR} roughness={0.60} metalness={0.0} />
          </mesh>
        </>
      )}

      {/* Interior floor */}
      {category !== "Wall Cabinets" && (
        <mesh position={[0, -heightFt / 2 + 0.022, 0]}>
          <boxGeometry args={[widthFt - 0.04, 0.018, depthFt - 0.04]} />
          <meshStandardMaterial color={INTERIOR_CLR} roughness={0.60} metalness={0.0} />
        </mesh>
      )}

      {/* Adjustable shelves */}
      {shelfYs.map((y, idx) => (
        <group key={idx} position={[0, y, 0]}>
          <AdjustableShelf width={shelfW} depth={shelfD} />
        </group>
      ))}
    </group>
  );
}

// ─── DrawerOrganizer ──────────────────────────────────────────────────────────
// Visible inside an open drawer — light maple organizer with dividers.
function DrawerOrganizer({ sW }) {
  const trayW = sW - 0.08;

  return (
    <group position={[0, 0.020, -(DRAWER_DEPTH / 2 + 0.012)]}>
      {/* Tray base — light maple/bamboo */}
      <mesh>
        <boxGeometry args={[trayW, 0.016, DRAWER_DEPTH]} />
        <meshStandardMaterial color={ORGANIZER_CLR} roughness={0.55} metalness={0.0} envMapIntensity={0.3} />
      </mesh>
      {/* Long dividers — two sections */}
      {[-trayW / 4, trayW / 4].map((x, k) => (
        <mesh key={k} position={[x, 0.026, 0]}>
          <boxGeometry args={[0.008, 0.048, DRAWER_DEPTH]} />
          <meshStandardMaterial color={ORGANIZER_CLR} roughness={0.52} metalness={0.0} />
        </mesh>
      ))}
      {/* Cross dividers */}
      {[
        { x: -trayW / 4, z: -DRAWER_DEPTH * 0.25 },
        { x: -trayW / 4, z:  DRAWER_DEPTH * 0.12 },
        { x:  trayW / 4, z:  DRAWER_DEPTH * 0.25 },
        { x:  trayW / 4, z: -DRAWER_DEPTH * 0.12 },
      ].map((p, k) => (
        <mesh key={k} position={[p.x, 0.022, p.z]}>
          <boxGeometry args={[trayW / 3 - 0.04, 0.038, 0.008]} />
          <meshStandardMaterial color={ORGANIZER_CLR} roughness={0.52} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}

// ─── DoorPanel ────────────────────────────────────────────────────────────────
// Single door with hinge-pivot animation via underdamped spring.
// The outer group sits at the hinge edge (caller's responsibility).
function DoorPanel({ panelW, sH, pivotOffsetX, latchSign, wallStyle, hasInner, innerW, innerH, frameColor, doorStyleId, hardwareType = "bar", isOpen, onToggle }) {
  const posRef    = useRef(0);
  const velRef    = useRef(0);
  const groupRef  = useRef();
  const targetRef = useRef(0);
  targetRef.current = isOpen ? -latchSign * Math.PI * 0.62 : 0;

  // Underdamped spring — door swings with a natural arc then settles
  useFrame((_, delta) => {
    const dt    = Math.min(delta, 0.05);
    const tgt   = targetRef.current;
    const force = 200 * (tgt - posRef.current) - 18 * velRef.current;
    velRef.current += force * dt;
    posRef.current += velRef.current * dt;
    if (groupRef.current) groupRef.current.rotation.y = posRef.current;
  });

  // ── Door style variants ──────────────────────────────────────────────────────
  const isGlass  = doorStyleId === "Glass-Front";
  const isSlab   = doorStyleId === "Slab";
  const isRaised = doorStyleId === "Raised Panel";

  const showInner = hasInner && !isSlab;
  const raiseAmt  = isRaised ? PANEL_RAISE * 2.8 : PANEL_RAISE;

  // PBR roughness varies per style: Slab = mirror lacquer, Shaker/Raised = semi-gloss
  const doorRough = isSlab ? 0.22 : 0.28;
  const doorEnv   = isSlab ? 1.2  : BODY_ENV;

  const frameFill = frameColor ?? FRAME_CLR;
  const panelFill = (() => {
    if (isGlass) return "#cce0ee";   // cool glass tint
    if (frameColor) {
      const c = new THREE.Color(frameColor);
      c.lerp(new THREE.Color("#ffffff"), isRaised ? 0.20 : 0.14);
      return "#" + c.getHexString();
    }
    return PANEL_CLR;
  })();

  // Handle position — toward latch side on base doors, centered/bottom on wall
  const hLen = wallStyle
    ? Math.min(panelW * 0.52, HDL_LEN * 0.88)
    : Math.min(sH * 0.22, HDL_LEN);
  const hX = wallStyle ? 0               : panelW * 0.34 * latchSign;
  const hY = wallStyle ? -sH / 2 + 0.072 : 0;

  return (
    <group ref={groupRef}>
      <group position={[pivotOffsetX, 0, 0]}>
        {/* ── Main door slab ──────────────────────────────────────────────── */}
        <mesh castShadow receiveShadow position={[0, 0, DOOR_D / 2]}>
          <boxGeometry args={[panelW - GAP * 0.5, sH - GAP * 0.5, DOOR_D]} />
          <meshStandardMaterial
            color={frameFill}
            roughness={doorRough}
            metalness={BODY_METAL}
            envMapIntensity={doorEnv}
          />
        </mesh>

        {/* ── Shaker / Raised Panel / Glass-Front inner detail ────────────── */}
        {showInner && (
          <>
            {/* Deep shadow groove around panel */}
            <mesh position={[0, 0, DOOR_D - GROOVE_D / 2]}>
              <boxGeometry args={[innerW + GROOVE_W * 2, innerH + GROOVE_W * 2, GROOVE_D + 0.001]} />
              <meshStandardMaterial color={GROOVE_CLR} roughness={0.90} metalness={0.0} />
            </mesh>
            {/* Centre panel */}
            <mesh castShadow position={[0, 0, DOOR_D + raiseAmt / 2]}>
              <boxGeometry args={[innerW, innerH, raiseAmt]} />
              <meshStandardMaterial
                color={panelFill}
                roughness={isGlass ? 0.03 : 0.26}
                metalness={isGlass ? 0.08 : 0.02}
                transparent={isGlass}
                opacity={isGlass ? 0.36 : 1}
                envMapIntensity={isGlass ? 2.4 : 0.9}
              />
            </mesh>
          </>
        )}

        <HardwareHandle hardwareType={hardwareType} x={hX} y={hY} len={hLen} horizontal={wallStyle} />

        {/* Invisible hit volume — thin box, DoubleSide for reliable raycasting */}
        <mesh
          position={[0, 0, DOOR_D + raiseAmt + 0.003]}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          <boxGeometry args={[panelW - GAP * 0.5, sH - GAP * 0.5, 0.004]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ─── DrawerPanel ──────────────────────────────────────────────────────────────
// Single drawer with critically-damped spring slide.
// TWO-GROUP pattern: outer = declarative Y, inner = imperative Z slide.
function DrawerPanel({ sW, dH, v, frameColor, drawerStyleId, hardwareType = "bar", isOpen, onToggle }) {
  const posRef    = useRef(0);
  const velRef    = useRef(0);
  const slideRef  = useRef();
  const targetRef = useRef(0);
  targetRef.current = isOpen ? DRAWER_DEPTH * 0.85 : 0;

  useFrame((_, delta) => {
    const dt    = Math.min(delta, 0.05);
    const tgt   = targetRef.current;
    const force = 300 * (tgt - posRef.current) - 36 * velRef.current;
    velRef.current += force * dt;
    posRef.current += velRef.current * dt;
    if (slideRef.current) slideRef.current.position.z = posRef.current;
  });

  // ── Drawer style variants ────────────────────────────────────────────────────
  const isGlass  = drawerStyleId === "Glass-Front";
  const isSlab   = drawerStyleId === "Slab";
  const isRaised = drawerStyleId === "Raised Panel";

  const drawFill  = frameColor ?? DRAWER_CLR;
  const doorRough = isSlab ? 0.22 : 0.28;
  const doorEnv   = isSlab ? 1.2  : BODY_ENV;

  // Inner inset — Shaker / Raised / Glass detail (not Slab)
  const innerW   = sW - GAP * 0.5 - FRAME_W * 2;
  const innerH   = dH - GAP * 0.5 - FRAME_W * 2;
  const hasInner = !isSlab && innerW > 0.04 && innerH > 0.04;
  const raiseAmt = isRaised ? PANEL_RAISE * 2.2 : PANEL_RAISE;

  const panelFill = (() => {
    if (isGlass) return "#cce0ee";
    if (frameColor) {
      const c = new THREE.Color(frameColor);
      c.lerp(new THREE.Color("#ffffff"), isRaised ? 0.20 : 0.14);
      return "#" + c.getHexString();
    }
    return PANEL_CLR;
  })();

  const hLen = Math.min(sW * 0.44, HDL_LEN);

  return (
    <group position={[0, v, 0]}>
      <group ref={slideRef}>
        {/* Main drawer front slab */}
        <mesh castShadow receiveShadow position={[0, 0, DOOR_D / 2]}>
          <boxGeometry args={[sW - GAP * 0.5, dH - GAP * 0.5, DOOR_D]} />
          <meshStandardMaterial
            color={drawFill}
            roughness={doorRough}
            metalness={BODY_METAL}
            envMapIntensity={doorEnv}
          />
        </mesh>

        {/* Inner panel detail */}
        {hasInner && (
          <>
            <mesh position={[0, 0, DOOR_D - GROOVE_D / 2]}>
              <boxGeometry args={[innerW + GROOVE_W * 2, innerH + GROOVE_W * 2, GROOVE_D + 0.001]} />
              <meshStandardMaterial color={GROOVE_CLR} roughness={0.90} metalness={0.0} />
            </mesh>
            <mesh castShadow position={[0, 0, DOOR_D + raiseAmt / 2]}>
              <boxGeometry args={[innerW, innerH, raiseAmt]} />
              <meshStandardMaterial
                color={panelFill}
                roughness={isGlass ? 0.03 : 0.26}
                metalness={isGlass ? 0.08 : 0.02}
                transparent={isGlass}
                opacity={isGlass ? 0.36 : 1}
                envMapIntensity={isGlass ? 2.4 : 0.9}
              />
            </mesh>
          </>
        )}

        <HardwareHandle hardwareType={hardwareType} x={0} y={0} len={hLen} horizontal={true} />
        {isOpen && <DrawerOrganizer sW={sW} />}

        {/* Full-face invisible hit volume */}
        <mesh
          position={[0, 0, DOOR_D + 0.003]}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          <boxGeometry args={[sW - GAP * 0.5, dH - GAP * 0.5, 0.004]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ─── ShakerDoorRow ────────────────────────────────────────────────────────────
function ShakerDoorRow({ sW, sH, sV, numDoors, wallStyle, keyPfx, frameColor, doorStyleId, hardwareType = "bar", openSet, onToggle }) {
  if (sH < 0.12 || numDoors <= 0) return null;

  const panelW = (sW - GAP * (numDoors - 1)) / numDoors;

  return (
    <>
      {Array.from({ length: numDoors }, (_, i) => {
        const h         = -sW / 2 + panelW / 2 + i * (panelW + GAP);
        const latchSign = i < numDoors / 2 ? 1 : -1;

        const innerW   = panelW - GAP * 0.5 - FRAME_W * 2;
        const innerH   = sH    - GAP * 0.5 - FRAME_W * 2;
        const hasInner = innerW > 0.06 && innerH > 0.08;

        const keyId  = `${keyPfx}-${i}`;
        const isOpen = openSet?.has(keyId) ?? false;

        const hingeX       = h - latchSign * panelW / 2;
        const pivotOffsetX = latchSign * panelW / 2;

        return (
          <group key={keyId} position={[hingeX, sV, 0]}>
            <DoorPanel
              panelW={panelW}
              sH={sH}
              pivotOffsetX={pivotOffsetX}
              latchSign={latchSign}
              wallStyle={wallStyle}
              hasInner={hasInner}
              innerW={innerW}
              innerH={innerH}
              frameColor={frameColor}
              doorStyleId={doorStyleId}
              hardwareType={hardwareType}
              isOpen={isOpen}
              onToggle={() => onToggle?.(keyId)}
            />
          </group>
        );
      })}
    </>
  );
}

// ─── DrawerRow ────────────────────────────────────────────────────────────────
function DrawerRow({ sW, sH, sV, numDrawers, keyPfx, frameColor, drawerStyleId, hardwareType = "bar", openSet, onToggle }) {
  if (sH < 0.06 || numDrawers <= 0) return null;

  const dH = (sH - GAP * (numDrawers - 1)) / numDrawers;

  return (
    <>
      {Array.from({ length: numDrawers }, (_, j) => {
        const v     = sV + sH / 2 - dH / 2 - j * (dH + GAP);
        const keyId = `${keyPfx}-${j}`;
        const isOpen = openSet?.has(keyId) ?? false;
        return (
          <DrawerPanel
            key={keyId}
            sW={sW}
            dH={dH}
            v={v}
            frameColor={frameColor}
            drawerStyleId={drawerStyleId}
            hardwareType={hardwareType}
            isOpen={isOpen}
            onToggle={() => onToggle?.(keyId)}
          />
        );
      })}
    </>
  );
}

// ─── CabinetFront ─────────────────────────────────────────────────────────────
function CabinetFront({ faceW, faceH, pos, rot, doors, drawers, category, frameColor, doorStyleId, drawerStyleId, hardwareType = "bar", openDoors, openDrawers, onDoorToggle, onDrawerToggle }) {
  const isTall = category === "Tall Units";
  const isWall = category === "Wall Cabinets";

  const usableW = faceW - MARG * 2;
  const vBot    = -(faceH / 2 - MARG);
  const vTop    =  (faceH / 2 - MARG);
  const usableH = vTop - vBot;

  // ── TALL UNIT ──────────────────────────────────────────────────────────────
  if (isTall) {
    const shelfV   = 3.0 - faceH / 2;
    const shelfTop = shelfV + SHELF_GAP / 2;
    const shelfBot = shelfV - SHELF_GAP / 2;

    const lowerH = Math.max(0, shelfBot - vBot);
    const lowerV = vBot + lowerH / 2;

    const upperH = Math.max(0, vTop - shelfTop);
    const upperV = shelfTop + upperH / 2;

    const doorsPerSection = doors != null
      ? Math.max(1, Math.round(doors / 2))
      : Math.max(1, Math.round(faceW / 1.5));

    return (
      <group position={pos} rotation={rot}>
        {/* Mid-shelf divider band */}
        <mesh castShadow position={[0, shelfV, PANEL_T / 2]}>
          <boxGeometry args={[usableW, SHELF_GAP - GAP * 0.5, PANEL_T]} />
          <meshStandardMaterial color={SHELF_CLR} roughness={0.55} metalness={0.02} />
        </mesh>
        <ShakerDoorRow sW={usableW} sH={lowerH} sV={lowerV} numDoors={doorsPerSection} wallStyle={false} keyPfx="tl" frameColor={frameColor} doorStyleId={doorStyleId} hardwareType={hardwareType} openSet={openDoors} onToggle={onDoorToggle} />
        <ShakerDoorRow sW={usableW} sH={upperH} sV={upperV} numDoors={doorsPerSection} wallStyle={false} keyPfx="tu" frameColor={frameColor} doorStyleId={doorStyleId} hardwareType={hardwareType} openSet={openDoors} onToggle={onDoorToggle} />
      </group>
    );
  }

  // ── WALL CABINET ──────────────────────────────────────────────────────────
  if (isWall) {
    const numDoors = doors != null
      ? Math.max(1, doors)
      : Math.max(1, Math.round(faceW / 1.5));

    return (
      <group position={pos} rotation={rot}>
        <ShakerDoorRow sW={usableW} sH={usableH} sV={0} numDoors={numDoors} wallStyle={true} keyPfx="w" frameColor={frameColor} doorStyleId={doorStyleId} hardwareType={hardwareType} openSet={openDoors} onToggle={onDoorToggle} />
      </group>
    );
  }

  // ── BASE CABINET ──────────────────────────────────────────────────────────
  const numDoors   = doors   != null ? Math.max(0, doors)   : Math.max(1, Math.round(faceW / 1.5));
  // Default to 1 drawer rail when the database has no drawer_count value —
  // virtually all base cabinets have at least one top drawer.
  const numDrawers = drawers != null ? Math.max(0, drawers) : 1;

  if (numDoors === 0 && numDrawers === 0) return null;

  const drawerH = numDrawers > 0 ? usableH * 0.28 : 0;
  const doorH   = numDoors   > 0 ? usableH - drawerH - (numDrawers > 0 ? GAP : 0) : 0;

  return (
    <group position={pos} rotation={rot}>
      <ShakerDoorRow sW={usableW} sH={doorH}   sV={vBot + doorH   / 2} numDoors={numDoors}   wallStyle={false} keyPfx="b"  frameColor={frameColor} doorStyleId={doorStyleId} hardwareType={hardwareType} openSet={openDoors}   onToggle={onDoorToggle} />
      <DrawerRow     sW={usableW} sH={drawerH} sV={vTop - drawerH / 2} numDrawers={numDrawers} keyPfx="bd" frameColor={frameColor} drawerStyleId={drawerStyleId} hardwareType={hardwareType} openSet={openDrawers} onToggle={onDrawerToggle} />
    </group>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

function Scene3DCabinetInner({
  cabinet,
  roomWidthFt  = 20,
  roomLengthFt = 20,
  primaryColor = "#1C1917",
}) {
  const meshRef  = useRef(null);
  const [hovered, setHovered] = useState(false);

  const [openDoors,   setOpenDoors]   = useState(() => new Set());
  const [openDrawers, setOpenDrawers] = useState(() => new Set());

  const toggleDoor = useCallback((key) => {
    setOpenDoors((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const toggleDrawer = useCallback((key) => {
    setOpenDrawers((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const selectedItemId      = usePlannerStore((s) => s.selectedItemId);
  const setSelectedItem     = usePlannerStore((s) => s.setSelectedItem);
  const upperCabinetColor   = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor   = usePlannerStore((s) => s.lowerCabinetColor);
  const selectedCountertop  = usePlannerStore((s) => s.selectedCountertop);
  const selectedHardware    = usePlannerStore((s) => s.selectedHardware);
  const selectedDoorStyle   = usePlannerStore((s) => s.selectedDoorStyle);
  const selectedDrawerStyle = usePlannerStore((s) => s.selectedDrawerStyle);

  const doorStyleId   = selectedDoorStyle?.id   ?? "Shaker";
  const drawerStyleId = selectedDrawerStyle?.id  ?? "Shaker";
  const hardwareType  = selectedHardware?.type   ?? "bar";

  const isSelected  = selectedItemId === cabinet.id;
  const isWallCab   = cabinet.category === "Wall Cabinets";
  const cabinetColorHex = isWallCab
    ? (upperCabinetColor?.hex ?? null)
    : (lowerCabinetColor?.hex ?? null);

  const { widthFt, depthFt, heightFt } = cabinet.dimensions;
  const { xFt, yFt, zFt }             = cabinet.position;

  const cx = xFt + widthFt / 2;
  const cy = yFt + heightFt / 2;
  const cz = zFt + depthFt  / 2;

  const isFloorCabinet = cabinet.category !== "Wall Cabinets" && cabinet.category !== "Tall Units";

  const fillColor = cabinetColorHex ?? BODY_CLR;

  // Edge lines: subtler when unselected, bright blue when selected/hovered
  const edgeColor   = (hovered || isSelected) ? "#3b82f6" : "#a09890";
  const edgeOpacity = (hovered || isSelected) ? 1.0 : 0.55;

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(widthFt, heightFt, depthFt)),
    [widthFt, heightFt, depthFt]
  );

  const frontDir  = getFrontDir(xFt, zFt, widthFt, depthFt, roomWidthFt, roomLengthFt);
  const facePlane = getFacePlane(widthFt, depthFt, heightFt, frontDir);

  const COUNTER_OVERHANG = 0.12;
  const ctFacingNS  = frontDir === "z+" || frontDir === "z-";
  const ctFrontSign = (frontDir === "z+" || frontDir === "x+") ? 1 : -1;
  const counterW    = ctFacingNS ? widthFt : widthFt + COUNTER_OVERHANG;
  const counterD    = ctFacingNS ? depthFt + COUNTER_OVERHANG : depthFt;
  const counterOX   = ctFacingNS ? 0 : ctFrontSign * COUNTER_OVERHANG / 2;
  const counterOZ   = ctFacingNS ? ctFrontSign * COUNTER_OVERHANG / 2 : 0;

  // Countertop color — user selection or realistic warm quartz default
  const countertopHex = selectedCountertop?.hex ?? "#c8c0b4";

  return (
    <group
      position={[cx, cy, cz]}
      rotation={[0, (cabinet.rotation?.yDeg ?? 0) * (Math.PI / 180), 0]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedItem(cabinet.id);
        // Clicking the cabinet body (not a door/drawer) closes any open panels
        if (openDoors.size > 0)   setOpenDoors(new Set());
        if (openDrawers.size > 0) setOpenDrawers(new Set());
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {/* ── Cabinet carcass shell ──────────────────────────────────────────── */}
      {/* Always render as open-front 5-panel box so door/drawer hit volumes
          on the front face are never occluded by a solid carcass mesh. */}
      {(() => {
        const mat = { color: fillColor, roughness: BODY_ROUGH, metalness: BODY_METAL, envMapIntensity: BODY_ENV };
        const W = widthFt; const H = heightFt; const D = depthFt; const T = PANEL_T;
        const backZ  = frontDir === "z-" ?  (D/2 - T/2) : -(D/2 - T/2);
        const backX  = frontDir === "x-" ?  (W/2 - T/2) : -(W/2 - T/2);
        const panels = (frontDir === "z+" || frontDir === "z-") ? [
          { pos: [0, 0, backZ],             size: [W,   H, T] },
          { pos: [-(W/2 - T/2), 0, 0],      size: [T,   H, D] },
          { pos: [ (W/2 - T/2), 0, 0],      size: [T,   H, D] },
          { pos: [0,  (H/2 - T/2), 0],      size: [W,   T, D] },
          { pos: [0, -(H/2 - T/2), 0],      size: [W,   T, D] },
        ] : [
          { pos: [backX, 0, 0],             size: [T,   H, D] },
          { pos: [0, 0, -(D/2 - T/2)],      size: [W,   H, T] },
          { pos: [0, 0,  (D/2 - T/2)],      size: [W,   H, T] },
          { pos: [0,  (H/2 - T/2), 0],      size: [W,   T, D] },
          { pos: [0, -(H/2 - T/2), 0],      size: [W,   T, D] },
        ];
        return panels.map(({ pos, size }, k) => (
          <mesh key={k} ref={k === 0 ? meshRef : undefined} castShadow receiveShadow position={pos}>
            <boxGeometry args={size} />
            <meshStandardMaterial {...mat} />
          </mesh>
        ));
      })()}

      {/* Edge definition lines — subtle ambient, bright on selection */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
      </lineSegments>

      {/* Selection wireframe — precise blue outline */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[widthFt + 0.05, heightFt + 0.05, depthFt + 0.05]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}

      {/* Interior — visible when any door is open */}
      {!cabinet.isFiller && openDoors.size > 0 && (
        <CabinetInterior
          widthFt={widthFt}
          heightFt={heightFt}
          depthFt={depthFt}
          category={cabinet.category}
          frontDir={frontDir}
        />
      )}

      {/* Door and drawer fronts */}
      {!cabinet.isFiller && (
        <CabinetFront
          faceW={facePlane.faceW}
          faceH={facePlane.faceH}
          pos={facePlane.pos}
          rot={facePlane.rot}
          doors={cabinet.doorCount}
          drawers={cabinet.drawerCount}
          category={cabinet.category}
          frameColor={cabinetColorHex}
          doorStyleId={doorStyleId}
          drawerStyleId={drawerStyleId}
          hardwareType={hardwareType}
          openDoors={openDoors}
          openDrawers={openDrawers}
          onDoorToggle={toggleDoor}
          onDrawerToggle={toggleDrawer}
        />
      )}

      {/* Cabinet name label — shown on hover / selection */}
      {(isSelected || hovered) && (
        <Html
          position={[0, heightFt / 2 + 0.22, 0]}
          center
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <div
            className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-semibold shadow-lg backdrop-blur-sm"
            style={{ backgroundColor: isSelected ? "#2563eb" : "#3b82f6", opacity: 0.95, letterSpacing: "0.02em" }}
          >
            {cabinet.name}
          </div>
        </Html>
      )}

      {/* ── Countertop — polished stone/quartz surface ──────────────────────── */}
      {isFloorCabinet && (
        <>
          {/* Main countertop slab */}
          <mesh position={[counterOX, heightFt / 2 + COUNTER_THICK / 2, counterOZ]} castShadow receiveShadow>
            <boxGeometry args={[counterW, COUNTER_THICK, counterD]} />
            <meshStandardMaterial
              color={countertopHex}
              roughness={0.12}
              metalness={0.06}
              envMapIntensity={1.8}
            />
          </mesh>
          {/* Front edge waterfall detail — slightly rounded appearance via thinner box */}
          <mesh position={[counterOX, heightFt / 2 + COUNTER_THICK / 2, counterOZ + counterD / 2 - 0.005]}>
            <boxGeometry args={[counterW, COUNTER_THICK * 0.92, 0.012]} />
            <meshStandardMaterial
              color={countertopHex}
              roughness={0.08}
              metalness={0.07}
              envMapIntensity={2.0}
            />
          </mesh>
        </>
      )}

      {/* ── Toe-kick recess ──────────────────────────────────────────────────── */}
      {isFloorCabinet && (
        <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.032]}>
          <boxGeometry args={[widthFt, 0.13, 0.066]} />
          <meshStandardMaterial color={TOEKICK_CLR} roughness={0.95} metalness={0.0} />
        </mesh>
      )}
    </group>
  );
}

// Memoize: re-render only when spatial props change. Color/style changes flow via store subscriptions.
const Scene3DCabinet = React.memo(Scene3DCabinetInner, (prev, next) =>
  prev.cabinet.id         === next.cabinet.id         &&
  prev.cabinet.position   === next.cabinet.position   &&
  prev.cabinet.rotation   === next.cabinet.rotation   &&
  prev.cabinet.dimensions === next.cabinet.dimensions &&
  prev.cabinet.material   === next.cabinet.material   &&
  prev.roomWidthFt        === next.roomWidthFt        &&
  prev.roomLengthFt       === next.roomLengthFt       &&
  prev.primaryColor       === next.primaryColor
);

export default Scene3DCabinet;
