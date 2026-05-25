"use client";

import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import usePlannerStore from "@/store/plannerStore";
import { COUNTER_THICK } from "@/lib/planner/layoutPresets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFrontDir(xFt, zFt, widthFt, roomW, roomL) {
  const T = 0.6;
  if (zFt <= T)                   return "z+";
  if (xFt <= T)                   return "x+";
  if (xFt + widthFt >= roomW - T) return "x-";
  return "z+";
}

function getFacePlane(widthFt, depthFt, heightFt, dir) {
  switch (dir) {
    case "x+":
      return { pos: [widthFt  / 2 + 0.005, 0, 0], rot: [0,  Math.PI / 2, 0], faceW: depthFt,  faceH: heightFt };
    case "x-":
      return { pos: [-widthFt / 2 - 0.005, 0, 0], rot: [0, -Math.PI / 2, 0], faceW: depthFt,  faceH: heightFt };
    default:
      return { pos: [0, 0, depthFt / 2 + 0.005],  rot: [0, 0, 0],            faceW: widthFt,  faceH: heightFt };
  }
}

// ─── Visual constants (all in feet) ──────────────────────────────────────────

const GAP        = 0.014;   // gap between adjacent panels
const MARG       = 0.018;   // perimeter margin inset from cabinet edge
const BACK_D     = 0.010;   // door frame slab depth
const FRONT_D    = 0.018;   // shaker raised-panel extra depth  (total ≈ 0.028 ft ≈ 8.5 mm)
const FRAME_W    = 0.060;   // shaker frame border width (~0.72")
const HDL_R      = 0.013;   // bar handle radius (~0.16" — slender European pull)
const HDL_LEN    = 0.36;    // max bar length (~4.3")
const HDL_GAP    = 0.030;   // handle stand-off from door face
const POST_R     = 0.017;   // mount post radius (slightly wider than bar)
const POST_LEN   = 0.022;   // mount post length (short bracket)
const SHELF_GAP  = 0.100;   // tall-unit shelf-divider band height

// ── Palette — realistic shaker-white / warm cream finish ──────────────────────
// Cabinet body deliberately matches the door frame so the whole unit reads as one
// uniform painted surface (as in a real kitchen — no category indicator tinting).
const BODY_CLR    = "#d4cfc8";  // cabinet body — warm taupe matte
const FRAME_CLR   = "#d4cfc8";  // door frame slab — same as body
const PANEL_CLR   = "#f2ede4";  // raised inner panel — noticeably lighter/smoother
const DRAWER_CLR  = "#dbd7d0";  // drawer front face
const METAL_CLR   = "#b4bbc3";  // brushed stainless steel (cooler grey)
const SHELF_CLR   = "#bcb8b1";  // shelf divider band
const TOEKICK_CLR = "#252220";  // very dark recess — standard on modern kitchens

// ─── BarHandle — slender bar + two tapered mounting brackets ──────────────────
//
//  x, y      — handle centre in face-local plane
//  len       — bar length
//  horizontal — true: bar runs along local X  (drawer / wall-cabinet style)
//               false: bar runs along local Y  (base / tall vertical style)
//
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
      {/* Bar */}
      <mesh castShadow position={[x, y, barZ]} rotation={barRot}>
        <cylinderGeometry args={[HDL_R, HDL_R, len, 14]} />
        <meshStandardMaterial color={METAL_CLR} roughness={0.08} metalness={0.92} />
      </mesh>

      {/* Tapered mounting brackets at each bar end */}
      {showPosts && [p1, p2].map(([px, py, pz], k) => (
        <mesh key={k} castShadow position={[px, py, pz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[POST_R, POST_R * 0.80, POST_LEN, 8]} />
          <meshStandardMaterial color={METAL_CLR} roughness={0.10} metalness={0.90} />
        </mesh>
      ))}
    </>
  );
}

