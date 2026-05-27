"use client";

import { useRef, useState, useMemo, useCallback } from "react";
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

const GAP          = 0.014;   // gap between adjacent panels
const MARG         = 0.018;   // perimeter margin inset from cabinet edge
const BACK_D       = 0.010;   // door frame slab depth
const FRONT_D      = 0.018;   // shaker raised-panel extra depth  (total ≈ 0.028 ft ≈ 8.5 mm)
const FRAME_W      = 0.060;   // shaker frame border width (~0.72")
const HDL_R        = 0.013;   // bar handle radius (~0.16" — slender European pull)
const HDL_LEN      = 0.36;    // max bar length (~4.3")
const HDL_GAP      = 0.030;   // handle stand-off from door face
const POST_R       = 0.017;   // mount post radius (slightly wider than bar)
const POST_LEN     = 0.022;   // mount post length (short bracket)
const SHELF_GAP    = 0.100;   // tall-unit shelf-divider band height
const DRAWER_DEPTH = 0.55;    // drawer box depth for slide-out animation (~6.6 in)
const PANEL_T      = 0.025;   // cabinet shell panel thickness (~0.3 in)

// ── Palette — realistic shaker-white / warm cream finish ──────────────────────
const BODY_CLR    = "#d4cfc8";  // cabinet body — warm taupe matte
const FRAME_CLR   = "#d4cfc8";  // door frame slab — same as body
const PANEL_CLR   = "#f2ede4";  // raised inner panel — noticeably lighter/smoother
const DRAWER_CLR  = "#dbd7d0";  // drawer front face
const METAL_CLR   = "#b4bbc3";  // brushed stainless steel (cooler grey)
const SHELF_CLR   = "#bcb8b1";  // shelf divider band
const TOEKICK_CLR = "#252220";  // very dark recess — standard on modern kitchens

