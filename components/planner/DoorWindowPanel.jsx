"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "door",   label: "Door",   icon: (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="2" width="10" height="16" rx="1" />
      <path d="M13 2 A10 10 0 0 1 13 18" strokeDasharray="3 2" />
      <circle cx="12" cy="10" r="0.8" fill="currentColor" />
    </svg>
  )},
  { value: "window", label: "Window", icon: (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="5" width="14" height="10" rx="1" />
      <line x1="10" y1="5" x2="10" y2="15" />
      <line x1="3" y1="10" x2="17" y2="10" />
    </svg>
  )},
];

const WALL_OPTIONS = [
  { value: "north", label: "North wall (top)" },
  { value: "south", label: "South wall (bottom)" },
  { value: "east",  label: "East wall (right)" },
  { value: "west",  label: "West wall (left)" },
];

const SWING_OPTIONS = [
  { value: "left",  label: "Swing left" },
  { value: "right", label: "Swing right" },
];

const DEFAULT_WIDTHS = { door: 3.0, window: 3.0 };

// ─── Add form ─────────────────────────────────────────────────────────────────

function AddDoorWindowForm({ onAdd, roomDimensions }) {
  const [type,      setType]      = useState("door");
  const [wall,      setWall]      = useState("north");
  const [offsetFt,  setOffsetFt]  = useState(2);
  const [widthFt,   setWidthFt]   = useState(3);
  const [heightFt,  setHeightFt]  = useState(type === "door" ? 6.8 : 4.0);
  const [swingDir,  setSwingDir]  = useState("left");

  function handleTypeChange(t) {
    setType(t);
    setWidthFt(DEFAULT_WIDTHS[t]);
    setHeightFt(t === "door" ? 6.8 : 4.0);
  }

  function handleAdd() {
    const isH = wall === "north" || wall === "south";
    const wallLen = isH ? roomDimensions.width : roomDimensions.length;
    const clampedOffset = Math.max(0, Math.min(offsetFt, wallLen - widthFt));
    onAdd({
      type,
      wall,
      offsetFt:  parseFloat(clampedOffset.toFixed(2)),
      widthFt:   parseFloat(widthFt),
      heightFt:  parseFloat(heightFt),
      swingDir:  type === "door" ? swingDir : undefined,
    });
    // Reset
    setOffsetFt(2);
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Type selector */}
      <div>
        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Type</label>
        <div className="flex gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              className={[
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition",
                type === opt.value
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400",
              ].join(" ")}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Wall selector */}
      <div>
        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Wall</label>
        <select
          value={wall}
          onChange={(e) => setWall(e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
        >
          {WALL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Numeric inputs row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
            Offset (ft)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={offsetFt}
            onChange={(e) => setOffsetFt(parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
            Width (ft)
          </label>
          <input
            type="number"
            min={1}
            max={12}
            step={0.5}
            value={widthFt}
            onChange={(e) => setWidthFt(parseFloat(e.target.value) || 3)}
            className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
      </div>

      {/* Height input */}
      <div>
        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
          Height (ft)
        </label>
        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={heightFt}
          onChange={(e) => setHeightFt(parseFloat(e.target.value) || 7)}
          className="w-full px-2.5 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      {/* Swing direction (doors only) */}
      {type === "door" && (
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Door Swing</label>
          <div className="flex gap-1.5">
            {SWING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSwingDir(opt.value)}
                className={[
                  "flex-1 py-1.5 rounded-lg border text-xs font-medium transition",
                  swingDir === opt.value
                    ? "border-stone-700 bg-stone-100 text-stone-800"
                    : "border-stone-200 bg-white text-stone-500 hover:border-stone-300",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-700 transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add {type === "door" ? "Door" : "Window"}
      </button>
    </div>
  );
}

// ─── Placed entry row ─────────────────────────────────────────────────────────

function DoorWindowRow({ entry, onRemove }) {
  const wallLabel = WALL_OPTIONS.find((w) => w.value === entry.wall)?.label ?? entry.wall;
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white border border-stone-100 shadow-sm group">
      <div className={[
        "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
        entry.type === "door" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600",
      ].join(" ")}>
        {entry.type === "door" ? (
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="2" width="8" height="15" rx="1" />
            <path d="M12 2 A8 8 0 0 1 12 17" strokeDasharray="2.5 1.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="6" width="14" height="8" rx="1" />
            <line x1="10" y1="6" x2="10" y2="14" />
            <line x1="3" y1="10" x2="17" y2="10" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-800 capitalize">{entry.type}</p>
        <p className="text-[10px] text-stone-400 truncate">
          {wallLabel} · {entry.widthFt}ft wide · +{entry.offsetFt}ft
        </p>
      </div>
      <button
        onClick={() => onRemove(entry.id)}
        className="w-6 h-6 rounded-full flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
        aria-label="Remove"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function DoorWindowPanel({ primaryColor = "#1C1917" }) {
  const doorWindows     = usePlannerStore((s) => s.doorWindows);
  const addDoorWindow   = usePlannerStore((s) => s.addDoorWindow);
  const removeDoorWindow = usePlannerStore((s) => s.removeDoorWindow);
  const roomDimensions  = usePlannerStore((s) => s.roomDimensions);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function handleAdd(entry) {
    addDoorWindow(entry);
    setShowForm(false);
  }

  const doorCount   = doorWindows.filter((d) => d.type === "door").length;
  const windowCount = doorWindows.filter((d) => d.type === "window").length;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition"
        aria-expanded={expanded}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Doors &amp; Windows</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {doorWindows.length === 0
              ? "Mark openings on your walls"
              : `${doorCount} door${doorCount !== 1 ? "s" : ""} · ${windowCount} window${windowCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 flex flex-col gap-2">

          {/* Tip */}
          <p className="text-[10px] text-stone-400 leading-relaxed">
            Mark doors and windows so the 2D plan shows wall openings. Switch to the <strong className="text-stone-500">Doors &amp; Windows</strong> layer in the canvas to see them highlighted.
          </p>

          {/* Placed list */}
          {doorWindows.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {doorWindows.map((dw) => (
                <DoorWindowRow key={dw.id} entry={dw} onRemove={removeDoorWindow} />
              ))}
            </div>
          )}

          {/* Add form toggle */}
          {showForm ? (
            <>
              <div className="mt-1 border-t border-stone-200 pt-3">
                <AddDoorWindowForm onAdd={handleAdd} roomDimensions={roomDimensions} />
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-[11px] text-stone-400 hover:text-stone-600 transition text-center"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-stone-300 text-xs text-stone-500 hover:border-stone-400 hover:bg-white hover:text-stone-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add door or window
            </button>
          )}
        </div>
      )}
    </div>
  );
}
