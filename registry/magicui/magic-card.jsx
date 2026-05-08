"use client";
import { useRef, useState } from "react";

/**
 * MagicCard — cursor-tracking glow effect.
 * Orb mode:       pass glowFrom + glowTo (two-color gradient)
 * Spotlight mode: pass gradientColor (single-color radial)
 */
export function MagicCard({
  children,
  className = "",
  // Orb mode
  glowFrom,
  glowTo,
  // Spotlight mode
  gradientColor,
  // Shared
  gradientSize = 320,
  gradientOpacity = 0.18,
}) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: -gradientSize, y: -gradientSize });
  const [hovering, setHovering] = useState(false);

  function handleMouseMove(e) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  // Build gradient string
  const gradient = gradientColor
    ? `radial-gradient(${gradientSize}px circle at ${pos.x}px ${pos.y}px, ${gradientColor}, transparent 80%)`
    : `radial-gradient(${gradientSize}px circle at ${pos.x}px ${pos.y}px, ${glowFrom}, ${glowTo}, transparent 100%)`;

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setPos({ x: -gradientSize, y: -gradientSize });
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: hovering ? (gradientColor ? 1 : gradientOpacity) : 0,
          background: gradient,
        }}
      />
      {children}
    </div>
  );
}