// ─── BarHandle ────────────────────────────────────────────────────────────────
function BarHandle({ x = 0, y = 0, len, horizontal }) {
  const barZ    = BACK_D + FRONT_D + HDL_GAP + HDL_R;
  const postZ   = BACK_D + FRONT_D + POST_LEN / 2 + 0.002;
  const halfOff = Math.max(0, len / 2 - POST_R);
  const showPosts = len >= 2 * (POST_R + 0.008);

  const [p1, p2] = horizontal
    ? [[x + halfOff, y, postZ], [x - halfOff, y, postZ]]
    : [[x, y + halfOff, postZ], [x, y - halfOff, postZ]];

  const barRot = horizontal ? [0, 0, Math.PI / 2] : [0, 0, 0];

  return (
    <>
      <mesh castShadow position={[x, y, barZ]} rotation={barRot}>
        <cylinderGeometry args={[HDL_R, HDL_R, len, 14]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.08} metalness={0.95} />
      </mesh>
      {showPosts && [p1, p2].map(([px, py, pz], k) => (
        <mesh key={k} castShadow position={[px, py, pz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[POST_R, POST_R * 0.80, POST_LEN, 8]} />
          <meshStandardMaterial color={METAL_CLR} roughness={0.10} metalness={0.90} />
        </mesh>
      ))}
    </>
  );
}

// ─── WireShelf ────────────────────────────────────────────────────────────────
// Simulates a wire rack shelf: thin slab + 6 chrome wire bars across the depth.
function WireShelf({ width, depth }) {
  const barPositions = Array.from({ length: 6 }, (_, k) => {
    const span = depth - 0.12;
    return -depth / 2 + 0.06 + k * (span / 5);
  });

  return (
    <group>
      {/* Shelf base slab */}
      <mesh>
        <boxGeometry args={[width - 0.06, 0.015, depth - 0.06]} />
        <meshStandardMaterial color="#6a6560" roughness={0.65} metalness={0.20} />
      </mesh>
      {/* Wire bars running left-right */}
      {barPositions.map((zPos, k) => (
        <mesh key={k} position={[0, 0.013, zPos]}>
          <boxGeometry args={[width - 0.08, 0.010, 0.010]} />
          <meshStandardMaterial color="#9a9590" roughness={0.25} metalness={0.70} />
        </mesh>
      ))}
    </group>
  );
}

// ─── CabinetInterior ──────────────────────────────────────────────────────────
// Shown in cabinet-body-local space when any door is open.
// Renders back panel, interior floor, and wire shelves.
function CabinetInterior({ widthFt, heightFt, depthFt, category, frontDir }) {
  const backPanel = (() => {
    switch (frontDir) {
      case "x+": return { pos: [-widthFt / 2 + 0.018, 0, 0], size: [0.016, heightFt - 0.04, depthFt - 0.04] };
      case "x-": return { pos: [ widthFt / 2 - 0.018, 0, 0], size: [0.016, heightFt - 0.04, depthFt - 0.04] };
      case "z-": return { pos: [0, 0,  depthFt / 2 - 0.018], size: [widthFt - 0.04, heightFt - 0.04, 0.016] };
      default:   return { pos: [0, 0, -depthFt / 2 + 0.018], size: [widthFt - 0.04, heightFt - 0.04, 0.016] };
    }
  })();

  const shelfW = widthFt  - 0.05;
  const shelfD = depthFt  - 0.05;

  const shelfYs = (() => {
    if (category === "Tall Units") {
      return [0.22, 0.42, 0.62].map((f) => f * heightFt - heightFt / 2);
    }
    if (category === "Wall Cabinets") {
      return [0];
    }
    // Base
    return [-heightFt / 2 + heightFt * 0.45];
  })();

  const interiorColor = "#ccc8c2";

  return (
    <group>
      {/* Back panel */}
      <mesh position={backPanel.pos}>
        <boxGeometry args={backPanel.size} />
        <meshStandardMaterial color={interiorColor} roughness={0.65} metalness={0.0} />
      </mesh>

      {/* Interior floor for floor cabinets */}
      {category !== "Wall Cabinets" && (
        <mesh position={[0, -heightFt / 2 + 0.025, 0]}>
          <boxGeometry args={[widthFt - 0.04, 0.020, depthFt - 0.04]} />
          <meshStandardMaterial color={interiorColor} roughness={0.65} metalness={0.0} />
        </mesh>
      )}

      {/* Wire shelves */}
      {shelfYs.map((y, idx) => (
        <group key={idx} position={[0, y, 0]}>
          <WireShelf width={shelfW} depth={shelfD} />
        </group>
      ))}
    </group>
  );
}

// ─── SilverwareOrganizer ──────────────────────────────────────────────────────
// Rendered inside an open drawer. Flat tray with long + short dividers.
function SilverwareOrganizer({ sW }) {
  const trayW = sW - 0.10;
  const divColor = "#3c3530";

  return (
    <group position={[0, 0.018, -(DRAWER_DEPTH / 2 + 0.016)]}>
      {/* Tray base */}
      <mesh>
        <boxGeometry args={[trayW, 0.018, DRAWER_DEPTH]} />
        <meshStandardMaterial color={divColor} roughness={0.70} metalness={0.0} />
      </mesh>
      {/* Two long dividers running front-to-back */}
      {[-trayW / 4, trayW / 4].map((x, k) => (
        <mesh key={k} position={[x, 0.028, 0]}>
          <boxGeometry args={[0.010, 0.055, DRAWER_DEPTH]} />
          <meshStandardMaterial color={divColor} roughness={0.70} metalness={0.0} />
        </mesh>
      ))}
      {/* Short cross dividers */}
      {[
        { x: -trayW / 4, z: -DRAWER_DEPTH * 0.25 },
        { x: -trayW / 4, z:  DRAWER_DEPTH * 0.10 },
        { x:  trayW / 4, z:  DRAWER_DEPTH * 0.25 },
        { x:  trayW / 4, z: -DRAWER_DEPTH * 0.10 },
      ].map((p, k) => (
        <mesh key={k} position={[p.x, 0.024, p.z]}>
          <boxGeometry args={[trayW / 3 - 0.05, 0.045, 0.010]} />
          <meshStandardMaterial color={divColor} roughness={0.70} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}

// ─── DoorPanel ────────────────────────────────────────────────────────────────
// Single door with hinge-pivot rotation animated via spring physics.
// The outer group is positioned at the hinge edge (caller's responsibility).
// pivotOffsetX shifts door content from hinge back to visual center.
function DoorPanel({ panelW, sH, pivotOffsetX, latchSign, wallStyle, hasInner, innerW, innerH, frameColor, isOpen, onToggle }) {
  const posRef    = useRef(0);
  const velRef    = useRef(0);
  const groupRef  = useRef();
  const targetRef = useRef(0);
  // Write to ref every render so the useFrame closure always reads the latest value
  targetRef.current = isOpen ? -latchSign * Math.PI * 0.62 : 0;

  // Underdamped spring — door swings past target slightly then settles (natural feel)
  useFrame((_, delta) => {
    const dt  = Math.min(delta, 0.05);
    const tgt = targetRef.current;
    const force = 200 * (tgt - posRef.current) - 18 * velRef.current;
    velRef.current += force * dt;
    posRef.current += velRef.current * dt;
    if (groupRef.current) groupRef.current.rotation.y = posRef.current;
  });

  const hLen = wallStyle
    ? Math.min(panelW * 0.52, HDL_LEN * 0.85)
    : Math.min(sH * 0.26, HDL_LEN);
  const hX = wallStyle ? 0              : panelW * 0.38 * latchSign;
  const hY = wallStyle ? -sH / 2 + 0.06 : 0;

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {/* Shift door content so it pivots around its hinge edge */}
      <group position={[pivotOffsetX, 0, 0]}>
        {/* Frame slab */}
        <mesh castShadow position={[0, 0, BACK_D / 2]}>
          <boxGeometry args={[panelW - GAP * 0.5, sH - GAP * 0.5, BACK_D]} />
          <meshStandardMaterial color={frameColor ?? FRAME_CLR} roughness={0.42} metalness={0.01} />
        </mesh>
        {/* Raised shaker centre panel */}
        {hasInner && (
          <mesh castShadow position={[0, 0, BACK_D + FRONT_D / 2]}>
            <boxGeometry args={[innerW, innerH, FRONT_D]} />
            <meshStandardMaterial color={frameColor ?? PANEL_CLR} roughness={0.16} metalness={0.02} />
          </mesh>
        )}
        <BarHandle x={hX} y={hY} len={hLen} horizontal={wallStyle} />
      </group>
    </group>
  );
}

// ─── DrawerPanel ──────────────────────────────────────────────────────────────
// Single drawer that slides out along Z via spring physics (soft-close feel).
// Shows SilverwareOrganizer when open.
//
// TWO-GROUP pattern prevents RTF from resetting position.z on re-render:
//   outer group — declarative Y position only (no ref, no Z)
//   inner group — imperative Z slide only (ref, no JSX position)
function DrawerPanel({ sW, dH, v, frameColor, isOpen, onToggle }) {
  const posRef    = useRef(0);
  const velRef    = useRef(0);
  const slideRef  = useRef();
  const targetRef = useRef(0);
  // Write to ref every render so the useFrame closure always reads the latest value
  targetRef.current = isOpen ? DRAWER_DEPTH * 0.85 : 0;

  // Critically-damped spring — fast, smooth stop, no bounce
  useFrame((_, delta) => {
    const dt  = Math.min(delta, 0.05);
    const tgt = targetRef.current;
    const force = 300 * (tgt - posRef.current) - 36 * velRef.current;
    velRef.current += force * dt;
    posRef.current += velRef.current * dt;
    if (slideRef.current) slideRef.current.position.z = posRef.current;
  });

  const hLen = Math.min(sW * 0.40, HDL_LEN);

  return (
    <group position={[0, v, 0]}>
      {/* Inner group: only Z is touched imperatively — no JSX position so RTF won't reset it */}
      <group
        ref={slideRef}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {/* Drawer front face */}
        <mesh castShadow position={[0, 0, (BACK_D + FRONT_D) / 2]}>
          <boxGeometry args={[sW - GAP * 0.5, dH - GAP * 0.5, BACK_D + FRONT_D]} />
          <meshStandardMaterial color={frameColor ?? DRAWER_CLR} roughness={0.48} metalness={0.0} />
        </mesh>
        <BarHandle x={0} y={0} len={hLen} horizontal={true} />
        {isOpen && <SilverwareOrganizer sW={sW} />}
      </group>
    </group>
  );
}

// ─── ShakerDoorRow ────────────────────────────────────────────────────────────
function ShakerDoorRow({ sW, sH, sV, numDoors, wallStyle, keyPfx, frameColor, openSet, onToggle }) {
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

        // Pivot the outer group at the hinge edge, not the door centre
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
function DrawerRow({ sW, sH, sV, numDrawers, keyPfx, frameColor, openSet, onToggle }) {
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
            isOpen={isOpen}
            onToggle={() => onToggle?.(keyId)}
          />
        );
      })}
    </>
  );
}

