"use client";

import { Environment } from "@react-three/drei";

/**
 * Scene3DLighting — light rig for the kitchen planner 3D scene.
 *
 * Uses IBL via Drei <Environment> for physically-based reflections on all
 * materials, plus directional key/fill lights for shadow casting.
 */
export default function Scene3DLighting({ sceneGraph }) {
  const sun = sceneGraph?.lighting?.sunPosition  ?? [5, 10, -3];
  const si  = sceneGraph?.lighting?.sunIntensity ?? 1.0;

  return (
    <>
      {/* IBL — provides ambient and environment reflections for all PBR surfaces */}
      <Environment preset="apartment" />

      {/* Reduced ambient — Environment already contributes fill */}
      <ambientLight intensity={0.30} color="#f5f0eb" />

      {/* Key light — warm sun from above-front */}
      <directionalLight
        position={sun}
        intensity={si}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Cool fill from behind to prevent pure-black backs */}
      <directionalLight position={[-4, 3, 8]} intensity={0.25} color="#ddeeff" />

      {/* Subtle point light near the ceiling center — simulates overhead fixture */}
      <pointLight
        position={[sun[0] * 0.5, sun[1] * 0.8, sun[2] * 0.5]}
        intensity={0.4}
        color="#fffaf5"
        distance={20}
        decay={2}
      />
    </>
  );
}
