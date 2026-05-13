"use client";
import { useEffect, useRef, useCallback } from "react";

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "#000",
  width,
  height,
  className,
  maxOpacity = 0.3,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({ squares: [], cols: 0, r: 0, g: 0, b: 0 });

  const parseColor = useCallback((c) => {
    const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }, []);

  const setupGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = width || container.clientWidth;
    const h = height || container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const cols = Math.floor(w / (squareSize + gridGap));
    const rows = Math.floor(h / (squareSize + gridGap));
    stateRef.current.cols = cols;
    stateRef.current.squares = Array.from({ length: cols * rows }, () => ({
      opacity: Math.random() * maxOpacity,
    }));
  }, [squareSize, gridGap, maxOpacity, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { r, g, b } = parseColor(color);
    stateRef.current.r = r;
    stateRef.current.g = g;
    stateRef.current.b = b;
    setupGrid();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { squares, cols, r: cr, g: cg, b: cb } = stateRef.current;
      squares.forEach((sq, i) => {
        if (Math.random() < flickerChance) sq.opacity = Math.random() * maxOpacity;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${sq.opacity})`;
        ctx.fillRect(
          (i % cols) * (squareSize + gridGap),
          Math.floor(i / cols) * (squareSize + gridGap),
          squareSize,
          squareSize,
        );
      });
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    const ro = new ResizeObserver(() => setupGrid());
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animationRef.current);
      ro.disconnect();
    };
  }, [squareSize, gridGap, flickerChance, color, maxOpacity, parseColor, setupGrid]);

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
