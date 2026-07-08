"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import usePlannerStore from "@/store/plannerStore";

const CATEGORY_ORDER = [
  "Base Cabinets",
  "Wall Cabinets",
  "Tall Units",
  "Vanity",
  "Appliances",
  "Accessories",
];

// Normalise DB short names to canonical long forms so accordion labels and
// colour lookups work regardless of how the admin named them in the DB.
function normalizeCategory(cat) {
  const c = (cat || "").toLowerCase().trim();
  if (c === "base" || c === "base cabinet")                      return "Base Cabinets";
  if (c === "wall" || c === "wall cabinet")                      return "Wall Cabinets";
  if (c === "tall" || c === "tall unit" || c === "pantry")       return "Tall Units";
  if (c === "vanity" || c === "vanity cabinet")                  return "Vanity";
  if (c === "accessories" || c === "accessory" || c === "accessorie") return "Accessories";
  return cat || "";
}

const CATEGORY_DOTS = {
  "Base Cabinets": "bg-stone-400",
  "Wall Cabinets": "bg-blue-400",
  "Tall Units":    "bg-emerald-400",
  Vanity:          "bg-pink-400",
  Appliances:      "bg-amber-400",
  Accessories:     "bg-violet-400",
};

const FIXTURES = [
  { id: "fixture-sink",  name: "Sink",           category: "Sink",
    widthFt: 2.5, depthFt: 1.67, imageUrl: null, sku: null, doorCount: null, drawerCount: null },
  { id: "fixture-range", name: "Range / Cooktop", category: "Range",
    widthFt: 2.5, depthFt: 2.0,  imageUrl: null, sku: null, doorCount: null, drawerCount: null },
];

const FIXTURE_ICONS = {
  Sink: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="11" rx="1"/>
      <rect x="7" y="11" width="10" height="5" rx="0.5"/>
      <line x1="12" y1="5" x2="12" y2="8"/>
      <circle cx="12" cy="4.5" r="1"/>
    </svg>
  ),
  Range: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="20" height="16" rx="1"/>
      <circle cx="7.5" cy="10" r="2.2"/>
      <circle cx="16.5" cy="10" r="2.2"/>
      <circle cx="7.5" cy="17" r="2.2"/>
      <circle cx="16.5" cy="17" r="2.2"/>
    </svg>
  ),
};

// ─── Cabinet door / drawer styles (hardcoded — 4 canonical types) ────────────
const DOOR_STYLE_OPTIONS = [
  {
    id: "Shaker",
    name: "Shaker",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5" />
        <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1.5} />
      </svg>
    ),
  },
  {
    id: "Slab",
    name: "Slab / Flat",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5" />
        <line x1="19" y1="43" x2="29" y2="43" strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "Raised Panel",
    name: "Raised Panel",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5" />
        <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1.5} />
        <rect x="15" y="15" width="18" height="18" rx="0.5" strokeWidth={1} fill="currentColor" fillOpacity={0.12} />
      </svg>
    ),
  },
  {
    id: "Glass-Front",
    name: "Glass-Front",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5" />
        <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1.5} />
        <line x1="10" y1="10" x2="38" y2="38" strokeWidth={1} opacity={0.4} />
        <line x1="10" y1="38" x2="38" y2="10" strokeWidth={1} opacity={0.4} />
      </svg>
    ),
  },
];

// ─── Hardware styles (hardcoded — no DB table needed) ─────────────────────────
const HARDWARE_STYLES = [
  { id: "hw-bar",    name: "Bar Pull",   type: "bar"    },
  { id: "hw-knob",   name: "Knob",       type: "knob"   },
  { id: "hw-cup",    name: "Cup Pull",   type: "cup"    },
  { id: "hw-hidden", name: "Integrated", type: "hidden" },
];

