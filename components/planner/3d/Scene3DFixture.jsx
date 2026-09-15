"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import usePlannerStore from "@/store/plannerStore";
import { COUNTER_THICK } from "@/lib/planner/layoutPresets";

// ─── Direction helper ──────────────────────────────────────────────────────────

/**
 * Returns all face-dependent geometry parameters for the oven door, handle,
 * control panel, and knobs based on which wall the fixture is on.
 *
 * faceDir:
 *   "z+"  — back wall (base-north), fixture faces south  [default]
 *   "x+"  — west wall (base-west),  fixture faces east
 *   "x-"  — east wall (base-east),  fixture faces west
 */
function getFrontGeom(faceDir, widthFt, depthFt, heightFt) {
  const doorH = heightFt * 0.68;
  const doorY = -heightFt / 2 + 0.15 + doorH / 2;

  if (faceDir === "x+") {         // west wall → faces east
    const fw = depthFt;           // face width = cabinet extent along Z
    return {
      doorPos:   [widthFt / 2 + 0.006, doorY, 0],
      doorSize:  [0.012, doorH, fw - 0.10],
      hdlPos:    [widthFt / 2 + 0.030, doorY + doorH * 0.38, 0],
      hdlRot:    [Math.PI / 2, 0, 0],       // cylinder along Z
      hdlLen:    fw * 0.70,
      panelPos:  [widthFt / 2 + 0.004, heightFt / 2 - 0.12, 0],
      panelSize: [0.007, 0.20, fw - 0.06],
      knobSpan:  fw,
      knobPos:   (k) => [widthFt / 2 + 0.016, heightFt / 2 - 0.12, k],
      knobRot:   [0, 0, -Math.PI / 2],      // cylinder protrudes toward x+
    };
  }

  if (faceDir === "x-") {         // east wall → faces west
    const fw = depthFt;
    return {
      doorPos:   [-widthFt / 2 - 0.006, doorY, 0],
      doorSize:  [0.012, doorH, fw - 0.10],
      hdlPos:    [-widthFt / 2 - 0.030, doorY + doorH * 0.38, 0],
      hdlRot:    [Math.PI / 2, 0, 0],
      hdlLen:    fw * 0.70,
      panelPos:  [-widthFt / 2 - 0.004, heightFt / 2 - 0.12, 0],
      panelSize: [0.007, 0.20, fw - 0.06],
      knobSpan:  fw,
      knobPos:   (k) => [-widthFt / 2 - 0.016, heightFt / 2 - 0.12, k],
      knobRot:   [0, 0, Math.PI / 2],       // cylinder protrudes toward x-
    };
  }

  // "z+" default — back wall (base-north), faces south
  const fw = widthFt;             // face width = cabinet extent along X
  return {
    doorPos:   [0, doorY, depthFt / 2 + 0.004],
    doorSize:  [fw - 0.10, doorH, 0.012],
    hdlPos:    [0, doorY + doorH * 0.38, depthFt / 2 + 0.026],
    hdlRot:    [0, 0, Math.PI / 2],          // cylinder along X
    hdlLen:    fw * 0.70,
    panelPos:  [0, heightFt / 2 - 0.12, depthFt / 2 + 0.003],
    panelSize: [fw - 0.06, 0.20, 0.007],
    knobSpan:  fw,
    knobPos:   (k) => [k, heightFt / 2 - 0.12, depthFt / 2 + 0.014],
    knobRot:   [Math.PI / 2, 0, 0],          // cylinder protrudes toward z+
  };
}

// ─── Sink geometry ─────────────────────────────────────────────────────────────
//
// Premium undermount single-bowl stainless steel sink with:
//  • Thick brushed stainless rim + basin walls (16-gauge gauge look)
//  • Deep basin with visible bottom, angled walls, rolled drain
//  • Basket strainer drain with crosshair grill + collar ring
//  • Slender high-arc gooseneck faucet (smooth 12-sided tube)
//  • Deck-mounted side-lever hot/cold handles with proper lever geometry
//  • Single-hole spout base with decorative ring collar
//  • Spray head spout tip cylinder at faucet end
//  • Direction-aware: works on z+, x+, x- cabinet orientations
//  • Integrated dishwasher panel beside the sink basin