// ─── ShakerDoorRow ────────────────────────────────────────────────────────────
//
//  Renders numDoors shaker-style panels side by side.
//
//  wallStyle = true  (Wall Cabinets)
//    → short horizontal bar near the BOTTOM of each door — reach up and pull
//      the door toward you.
//  wallStyle = false (Base / Tall)
//    → vertical bar at the inner latch edge of each door.
//
function ShakerDoorRow({ sW, sH, sV, numDoors, wallStyle, keyPfx }) {
  if (sH < 0.12 || numDoors <= 0) return null;

  const panelW = (sW - GAP * (numDoors - 1)) / numDoors;

  return (
    <>
      {Array.from({ length: numDoors }, (_, i) => {
        // Face-local horizontal centre of this panel
        const h         = -sW / 2 + panelW / 2 + i * (panelW + GAP);
        // Latch side: left-half doors open right (sign=+1), right-half open left
        const latchSign = i < numDoors / 2 ? 1 : -1;

        // Shaker inner panel — only rendered when the framing border leaves a
        // visible centre area (very narrow fillers skip it)
        const innerW   = panelW - GAP * 0.5 - FRAME_W * 2;
        const innerH   = sH    - GAP * 0.5 - FRAME_W * 2;
        const hasInner = innerW > 0.06 && innerH > 0.08;

        // Handle length: wall = width-proportional, others = height-proportional
        const hLen = wallStyle
          ? Math.min(panelW * 0.52, HDL_LEN * 0.85)
          : Math.min(sH    * 0.26,  HDL_LEN);

        // Handle position
        const hX = wallStyle ? 0              : panelW * 0.38 * latchSign;
        const hY = wallStyle ? -sH / 2 + 0.06 : 0;

        return (
          <group key={`${keyPfx}-${i}`} position={[h, sV, 0]}>
            {/* Frame slab — full door face, matte painted */}
            <mesh castShadow position={[0, 0, BACK_D / 2]}>
              <boxGeometry args={[panelW - GAP * 0.5, sH - GAP * 0.5, BACK_D]} />
              <meshStandardMaterial color={FRAME_CLR} roughness={0.55} metalness={0.0} />
            </mesh>

            {/* Raised shaker centre panel — lighter and slightly shinier */}
            {hasInner && (
              <mesh castShadow position={[0, 0, BACK_D + FRONT_D / 2]}>
                <boxGeometry args={[innerW, innerH, FRONT_D]} />
                <meshStandardMaterial color={PANEL_CLR} roughness={0.20} metalness={0.02} />
              </mesh>
            )}

            <BarHandle x={hX} y={hY} len={hLen} horizontal={wallStyle} />
          </group>
        );
      })}
    </>
  );
}

// ─── DrawerRow ────────────────────────────────────────────────────────────────
//
//  Renders numDrawers flush-style drawer fronts stacked top → bottom.
//  Each gets a centred horizontal bar handle.
//
function DrawerRow({ sW, sH, sV, numDrawers, keyPfx }) {
  if (sH < 0.06 || numDrawers <= 0) return null;

  const dH   = (sH - GAP * (numDrawers - 1)) / numDrawers;
  const hLen = Math.min(sW * 0.40, HDL_LEN);

  return (
    <>
      {Array.from({ length: numDrawers }, (_, j) => {
        const v = sV + sH / 2 - dH / 2 - j * (dH + GAP);
        return (
          <group key={`${keyPfx}-${j}`} position={[0, v, 0]}>
            <mesh castShadow position={[0, 0, (BACK_D + FRONT_D) / 2]}>
              <boxGeometry args={[sW - GAP * 0.5, dH - GAP * 0.5, BACK_D + FRONT_D]} />
              <meshStandardMaterial color={DRAWER_CLR} roughness={0.48} metalness={0.0} />
            </mesh>
            <BarHandle x={0} y={0} len={hLen} horizontal={true} />
          </group>
        );
      })}
    </>
  );
}