// Hardware icon SVGs
const HARDWARE_ICONS = {
  bar: (
    <svg viewBox="0 0 32 32" className="w-6 h-6 text-stone-500" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="6" y1="16" x2="26" y2="16"/>
      <circle cx="8" cy="16" r="2.5" fill="currentColor" stroke="none"/>
      <circle cx="24" cy="16" r="2.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  knob: (
    <svg viewBox="0 0 32 32" className="w-6 h-6 text-stone-500" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="16" cy="16" r="6"/>
      <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  cup: (
    <svg viewBox="0 0 32 32" className="w-6 h-6 text-stone-500" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M6 12 Q6 22 16 22 Q26 22 26 12"/>
      <line x1="6" y1="12" x2="26" y2="12"/>
    </svg>
  ),
  hidden: (
    <svg viewBox="0 0 32 32" className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="3 2">
      <rect x="6" y="13" width="20" height="6" rx="1"/>
    </svg>
  ),
};

// ─── Finish → approximate hex color for 3D preview ───────────────────────────
function matchColorKeywords(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("white") || t.includes("bright"))             return "#f4f2ee";
  if (t.includes("cream") || t.includes("ivory"))              return "#f0e8d0";
  if (t.includes("light gray") || t.includes("light grey"))    return "#c0bcb8";
  if (t.includes("gray")  || t.includes("grey"))               return "#8c8c8c";
  if (t.includes("charcoal") || t.includes("dark gray") || t.includes("dark grey")) return "#4a4a4a";
  if (t.includes("black") || t.includes("midnight"))           return "#2a2320";
  if (t.includes("espresso") || t.includes("dark brown"))      return "#3b2010";
  if (t.includes("walnut") || t.includes("brown"))             return "#6b4226";
  if (t.includes("navy") || t.includes("dark blue"))           return "#1a2744";
  if (t.includes("blue"))                                       return "#3a5f8a";
  if (t.includes("sage") || t.includes("olive"))               return "#6b7c5e";
  if (t.includes("green") || t.includes("forest"))             return "#3a5f3a";
  if (t.includes("beige") || t.includes("linen"))              return "#d9c9a8";
  if (t.includes("taupe") || t.includes("greige"))             return "#9e8f7c";
  if (t.includes("warm") && !t.includes("white"))              return "#c8b89a";
  if (t.includes("natural") || t.includes("maple"))            return "#c8a06e";
  if (t.includes("cherry"))                                     return "#8b2500";
  if (t.includes("oak"))                                        return "#b8865a";
  // Countertop-specific keywords
  if (t.includes("quartz"))                                     return "#e8e4de";
  if (t.includes("marble"))                                     return "#f0ede8";
  if (t.includes("granite"))                                    return "#9a9088";
  if (t.includes("concrete"))                                   return "#9a9898";
  if (t.includes("soapstone"))                                  return "#6a7070";
  if (t.includes("butcher") || t.includes("wood"))             return "#b8905a";
  // Flooring-specific keywords
  if (t.includes("hardwood") || t.includes("plank"))           return "#c09a6a";
  if (t.includes("tile") || t.includes("ceramic") || t.includes("porcelain")) return "#d0cdc8";
  if (t.includes("slate"))                                      return "#7a7870";
  if (t.includes("limestone"))                                  return "#d4cfc0";
  if (t.includes("terracotta"))                                 return "#c8785a";
  return null;
}

export function finishCodeToHex(code, finishFamily, name, description) {
  // Check name first — admins set human-readable names like "Warm White"
  const fromName = matchColorKeywords(name);
  if (fromName) return fromName;
  // Then check the code field
  const fromCode = matchColorKeywords(code);
  if (fromCode) return fromCode;
  // Then check the description field
  const fromDesc = matchColorKeywords(description);
  if (fromDesc) return fromDesc;
  // finishFamily fallback
  if ((finishFamily || "").toLowerCase() === "stained") return "#7a5c3a";
  return "#d4cfc8"; // default warm taupe
}

// ─── Shared UI building blocks ────────────────────────────────────────────────

/**
 * Reusable accordion section wrapper used by all 5 new design sections.
 */