function SinkMesh({ widthFt, heightFt, depthFt, hovered, faceDir = "z+", hasDishwasher = false }) {
  // ── Color palette ────────────────────────────────────────────────────────────
  const bodyColor    = hovered ? "#cce0fc" : "#e0dbd4";
  const counterColor = "#c4bbb0";
  const STEEL_CLR    = "#c0c8cc";   // brushed stainless rim/outer — cool bright
  const STEEL_MID    = "#9aA2a6";   // rim edge / basin upper walls
  const STEEL_DARK   = "#6e7880";   // basin interior walls — depth shadow
  const BASIN_FLOOR  = "#4c5458";   // basin floor — darkest for recess depth
  const DRAIN_CLR    = "#303638";   // drain — near-black stainless
  const FAUCET_CLR   = "#d0dade";   // polished high-chrome faucet
  const FAUCET_DARK  = "#9ab0b8";   // faucet shadow joints / tip
  const DW_CLR       = "#d6d2cc";   // dishwasher panel (matches cabinet)
  const DW_CTRL      = "#282624";   // control strip — very dark charcoal

  // Dishwasher open/close state
  const [dwOpen, setDwOpen] = useState(false);

  // ── Layout split: sink side vs dishwasher side ───────────────────────────────
  // Total cabinet width is shared: sink gets left portion, DW gets right portion.
  // Standard 24" DW = 2.0 ft; remainder goes to sink cabinet.
  const DW_W     = hasDishwasher ? Math.min(widthFt * 0.44, 2.0) : 0;
  const SINK_W   = widthFt - DW_W;
  // Each panel is centered in its own half; offsets from fixture center
  const isNS    = faceDir === "z+" || faceDir === "z-";
  // For NS (north wall, z+): split runs along X axis
  // For EW (west/east wall): split runs along Z axis
  const sinkCtrX = isNS ? (-DW_W / 2)           : 0;
  const sinkCtrZ = isNS ? 0                      : (-DW_W / 2);
  const dwCtrX   = isNS ? (SINK_W / 2)           : 0;
  const dwCtrZ   = isNS ? 0                      : (SINK_W / 2);

  // ── Basin dimensions (sits in sink half only) ────────────────────────────────
  // Undermount single-bowl: 68% of sink-section width, 62% of depth, 8" deep
  const basinW    = SINK_W * 0.68;
  const basinD    = depthFt * 0.62;
  const basinH    = 0.66;             // ~8" deep bowl
  const rimThick  = 0.022;            // 16-gauge stainless rim thickness
  const wallThick = 0.016;            // basin side wall
  // In local sink-section space: basin centered on sinkCtrX / sinkCtrZ
  const basinTopY = heightFt / 2;     // flush with underside of countertop
  const basinBotY = basinTopY - basinH;
  const basinCtrY = basinTopY - basinH / 2;
  // Basin center in fixture-local coords
  const bsnX = isNS ? sinkCtrX : 0;
  const bsnZ = isNS ? 0        : sinkCtrZ;

  // ── Faucet geometry — high-arc gooseneck, deck-mounted ───────────────────────
  const faucetGeo = useMemo(() => {
    const by  = heightFt / 2 + COUNTER_THICK + 0.010;
    const rH  = 0.36;   // ~14" rise
    const fwd = 0.20;   // forward reach
    let curve;
    if (faceDir === "x+") {
      // West wall — faucet foot behind basin (toward wall = negative X), arc forward (+X)
      const fx = bsnX - SINK_W * 0.24;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(fx,            by,           bsnZ),
        new THREE.Vector3(fx,            by + 0.07,    bsnZ),
        new THREE.Vector3(fx,            by + rH,      bsnZ),
        new THREE.Vector3(fx + fwd*0.5,  by + rH+0.04, bsnZ),
        new THREE.Vector3(fx + fwd,      by + rH-0.02, bsnZ),
        new THREE.Vector3(fx + fwd+0.05, by + rH-0.09, bsnZ),
      ]);
    } else if (faceDir === "x-") {
      // East wall — foot behind basin (+X), arc forward (-X)
      const fx = bsnX + SINK_W * 0.24;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(fx,            by,           bsnZ),
        new THREE.Vector3(fx,            by + 0.07,    bsnZ),
        new THREE.Vector3(fx,            by + rH,      bsnZ),
        new THREE.Vector3(fx - fwd*0.5,  by + rH+0.04, bsnZ),
        new THREE.Vector3(fx - fwd,      by + rH-0.02, bsnZ),
        new THREE.Vector3(fx - fwd-0.05, by + rH-0.09, bsnZ),
      ]);
    } else {
      // North wall (z+) — foot toward wall (-Z), arc forward (+Z)
      const fz = bsnZ - depthFt * 0.26;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(bsnX, by,           fz),
        new THREE.Vector3(bsnX, by + 0.07,    fz),
        new THREE.Vector3(bsnX, by + rH,      fz),
        new THREE.Vector3(bsnX, by + rH+0.04, fz + fwd*0.5),
        new THREE.Vector3(bsnX, by + rH-0.02, fz + fwd),
        new THREE.Vector3(bsnX, by + rH-0.09, fz + fwd+0.05),
      ]);
    }
    return new THREE.TubeGeometry(curve, 28, 0.010, 12, false);
  }, [heightFt, depthFt, faceDir, bsnX, bsnZ, SINK_W]);

  // Spout tip coords (bottom of aerator)
  const spoutTip = useMemo(() => {
    const by = heightFt / 2 + COUNTER_THICK + 0.010;
    const rH = 0.36; const fwd = 0.20;
    if (faceDir === "x+") {
      const fx = bsnX - SINK_W * 0.24;
      return [fx + fwd + 0.05, by + rH - 0.09, bsnZ];
    } else if (faceDir === "x-") {
      const fx = bsnX + SINK_W * 0.24;
      return [fx - fwd - 0.05, by + rH - 0.09, bsnZ];
    }
    const fz = bsnZ - depthFt * 0.26;
    return [bsnX, by + rH - 0.09, fz + fwd + 0.05];
  }, [heightFt, depthFt, faceDir, bsnX, bsnZ, SINK_W]);

  // ── Faucet deck base coords ───────────────────────────────────────────────────
  const mountY = heightFt / 2 + COUNTER_THICK;
  // Foot is on the wall side of the basin
  const fbx = faceDir === "x+" ? bsnX - SINK_W * 0.24
            : faceDir === "x-" ? bsnX + SINK_W * 0.24
            : bsnX;
  const fbz = isNS ? bsnZ - depthFt * 0.26 : bsnZ;
  // Handle offsets — perpendicular to faucet axis
  const hOX = isNS ? 0.10 : 0;
  const hOZ = isNS ? 0    : 0.10;

  return (
    <>
      {/* ── Sink cabinet carcass ──────────────────────────────────────────── */}
      <mesh castShadow receiveShadow position={[isNS ? sinkCtrX : 0, 0, isNS ? 0 : sinkCtrZ]}>
        <boxGeometry args={[isNS ? SINK_W : widthFt, heightFt, isNS ? depthFt : SINK_W]} />
        <meshStandardMaterial color={bodyColor} roughness={0.28} metalness={0.02} envMapIntensity={0.8} />
      </mesh>

      {/* ── Countertop slab over full fixture width (both sink + DW) ─────── */}
      {(() => {
        const OV   = 0.10;
        const sign = (faceDir === "z+" || faceDir === "x+") ? 1 : -1;
        const ctW  = isNS ? widthFt        : widthFt + OV;
        const ctD  = isNS ? depthFt + OV   : depthFt;
        const ctOX = isNS ? 0              : sign * OV / 2;
        const ctOZ = isNS ? sign * OV / 2  : 0;
        return (
          <mesh castShadow receiveShadow position={[ctOX, heightFt / 2 + COUNTER_THICK / 2, ctOZ]}>
            <boxGeometry args={[ctW, COUNTER_THICK, ctD]} />
            <meshStandardMaterial color={counterColor} roughness={0.08} metalness={0.06} envMapIntensity={2.4} />
          </mesh>
        );
      })()}

      {/* ── Sink basin — rim plate visible through countertop cutout ──────── */}
      {/* Outer stainless rim frame — bright brushed steel */}
      <mesh castShadow position={[bsnX, basinTopY - rimThick / 2, bsnZ]}>
        <boxGeometry args={[basinW, rimThick, basinD]} />
        <meshStandardMaterial color={STEEL_CLR} roughness={0.12} metalness={0.95} envMapIntensity={2.5} />
      </mesh>
      {/* Rim inner bevel — dark transition ring showing depth */}
      <mesh position={[bsnX, basinTopY - rimThick - 0.006, bsnZ]}>
        <boxGeometry args={[basinW - rimThick * 2, 0.012, basinD - rimThick * 2]} />
        <meshStandardMaterial color={STEEL_MID} roughness={0.18} metalness={0.92} envMapIntensity={2.0} />
      </mesh>

      {/* Basin floor — darkest, slight slope implied by lighter edge */}
      <mesh receiveShadow position={[bsnX, basinBotY + wallThick / 2, bsnZ]}>
        <boxGeometry args={[basinW - wallThick * 2, wallThick, basinD - wallThick * 2]} />
        <meshStandardMaterial color={BASIN_FLOOR} roughness={0.25} metalness={0.88} envMapIntensity={1.4} />
      </mesh>
      {/* Basin left wall */}
      <mesh position={[bsnX - (basinW / 2 - wallThick / 2), basinCtrY, bsnZ]}>
        <boxGeometry args={[wallThick, basinH - wallThick, basinD - wallThick * 2]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.18} metalness={0.92} envMapIntensity={1.6} />
      </mesh>
      {/* Basin right wall */}
      <mesh position={[bsnX + (basinW / 2 - wallThick / 2), basinCtrY, bsnZ]}>
        <boxGeometry args={[wallThick, basinH - wallThick, basinD - wallThick * 2]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.18} metalness={0.92} envMapIntensity={1.6} />
      </mesh>
      {/* Basin back wall */}
      <mesh position={[bsnX, basinCtrY, bsnZ - (basinD / 2 - wallThick / 2)]}>
        <boxGeometry args={[basinW - wallThick * 2, basinH - wallThick, wallThick]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.18} metalness={0.92} envMapIntensity={1.6} />
      </mesh>
      {/* Basin front wall */}
      <mesh position={[bsnX, basinCtrY, bsnZ + (basinD / 2 - wallThick / 2)]}>
        <boxGeometry args={[basinW - wallThick * 2, basinH - wallThick, wallThick]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.18} metalness={0.92} envMapIntensity={1.6} />
      </mesh>

      {/* ── Drain strainer ────────────────────────────────────────────────── */}
      <mesh position={[bsnX, basinBotY + wallThick + 0.009, bsnZ]}>
        <cylinderGeometry args={[0.048, 0.048, 0.018, 20]} />
        <meshStandardMaterial color={DRAIN_CLR} roughness={0.28} metalness={0.88} />
      </mesh>
      <mesh position={[bsnX, basinBotY + wallThick + 0.005, bsnZ]}>
        <cylinderGeometry args={[0.034, 0.034, 0.010, 20]} />
        <meshStandardMaterial color="#18202280" roughness={0.50} metalness={0.70} />
      </mesh>
      <mesh position={[bsnX, basinBotY + wallThick + 0.016, bsnZ]}>
        <torusGeometry args={[0.038, 0.005, 8, 20]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.18} metalness={0.92} />
      </mesh>
      {[-0.012, 0, 0.012].map((off, k) => (
        <mesh key={`gx${k}`} position={[bsnX + off, basinBotY + wallThick + 0.017, bsnZ]}>
          <boxGeometry args={[0.003, 0.003, 0.064]} />
          <meshStandardMaterial color={DRAIN_CLR} roughness={0.22} metalness={0.88} />
        </mesh>
      ))}
      {[-0.012, 0, 0.012].map((off, k) => (
        <mesh key={`gz${k}`} position={[bsnX, basinBotY + wallThick + 0.017, bsnZ + off]}>
          <boxGeometry args={[0.064, 0.003, 0.003]} />
          <meshStandardMaterial color={DRAIN_CLR} roughness={0.22} metalness={0.88} />
        </mesh>
      ))}

      {/* ── Gooseneck faucet tube ─────────────────────────────────────────── */}
      <mesh castShadow geometry={faucetGeo}>
        <meshStandardMaterial color={FAUCET_CLR} roughness={0.04} metalness={0.97} envMapIntensity={2.8} />
      </mesh>

      {/* Spout aerator tip — stepped nozzle */}
      <mesh castShadow position={spoutTip}>
        <cylinderGeometry args={[0.014, 0.018, 0.030, 16]} />
        <meshStandardMaterial color={FAUCET_DARK} roughness={0.12} metalness={0.94} envMapIntensity={2.0} />
      </mesh>
      {/* Aerator screen face */}
      <mesh position={[spoutTip[0], spoutTip[1] - 0.016, spoutTip[2]]}>
        <cylinderGeometry args={[0.012, 0.012, 0.005, 16]} />
        <meshStandardMaterial color="#1c2426" roughness={0.55} metalness={0.65} />
      </mesh>

      {/* ── Faucet deck base — multi-piece escutcheon ───────────────────────── */}
      {/* Base plate */}
      <mesh position={[fbx, mountY + 0.003, fbz]}>
        <cylinderGeometry args={[0.034, 0.040, 0.007, 20]} />
        <meshStandardMaterial color={FAUCET_CLR} roughness={0.05} metalness={0.97} envMapIntensity={2.4} />
      </mesh>
      {/* Decorative collar ring */}
      <mesh position={[fbx, mountY + 0.010, fbz]}>
        <torusGeometry args={[0.024, 0.004, 8, 20]} />
        <meshStandardMaterial color={FAUCET_DARK} roughness={0.08} metalness={0.96} envMapIntensity={2.2} />
      </mesh>
      {/* Stem riser */}
      <mesh position={[fbx, mountY + 0.037, fbz]}>
        <cylinderGeometry args={[0.014, 0.020, 0.056, 16]} />
        <meshStandardMaterial color={FAUCET_CLR} roughness={0.04} metalness={0.97} envMapIntensity={2.8} />
      </mesh>

      {/* ── Side-lever handles (hot/cold) ────────────────────────────────── */}
      {[-1, 1].map((side) => {
        const hbx = fbx + side * hOX;
        const hbz = fbz + side * hOZ;
        const lLen  = 0.076;
        const lRot  = isNS ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
        const lPos  = isNS
          ? [0, 0.036, lLen / 2 * side]
          : [lLen / 2 * side, 0.036, 0];
        const capPos = isNS
          ? [0, 0.036, (lLen / 2 + 0.010) * side]
          : [(lLen / 2 + 0.010) * side, 0.036, 0];
        return (
          <group key={side} position={[hbx, mountY, hbz]}>
            {/* Handle base disk */}
            <mesh position={[0, 0.004, 0]}>
              <cylinderGeometry args={[0.018, 0.020, 0.008, 16]} />
              <meshStandardMaterial color={FAUCET_CLR} roughness={0.05} metalness={0.97} envMapIntensity={2.4} />
            </mesh>
            {/* Handle stem */}
            <mesh position={[0, 0.022, 0]}>
              <cylinderGeometry args={[0.010, 0.013, 0.026, 14]} />
              <meshStandardMaterial color={FAUCET_CLR} roughness={0.05} metalness={0.97} envMapIntensity={2.4} />
            </mesh>
            {/* Lever arm */}
            <mesh position={lPos} rotation={lRot}>
              <cylinderGeometry args={[0.005, 0.009, lLen, 12]} />
              <meshStandardMaterial color={FAUCET_CLR} roughness={0.05} metalness={0.97} envMapIntensity={2.4} />
            </mesh>
            {/* Lever end cap */}
            <mesh position={capPos}>
              <sphereGeometry args={[0.010, 12, 12]} />
              <meshStandardMaterial color={FAUCET_DARK} roughness={0.08} metalness={0.96} />
            </mesh>
          </group>
        );
      })}

      {/* ── Integrated Dishwasher panel (right/south side of the unit) ────── */}
      {hasDishwasher && (() => {
        // DW carcass body — occupies the DW_W portion of the unit
        const dwDoorH = heightFt * 0.82;
        const dwDoorY = -heightFt / 2 + 0.085 + dwDoorH / 2;
        // Front face position (Z or X depending on orientation)
        const frontOffset = 0.007;
        const dwFrontZ = isNS ? depthFt / 2 + frontOffset : 0;
        const dwFrontX = isNS ? dwCtrX : (faceDir === "x+" ? widthFt / 2 + frontOffset : -widthFt / 2 - frontOffset);
        const dwPanelW = isNS ? DW_W - 0.04 : 0.010;
        const dwPanelD = isNS ? 0.010       : depthFt * 0.40;
        const hdlLen   = isNS ? DW_W * 0.70 : depthFt * 0.32;
        const hdlRot   = isNS ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
        const hdlY     = dwDoorY + dwDoorH * 0.42;

        return (
          <group onClick={(e) => { e.stopPropagation(); setDwOpen((o) => !o); }}>
            {/* DW carcass — same color as cabinet body */}
            <mesh castShadow receiveShadow position={[isNS ? dwCtrX : 0, 0, isNS ? 0 : dwCtrZ]}>
              <boxGeometry args={[isNS ? DW_W : widthFt, heightFt, isNS ? depthFt : DW_W]} />
              <meshStandardMaterial color={bodyColor} roughness={0.30} metalness={0.02} />
            </mesh>

            {/* DW front door panel — slightly proud of cabinet face */}
            <mesh castShadow position={[dwFrontX, dwDoorY, dwFrontZ]}>
              <boxGeometry args={[dwPanelW, dwDoorH, dwPanelD]} />
              <meshStandardMaterial color={DW_CLR} roughness={0.22} metalness={0.05} envMapIntensity={0.9} />
            </mesh>

            {/* Control strip at top of DW door */}
            <mesh position={[
              isNS ? dwCtrX : dwFrontX + (faceDir === "x+" ? 0.002 : -0.002),
              dwDoorY + dwDoorH / 2 - 0.055,
              isNS ? dwFrontZ + 0.002 : dwCtrZ,
            ]}>
              <boxGeometry args={[
                isNS ? DW_W - 0.06 : 0.007,
                0.090,
                isNS ? 0.007 : depthFt * 0.38,
              ]} />
              <meshStandardMaterial color={DW_CTRL} roughness={0.30} metalness={0.20} />
            </mesh>

            {/* DW door handle bar */}
            <mesh castShadow
              position={[
                isNS ? dwCtrX : dwFrontX + (faceDir === "x+" ? 0.026 : -0.026),
                hdlY,
                isNS ? dwFrontZ + 0.020 : dwCtrZ,
              ]}
              rotation={hdlRot}
            >
              <cylinderGeometry args={[0.009, 0.009, hdlLen, 10]} />
              <meshStandardMaterial color="#a4aeb2" roughness={0.07} metalness={0.92} envMapIntensity={1.8} />
            </mesh>

            {/* LED status dots */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[
                isNS ? dwCtrX - DW_W * 0.18 + i * DW_W * 0.18 : dwFrontX,
                dwDoorY + dwDoorH / 2 - 0.030,
                isNS ? dwFrontZ + 0.004 : dwCtrZ,
              ]}>
                <sphereGeometry args={[0.005, 8, 8]} />
                <meshStandardMaterial
                  color={dwOpen ? "#22c55e" : "#5a6470"}
                  roughness={0.3} metalness={0.4}
                  emissive={dwOpen ? "#16a34a" : "#000000"}
                  emissiveIntensity={dwOpen ? 1.0 : 0}
                />
              </mesh>
            ))}

            {dwOpen && (
              <Html
                position={[isNS ? dwCtrX : (faceDir === "x+" ? dwFrontX + 0.18 : dwFrontX - 0.18), dwDoorY + dwDoorH / 2 + 0.10, isNS ? dwFrontZ : dwCtrZ]}
                center style={{ pointerEvents: "none" }}
              >
                <div className="px-2 py-0.5 rounded-full text-white text-[9px] font-semibold shadow-md bg-emerald-500 opacity-90 whitespace-nowrap">
                  Dishwasher · Open
                </div>
              </Html>
            )}
          </group>
        );
      })()}

      {/* ── Toe kick — full fixture width ─────────────────────────────────── */}
      <mesh position={[0, -heightFt / 2 + 0.060, isNS ? depthFt / 2 - 0.030 : 0]}>
        <boxGeometry args={[
          isNS ? widthFt - 0.01 : 0.055,
          0.120,
          isNS ? 0.055          : depthFt - 0.01,
        ]} />
        <meshStandardMaterial color="#121010" roughness={0.95} metalness={0} />
      </mesh>
    </>
  );
}

