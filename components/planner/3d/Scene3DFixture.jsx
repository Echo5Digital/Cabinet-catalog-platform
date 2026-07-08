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

function SinkMesh({ widthFt, heightFt, depthFt, hovered, faceDir = "z+" }) {
  // ── Color palette ────────────────────────────────────────────────────────────
  const bodyColor    = hovered ? "#cce0fc" : "#e2ddd8";
  // Countertop matches updated Scene3DCabinet default countertop
  const counterColor = "#c8c0b4";
  // Brushed stainless — warm silver, not blue-grey
  const STEEL_CLR    = "#b0b8bc";
  const STEEL_DARK   = "#7a8488";   // basin interior — deeper/darker for depth
  const BASIN_FLOOR  = "#5a6468";   // basin floor — darkest, recessed appearance
  const DRAIN_CLR    = "#383c3e";   // drain fitting — near-black stainless
  const FAUCET_CLR   = "#c4ccd0";   // polished chrome/nickel faucet body
  const FAUCET_DARK  = "#9aa4a8";   // faucet spout underside / shadow tones

  // ── Basin dimensions ─────────────────────────────────────────────────────────
  // Premium single-bowl: 60% width, 60% depth, 9" deep (~0.75 ft)
  const basinW     = widthFt  * 0.62;
  const basinD     = depthFt  * 0.60;
  const basinH     = 0.74;            // deep 9" bowl — proper premium sink depth
  const rimThick   = 0.025;           // 16-gauge rim wall thickness
  const wallThick  = 0.018;           // basin side wall thickness
  // Basin top flush with underside of countertop (undermount)
  const basinTopY  = heightFt / 2;
  const basinBotY  = basinTopY - basinH;
  const basinCtrY  = basinTopY - basinH / 2;

  // ── Faucet geometry (direction-aware CatmullRom curve) ───────────────────────
  // High-arc gooseneck: rises 14" from deck, graceful forward arc
  const faucetGeo = useMemo(() => {
    const by  = heightFt / 2 + COUNTER_THICK + 0.012;   // deck surface + tiny gap
    const rH  = 0.38;   // rise height (≈14" — premium tall arc)
    const fwd = 0.22;   // forward reach toward basin
    let curve;

    if (faceDir === "x+") {
      const bx = -widthFt * 0.28;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(bx,          by,          0),
        new THREE.Vector3(bx,          by + 0.08,   0),
        new THREE.Vector3(bx,          by + rH,     0),
        new THREE.Vector3(bx + fwd * 0.6, by + rH + 0.04, 0),
        new THREE.Vector3(bx + fwd,    by + rH - 0.02, 0),
        new THREE.Vector3(bx + fwd + 0.06, by + rH - 0.10, 0),
      ]);
    } else if (faceDir === "x-") {
      const bx = widthFt * 0.28;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(bx,             by,          0),
        new THREE.Vector3(bx,             by + 0.08,   0),
        new THREE.Vector3(bx,             by + rH,     0),
        new THREE.Vector3(bx - fwd * 0.6, by + rH + 0.04, 0),
        new THREE.Vector3(bx - fwd,       by + rH - 0.02, 0),
        new THREE.Vector3(bx - fwd - 0.06, by + rH - 0.10, 0),
      ]);
    } else {
      // "z+" default — back wall, faucet rises from wall side toward basin
      const bz = -depthFt * 0.28;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, by,          bz),
        new THREE.Vector3(0, by + 0.08,   bz),
        new THREE.Vector3(0, by + rH,     bz),
        new THREE.Vector3(0, by + rH + 0.04, bz + fwd * 0.6),
        new THREE.Vector3(0, by + rH - 0.02, bz + fwd),
        new THREE.Vector3(0, by + rH - 0.10, bz + fwd + 0.06),
      ]);
    }
    // Slender 12-sided tube — smooth polished chrome look
    return new THREE.TubeGeometry(curve, 24, 0.011, 12, false);
  }, [heightFt, depthFt, widthFt, faceDir]);

  // Spout tip position — end of faucet curve
  const spoutTip = useMemo(() => {
    const by  = heightFt / 2 + COUNTER_THICK + 0.012;
    const rH  = 0.38;
    const fwd = 0.22;
    if (faceDir === "x+") {
      const bx = -widthFt * 0.28;
      return [bx + fwd + 0.06, by + rH - 0.10, 0];
    } else if (faceDir === "x-") {
      const bx = widthFt * 0.28;
      return [bx - fwd - 0.06, by + rH - 0.10, 0];
    }
    const bz = -depthFt * 0.28;
    return [0, by + rH - 0.10, bz + fwd + 0.06];
  }, [heightFt, depthFt, widthFt, faceDir]);

  // ── Deck fittings (base, handles) — direction-aware ──────────────────────────
  const mountY  = heightFt / 2 + COUNTER_THICK;
  const isNS    = faceDir === "z+" || faceDir === "z-";
  // Faucet base position — toward wall (same side as faucet foot)
  const fbx = faceDir === "x+" ? -widthFt * 0.28
            : faceDir === "x-" ?  widthFt * 0.28 : 0;
  const fbz = isNS ? -depthFt * 0.28 : 0;
  // Handle offsets — perpendicular to faucet axis
  const hOX = isNS ? 0.115 : 0;
  const hOZ = isNS ? 0     : 0.115;

  return (
    <>
      {/* ── Cabinet carcass body ──────────────────────────────────────────── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        <meshStandardMaterial color={bodyColor} roughness={0.28} metalness={0.02} envMapIntensity={0.8} />
      </mesh>

      {/* ── Countertop stone slab — direction-aware front overhang ─────────── */}
      {(() => {
        const OV   = 0.12;
        const sign = (faceDir === "z+" || faceDir === "x+") ? 1 : -1;
        const ctW  = isNS ? widthFt : widthFt + OV;
        const ctD  = isNS ? depthFt + OV : depthFt;
        const ctOX = isNS ? 0 : sign * OV / 2;
        const ctOZ = isNS ? sign * OV / 2 : 0;
        return (
          <>
            <mesh castShadow receiveShadow position={[ctOX, heightFt / 2 + COUNTER_THICK / 2, ctOZ]}>
              <boxGeometry args={[ctW, COUNTER_THICK, ctD]} />
              <meshStandardMaterial color={counterColor} roughness={0.12} metalness={0.06} envMapIntensity={1.8} />
            </mesh>
            {/* Front edge waterfall detail */}
            <mesh position={[ctOX, heightFt / 2 + COUNTER_THICK / 2, ctOZ + ctD / 2 - 0.005]}>
              <boxGeometry args={[ctW, COUNTER_THICK * 0.92, 0.012]} />
              <meshStandardMaterial color={counterColor} roughness={0.08} metalness={0.07} envMapIntensity={2.0} />
            </mesh>
          </>
        );
      })()}

      {/* ── Undermount basin — 5-panel hollow shell ───────────────────────── */}
      {/* Rim — stainless steel collar visible through cutout in stone */}
      <mesh castShadow position={[0, basinTopY - rimThick / 2, 0]}>
        <boxGeometry args={[basinW, rimThick, basinD]} />
        <meshStandardMaterial color={STEEL_CLR} roughness={0.18} metalness={0.90} envMapIntensity={1.6} />
      </mesh>

      {/* Basin floor — polished stainless, darker */}
      <mesh receiveShadow position={[0, basinBotY + wallThick / 2, 0]}>
        <boxGeometry args={[basinW - wallThick * 2, wallThick, basinD - wallThick * 2]} />
        <meshStandardMaterial color={BASIN_FLOOR} roughness={0.25} metalness={0.88} envMapIntensity={1.0} />
      </mesh>

      {/* Basin left wall */}
      <mesh position={[-(basinW / 2 - wallThick / 2), basinCtrY, 0]}>
        <boxGeometry args={[wallThick, basinH - wallThick, basinD - wallThick * 2]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.22} metalness={0.88} envMapIntensity={1.2} />
      </mesh>
      {/* Basin right wall */}
      <mesh position={[(basinW / 2 - wallThick / 2), basinCtrY, 0]}>
        <boxGeometry args={[wallThick, basinH - wallThick, basinD - wallThick * 2]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.22} metalness={0.88} envMapIntensity={1.2} />
      </mesh>
      {/* Basin back wall (toward room wall) */}
      <mesh position={[0, basinCtrY, -(basinD / 2 - wallThick / 2)]}>
        <boxGeometry args={[basinW - wallThick * 2, basinH - wallThick, wallThick]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.22} metalness={0.88} envMapIntensity={1.2} />
      </mesh>
      {/* Basin front wall (toward cabinet front) */}
      <mesh position={[0, basinCtrY, (basinD / 2 - wallThick / 2)]}>
        <boxGeometry args={[basinW - wallThick * 2, basinH - wallThick, wallThick]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.22} metalness={0.88} envMapIntensity={1.2} />
      </mesh>

      {/* ── Basket strainer drain ─────────────────────────────────────────── */}
      {/* Drain body — recessed flange ring */}
      <mesh position={[0, basinBotY + wallThick + 0.010, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.020, 20]} />
        <meshStandardMaterial color={DRAIN_CLR} roughness={0.30} metalness={0.85} envMapIntensity={1.0} />
      </mesh>
      {/* Inner drain bowl — darker recess */}
      <mesh position={[0, basinBotY + wallThick + 0.006, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.012, 20]} />
        <meshStandardMaterial color="#1c2022" roughness={0.40} metalness={0.80} />
      </mesh>
      {/* Strainer basket rim ring */}
      <mesh position={[0, basinBotY + wallThick + 0.018, 0]}>
        <torusGeometry args={[0.042, 0.006, 8, 20]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.20} metalness={0.90} envMapIntensity={1.2} />
      </mesh>
      {/* Crosshair grill bars — 3 bars in each direction for realistic strainer */}
      {[-0.014, 0, 0.014].map((off, k) => (
        <mesh key={`gx-${k}`} position={[off, basinBotY + wallThick + 0.019, 0]}>
          <boxGeometry args={[0.004, 0.003, 0.072]} />
          <meshStandardMaterial color={DRAIN_CLR} roughness={0.25} metalness={0.88} />
        </mesh>
      ))}
      {[-0.014, 0, 0.014].map((off, k) => (
        <mesh key={`gz-${k}`} position={[0, basinBotY + wallThick + 0.019, off]}>
          <boxGeometry args={[0.072, 0.003, 0.004]} />
          <meshStandardMaterial color={DRAIN_CLR} roughness={0.25} metalness={0.88} />
        </mesh>
      ))}

      {/* ── Gooseneck faucet tube ──────────────────────────────────────────── */}
      <mesh castShadow geometry={faucetGeo}>
        <meshStandardMaterial color={FAUCET_CLR} roughness={0.06} metalness={0.96} envMapIntensity={2.0} />
      </mesh>

      {/* Spout tip — cylindrical aerator head at faucet end */}
      <mesh castShadow position={spoutTip}>
        <cylinderGeometry args={[0.015, 0.018, 0.030, 14]} />
        <meshStandardMaterial color={FAUCET_DARK} roughness={0.15} metalness={0.92} envMapIntensity={1.4} />
      </mesh>
      {/* Aerator face disc */}
      <mesh position={[spoutTip[0], spoutTip[1] - 0.016, spoutTip[2]]}>
        <cylinderGeometry args={[0.013, 0.013, 0.004, 14]} />
        <meshStandardMaterial color="#2a2e30" roughness={0.45} metalness={0.75} />
      </mesh>

      {/* ── Faucet deck base — single-hole mounting ───────────────────────── */}
      {/* Escutcheon plate */}
      <mesh position={[fbx, mountY + 0.004, fbz]}>
        <cylinderGeometry args={[0.036, 0.040, 0.008, 18]} />
        <meshStandardMaterial color={FAUCET_CLR} roughness={0.06} metalness={0.96} envMapIntensity={1.8} />
      </mesh>
      {/* Decorative collar ring above plate */}
      <mesh position={[fbx, mountY + 0.012, fbz]}>
        <torusGeometry args={[0.026, 0.005, 8, 18]} />
        <meshStandardMaterial color={FAUCET_DARK} roughness={0.10} metalness={0.94} envMapIntensity={1.6} />
      </mesh>
      {/* Base column rising to gooseneck */}
      <mesh position={[fbx, mountY + 0.038, fbz]}>
        <cylinderGeometry args={[0.018, 0.022, 0.060, 14]} />
        <meshStandardMaterial color={FAUCET_CLR} roughness={0.06} metalness={0.96} envMapIntensity={2.0} />
      </mesh>

      {/* ── Side-lever handles — hot (left) and cold (right) ─────────────── */}
      {[
        { side: -1, label: "hot" },
        { side:  1, label: "cold" },
      ].map(({ side }) => {
        const hbx = fbx + side * hOX;
        const hbz = fbz + side * hOZ;
        return (
          <group key={side} position={[hbx, mountY, hbz]}>
            {/* Handle base escutcheon */}
            <mesh position={[0, 0.004, 0]}>
              <cylinderGeometry args={[0.018, 0.020, 0.008, 14]} />
              <meshStandardMaterial color={FAUCET_CLR} roughness={0.06} metalness={0.96} envMapIntensity={1.8} />
            </mesh>
            {/* Vertical stem */}
            <mesh position={[0, 0.022, 0]}>
              <cylinderGeometry args={[0.010, 0.013, 0.028, 12]} />
              <meshStandardMaterial color={FAUCET_CLR} roughness={0.06} metalness={0.96} envMapIntensity={1.8} />
            </mesh>
            {/* Lever arm — horizontal bar extending toward front */}
            {(() => {
              const leverLen = 0.080;
              // Lever points toward cabinet front (perpendicular to faucet axis)
              const lRot = isNS ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
              const lPos = isNS
                ? [0, 0.036, leverLen / 2 * side]
                : [leverLen / 2 * side, 0.036, 0];
              return (
                <mesh position={lPos} rotation={lRot}>
                  <cylinderGeometry args={[0.006, 0.009, leverLen, 10]} />
                  <meshStandardMaterial color={FAUCET_CLR} roughness={0.06} metalness={0.96} envMapIntensity={1.8} />
                </mesh>
              );
            })()}
            {/* Lever knob cap at tip */}
            {(() => {
              const lPos = isNS
                ? [0, 0.036, (0.040 + 0.010) * side]
                : [(0.040 + 0.010) * side, 0.036, 0];
              return (
                <mesh position={lPos}>
                  <sphereGeometry args={[0.010, 10, 10]} />
                  <meshStandardMaterial color={FAUCET_DARK} roughness={0.10} metalness={0.94} envMapIntensity={1.6} />
                </mesh>
              );
            })()}
          </group>
        );
      })}

      {/* ── Toe kick ─────────────────────────────────────────────────────────── */}
      <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.033]}>
        <boxGeometry args={[widthFt - 0.01, 0.13, 0.066]} />
        <meshStandardMaterial color="#141210" roughness={0.95} metalness={0} />
      </mesh>
    </>
  );
}

