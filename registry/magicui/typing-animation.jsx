"use client";
import { useEffect, useState } from "react";

export function TypingAnimation({
  children,
  duration = 80,
  delay = 0,
  loop = true,
  pauseTime = 1800,
  showCursor = true,
  className,
}) {
  const text = typeof children === "string" ? children : "";
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState("waiting"); // waiting | typing | pausing

  useEffect(() => {
    let timeout;
    if (phase === "waiting") {
      timeout = setTimeout(() => setPhase("typing"), delay);
    } else if (phase === "typing") {
      if (displayed.length < text.length) {
        timeout = setTimeout(
          () => setDisplayed(text.slice(0, displayed.length + 1)),
          duration,
        );
      } else {
        setPhase("pausing");
      }
    } else if (phase === "pausing") {
      if (loop) {
        timeout = setTimeout(() => {
          setDisplayed("");
          setPhase("typing");
        }, pauseTime);
      }
    }
    return () => clearTimeout(timeout);
  }, [phase, displayed, text, duration, delay, loop, pauseTime]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && (
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: "1em",
            background: "currentColor",
            marginLeft: "2px",
            verticalAlign: "text-bottom",
            animation: "blink 1s step-end infinite",
          }}
        />
      )}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  );
}