// ─── Range geometry ────────────────────────────────────────────────────────────
// Premium freestanding gas range with:
//  • Brushed stainless body with subtle vertical grain (side panels darker)
//  • Ultra-gloss black glass-ceramic cooktop
//  • 4 gas burners: each has 3 concentric cast-iron grate rings + center cap +
//    4-arm spider grate sitting on top
//  • Control panel: matte black fascia strip with 5 metal-dome knobs (hollow
//    center indicator ring) + digital clock display
//  • Oven door: frameless black glass + wide stainless border + thick bar handle
//    — pivots from bottom hinge on click (fully open = 90°)
//  • Oven interior: glow from emissive back wall + shelves visible when open
//  • Stainless backsplash / back-guard panel with brand logo strip
//  • Thin warming-drawer at the very bottom
//  • Direction-aware (z+, x+, x-)

function RangeMesh({ widthFt, heightFt, depthFt, hovered, faceDir = "z+" }) {
  const [ovenOpen, setOvenOpen] = useState(false);

  // ── Palette ───────────────────────────────────────────────────────────────
  const STEEL_MID   = hovered ? "#cce4ff" : "#c0c5c8";  // main body stainless
  const STEEL_DARK  = "#8e9598";                          // side/back panels
  const STEEL_TRIM  = "#a8b0b4";                          // trim strips
  const GLASS_TOP   = "#161210";                          // glass-ceramic cooktop
  const GRATE_CLR   = "#2a2420";                          // cast iron grate (very dark)
  const GRATE_MID   = "#3a3430";                          // grate inner ring
  const PANEL_STRIP = "#1e1c1a";                          // control fascia strip
  const KNOB_BODY   = "#4a4540";                          // knob outer body
  const KNOB_RING   = "#8a9298";                          // knob indicator ring metal
  const HDL_STEEL   = "#a4b0b6";                          // handle brushed chrome
  const OVEN_GLASS  = "#0e0c0a";                          // oven door glass
  const OVEN_INT    = "#2a1e12";                          // oven interior walls
  const OVEN_GLOW   = "#ff8c3a";                          // oven preheat glow

  const isNSDir   = faceDir === "z+" || faceDir === "z-";
  const wallSign  = (faceDir === "z+" || faceDir === "x-") ? -1 : 1;

  // Face-dependent geometry helpers
  const g = getFrontGeom(faceDir, widthFt, depthFt, heightFt);
  const knobSpacing = g.knobSpan / 5.5;
  const knobs = [-2, -1, 0, 1, 2].map((n) => n * knobSpacing * 0.5);

  // ── Burner positions (top face — direction-independent) ───────────────────
  const burners = [
    [-widthFt * 0.24,  depthFt * 0.20],
    [ widthFt * 0.24,  depthFt * 0.20],
    [-widthFt * 0.24, -depthFt * 0.16],
    [ widthFt * 0.24, -depthFt * 0.16],
  ];
  const bR   = Math.min(widthFt, depthFt) * 0.12;  // outer grate radius
  const topY = heightFt / 2;

  // ── Oven door dimensions ──────────────────────────────────────────────────
  const warmH  = 0.15;                               // warming drawer height
  const warmY  = -heightFt / 2 + warmH / 2;
  const doorH  = heightFt * 0.62;
  const doorY  = warmY + warmH / 2 + 0.04 + doorH / 2;
  const pivotY = doorY - doorH / 2;

  const doorOpenAngle = ovenOpen ? -Math.PI / 2 : 0;
  const doorPivotRot  = faceDir === "x+" ? [0, 0, doorOpenAngle]
                      : faceDir === "x-" ? [0, 0, -doorOpenAngle]
                      : [doorOpenAngle, 0, 0];
  const doorGroupPos  = faceDir === "x+" ? [widthFt / 2 + 0.004, pivotY, 0]
                      : faceDir === "x-" ? [-widthFt / 2 - 0.004, pivotY, 0]
                      : [0, pivotY, depthFt / 2 + 0.003];

  return (
    <>
      {/* ── Main stainless body ───────────────────────────────────────────── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthFt - 0.03, heightFt, depthFt - 0.02]} />
        <meshStandardMaterial color={STEEL_MID} roughness={0.20} metalness={0.68} envMapIntensity={1.2} />
      </mesh>

      {/* Side panels — darker brushed steel (shadow effect) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (widthFt / 2 - 0.008), 0, 0]}>
          <boxGeometry args={[0.014, heightFt - 0.01, depthFt - 0.03]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.22} metalness={0.72} />
        </mesh>
      ))}

      {/* ── Glass-ceramic cooktop surface ─────────────────────────────────── */}
      <mesh castShadow position={[0, topY + 0.006, 0]}>
        <boxGeometry args={[widthFt - 0.05, 0.012, depthFt - 0.05]} />
        <meshStandardMaterial color={GLASS_TOP} roughness={0.02} metalness={0.12} envMapIntensity={2.0} />
      </mesh>

      {/* ── Gas burner grates — 4 burners ─────────────────────────────────── */}
      {burners.map(([bx, bz], i) => (
        <group key={i}>
          {/* Outer concentric ring (large — outer grate support ring) */}
          <mesh position={[bx, topY + 0.016, bz]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bR, bR * 0.095, 8, 32]} />
            <meshStandardMaterial color={GRATE_CLR} roughness={0.82} metalness={0.18} />
          </mesh>
          {/* Mid ring — burner cap rim */}
          <mesh position={[bx, topY + 0.018, bz]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bR * 0.56, bR * 0.115, 7, 28]} />
            <meshStandardMaterial color={GRATE_MID} roughness={0.78} metalness={0.16} />
          </mesh>
          {/* Inner port ring — tiny innermost ring */}
          <mesh position={[bx, topY + 0.020, bz]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bR * 0.24, bR * 0.10, 6, 20]} />
            <meshStandardMaterial color={GRATE_CLR} roughness={0.85} metalness={0.12} />
          </mesh>
          {/* 4-arm spider grate — 2 cross bars */}
          <mesh position={[bx, topY + 0.022, bz]}>
            <boxGeometry args={[bR * 2.0, 0.016, bR * 0.18]} />
            <meshStandardMaterial color={GRATE_CLR} roughness={0.80} metalness={0.20} />
          </mesh>
          <mesh position={[bx, topY + 0.022, bz]}>
            <boxGeometry args={[bR * 0.18, 0.016, bR * 2.0]} />
            <meshStandardMaterial color={GRATE_CLR} roughness={0.80} metalness={0.20} />
          </mesh>
          {/* Center burner cap — flat disc */}
          <mesh position={[bx, topY + 0.026, bz]}>
            <cylinderGeometry args={[bR * 0.19, bR * 0.22, 0.018, 14]} />
            <meshStandardMaterial color={GRATE_MID} roughness={0.75} metalness={0.15} />
          </mesh>
        </group>
      ))}

      {/* ── Oven door — clickable, pivots from bottom hinge ──────────────── */}
      <group
        position={doorGroupPos}
        rotation={doorPivotRot}
        onClick={(e) => { e.stopPropagation(); setOvenOpen((o) => !o); }}
      >
        {faceDir === "z+" ? (
          <>
            {/* Stainless frame border around glass */}
            <mesh castShadow position={[0, doorH / 2, 0.001]}>
              <boxGeometry args={[g.doorSize[0], doorH, 0.020]} />
              <meshStandardMaterial color={STEEL_MID} roughness={0.18} metalness={0.72} envMapIntensity={1.4} />
            </mesh>
            {/* Black oven glass inset */}
            <mesh castShadow position={[0, doorH / 2, 0.013]}>
              <boxGeometry args={[g.doorSize[0] - 0.06, doorH - 0.06, 0.010]} />
              <meshStandardMaterial color={OVEN_GLASS} roughness={0.03} metalness={0.10} envMapIntensity={2.2} />
            </mesh>
            {/* Inner glass pane — amber tint when hot */}
            <mesh position={[0, doorH / 2, 0.018]}>
              <boxGeometry args={[g.doorSize[0] * 0.72, doorH * 0.60, 0.005]} />
              <meshStandardMaterial color={ovenOpen ? "#8b5e2a" : "#1a1410"} roughness={0.03} metalness={0.05} transparent opacity={ovenOpen ? 0.55 : 0.80} envMapIntensity={1.5} />
            </mesh>
            {/* Bar handle — thick polished chrome */}
            <mesh castShadow position={[0, doorH * 0.90, 0.038]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, g.hdlLen * 0.85, 14]} />
              <meshStandardMaterial color={HDL_STEEL} roughness={0.05} metalness={0.94} envMapIntensity={2.0} />
            </mesh>
            {/* Handle end caps */}
            {[-1, 1].map((s) => (
              <mesh key={s} castShadow position={[s * g.hdlLen * 0.425, doorH * 0.90, 0.038]}>
                <sphereGeometry args={[0.018, 12, 12]} />
                <meshStandardMaterial color={HDL_STEEL} roughness={0.05} metalness={0.94} />
              </mesh>
            ))}
            {/* Oven window interior glow when open */}
            {ovenOpen && (
              <mesh position={[0, doorH / 2, -0.05]}>
                <boxGeometry args={[g.doorSize[0] * 0.60, doorH * 0.50, 0.010]} />
                <meshStandardMaterial color={OVEN_GLOW} roughness={0.6} metalness={0} emissive={OVEN_GLOW} emissiveIntensity={0.8} />
              </mesh>
            )}
          </>
        ) : faceDir === "x+" ? (
          <>
            <mesh castShadow position={[0.001, doorH / 2, 0]}>
              <boxGeometry args={[0.020, doorH, g.doorSize[2]]} />
              <meshStandardMaterial color={STEEL_MID} roughness={0.18} metalness={0.72} envMapIntensity={1.4} />
            </mesh>
            <mesh castShadow position={[0.013, doorH / 2, 0]}>
              <boxGeometry args={[0.010, doorH - 0.06, g.doorSize[2] - 0.06]} />
              <meshStandardMaterial color={OVEN_GLASS} roughness={0.03} metalness={0.10} envMapIntensity={2.2} />
            </mesh>
            <mesh castShadow position={[0.038, doorH * 0.90, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, g.hdlLen * 0.85, 14]} />
              <meshStandardMaterial color={HDL_STEEL} roughness={0.05} metalness={0.94} envMapIntensity={2.0} />
            </mesh>
          </>
        ) : (
          <>
            <mesh castShadow position={[-0.001, doorH / 2, 0]}>
              <boxGeometry args={[0.020, doorH, g.doorSize[2]]} />
              <meshStandardMaterial color={STEEL_MID} roughness={0.18} metalness={0.72} envMapIntensity={1.4} />
            </mesh>
            <mesh castShadow position={[-0.013, doorH / 2, 0]}>
              <boxGeometry args={[0.010, doorH - 0.06, g.doorSize[2] - 0.06]} />
              <meshStandardMaterial color={OVEN_GLASS} roughness={0.03} metalness={0.10} envMapIntensity={2.2} />
            </mesh>
            <mesh castShadow position={[-0.038, doorH * 0.90, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, g.hdlLen * 0.85, 14]} />
              <meshStandardMaterial color={HDL_STEEL} roughness={0.05} metalness={0.94} envMapIntensity={2.0} />
            </mesh>
          </>
        )}
      </group>

      {/* Oven interior — visible from in front when door is open (z+ only) */}
      {ovenOpen && faceDir === "z+" && (() => {
        const iW = widthFt - 0.22;
        const iH = doorH - 0.14;
        const iD = depthFt - 0.20;
        const iy = doorY;
        return (
          <>
            {/* Interior back wall — glowing orange */}
            <mesh position={[0, iy, -depthFt / 2 + 0.14]}>
              <boxGeometry args={[iW, iH, 0.012]} />
              <meshStandardMaterial color={OVEN_GLOW} roughness={0.7} metalness={0} emissive={OVEN_GLOW} emissiveIntensity={0.5} />
            </mesh>
            {/* Interior sides */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * iW / 2, iy, -depthFt / 2 + 0.14 + iD / 2]}>
                <boxGeometry args={[0.012, iH, iD]} />
                <meshStandardMaterial color={OVEN_INT} roughness={0.60} metalness={0.05} emissive="#1a0a00" emissiveIntensity={0.3} />
              </mesh>
            ))}
            {/* Oven rack — wire grid */}
            <mesh position={[0, iy - iH * 0.18, -depthFt / 2 + 0.14 + iD / 2]}>
              <boxGeometry args={[iW - 0.06, 0.008, iD - 0.04]} />
              <meshStandardMaterial color="#4a3a28" roughness={0.55} metalness={0.35} />
            </mesh>
          </>
        );
      })()}

      {/* Open indicator tooltip */}
      {ovenOpen && (
        <Html position={[0, heightFt / 2 + 0.2, 0]} center style={{ pointerEvents: "none" }}>
          <div className="px-2 py-0.5 rounded-full text-white text-[9px] font-semibold shadow-md bg-orange-500 opacity-90 whitespace-nowrap">
            Oven · Open
          </div>
        </Html>
      )}

      {/* ── Control panel fascia strip ─────────────────────────────────────── */}
      <mesh castShadow position={g.panelPos}>
        <boxGeometry args={g.panelSize} />
        <meshStandardMaterial color={PANEL_STRIP} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Digital clock display — small rectangle in panel center */}
      {faceDir === "z+" && (
        <mesh position={[0, g.panelPos[1], g.panelPos[2] + g.panelSize[2] / 2 + 0.001]}>
          <boxGeometry args={[widthFt * 0.22, 0.055, 0.004]} />
          <meshStandardMaterial color="#0a1a14" roughness={0.3} metalness={0} emissive="#00ff80" emissiveIntensity={0.15} />
        </mesh>
      )}

      {/* ── Control knobs — 5 raised metal-dome knobs ─────────────────────── */}
      {knobs.map((k, i) => (
        <group key={i} position={g.knobPos(k)} rotation={g.knobRot}>
          {/* Outer knob body — slightly tapered cylinder */}
          <mesh>
            <cylinderGeometry args={[0.026, 0.022, 0.024, 16]} />
            <meshStandardMaterial color={KNOB_BODY} roughness={0.30} metalness={0.60} />
          </mesh>
          {/* Indicator ring — polished metal inset */}
          <mesh position={[0, 0.013, 0]}>
            <torusGeometry args={[0.016, 0.003, 6, 16]} />
            <meshStandardMaterial color={KNOB_RING} roughness={0.10} metalness={0.90} envMapIntensity={1.5} />
          </mesh>
          {/* Center indicator dot */}
          <mesh position={[0, 0.013, 0.016]}>
            <sphereGeometry args={[0.003, 6, 6]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* ── Back guard (stainless backsplash panel behind cooktop) ─────────── */}
      {(() => {
        const gH = 0.22;
        const gD = 0.038;
        const gPos = isNSDir
          ? [0, topY + gH / 2, wallSign * (depthFt / 2 - gD / 2)]
          : [wallSign * (widthFt / 2 - gD / 2), topY + gH / 2, 0];
        const gSize = isNSDir
          ? [widthFt - 0.03, gH, gD]
          : [gD, gH, depthFt - 0.03];
        return (
          <>
            <mesh castShadow position={gPos}>
              <boxGeometry args={gSize} />
              <meshStandardMaterial color={STEEL_MID} roughness={0.18} metalness={0.72} envMapIntensity={1.3} />
            </mesh>
            {/* Brand logo strip — thin matte bar near top of backsplash */}
            <mesh position={[gPos[0], gPos[1] + gH * 0.30, gPos[2]]}>
              <boxGeometry args={isNSDir ? [widthFt * 0.36, 0.018, gD + 0.001] : [gD + 0.001, 0.018, widthFt * 0.36]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.40} metalness={0.50} />
            </mesh>
          </>
        );
      })()}

      {/* ── Warming drawer — thin pull-out at bottom ──────────────────────── */}
      {isNSDir && (
        <>
          {/* Drawer face */}
          <mesh castShadow position={[0, warmY, depthFt / 2 + 0.003]}>
            <boxGeometry args={[widthFt - 0.05, warmH - 0.02, 0.016]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.20} metalness={0.68} envMapIntensity={1.2} />
          </mesh>
          {/* Drawer handle — slim bar */}
          <mesh castShadow position={[0, warmY + warmH * 0.20, depthFt / 2 + 0.026]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.007, 0.007, widthFt * 0.60, 10]} />
            <meshStandardMaterial color={HDL_STEEL} roughness={0.06} metalness={0.92} envMapIntensity={1.8} />
          </mesh>
          {/* Divider line above warming drawer */}
          <mesh position={[0, warmY + warmH / 2, depthFt / 2 + 0.004]}>
            <boxGeometry args={[widthFt - 0.05, 0.006, 0.006]} />
            <meshStandardMaterial color={STEEL_TRIM} roughness={0.25} metalness={0.65} />
          </mesh>
        </>
      )}

      {/* ── Toe kick ──────────────────────────────────────────────────────── */}
      <mesh position={[0, -heightFt / 2 + 0.060, isNSDir ? depthFt / 2 - 0.030 : 0]}>
        <boxGeometry args={[isNSDir ? widthFt - 0.04 : 0.055, 0.12, isNSDir ? 0.060 : depthFt - 0.04]} />
        <meshStandardMaterial color="#1a1614" roughness={0.95} metalness={0} />
      </mesh>
    </>
  );
}