// ─── CabinetFront ─────────────────────────────────────────────────────────────
//
//  Routes to the correct door/drawer layout based on cabinet category.
//
//  BASE CABINETS   — optional drawers top 28%, shaker doors below;
//                    vertical bar at inner latch edge.
//  WALL CABINETS   — shaker doors only; horizontal bar near door bottom
//                    (natural grip when reaching overhead).
//  TALL UNITS      — split at counter height (3 ft from floor) into lower
//                    (~35") and upper (~47") sections; shelf band marks split;
//                    vertical bar handles on both sections.
//
function CabinetFront({ faceW, faceH, pos, rot, doors, drawers, category }) {
  const isTall = category === "Tall Units";
  const isWall = category === "Wall Cabinets";

  const usableW = faceW - MARG * 2;
  const vBot    = -(faceH / 2 - MARG);
  const vTop    =  (faceH / 2 - MARG);
  const usableH = vTop - vBot;

  // ── TALL UNIT ─────────────────────────────────────────────────────────────
  if (isTall) {
    // Counter height (3 ft from floor) in face-local v coords.
    // Face v=0 is at faceH/2 above floor → shelfV = 3.0 − faceH/2
    const shelfV   = 3.0 - faceH / 2;          // −0.5 ft for standard 7 ft unit
    const shelfTop = shelfV + SHELF_GAP / 2;
    const shelfBot = shelfV - SHELF_GAP / 2;

    const lowerH = Math.max(0, shelfBot - vBot); // ~2.88 ft — mirrors base cabinet
    const lowerV = vBot + lowerH / 2;

    const upperH = Math.max(0, vTop - shelfTop); // ~3.88 ft — pantry upper section
    const upperV = shelfTop + upperH / 2;

    const doorsPerSection = doors != null
      ? Math.max(1, Math.round(doors / 2))
      : Math.max(1, Math.round(faceW / 1.5));

    return (
      <group position={pos} rotation={rot}>
        {/* Shelf divider band at counter height */}
        <mesh castShadow position={[0, shelfV, BACK_D / 2]}>
          <boxGeometry args={[usableW, SHELF_GAP - GAP * 0.5, BACK_D]} />
          <meshStandardMaterial color={SHELF_CLR} roughness={0.60} metalness={0.0} />
        </mesh>
        <ShakerDoorRow sW={usableW} sH={lowerH} sV={lowerV} numDoors={doorsPerSection} wallStyle={false} keyPfx="tl" />
        <ShakerDoorRow sW={usableW} sH={upperH} sV={upperV} numDoors={doorsPerSection} wallStyle={false} keyPfx="tu" />
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
        <ShakerDoorRow sW={usableW} sH={usableH} sV={0} numDoors={numDoors} wallStyle={true} keyPfx="w" />
      </group>
    );
  }

  // ── BASE CABINET ──────────────────────────────────────────────────────────
  const numDoors   = doors   != null ? Math.max(0, doors)   : Math.max(1, Math.round(faceW / 1.5));
  const numDrawers = drawers != null ? Math.max(0, drawers) : 0;

  if (numDoors === 0 && numDrawers === 0) return null;

  // Drawers occupy top 28% of usable height; doors fill the rest below
  const drawerH = numDrawers > 0 ? usableH * 0.28 : 0;
  const doorH   = numDoors   > 0 ? usableH - drawerH - (numDrawers > 0 ? GAP : 0) : 0;

  return (
    <group position={pos} rotation={rot}>
      <ShakerDoorRow sW={usableW} sH={doorH}   sV={vBot + doorH   / 2} numDoors={numDoors}   wallStyle={false} keyPfx="b"  />
      <DrawerRow     sW={usableW} sH={drawerH} sV={vTop - drawerH / 2} numDrawers={numDrawers} keyPfx="bd" />
    </group>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Scene3DCabinet({
  cabinet,
  roomWidthFt  = 20,
  roomLengthFt = 20,
}) {
  const meshRef  = useRef(null);
  const [hovered, setHovered] = useState(false);

  const selectedItemId  = usePlannerStore((s) => s.selectedItemId);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);
  const removeItem      = usePlannerStore((s) => s.removeItem);

  const isSelected = selectedItemId === cabinet.id;

  const { widthFt, depthFt, heightFt } = cabinet.dimensions;
  const { xFt, yFt, zFt }             = cabinet.position;

  const cx = xFt + widthFt / 2;
  const cy = yFt + heightFt / 2;
  const cz = zFt + depthFt  / 2;

  const isFloorCabinet =
    cabinet.category !== "Wall Cabinets" && cabinet.category !== "Tall Units";

  // Body uses a single realistic paint colour — not the category indicator tint.
  // Real kitchens have all cabinets in one consistent finish.
  const fillColor = isSelected ? "#0ea5e9" : hovered ? "#c2bdb7" : BODY_CLR;
  // Edge lines are close to body tone so they define shape without harsh contrast.
  const edgeColor = isSelected ? "#0284c7" : "#908c87";

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(widthFt, heightFt, depthFt)),
    [widthFt, heightFt, depthFt]
  );

  const frontDir  = getFrontDir(xFt, zFt, widthFt, roomWidthFt, roomLengthFt);
  const facePlane = getFacePlane(widthFt, depthFt, heightFt, frontDir);

  return (
    <group
      position={[cx, cy, cz]}
      rotation={[0, (cabinet.rotation?.yDeg ?? 0) * (Math.PI / 180), 0]}
      onClick={(e) => { e.stopPropagation(); setSelectedItem(cabinet.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); removeItem(cabinet.id); }}
    >
      {/* Cabinet body — solid matte painted finish */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        <meshStandardMaterial
          color={fillColor}
          roughness={cabinet.material?.roughness ?? 0.68}
          metalness={cabinet.material?.metalness ?? 0.0}
        />
      </mesh>

      {/* Edge definition lines */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>

      {/* Selection wireframe */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[widthFt + 0.06, heightFt + 0.06, depthFt + 0.06]} />
          <meshBasicMaterial color="#0ea5e9" wireframe />
        </mesh>
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
            style={{ backgroundColor: isSelected ? "#0ea5e9" : "#44403c", opacity: 0.95 }}
          >
            {cabinet.name}
            {isSelected && <span className="ml-1 opacity-70 text-[9px]">· dbl-click to remove</span>}
          </div>
        </Html>
      )}

      {/* Countertop — polished stone / quartz surface */}
      {isFloorCabinet && (
        <mesh position={[0, heightFt / 2 + COUNTER_THICK / 2, depthFt * 0.04]} castShadow>
          <boxGeometry args={[widthFt + 0.04, COUNTER_THICK, depthFt + 0.08]} />
          <meshStandardMaterial color="#b5afa8" roughness={0.15} metalness={0.05} />
        </mesh>
      )}

      {/* Toe-kick — dark recess at floor level */}
      {isFloorCabinet && (
        <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.03125]}>
          <boxGeometry args={[widthFt, 0.13, 0.0625]} />
          <meshStandardMaterial color={TOEKICK_CLR} roughness={0.90} metalness={0} />
        </mesh>
      )}
    </group>
  );
}
