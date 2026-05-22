"use client";

import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import usePlannerStore from "@/store/plannerStore";

/**
 * Scene3DControls — camera controls for the 3D planner viewport.
 *
 * • Perspective mode : free orbit (drag), pan (right-click), zoom (wheel)
 * • Saves camera position to Zustand so AI generation can use the pose
 */
export default function Scene3DControls({ sceneGraph }) {
  const controlsRef  = useRef(null);
  const { camera }   = useThree();
  const setCameraState = usePlannerStore((s) => s.setCameraState);

  // Initialise camera from stored scene graph
  useEffect(() => {
    if (!sceneGraph?.camera) return;
    const { position, target } = sceneGraph.camera;
    camera.position.set(...position);
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Persist camera pose on each orbit end
  function handleChange() {
    if (!controlsRef.current) return;
    const { x: px, y: py, z: pz } = camera.position;
    const { x: tx, y: ty, z: tz } = controlsRef.current.target;
    setCameraState({
      mode:     "perspective",
      position: [px, py, pz],
      target:   [tx, ty, tz],
    });
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={2}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2 + 0.1}   // prevent going below floor
      onEnd={handleChange}
    />
  );
}
