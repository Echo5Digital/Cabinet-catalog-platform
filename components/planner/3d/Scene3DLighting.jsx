"use client";

import { Environment } from "@react-three/drei";

/**
 * Scene3DLighting — physically-based light rig for the kitchen planner.
 *
 * Strategy:
 *  • IBL via <Environment preset="apartment"> — provides ambient GI and PBR
 *    reflections on all lacquer, stone, and metal surfaces.
 *  • Warm key light from upper-front — simulates a south-facing window.
 *  • Cool fill from rear — prevents black backs and adds depth contrast.
 *  • Overhead point light — simulates a flush ceiling fixture above the island.
 *  • Subtle bounce light from the floor plane — warms up base cabinets and toe kicks.
 */
export default function Scene3DLighting({ sceneGraph }) {
  const sun = sceneGraph?.lighting?.sunPosition  ?? [6, 11, -4];
  const si  = sceneGraph?.lighting?.sunIntensity ?? 1.1;

  return (
    <>
      {/* IBL — apartment preset: warm neutral, great for kitchens */}
      <Environment preset="apartment" />

      {/* Ambient fill — slightly lower than raw 0.30 so IBL does the heavy lifting */}
      <ambientLight intensity={0.28} color="#f6f1ec" />

      {/* Key light — warm daylight from upper-front-right (south window) */}
      <directionalLight
        position={sun}
        intensity={si}
        color="#fff9f2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
      />

      {/* Cool fill — opposite side, prevents harsh shadows, adds depth */}
      <directionalLight position={[-5, 4, 9]} intensity={0.30} color="#dce8f8" />

      {/* Overhead point — flush ceiling fixture above the kitchen centre */}
      <pointLight
        position={[sun[0] * 0.45, sun[1] * 0.85, sun[2] * 0.45]}
        intensity={0.55}
        color="#fffaf6"
        distance={22}
        decay={2}
      />

      {/* Soft bounce light from below — warms toe kicks and base cabinet undersides */}
      <pointLight
        position={[sun[0] * 0.6, 0.4, sun[2] * 0.6]}
        intensity={0.12}
        color="#f5e8d8"
        distance={14}
        decay={2}
      />
    </>
  );
}