// ─── CabinetFront ─────────────────────────────────────────────────────────────
function CabinetFront({ faceW, faceH, pos, rot, doors, drawers, category, frameColor, openDoors, openDrawers, onDoorToggle, onDrawerToggle }) {
  const isTall = category === "Tall Units";
  const isWall = category === "Wall Cabinets";

  const usableW = faceW - MARG * 2;
  const vBot    = -(faceH / 2 - MARG);
  const vTop    =  (faceH / 2 - MARG);
  const usableH = vTop - vBot;

  // ── TALL UNIT ─────────────────────────────────────────────────────────────
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
        <mesh castShadow position={[0, shelfV, BACK_D / 2]}>
          <boxGeometry args={[usableW, SHELF_GAP - GAP * 0.5, BACK_D]} />
          <meshStandardMaterial color={SHELF_CLR} roughness={0.60} metalness={0.0} />
        </mesh>
        <ShakerDoorRow sW={usableW} sH={lowerH} sV={lowerV} numDoors={doorsPerSection} wallStyle={false} keyPfx="tl" frameColor={frameColor} openSet={openDoors} onToggle={onDoorToggle} />
        <ShakerDoorRow sW={usableW} sH={upperH} sV={upperV} numDoors={doorsPerSection} wallStyle={false} keyPfx="tu" frameColor={frameColor} openSet={openDoors} onToggle={onDoorToggle} />
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
        <ShakerDoorRow sW={usableW} sH={usableH} sV={0} numDoors={numDoors} wallStyle={true} keyPfx="w" frameColor={frameColor} openSet={openDoors} onToggle={onDoorToggle} />
      </group>
    );
  }

  // ── BASE CABINET ──────────────────────────────────────────────────────────
  const numDoors   = doors   != null ? Math.max(0, doors)   : Math.max(1, Math.round(faceW / 1.5));
  const numDrawers = drawers != null ? Math.max(0, drawers) : 0;

  if (numDoors === 0 && numDrawers === 0) return null;

  const drawerH = numDrawers > 0 ? usableH * 0.28 : 0;
  const doorH   = numDoors   > 0 ? usableH - drawerH - (numDrawers > 0 ? GAP : 0) : 0;

  return (
    <group position={pos} rotation={rot}>
      <ShakerDoorRow sW={usableW} sH={doorH}   sV={vBot + doorH   / 2} numDoors={numDoors}   wallStyle={false} keyPfx="b"  frameColor={frameColor} openSet={openDoors}   onToggle={onDoorToggle} />
      <DrawerRow     sW={usableW} sH={drawerH} sV={vTop - drawerH / 2} numDrawers={numDrawers} keyPfx="bd" frameColor={frameColor} openSet={openDrawers} onToggle={onDrawerToggle} />
    </group>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Scene3DCabinet({
  cabinet,
  roomWidthFt  = 20,
  roomLengthFt = 20,
  primaryColor = "#1C1917",
}) {
  const meshRef  = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Door / drawer open state — Sets of string keys
  const [openDoors,   setOpenDoors]   = useState(() => new Set());
  const [openDrawers, setOpenDrawers] = useState(() => new Set());

  const toggleDoor = useCallback((key) => {
    setOpenDoors((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const toggleDrawer = useCallback((key) => {
    setOpenDrawers((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const selectedItemId     = usePlannerStore((s) => s.selectedItemId);
  const setSelectedItem    = usePlannerStore((s) => s.setSelectedItem);
  const upperCabinetColor  = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor  = usePlannerStore((s) => s.lowerCabinetColor);

  const isSelected = selectedItemId === cabinet.id;

  const isWallCab      = cabinet.category === "Wall Cabinets";
  const cabinetColorHex = isWallCab
    ? (upperCabinetColor?.hex ?? null)
    : (lowerCabinetColor?.hex ?? null);

  const { widthFt, depthFt, heightFt } = cabinet.dimensions;
  const { xFt, yFt, zFt }             = cabinet.position;

  const cx = xFt + widthFt / 2;
  const cy = yFt + heightFt / 2;
  const cz = zFt + depthFt  / 2;

  const isFloorCabinet =
    cabinet.category !== "Wall Cabinets" && cabinet.category !== "Tall Units";

  // Body always shows the chosen finish — selection is indicated by the blue wireframe outline.
  const fillColor = cabinetColorHex ?? BODY_CLR;
  const edgeColor = (hovered || isSelected) ? "#3b82f6" : "#908c87";

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

  return (
    <group
      position={[cx, cy, cz]}
      rotation={[0, (cabinet.rotation?.yDeg ?? 0) * (Math.PI / 180), 0]}
      onClick={(e) => { e.stopPropagation(); setSelectedItem(cabinet.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Cabinet shell:
           • Doors closed → solid BoxGeometry (opaque exterior, prevents corner-overlap artefacts)
           • Any door open  → 5-panel hollow shell (front face removed, interior visible) */}
      {openDoors.size === 0 ? (
        <mesh ref={meshRef} castShadow receiveShadow>
          <boxGeometry args={[widthFt, heightFt, depthFt]} />
          <meshStandardMaterial color={fillColor} roughness={cabinet.material?.roughness ?? 0.52} metalness={cabinet.material?.metalness ?? 0.01} />
        </mesh>
      ) : (() => {
        const mat = { color: fillColor, roughness: cabinet.material?.roughness ?? 0.52, metalness: cabinet.material?.metalness ?? 0.01 };
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

      {/* Edge definition lines */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>

      {/* Selection wireframe */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[widthFt + 0.06, heightFt + 0.06, depthFt + 0.06]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}

      {/* Interior — visible when at least one door is open */}
      {!cabinet.isFiller && openDoors.size > 0 && (
        <CabinetInterior
          widthFt={widthFt}
          heightFt={heightFt}
          depthFt={depthFt}
          category={cabinet.category}
          frontDir={frontDir}
        />
      )}

      {/* Category-specific door / drawer fronts */}
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
          openDoors={openDoors}
          openDrawers={openDrawers}
          onDoorToggle={toggleDoor}
          onDrawerToggle={toggleDrawer}
        />
      )}

      {/* Hover / selection label */}
      {(isSelected || hovered) && (
        <Html
          position={[0, heightFt / 2 + 0.25, 0]}
          center
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <div
            className="px-2 py-0.5 rounded-full text-white text-[10px] font-semibold shadow-md"
            style={{ backgroundColor: "#3b82f6", opacity: 0.95 }}
          >
            {cabinet.name}
          </div>
        </Html>
      )}

      {/* Countertop */}
      {isFloorCabinet && (
        <mesh position={[counterOX, heightFt / 2 + COUNTER_THICK / 2, counterOZ]} castShadow>
          <boxGeometry args={[counterW, COUNTER_THICK, counterD]} />
          <meshStandardMaterial color="#b5afa8" roughness={0.10} metalness={0.10} />
        </mesh>
      )}

      {/* Toe-kick */}
      {isFloorCabinet && (
        <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.03125]}>
          <boxGeometry args={[widthFt, 0.13, 0.0625]} />
          <meshStandardMaterial color={TOEKICK_CLR} roughness={0.90} metalness={0} />
        </mesh>
      )}
    </group>
  );
}