function SidebarSection({ label, selected, isOpen, onToggle, children }) {
  return (
    <div className="px-3 pt-3 pb-1 border-t border-stone-100 mt-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-1 py-2 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 group-hover:text-stone-600 transition-colors">
            {label}
          </p>
          {selected && (
            <span className="text-[9px] text-stone-400 truncate hidden sm:inline">
              — {selected}
            </span>
          )}
        </div>
        <svg
          className={[
            "w-3.5 h-3.5 text-stone-400 transition-transform shrink-0",
            isOpen ? "rotate-90" : "",
          ].join(" ")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && children}
    </div>
  );
}

/**
 * Reusable swatch chip — renders image if swatchUrl, solid color if hex, neutral stone otherwise.
 */
function SwatchButton({ item, isSelected, onClick }) {
  return (
    <button
      type="button"
      title={item.name}
      onClick={() => onClick(item)}
      className={[
        "relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-100 shrink-0 focus:outline-none",
        isSelected
          ? "border-blue-500 shadow-md scale-105"
          : "border-stone-200 hover:border-stone-400 hover:scale-105",
      ].join(" ")}
    >
      {item.swatchUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.swatchUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : item.hex ? (
        <span className="block w-full h-full" style={{ backgroundColor: item.hex }} />
      ) : (
        <span className="block w-full h-full bg-stone-200" />
      )}

      {isSelected && (
        <span className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
          <svg className="w-3.5 h-3.5 text-blue-600 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  );
}

/**
 * Shared dashed clear-selection chip.
 */
function ClearButton({ onClear }) {
  return (
    <button
      type="button"
      title="Clear selection"
      onClick={onClear}
      className="w-10 h-10 rounded-lg border-2 border-dashed border-stone-300 text-stone-400 flex items-center justify-center hover:border-stone-500 hover:text-stone-600 transition shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// ─── Individual draggable product card ────────────────────────────────────────

function DraggableProduct({ product, onQuickAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `sidebar-${product.id}`,
    data: { type: "product", product },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onQuickAdd?.(product)}
      className={[
        "flex items-center gap-3 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-100 select-none",
        isDragging
          ? "opacity-30 scale-95 border-stone-300 bg-stone-50"
          : "border-stone-100 bg-white hover:border-stone-200 hover:shadow-sm",
      ].join(" ")}
      style={{ touchAction: "none" }}
    >
      {/* Product image */}
      <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-100 overflow-hidden shrink-0 flex items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          FIXTURE_ICONS[product.category] || (
            <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-800 truncate leading-tight">{product.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={[
              "inline-block w-1.5 h-1.5 rounded-full shrink-0",
              CATEGORY_DOTS[normalizeCategory(product.category)] || "bg-stone-300",
            ].join(" ")}
          />
          <p className="text-[10px] text-stone-500 truncate">
            {product.widthFt}ft × {product.depthFt}ft
          </p>
        </div>
      </div>

      {/* Drag handle icon */}
      <svg className="w-3.5 h-3.5 text-stone-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
      </svg>
    </div>
  );
}

// ─── Finish swatch chip (existing — for cabinet colors) ───────────────────────

function FinishSwatch({ finish, isSelected, onClick }) {
  const hex = finishCodeToHex(finish.code, finish.finishFamily, finish.name, finish.description);

  return (
    <button
      type="button"
      title={finish.name}
      onClick={() => onClick(finish)}
      className={[
        "relative w-9 h-9 rounded-lg overflow-hidden border-2 transition-all duration-100 shrink-0 focus:outline-none",
        isSelected
          ? "border-blue-500 shadow-md scale-105"
          : "border-stone-200 hover:border-stone-400 hover:scale-105",
      ].join(" ")}
    >
      {finish.swatchUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finish.swatchUrl}
          alt={finish.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="block w-full h-full" style={{ backgroundColor: hex }} />
      )}

      {isSelected && (
        <span className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
          <svg className="w-3.5 h-3.5 text-blue-600 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── Door Style section ───────────────────────────────────────────────────────

function DoorStyleSection() {
  const selectedDoorStyle    = usePlannerStore((s) => s.selectedDoorStyle);
  const setSelectedDoorStyle = usePlannerStore((s) => s.setSelectedDoorStyle);
  const [isOpen, setIsOpen]  = useState(true);

  const handleSelect = (opt) => {
    const payload = { id: opt.id, name: opt.name };
    setSelectedDoorStyle(selectedDoorStyle?.id === opt.id ? null : payload);
  };

  return (
    <SidebarSection
      label="Door Style"
      selected={selectedDoorStyle?.name}
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
    >
      <div className="grid grid-cols-4 gap-1.5 pb-3 px-1">
        {DOOR_STYLE_OPTIONS.map((opt) => {
          const sel = selectedDoorStyle?.id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.name}
              onClick={() => handleSelect(opt)}
              className={[
                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-100 focus:outline-none",
                sel
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50",
              ].join(" ")}
            >
              <span className={["block w-8 h-8", sel ? "text-blue-600" : "text-stone-500"].join(" ")}>
                {opt.icon}
              </span>
              <span className={["text-[9px] font-medium leading-tight text-center", sel ? "text-blue-700" : "text-stone-500"].join(" ")}>
                {opt.name}
              </span>
            </button>
          );
        })}
        {selectedDoorStyle && <ClearButton onClear={() => setSelectedDoorStyle(null)} />}
      </div>
    </SidebarSection>
  );
}

// ─── Drawer Style section ─────────────────────────────────────────────────────

function DrawerStyleSection() {
  const selectedDrawerStyle    = usePlannerStore((s) => s.selectedDrawerStyle);
  const setSelectedDrawerStyle = usePlannerStore((s) => s.setSelectedDrawerStyle);
  const [isOpen, setIsOpen]    = useState(false);

  const handleSelect = (opt) => {
    const payload = { id: opt.id, name: opt.name };
    setSelectedDrawerStyle(selectedDrawerStyle?.id === opt.id ? null : payload);
  };

  return (
    <SidebarSection
      label="Drawer Style"
      selected={selectedDrawerStyle?.name}
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
    >
      <div className="grid grid-cols-4 gap-1.5 pb-3 px-1">
        {DOOR_STYLE_OPTIONS.map((opt) => {
          const sel = selectedDrawerStyle?.id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.name}
              onClick={() => handleSelect(opt)}
              className={[
                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-100 focus:outline-none",
                sel
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50",
              ].join(" ")}
            >
              <span className={["block w-8 h-8", sel ? "text-blue-600" : "text-stone-500"].join(" ")}>
                {opt.icon}
              </span>
              <span className={["text-[9px] font-medium leading-tight text-center", sel ? "text-blue-700" : "text-stone-500"].join(" ")}>
                {opt.name}
              </span>
            </button>
          );
        })}
        {selectedDrawerStyle && <ClearButton onClear={() => setSelectedDrawerStyle(null)} />}
      </div>
    </SidebarSection>
  );
}

// ─── Hardware section ─────────────────────────────────────────────────────────

function HardwareTile({ hw, isSelected, onClick }) {
  return (
    <button
      type="button"
      title={hw.name}
      onClick={() => onClick(hw)}
      className={[
        "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-100 focus:outline-none",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50",
      ].join(" ")}
    >
      {HARDWARE_ICONS[hw.type]}
      <span className={["text-[9px] font-medium leading-tight text-center", isSelected ? "text-blue-700" : "text-stone-500"].join(" ")}>
        {hw.name}
      </span>
    </button>
  );
}

function HardwareSection() {
  const selectedHardware    = usePlannerStore((s) => s.selectedHardware);
  const setSelectedHardware = usePlannerStore((s) => s.setSelectedHardware);
  const [isOpen, setIsOpen] = useState(true);

  const handleSelect = (hw) =>
    setSelectedHardware(selectedHardware?.id === hw.id ? null : hw);

  return (
    <SidebarSection
      label="Hardware"
      selected={selectedHardware?.name}
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
    >
      <div className="grid grid-cols-4 gap-1.5 pb-3 px-1">
        {HARDWARE_STYLES.map((hw) => (
          <HardwareTile
            key={hw.id}
            hw={hw}
            isSelected={selectedHardware?.id === hw.id}
            onClick={handleSelect}
          />
        ))}
      </div>
    </SidebarSection>
  );
}

// ─── Cabinet Colors section ────────────────────────────────────────────────────

function CabinetColorsSection({ finishes }) {
  const upperCabinetColor    = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor    = usePlannerStore((s) => s.lowerCabinetColor);
  const setUpperCabinetColor = usePlannerStore((s) => s.setUpperCabinetColor);
  const setLowerCabinetColor = usePlannerStore((s) => s.setLowerCabinetColor);

  const [openRows, setOpenRows] = useState(() => new Set(["upper", "lower"]));

  const toggleRow = (key) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleSelect = (slot, finish) => {
    const payload = {
      id:          finish.id,
      name:        finish.name,
      code:        finish.code,
      finishFamily: finish.finishFamily,
      swatchUrl:   finish.swatchUrl,
      hex:         finishCodeToHex(finish.code, finish.finishFamily, finish.name, finish.description),
    };
    if (slot === "upper") {
      setUpperCabinetColor(upperCabinetColor?.id === finish.id ? null : payload);
    } else {
      setLowerCabinetColor(lowerCabinetColor?.id === finish.id ? null : payload);
    }
  };

  const rows = [
    { key: "upper", label: "Upper Cabinet Color", selected: upperCabinetColor },
    { key: "lower", label: "Lower Cabinet Color", selected: lowerCabinetColor },
  ];

  return (
    <div className="px-3 pt-3 pb-1 border-t border-stone-100 mt-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1 px-1">
        Cabinet Colors
      </p>

      {finishes.length === 0 ? (
        <p className="text-[10px] text-stone-400 px-1 py-2">
          No finishes configured for this style.
        </p>
      ) : (
        rows.map((row) => {
          const isOpen = openRows.has(row.key);
          return (
            <div key={row.key}>
              <button
                onClick={() => toggleRow(row.key)}
                className="w-full flex items-center justify-between px-1 py-2 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full border border-stone-300 shrink-0 transition-all"
                    style={
                      row.selected?.swatchUrl
                        ? {
                            backgroundImage: `url(${row.selected.swatchUrl})`,
                            backgroundSize:  "cover",
                          }
                        : { backgroundColor: row.selected?.hex ?? "#e7e5e4" }
                    }
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 group-hover:text-stone-700 transition-colors truncate">
                    {row.label}
                  </span>
                  {row.selected && (
                    <span className="text-[9px] text-stone-400 truncate hidden sm:inline">
                      — {row.selected.name}
                    </span>
                  )}
                </div>
                <svg
                  className={[
                    "w-3.5 h-3.5 text-stone-400 transition-transform shrink-0",
                    isOpen ? "rotate-90" : "",
                  ].join(" ")}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {isOpen && (
                <div className="flex flex-wrap gap-2 pb-3 px-1">
                  {finishes.map((finish) => (
                    <FinishSwatch
                      key={finish.id}
                      finish={finish}
                      isSelected={row.selected?.id === finish.id}
                      onClick={(f) => handleSelect(row.key, f)}
                    />
                  ))}
                  {row.selected && (
                    <button
                      type="button"
                      title="Clear selection"
                      onClick={() =>
                        row.key === "upper"
                          ? setUpperCabinetColor(null)
                          : setLowerCabinetColor(null)
                      }
                      className="w-9 h-9 rounded-lg border-2 border-dashed border-stone-300 text-stone-400 flex items-center justify-center hover:border-stone-500 hover:text-stone-600 transition shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Countertop section ───────────────────────────────────────────────────────

function CountertopSection({ countertops }) {
  const selectedCountertop    = usePlannerStore((s) => s.selectedCountertop);
  const setSelectedCountertop = usePlannerStore((s) => s.setSelectedCountertop);
  const [isOpen, setIsOpen]   = useState(true);

  if (!countertops || countertops.length === 0) return null;

  const handleSelect = (c) => {
    const hex = finishCodeToHex(c.code, null, c.name, c.description);
    const payload = { id: c.id, name: c.name, code: c.code, description: c.description, swatchUrl: c.swatchUrl, hex };
    setSelectedCountertop(selectedCountertop?.id === c.id ? null : payload);
  };

  return (
    <SidebarSection
      label="Countertop"
      selected={selectedCountertop?.name}
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
    >
      <div className="flex flex-wrap gap-2 pb-3 px-1">
        {countertops.map((c) => {
          const hex = finishCodeToHex(c.code, null, c.name, c.description);
          return (
            <SwatchButton
              key={c.id}
              item={{ id: c.id, name: c.name, swatchUrl: c.swatchUrl, hex }}
              isSelected={selectedCountertop?.id === c.id}
              onClick={() => handleSelect(c)}
            />
          );
        })}
        {selectedCountertop && <ClearButton onClear={() => setSelectedCountertop(null)} />}
      </div>
    </SidebarSection>
  );
}

// ─── Flooring section ─────────────────────────────────────────────────────────

function FlooringSection({ floorColors }) {
  const selectedFlooring    = usePlannerStore((s) => s.selectedFlooring);
  const setSelectedFlooring = usePlannerStore((s) => s.setSelectedFlooring);
  const [isOpen, setIsOpen] = useState(false);

  if (!floorColors || floorColors.length === 0) return null;

  const handleSelect = (c) => {
    const hex = finishCodeToHex(c.code, null, c.name, c.description);
    const payload = { id: c.id, name: c.name, code: c.code, description: c.description, swatchUrl: c.swatchUrl, hex };
    setSelectedFlooring(selectedFlooring?.id === c.id ? null : payload);
  };

  return (
    <SidebarSection
      label="Flooring"
      selected={selectedFlooring?.name}
      isOpen={isOpen}
      onToggle={() => setIsOpen((v) => !v)}
    >
      <div className="flex flex-wrap gap-2 pb-3 px-1">
        {floorColors.map((c) => {
          const hex = finishCodeToHex(c.code, null, c.name, c.description);
          return (
            <SwatchButton
              key={c.id}
              item={{ id: c.id, name: c.name, swatchUrl: c.swatchUrl, hex }}
              isSelected={selectedFlooring?.id === c.id}
              onClick={() => handleSelect(c)}
            />
          );
        })}
        {selectedFlooring && <ClearButton onClear={() => setSelectedFlooring(null)} />}
      </div>
    </SidebarSection>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProductSidebar({ products = [], finishes = [], structures = [], countertops = [], floorColors = [], isOpen, onToggle, onQuickAdd }) {
  // Categories present in CATEGORY_ORDER (in defined order)
  const orderedPresent = CATEGORY_ORDER.filter((cat) =>
    products.some((p) => normalizeCategory(p.category) === cat)
  );
  // Any categories that exist in products but aren't listed in CATEGORY_ORDER
  const extraCategories = [...new Set(products.map((p) => normalizeCategory(p.category)))]
    .filter((c) => c && !CATEGORY_ORDER.includes(c));
  const presentCategories = [...orderedPresent, ...extraCategories];

  const [openCategories, setOpenCategories] = useState(() => new Set());

  const toggleCategory = (cat) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Group ALL products by canonical category
  const grouped = {};
  for (const p of products) {
    const cat = normalizeCategory(p.category) || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={[
          "hidden md:flex flex-col bg-white border-r border-stone-200 transition-all duration-200 shrink-0 overflow-hidden",
          isOpen ? "w-72" : "w-0",
        ].join(" ")}
      >
        {isOpen && (
          <SidebarContent
            products={products}
            finishes={finishes}
            countertops={countertops}
            floorColors={floorColors}
            grouped={grouped}
            presentCategories={presentCategories}
            openCategories={openCategories}
            toggleCategory={toggleCategory}
            onQuickAdd={onQuickAdd}
          />
        )}
      </div>

      {/* Mobile: bottom sheet trigger + drawer */}
      <div className="md:hidden">
        {/* Mobile toggle strip */}
        <div className="absolute bottom-16 left-0 z-20">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-2 rounded-r-xl bg-white border border-l-0 border-stone-200 shadow-md text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Design
          </button>
        </div>

        {/* Mobile drawer */}
        {isOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40" onClick={onToggle} />
            <div className="relative ml-auto w-[min(288px,90vw)] h-full bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <p className="text-sm font-semibold text-stone-900">Design Options</p>
                <button
                  onClick={onToggle}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 transition text-stone-500"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarContent
                products={products}
                finishes={finishes}
                structures={structures}
                countertops={countertops}
                floorColors={floorColors}
                grouped={grouped}
                presentCategories={presentCategories}
                openCategories={openCategories}
                toggleCategory={toggleCategory}
                onQuickAdd={onQuickAdd}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SidebarContent({
  products,
  finishes,
  countertops,
  floorColors,
  grouped,
  presentCategories,
  openCategories,
  toggleCategory,
  onQuickAdd,
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-100 shrink-0">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Products <span className="text-stone-400">({products.length})</span>
        </p>
      </div>

      {/* Scrollable body — products + design sections + fixtures */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>

        {/* ── Product list — accordion by category ─────────────────────────── */}
        <div className="px-3 py-2">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-stone-400">
              <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-xs text-center">No products available in the catalog yet.</p>
            </div>
          ) : (
            presentCategories.map((cat) => {
              const items  = grouped[cat] || [];
              const isOpen = openCategories.has(cat);
              return (
                <div key={cat}>
                  {/* Accordion header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-1 py-2.5 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={["w-2 h-2 rounded-full shrink-0", CATEGORY_DOTS[cat] || "bg-stone-300"].join(" ")} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 group-hover:text-stone-700 transition-colors">
                        {cat}{" "}
                        <span className="text-stone-400 font-normal normal-case tracking-normal">({items.length})</span>
                      </span>
                    </div>
                    <svg
                      className={["w-3.5 h-3.5 text-stone-400 transition-transform", isOpen ? "rotate-90" : ""].join(" ")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Products (only when expanded) */}
                  {isOpen && (
                    <div className="space-y-1.5 pb-3">
                      {items.map((product) => (
                        <DraggableProduct key={product.id} product={product} onQuickAdd={onQuickAdd} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Door Style ────────────────────────────────────────────────────── */}
        <DoorStyleSection />

        {/* ── Drawer Style ──────────────────────────────────────────────────── */}
        <DrawerStyleSection />

        {/* ── Hardware ──────────────────────────────────────────────────────── */}
        <HardwareSection />

        {/* ── Cabinet Colors ────────────────────────────────────────────────── */}
        <CabinetColorsSection finishes={finishes} />

        {/* ── Countertop ───────────────────────────────────────────────────── */}
        <CountertopSection countertops={countertops} />

        {/* ── Flooring ─────────────────────────────────────────────────────── */}
        <FlooringSection floorColors={floorColors} />

        {/* ── Kitchen Fixtures ──────────────────────────────────────────────── */}
        <div className="px-3 pt-3 pb-1 border-t border-stone-100 mt-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2 px-1">
            Kitchen Fixtures
          </p>
          <div className="space-y-1.5">
            {FIXTURES.map((f) => <DraggableProduct key={f.id} product={f} onQuickAdd={onQuickAdd} />)}
          </div>
        </div>

        {/* Tip */}
        <div className="px-4 py-3 border-t border-stone-100">
          <p className="text-[10px] text-stone-400 text-center">
            Tap or drag products onto the canvas
          </p>
        </div>

      </div>
    </div>
  );
}