// ─── Refrigerator geometry ─────────────────────────────────────────────────────
//
// Premium French-door refrigerator with:
//  • Tall brushed stainless body — high metalness + subtle side shadowing
//  • Vertical brushed grain lines across front for stainless texture
//  • Two upper French-door panels — each independently openable (click)
//    - Left: water/ice dispenser with paddle buttons + digital display
//    - Right: clean stainless panel
//  • Chunky vertical bar handles + hinge plates
//  • Thick rubber door gasket (dark seal edge visible)
//  • Interior visible when open: LED strip + 3 wire shelves + drawer bins
//  • Lower pull-out freezer drawer — animated slide-out
//  • Fridge-freezer divider rail
//  • Top compressor vent grill (horizontal slats)
//  • Toe kick recess
//  • Direction-aware (z+, x+, x-)

function RefrigeratorMesh({ widthFt, heightFt, depthFt, hovered, faceDir = "z+" }) {
  const [leftDoorOpen,  setLeftDoorOpen]  = useState(false);
  const [rightDoorOpen, setRightDoorOpen] = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);

  // ── Palette ───────────────────────────────────────────────────────────────
  const BODY_STEEL  = hovered ? "#cce4ff" : "#bec4c8";   // main brushed stainless
  const BODY_DARK   = "#8e9498";                           // side panel (shadow face)
  const BODY_GRAIN  = "#b2b8bc";                           // vertical grain lines
  const DOOR_STEEL  = hovered ? "#cce8ff" : "#c4cace";   // door panels (front face, slightly lighter)
  const DOOR_EDGE   = "#a8b0b4";                           // door edge bevel
  const HDL_CLR     = "#9aacb4";                           // polished bar handle chrome
  const GASKET_CLR  = "#1e2426";                           // rubber door gasket
  const HINGE_CLR   = "#828c90";                           // hinge plate brushed
  const DISP_CLR    = "#0e1618";                           // dispenser recess cavity
  const DISP_FRAME  = "#5a6466";                           // dispenser chrome frame
  const LED_CLR     = "#dceeff";                           // interior LED cool white
  const INT_CLR     = "#e4eeee";                           // interior liner — light grey-blue
  const SHELF_CLR   = "#8aa0a8";                           // wire shelf — grey-blue chrome
  const DRAWER_INT  = "#c8d4d4";                           // freezer drawer liner

  const isNS   = faceDir === "z+" || faceDir === "z-";
  const halfW  = widthFt / 2;
  const halfD  = depthFt / 2;

  // Proportions
  const freezerH = heightFt * 0.24;
  const fridgeH  = heightFt - freezerH;
  const fridgeY  = -heightFt / 2 + freezerH + fridgeH / 2;
  const freezerY = -heightFt / 2 + freezerH / 2;

  // Door geometry
  const doorThick = 0.052;
  const lDoorW    = isNS ? halfW - 0.012 : doorThick;
  const rDoorW    = isNS ? halfW - 0.012 : doorThick;
  const doorH     = fridgeH - 0.028;

  // Hinge positions (outer edge of each door)
  const lHingeX = isNS ? -halfW + 0.008 : (faceDir === "x+" ?  halfW - 0.008 : -halfW + 0.008);
  const rHingeX = isNS ?  halfW - 0.008 : (faceDir === "x+" ? -halfW + 0.008 :  halfW - 0.008);

  // Open angles
  const lOpenAngle = isNS ? (leftDoorOpen  ? -Math.PI * 0.52 : 0) : (leftDoorOpen  ?  Math.PI * 0.52 : 0);
  const rOpenAngle = isNS ? (rightDoorOpen ?  Math.PI * 0.52 : 0) : (rightDoorOpen ? -Math.PI * 0.52 : 0);

  const lDoorRot = [0, lOpenAngle, 0];
  const rDoorRot = [0, rOpenAngle, 0];

  // Handle proportions
  const hdlH      = fridgeH * 0.46;
  const hdlY      = fridgeY + fridgeH * 0.05;
  const hdlRadius = 0.015;
  const hdlStandoff = 0.032;

  // Dispenser panel
  const dispW = lDoorW * 0.54;
  const dispH = doorH  * 0.28;
  const dispY = fridgeY + fridgeH * 0.08;

  // Interior dimensions
  const intW = widthFt - 0.16;
  const intH = fridgeH - 0.10;
  const intD = depthFt - 0.16;

  return (
    <>
      {/* ── Main body — tall stainless box ──────────────────────────────────── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthFt - 0.02, heightFt, depthFt - 0.02]} />
        <meshStandardMaterial color={BODY_STEEL} roughness={0.18} metalness={0.74} envMapIntensity={1.5} />
      </mesh>

      {/* Side panels — darker to simulate brushed-grain shadow */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (halfW - 0.007), 0, 0]}>
          <boxGeometry args={[0.012, heightFt - 0.01, depthFt - 0.03]} />
          <meshStandardMaterial color={BODY_DARK} roughness={0.22} metalness={0.70} />
        </mesh>
      ))}

      {/* Vertical grain lines — 4 subtle strips across front face (z+ only) */}
      {isNS && [-3, -1, 1, 3].map((s, i) => (
        <mesh key={i} position={[s * widthFt * 0.14, 0, halfD - 0.003]}>
          <boxGeometry args={[0.004, heightFt - 0.04, 0.004]} />
          <meshStandardMaterial color={BODY_GRAIN} roughness={0.20} metalness={0.78} />
        </mesh>
      ))}

      {/* ── Interior cavity — visible when either door open ─────────────────── */}
      {(leftDoorOpen || rightDoorOpen) && (
        <>
          {/* Interior back liner */}
          <mesh position={[0, fridgeY, -halfD + 0.10]}>
            <boxGeometry args={[intW, intH, 0.012]} />
            <meshStandardMaterial color={INT_CLR} roughness={0.55} metalness={0.02} />
          </mesh>
          {/* Interior side liners */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (intW / 2 + 0.006), fridgeY, 0]}>
              <boxGeometry args={[0.014, intH, intD]} />
              <meshStandardMaterial color={INT_CLR} roughness={0.55} metalness={0.02} />
            </mesh>
          ))}
          {/* Interior floor */}
          <mesh position={[0, fridgeY - intH / 2, 0]}>
            <boxGeometry args={[intW, 0.012, intD]} />
            <meshStandardMaterial color={INT_CLR} roughness={0.55} metalness={0.02} />
          </mesh>
          {/* LED light strip — top of interior */}
          <mesh position={[0, fridgeY + intH / 2 - 0.016, 0]}>
            <boxGeometry args={[intW * 0.88, 0.014, 0.040]} />
            <meshStandardMaterial color={LED_CLR} roughness={0.4} metalness={0} emissive={LED_CLR} emissiveIntensity={0.9} />
          </mesh>
          {/* Wire shelves — 3 evenly spaced */}
          {[0.22, 0.46, 0.68].map((frac, si) => (
            <group key={si} position={[0, fridgeY + intH * (0.5 - frac), 0]}>
              <mesh>
                <boxGeometry args={[intW - 0.04, 0.008, intD - 0.04]} />
                <meshStandardMaterial color={SHELF_CLR} roughness={0.30} metalness={0.75} envMapIntensity={1.0} />
              </mesh>
              {/* Shelf front lip */}
              <mesh position={[0, 0.010, (intD - 0.04) / 2]}>
                <boxGeometry args={[intW - 0.04, 0.022, 0.010]} />
                <meshStandardMaterial color={INT_CLR} roughness={0.50} metalness={0.02} />
              </mesh>
            </group>
          ))}
          {/* Door bins on interior face — 2 bins */}
          {[-0.28, 0.14].map((oy, bi) => (
            <mesh key={bi} position={[0, fridgeY + oy, halfD - 0.035]}>
              <boxGeometry args={[intW * 0.88, intH * 0.18, 0.042]} />
              <meshStandardMaterial color={DRAWER_INT} roughness={0.45} metalness={0.04} />
            </mesh>
          ))}
        </>
      )}

      {/* ── LEFT upper French door — clickable ──────────────────────────────── */}
      <group
        position={[lHingeX, fridgeY, isNS ? halfD : 0]}
        rotation={lDoorRot}
        onClick={(e) => { e.stopPropagation(); setLeftDoorOpen((o) => !o); }}
      >
        {/* Door slab — thick stainless panel */}
        <mesh castShadow position={isNS ? [lDoorW / 2 - 0.008, 0, doorThick / 2] : [doorThick / 2, 0, 0]}>
          <boxGeometry args={[lDoorW, doorH, doorThick]} />
          <meshStandardMaterial color={DOOR_STEEL} roughness={0.15} metalness={0.72} envMapIntensity={1.6} />
        </mesh>
        {/* Door bevel edge — front face */}
        <mesh position={isNS ? [lDoorW / 2 - 0.008, 0, doorThick + 0.001] : [doorThick + 0.001, 0, 0]}>
          <boxGeometry args={isNS ? [lDoorW, doorH, 0.004] : [0.004, doorH, lDoorW]} />
          <meshStandardMaterial color={DOOR_EDGE} roughness={0.12} metalness={0.80} envMapIntensity={1.8} />
        </mesh>
        {/* Gasket rubber seal */}
        <mesh position={isNS ? [lDoorW / 2 - 0.008, 0, doorThick / 2 + 0.002] : [doorThick / 2 + 0.002, 0, 0]}>
          <boxGeometry args={isNS ? [lDoorW + 0.006, doorH + 0.006, 0.005] : [0.005, doorH + 0.006, lDoorW + 0.006]} />
          <meshStandardMaterial color={GASKET_CLR} roughness={0.80} metalness={0.02} />
        </mesh>

        {/* ── Vertical bar handle — inside edge of left door ───────────────── */}
        {/* Handle mounting bracket (top) */}
        <mesh castShadow position={isNS
          ? [lDoorW - 0.054, hdlY - fridgeY + hdlH * 0.42, doorThick + hdlStandoff - 0.004]
          : [doorThick + hdlStandoff - 0.004, hdlY - fridgeY + hdlH * 0.42, 0.054]}
        >
          <cylinderGeometry args={[0.012, 0.010, 0.022, 10]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.08} metalness={0.92} envMapIntensity={1.6} />
        </mesh>
        {/* Handle mounting bracket (bottom) */}
        <mesh castShadow position={isNS
          ? [lDoorW - 0.054, hdlY - fridgeY - hdlH * 0.42, doorThick + hdlStandoff - 0.004]
          : [doorThick + hdlStandoff - 0.004, hdlY - fridgeY - hdlH * 0.42, 0.054]}
        >
          <cylinderGeometry args={[0.012, 0.010, 0.022, 10]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.08} metalness={0.92} envMapIntensity={1.6} />
        </mesh>
        {/* Handle bar */}
        <mesh castShadow position={isNS
          ? [lDoorW - 0.054, hdlY - fridgeY, doorThick + hdlStandoff]
          : [doorThick + hdlStandoff, hdlY - fridgeY, 0.054]}
          rotation={isNS ? [0, 0, 0] : [Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[hdlRadius, hdlRadius, hdlH, 14]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.05} metalness={0.94} envMapIntensity={2.0} />
        </mesh>

        {/* ── Water/ice dispenser (left door center-left) ───────────────────── */}
        {/* Recessed cavity */}
        <mesh position={isNS
          ? [lDoorW * 0.38, dispY - fridgeY, doorThick - 0.004]
          : [doorThick - 0.004, dispY - fridgeY, lDoorW * 0.38]}
        >
          <boxGeometry args={isNS ? [dispW, dispH, 0.018] : [0.018, dispH, dispW]} />
          <meshStandardMaterial color={DISP_CLR} roughness={0.70} metalness={0.08} />
        </mesh>
        {/* Chrome frame around dispenser */}
        <mesh position={isNS
          ? [lDoorW * 0.38, dispY - fridgeY, doorThick + 0.002]
          : [doorThick + 0.002, dispY - fridgeY, lDoorW * 0.38]}
        >
          <boxGeometry args={isNS ? [dispW + 0.012, dispH + 0.012, 0.005] : [0.005, dispH + 0.012, dispW + 0.012]} />
          <meshStandardMaterial color={DISP_FRAME} roughness={0.12} metalness={0.85} envMapIntensity={1.4} />
        </mesh>
        {/* Paddle buttons — 3 buttons */}
        {[-0.30, 0, 0.30].map((off, pi) => (
          <mesh key={pi} position={isNS
            ? [lDoorW * 0.38 + off * dispW * 0.44, dispY - fridgeY - dispH * 0.18, doorThick + 0.005]
            : [doorThick + 0.005, dispY - fridgeY - dispH * 0.18, lDoorW * 0.38 + off * dispW * 0.44]}
          >
            <boxGeometry args={isNS ? [dispW * 0.24, dispH * 0.26, 0.010] : [0.010, dispH * 0.26, dispW * 0.24]} />
            <meshStandardMaterial color="#3a4446" roughness={0.40} metalness={0.28} />
          </mesh>
        ))}
        {/* Digital display on dispenser */}
        <mesh position={isNS
          ? [lDoorW * 0.38, dispY - fridgeY + dispH * 0.28, doorThick + 0.006]
          : [doorThick + 0.006, dispY - fridgeY + dispH * 0.28, lDoorW * 0.38]}
        >
          <boxGeometry args={isNS ? [dispW * 0.70, dispH * 0.22, 0.005] : [0.005, dispH * 0.22, dispW * 0.70]} />
          <meshStandardMaterial color="#081214" roughness={0.20} metalness={0.05} emissive="#003344" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* ── RIGHT upper French door — clickable ─────────────────────────────── */}
      <group
        position={[rHingeX, fridgeY, isNS ? halfD : 0]}
        rotation={rDoorRot}
        onClick={(e) => { e.stopPropagation(); setRightDoorOpen((o) => !o); }}
      >
        <mesh castShadow position={isNS ? [-rDoorW / 2 + 0.008, 0, doorThick / 2] : [-doorThick / 2, 0, 0]}>
          <boxGeometry args={[rDoorW, doorH, doorThick]} />
          <meshStandardMaterial color={DOOR_STEEL} roughness={0.15} metalness={0.72} envMapIntensity={1.6} />
        </mesh>
        <mesh position={isNS ? [-rDoorW / 2 + 0.008, 0, doorThick + 0.001] : [-doorThick - 0.001, 0, 0]}>
          <boxGeometry args={isNS ? [rDoorW, doorH, 0.004] : [0.004, doorH, rDoorW]} />
          <meshStandardMaterial color={DOOR_EDGE} roughness={0.12} metalness={0.80} envMapIntensity={1.8} />
        </mesh>
        <mesh position={isNS ? [-rDoorW / 2 + 0.008, 0, doorThick / 2 + 0.002] : [-doorThick / 2 - 0.002, 0, 0]}>
          <boxGeometry args={isNS ? [rDoorW + 0.006, doorH + 0.006, 0.005] : [0.005, doorH + 0.006, rDoorW + 0.006]} />
          <meshStandardMaterial color={GASKET_CLR} roughness={0.80} metalness={0.02} />
        </mesh>

        {/* Handle (right door — inside = toward center, i.e. toward -X) */}
        <mesh castShadow position={isNS
          ? [-rDoorW + 0.054, hdlY - fridgeY + hdlH * 0.42, doorThick + hdlStandoff - 0.004]
          : [-doorThick - hdlStandoff + 0.004, hdlY - fridgeY + hdlH * 0.42, -0.054]}
        >
          <cylinderGeometry args={[0.012, 0.010, 0.022, 10]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.08} metalness={0.92} envMapIntensity={1.6} />
        </mesh>
        <mesh castShadow position={isNS
          ? [-rDoorW + 0.054, hdlY - fridgeY - hdlH * 0.42, doorThick + hdlStandoff - 0.004]
          : [-doorThick - hdlStandoff + 0.004, hdlY - fridgeY - hdlH * 0.42, -0.054]}
        >
          <cylinderGeometry args={[0.012, 0.010, 0.022, 10]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.08} metalness={0.92} envMapIntensity={1.6} />
        </mesh>
        <mesh castShadow position={isNS
          ? [-rDoorW + 0.054, hdlY - fridgeY, doorThick + hdlStandoff]
          : [-doorThick - hdlStandoff, hdlY - fridgeY, -0.054]}
          rotation={isNS ? [0, 0, 0] : [Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[hdlRadius, hdlRadius, hdlH, 14]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.05} metalness={0.94} envMapIntensity={2.0} />
        </mesh>
      </group>

      {/* ── Center door split line ───────────────────────────────────────────── */}
      <mesh position={isNS
        ? [0, fridgeY, halfD + doorThick * 0.55]
        : faceDir === "x+" ? [halfW + doorThick * 0.55, fridgeY, 0]
        : [-halfW - doorThick * 0.55, fridgeY, 0]}
      >
        <boxGeometry args={isNS ? [0.010, fridgeH - 0.03, 0.008] : [0.008, fridgeH - 0.03, 0.010]} />
        <meshStandardMaterial color={GASKET_CLR} roughness={0.80} metalness={0.02} />
      </mesh>

      {/* ── Hinge plates — 2 per side ───────────────────────────────────────── */}
      {[-1, 1].map((side) =>
        [-fridgeH * 0.36, fridgeH * 0.36].map((oy, j) => (
          <mesh key={`h${side}${j}`} position={isNS
            ? [side * (halfW - 0.009), fridgeY + oy, halfD - 0.008]
            : [halfW - 0.009, fridgeY + oy, side * (halfD - 0.008)]}
          >
            <boxGeometry args={[0.020, 0.044, 0.014]} />
            <meshStandardMaterial color={HINGE_CLR} roughness={0.25} metalness={0.78} envMapIntensity={1.2} />
          </mesh>
        ))
      )}

      {/* ── Lower freezer drawer — pull-out clickable ───────────────────────── */}
      <group onClick={(e) => { e.stopPropagation(); setDrawerOpen((o) => !o); }}>
        {/* Drawer front panel */}
        <mesh castShadow position={isNS
          ? [0, freezerY, halfD + (drawerOpen ? depthFt * 0.38 : 0)]
          : faceDir === "x+"
            ? [halfW + (drawerOpen ? depthFt * 0.38 : 0), freezerY, 0]
            : [-halfW - (drawerOpen ? depthFt * 0.38 : 0), freezerY, 0]}
        >
          <boxGeometry args={isNS ? [widthFt - 0.04, freezerH - 0.025, doorThick] : [doorThick, freezerH - 0.025, depthFt - 0.04]} />
          <meshStandardMaterial color={DOOR_STEEL} roughness={0.15} metalness={0.72} envMapIntensity={1.6} />
        </mesh>
        {/* Drawer handle — wide horizontal bar */}
        <mesh castShadow
          position={isNS
            ? [0, freezerY + freezerH * 0.26, halfD + doorThick + 0.026 + (drawerOpen ? depthFt * 0.38 : 0)]
            : faceDir === "x+"
              ? [halfW + doorThick + 0.026 + (drawerOpen ? depthFt * 0.38 : 0), freezerY + freezerH * 0.26, 0]
              : [-halfW - doorThick - 0.026 - (drawerOpen ? depthFt * 0.38 : 0), freezerY + freezerH * 0.26, 0]}
          rotation={isNS ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.013, 0.013, widthFt * 0.68, 12]} />
          <meshStandardMaterial color={HDL_CLR} roughness={0.05} metalness={0.94} envMapIntensity={2.0} />
        </mesh>
      </group>

      {/* ── Fridge-freezer divider rail ──────────────────────────────────────── */}
      <mesh position={isNS
        ? [0, freezerY + freezerH / 2 + 0.005, halfD + doorThick * 0.5]
        : faceDir === "x+" ? [halfW + doorThick * 0.5, freezerY + freezerH / 2, 0]
        : [-halfW - doorThick * 0.5, freezerY + freezerH / 2, 0]}
      >
        <boxGeometry args={isNS ? [widthFt - 0.03, 0.014, 0.010] : [0.010, 0.014, depthFt - 0.03]} />
        <meshStandardMaterial color={GASKET_CLR} roughness={0.75} metalness={0.10} />
      </mesh>

      {/* ── Top compressor vent grill ────────────────────────────────────────── */}
      {[-3, -1.5, 0, 1.5, 3].map((k) => (
        <mesh key={`v${k}`} position={[k * widthFt * 0.12, heightFt / 2 - 0.018, 0]}>
          <boxGeometry args={[widthFt * 0.07, 0.009, depthFt - 0.06]} />
          <meshStandardMaterial color={BODY_DARK} roughness={0.50} metalness={0.42} />
        </mesh>
      ))}

      {/* ── Toe kick ─────────────────────────────────────────────────────────── */}
      <mesh position={isNS
        ? [0, -heightFt / 2 + 0.055, halfD - 0.032]
        : faceDir === "x+" ? [halfW - 0.032, -heightFt / 2 + 0.055, 0]
        : [-halfW + 0.032, -heightFt / 2 + 0.055, 0]}
      >
        <boxGeometry args={isNS ? [widthFt - 0.03, 0.11, 0.064] : [0.064, 0.11, depthFt - 0.03]} />
        <meshStandardMaterial color="#141210" roughness={0.95} metalness={0} />
      </mesh>

      {/* ── Status labels ────────────────────────────────────────────────────── */}
      {(leftDoorOpen || rightDoorOpen || drawerOpen) && (
        <Html position={[0, heightFt / 2 + 0.22, 0]} center style={{ pointerEvents: "none" }}>
          <div className="flex gap-1">
            {leftDoorOpen  && <div className="px-2 py-0.5 rounded-full text-white text-[9px] font-semibold shadow-md bg-sky-500 opacity-90 whitespace-nowrap">Left · Open</div>}
            {rightDoorOpen && <div className="px-2 py-0.5 rounded-full text-white text-[9px] font-semibold shadow-md bg-sky-500 opacity-90 whitespace-nowrap">Right · Open</div>}
            {drawerOpen    && <div className="px-2 py-0.5 rounded-full text-white text-[9px] font-semibold shadow-md bg-indigo-500 opacity-90 whitespace-nowrap">Freezer · Open</div>}
          </div>
        </Html>
      )}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Scene3DFixture({
  fixture,
  primaryColor = "#1C1917",
}) {
  const [hovered, setHovered] = useState(false);

  const selectedItemId  = usePlannerStore((s) => s.selectedItemId);
  const setSelectedItem = usePlannerStore((s) => s.setSelectedItem);
  const removeItem      = usePlannerStore((s) => s.removeItem);

  const isSelected = selectedItemId === fixture.id;

  const { widthFt, depthFt, heightFt } = fixture.dimensions;
  const { xFt, yFt, zFt }             = fixture.position;

  const cx = xFt + widthFt / 2;
  const cy = yFt + heightFt / 2;
  const cz = zFt + depthFt  / 2;

  // Derive the facing direction from the zone the fixture was placed in
  const faceDir = fixture.zoneId?.includes("-west") ? "x+"
                : fixture.zoneId?.includes("-east") ? "x-"
                : "z+";

  // Dishwasher: stored in fixture meta (productId "fixture-sink-dw") or name contains "dishwasher"
  const hasDishwasher = fixture.productId === "fixture-sink-dw"
    || (fixture.name ?? "").toLowerCase().includes("dishwasher");

  return (
    <group
      position={[cx, cy, cz]}
      rotation={[0, (fixture.rotation?.yDeg ?? 0) * (Math.PI / 180), 0]}
      onClick={(e) => { e.stopPropagation(); setSelectedItem(fixture.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); removeItem(fixture.id); }}
    >
      {/* Category-specific geometry */}
      {fixture.category === "Sink" ? (
        <SinkMesh
          widthFt={widthFt} heightFt={heightFt} depthFt={depthFt}
          hovered={hovered} faceDir={faceDir}
          hasDishwasher={hasDishwasher}
        />
      ) : fixture.category === "Refrigerator" ? (
        <RefrigeratorMesh
          widthFt={widthFt} heightFt={heightFt} depthFt={depthFt}
          hovered={hovered} faceDir={faceDir}
        />
      ) : (
        <RangeMesh
          widthFt={widthFt} heightFt={heightFt} depthFt={depthFt}
          hovered={hovered} faceDir={faceDir}
        />
      )}

      {/* Selection wireframe — blue outline */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[widthFt + 0.06, heightFt + 0.06, depthFt + 0.06]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
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
            {fixture.name}
            {isSelected && <span className="ml-1 opacity-70 text-[9px]">· dbl-click to remove</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
