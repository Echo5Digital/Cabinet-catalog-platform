"use client";

import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MOVE_SPEED   = 0.08;   // ft per frame
const LOOK_SPEED   = 0.0018; // radians per pixel

/**
 * WalkthroughControls — first-person WASD + mouse-look camera.
 *
 * Activated when the user enters walkthrough mode. Unlike PointerLockControls
 * (which requires pointer lock API and may be blocked on iOS), this uses raw
 * mouse events for maximum compatibility. On mobile, touch joystick is not
 * implemented — walkthrough mode is desktop-only.
 *
 * Movement keys: W/A/S/D or arrow keys.
 * Look: click+drag anywhere in the canvas.
 * Exit: pressing Escape or clicking the Exit button in PlannerScene3D.
 *
 * Props:
 *   roomWidthFt, roomLengthFt — used to clamp camera within the room.
 *   active — boolean — only processes input when true.
 */
export default function WalkthroughControls({ roomWidthFt = 14, roomLengthFt = 11, active }) {
  const { camera, gl } = useThree();

  const yaw   = useRef(0);     // horizontal angle (radians)
  const pitch = useRef(-0.08); // vertical angle (down slightly for natural look)
  const keys  = useRef({});
  const dragging = useRef(false);

  // Set first-person eye-level position when activated
  useEffect(() => {
    if (!active) return;
    // Place camera at room center, eye level (5.5 ft = ~1.65 m)
    const cx = roomWidthFt  / 2;
    const cz = roomLengthFt / 2;
    camera.position.set(cx, 5.5, cz);
    camera.rotation.order = "YXZ";
    yaw.current   = Math.PI; // look toward south wall
    pitch.current = -0.05;
  }, [active, camera, roomWidthFt, roomLengthFt]);

  // Mouse look handlers
  const handleMouseDown = useCallback((e) => {
    if (!active || e.button !== 0) return;
    dragging.current = true;
  }, [active]);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!active || !dragging.current) return;
    yaw.current   -= e.movementX * LOOK_SPEED;
    pitch.current -= e.movementY * LOOK_SPEED;
    pitch.current  = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, pitch.current));
  }, [active]);

  // Key handlers
  const handleKeyDown = useCallback((e) => {
    if (!active) return;
    keys.current[e.key.toLowerCase()] = true;
  }, [active]);

  const handleKeyUp = useCallback((e) => {
    keys.current[e.key.toLowerCase()] = false;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup",   handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown",   handleKeyDown);
    window.addEventListener("keyup",     handleKeyUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup",   handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown",   handleKeyDown);
      window.removeEventListener("keyup",     handleKeyUp);
    };
  }, [gl.domElement, handleMouseDown, handleMouseUp, handleMouseMove, handleKeyDown, handleKeyUp]);

  // Per-frame movement + camera rotation update
  useFrame(() => {
    if (!active) return;

    // Apply yaw/pitch to camera quaternion
    camera.quaternion.setFromEuler(
      new THREE.Euler(pitch.current, yaw.current, 0, "YXZ")
    );

    // Compute forward and right vectors (horizontal plane only)
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right   = new THREE.Vector3( Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    const k = keys.current;
    const move = new THREE.Vector3();

    if (k["w"] || k["arrowup"])    move.addScaledVector(forward,  MOVE_SPEED);
    if (k["s"] || k["arrowdown"])  move.addScaledVector(forward, -MOVE_SPEED);
    if (k["a"] || k["arrowleft"])  move.addScaledVector(right,   -MOVE_SPEED);
    if (k["d"] || k["arrowright"]) move.addScaledVector(right,    MOVE_SPEED);

    camera.position.add(move);

    // Clamp camera within room bounds (with 0.5ft wall clearance)
    const margin = 0.5;
    camera.position.x = Math.max(margin, Math.min(roomWidthFt  - margin, camera.position.x));
    camera.position.z = Math.max(margin, Math.min(roomLengthFt - margin, camera.position.z));
    camera.position.y = 5.5; // keep at eye level
  });

  return null; // no visual output — pure imperative camera control
}