// ─── Range geometry ────────────────────────────────────────────────────────────

function RangeMesh({ widthFt, heightFt, depthFt, hovered, faceDir = "z+" }) {
  const bodyColor    = hovered ? "#bfdbfe" : "#c4c8cb";  // blue highlight on hover; cooler brushed stainless
  const cooktopColor = "#1a1614";   // near-black ultra-gloss glass-ceramic
  const burnerColor  = "#3a3530";   // dark iron torus rings
  const knobColor    = "#555050";   // control knobs

  // 4 burner torus positions — on the TOP, direction-independent
  const burners = [
    [-widthFt * 0.22,  depthFt * 0.18],
    [ widthFt * 0.22,  depthFt * 0.18],
    [-widthFt * 0.22, -depthFt * 0.18],
    [ widthFt * 0.22, -depthFt * 0.18],
  ];
  const burnerR = Math.min(widthFt, depthFt) * 0.11;

  // Face-dependent geometry (door, handle, panel, knobs)
  const g = getFrontGeom(faceDir, widthFt, depthFt, heightFt);
  const knobSpacing = g.knobSpan / 5;
  const knobs = [-2, -1, 1, 2].map((n) => n * knobSpacing * 0.5);

  return (
    <>
      {/* Brushed stainless body — slide-in range, no countertop overhang */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthFt - 0.04, heightFt, depthFt - 0.02]} />
        <meshStandardMaterial color={bodyColor} roughness={0.18} metalness={0.62} />
      </mesh>

      {/* Ultra-gloss glass-ceramic cooktop surface */}
      <mesh castShadow position={[0, heightFt / 2 + 0.005, 0]}>
        <boxGeometry args={[widthFt - 0.06, 0.010, depthFt - 0.06]} />
        <meshStandardMaterial color={cooktopColor} roughness={0.03} metalness={0.10} />
      </mesh>

      {/* Burner outer torus rings + inner coil + center cap — direction-independent */}
      {burners.map(([bx, bz], i) => (
        <group key={i}>
          {/* Outer iron ring */}
          <mesh position={[bx, heightFt / 2 + 0.012, bz]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[burnerR, burnerR * 0.18, 8, 24]} />
            <meshStandardMaterial color={burnerColor} roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Inner coil ring — simulates gas burner concentric rings */}
          <mesh position={[bx, heightFt / 2 + 0.013, bz]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[burnerR * 0.50, burnerR * 0.14, 6, 20]} />
            <meshStandardMaterial color="#555050" roughness={0.55} metalness={0.25} />
          </mesh>
          {/* Cast iron center cap */}
          <mesh position={[bx, heightFt / 2 + 0.014, bz]}>
            <cylinderGeometry args={[burnerR * 0.18, burnerR * 0.18, 0.016, 10]} />
            <meshStandardMaterial color="#2a2520" roughness={0.80} metalness={0.10} />
          </mesh>
        </group>
      ))}

      {/* Oven door — placed on the correct front face */}
      <mesh castShadow position={g.doorPos}>
        <boxGeometry args={g.doorSize} />
        <meshStandardMaterial
          color="#1a1614"
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Oven door window — amber glass panel inset on door face */}
      {(() => {
        const isNSDir = faceDir === "z+" || faceDir === "z-";
        const winPos = isNSDir
          ? [g.doorPos[0], g.doorPos[1], g.doorPos[2] + 0.009]
          : faceDir === "x+"
            ? [g.doorPos[0] + 0.009, g.doorPos[1], g.doorPos[2]]
            : [g.doorPos[0] - 0.009, g.doorPos[1], g.doorPos[2]];
        const winSize = isNSDir
          ? [g.doorSize[0] * 0.64, g.doorSize[1] * 0.54, 0.004]
          : [0.004, g.doorSize[1] * 0.54, g.doorSize[2] * 0.64];
        return (
          <mesh position={winPos}>
            <boxGeometry args={winSize} />
            <meshStandardMaterial color="#d4944a" roughness={0.04} metalness={0.05} transparent opacity={0.38} />
          </mesh>
        );
      })()}

      {/* Oven door handle */}
      <mesh castShadow position={g.hdlPos} rotation={g.hdlRot}>
        <cylinderGeometry args={[0.013, 0.013, g.hdlLen, 10]} />
        <meshStandardMaterial color="#9eaeb6" roughness={0.06} metalness={0.92} />
      </mesh>

      {/* Control panel strip — at the top of the front face */}
      <mesh castShadow position={g.panelPos}>
        <boxGeometry args={g.panelSize} />
        <meshStandardMaterial color="#2a2520" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Control knobs — polished metal caps */}
      {knobs.map((k, i) => (
        <mesh key={i} position={g.knobPos(k)} rotation={g.knobRot}>
          <cylinderGeometry args={[0.025, 0.020, 0.020, 12]} />
          <meshStandardMaterial color={knobColor} roughness={0.28} metalness={0.68} />
        </mesh>
      ))}

      {/* Back guard — raised stainless panel at rear top, wall-facing direction */}
      {(() => {
        const gH = 0.18;
        const gD = 0.04;
        const isNSDir = faceDir === "z+" || faceDir === "z-";
        const wallSign = (faceDir === "z+" || faceDir === "x-") ? -1 : 1;
        const gPos = isNSDir
          ? [0, heightFt / 2 + gH / 2, wallSign * (depthFt / 2 - gD / 2)]
          : [wallSign * (widthFt / 2 - gD / 2), heightFt / 2 + gH / 2, 0];
        const gSize = isNSDir
          ? [widthFt - 0.04, gH, gD]
          : [gD, gH, depthFt - 0.04];
        return (
          <mesh castShadow position={gPos}>
            <boxGeometry args={gSize} />
            <meshStandardMaterial color={bodyColor} roughness={0.18} metalness={0.62} />
          </mesh>
        );
      })()}

      {/* Toe kick */}
      <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.03]}>
        <boxGeometry args={[widthFt - 0.05, 0.13, 0.06]} />
        <meshStandardMaterial color="#252220" roughness={0.9} metalness={0} />
      </mesh>
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
        <SinkMesh widthFt={widthFt} heightFt={heightFt} depthFt={depthFt} hovered={hovered} faceDir={faceDir} />
      ) : (
        <RangeMesh widthFt={widthFt} heightFt={heightFt} depthFt={depthFt} hovered={hovered} faceDir={faceDir} />
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
