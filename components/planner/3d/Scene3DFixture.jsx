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

function SinkMesh({ widthFt, heightFt, depthFt, hovered, faceDir = "z+" }) {
  const bodyColor    = hovered ? "#bfdbfe" : "#d4cfc8";  // blue highlight on hover
  const counterColor = "#b5afa8";   // exactly matches Scene3DCabinet countertop color
  const basinColor   = "#8c9fa5";   // brushed stainless steel
  const faucetColor  = "#9eaeb6";   // brushed chrome

  // Undermount basin — top flush with stone bottom (heightFt/2), recessed downward
  const basinW  = widthFt  * 0.70;
  const basinD  = depthFt  * 0.58;
  const basinH  = 0.28;
  const basinCy = heightFt / 2 - basinH / 2;

  // Gooseneck faucet arc — direction-aware: starts from the wall side, arcs toward front
  const faucetGeo = useMemo(() => {
    const by = heightFt / 2 + COUNTER_THICK + 0.02;  // just above stone top surface
    let curve;

    if (faceDir === "x+") {
      // West wall cabinet — wall is at x-, front is x+
      const bx = -widthFt * 0.30;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(bx,        by,        0),
        new THREE.Vector3(bx,        by + 0.18, 0),
        new THREE.Vector3(bx + 0.09, by + 0.26, 0),
        new THREE.Vector3(bx + 0.20, by + 0.20, 0),
        new THREE.Vector3(bx + 0.28, by + 0.12, 0),
      ]);
    } else if (faceDir === "x-") {
      // East wall cabinet — wall is at x+, front is x-
      const bx = widthFt * 0.30;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(bx,        by,        0),
        new THREE.Vector3(bx,        by + 0.18, 0),
        new THREE.Vector3(bx - 0.09, by + 0.26, 0),
        new THREE.Vector3(bx - 0.20, by + 0.20, 0),
        new THREE.Vector3(bx - 0.28, by + 0.12, 0),
      ]);
    } else {
      // "z+" — back wall (base-north): wall is at z-, front is z+
      const bz = -depthFt * 0.30;
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, by,        bz),
        new THREE.Vector3(0, by + 0.18, bz),
        new THREE.Vector3(0, by + 0.26, bz + 0.09),
        new THREE.Vector3(0, by + 0.20, bz + 0.20),
        new THREE.Vector3(0, by + 0.12, bz + 0.28),
      ]);
    }
    return new THREE.TubeGeometry(curve, 16, 0.016, 8, false);
  }, [heightFt, depthFt, widthFt, faceDir]);

  return (
    <>
      {/* Cabinet body — semi-gloss painted finish */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthFt, heightFt, depthFt]} />
        <meshStandardMaterial color={bodyColor} roughness={0.50} metalness={0.01} />
      </mesh>

      {/* Stone countertop — direction-aware overhang (matches Scene3DCabinet fix):
          extend only toward the front face so adjacent countertop seams never overlap. */}
      {(() => {
        const OV = 0.12;
        const isNS = faceDir === "z+" || faceDir === "z-";
        const sign = (faceDir === "z+" || faceDir === "x+") ? 1 : -1;
        const ctW  = isNS ? widthFt : widthFt + OV;
        const ctD  = isNS ? depthFt + OV : depthFt;
        const ctOX = isNS ? 0 : sign * OV / 2;
        const ctOZ = isNS ? sign * OV / 2 : 0;
        return (
          <mesh castShadow position={[ctOX, heightFt / 2 + COUNTER_THICK / 2, ctOZ]}>
            <boxGeometry args={[ctW, COUNTER_THICK, ctD]} />
            <meshStandardMaterial color={counterColor} roughness={0.10} metalness={0.10} />
          </mesh>
        );
      })()}

      {/* Undermount basin outer shell — brushed stainless */}
      <mesh castShadow position={[0, basinCy, 0]}>
        <boxGeometry args={[basinW, basinH, basinD]} />
        <meshStandardMaterial color={basinColor} roughness={0.22} metalness={0.82} />
      </mesh>

      {/* Inner basin — slightly smaller, darker; gives illusion of basin walls + depth */}
      <mesh position={[0, basinCy, 0]}>
        <boxGeometry args={[basinW - 0.05, basinH, basinD - 0.05]} />
        <meshStandardMaterial color="#4e6268" roughness={0.28} metalness={0.70} />
      </mesh>

      {/* Drain disk at basin floor */}
      <mesh position={[0, heightFt / 2 - basinH + 0.008, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.016, 8]} />
        <meshStandardMaterial color="#1e1a17" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Drain crosshair — strainer grill bars */}
      <mesh position={[0, heightFt / 2 - basinH + 0.010, 0]}>
        <boxGeometry args={[0.065, 0.004, 0.011]} />
        <meshStandardMaterial color="#1e1a17" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[0, heightFt / 2 - basinH + 0.010, 0]}>
        <boxGeometry args={[0.011, 0.004, 0.065]} />
        <meshStandardMaterial color="#1e1a17" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Gooseneck faucet arc */}
      <mesh castShadow geometry={faucetGeo}>
        <meshStandardMaterial color={faucetColor} roughness={0.08} metalness={0.88} />
      </mesh>

      {/* Faucet mounting disc + hot/cold valve handles — direction-aware */}
      {(() => {
        const mountY = heightFt / 2 + COUNTER_THICK;
        // Base position mirrors faucet curve start point
        const bx = faceDir === "x+" ? -widthFt * 0.30
                 : faceDir === "x-" ?  widthFt * 0.30 : 0;
        const bz = (faceDir === "z+" || faceDir === "z-") ? -depthFt * 0.30 : 0;
        // Valve offset direction: perpendicular to the faucet axis
        const isNS = faceDir === "z+" || faceDir === "z-";
        const vOX  = isNS ? 0.09 : 0;   // offset along X for NS walls
        const vOZ  = isNS ? 0   : 0.09; // offset along Z for EW walls
        return (
          <>
            {/* Faucet base disc */}
            <mesh position={[bx, mountY, bz]}>
              <cylinderGeometry args={[0.048, 0.052, 0.022, 12]} />
              <meshStandardMaterial color={faucetColor} roughness={0.06} metalness={0.90} />
            </mesh>
            {/* Hot handle (left/front) */}
            <mesh position={[bx - vOX, mountY + 0.04, bz - vOZ]}>
              <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
              <meshStandardMaterial color={faucetColor} roughness={0.06} metalness={0.88} />
            </mesh>
            {/* Cold handle (right/back) */}
            <mesh position={[bx + vOX, mountY + 0.04, bz + vOZ]}>
              <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
              <meshStandardMaterial color={faucetColor} roughness={0.06} metalness={0.88} />
            </mesh>
          </>
        );
      })()}

      {/* Toe kick — recessed 0.03 ft from body front face to prevent z-fighting */}
      <mesh position={[0, -heightFt / 2 + 0.065, depthFt / 2 - 0.06]}>
        <boxGeometry args={[widthFt - 0.01, 0.13, 0.06]} />
        <meshStandardMaterial color="#252220" roughness={0.9} metalness={0} />
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
