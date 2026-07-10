"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import usePlannerStore from "@/store/plannerStore";
import KitchenHealthScore from "./KitchenHealthScore";
import KitchenInsightsPanel from "./KitchenInsightsPanel";
import CostEstimator from "./CostEstimator";
import StorageAnalytics from "./StorageAnalytics";
import DesignRecommendations from "./DesignRecommendations";
import MoodBoard from "./MoodBoard";
import ProposalGenerator from "./ProposalGenerator";
import DoorWindowPanel from "./DoorWindowPanel";

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Base Cabinets",
  "Wall Cabinets",
  "Tall Units",
  "Vanity",
  "Appliances",
  "Accessories",
];

function normalizeCategory(cat) {
  const c = (cat || "").toLowerCase().trim();
  if (c === "base" || c === "base cabinet")                      return "Base Cabinets";
  if (c === "wall" || c === "wall cabinet")                      return "Wall Cabinets";
  if (c === "tall" || c === "tall unit" || c === "pantry")       return "Tall Units";
  if (c === "vanity" || c === "vanity cabinet")                  return "Vanity";
  if (c === "accessories" || c === "accessory" || c === "accessorie") return "Accessories";
  return cat || "";
}

const CATEGORY_COLORS = {
  "Base Cabinets": { dot: "bg-stone-400",   bg: "bg-stone-50",   text: "text-stone-600"  },
  "Wall Cabinets": { dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700"   },
  "Tall Units":    { dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
  Vanity:          { dot: "bg-pink-400",    bg: "bg-pink-50",    text: "text-pink-700"   },
  Appliances:      { dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700"  },
  Accessories:     { dot: "bg-violet-400",  bg: "bg-violet-50",  text: "text-violet-700" },
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURES = [
  { id: "fixture-sink-dw",  name: "Sink + Dishwasher",       category: "Sink",         widthFt: 2.5, depthFt: 1.67, imageUrl: null, sku: null, doorCount: null, drawerCount: null },
  { id: "fixture-range",    name: "Range / Cooktop",         category: "Range",        widthFt: 2.5, depthFt: 2.0,  imageUrl: null, sku: null, doorCount: null, drawerCount: null },
  { id: "fixture-fridge",   name: "Refrigerator",            category: "Refrigerator", widthFt: 2.5, depthFt: 2.0,  imageUrl: null, sku: null, doorCount: null, drawerCount: null },
];

const FIXTURE_ICONS = {
  Sink: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="11" rx="1.5"/>
      <rect x="7" y="11" width="10" height="5" rx="0.5"/>
      <line x1="12" y1="5" x2="12" y2="8"/>
      <circle cx="12" cy="4.5" r="1"/>
    </svg>
  ),
  Range: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="20" height="16" rx="1.5"/>
      <circle cx="7.5" cy="10" r="2.2"/>
      <circle cx="16.5" cy="10" r="2.2"/>
      <circle cx="7.5" cy="17" r="2.2"/>
      <circle cx="16.5" cy="17" r="2.2"/>
    </svg>
  ),
  Refrigerator: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="2" width="16" height="20" rx="1.5"/>
      <line x1="4" y1="9" x2="20" y2="9"/>
      <line x1="8" y1="5.5" x2="8" y2="7.5"/>
      <line x1="8" y1="12" x2="8" y2="16"/>
    </svg>
  ),
};

// ─── Door / Drawer styles ─────────────────────────────────────────────────────

const DOOR_STYLE_OPTIONS = [
  {
    id: "Shaker", name: "Shaker",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5"/>
        <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1.5}/>
      </svg>
    ),
  },
  {
    id: "Slab", name: "Slab",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5"/>
        <line x1="19" y1="43" x2="29" y2="43" strokeWidth={2} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "Raised Panel", name: "Raised",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5"/>
        <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1.5}/>
        <rect x="15" y="15" width="18" height="18" rx="0.5" strokeWidth={1} fill="currentColor" fillOpacity={0.12}/>
      </svg>
    ),
  },
  {
    id: "Glass-Front", name: "Glass",
    icon: (
      <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="40" height="40" rx="1.5"/>
        <rect x="10" y="10" width="28" height="28" rx="1" strokeWidth={1.5}/>
        <line x1="10" y1="10" x2="38" y2="38" strokeWidth={1} opacity={0.4}/>
        <line x1="10" y1="38" x2="38" y2="10" strokeWidth={1} opacity={0.4}/>
      </svg>
    ),
  },
];

// ─── Hardware styles ──────────────────────────────────────────────────────────

const HARDWARE_STYLES = [
  { id: "hw-bar",    name: "Bar Pull",   type: "bar"    },
  { id: "hw-knob",   name: "Knob",       type: "knob"   },
  { id: "hw-cup",    name: "Cup Pull",   type: "cup"    },
  { id: "hw-hidden", name: "Integrated", type: "hidden" },
];

const HARDWARE_ICONS = {
  bar: (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="6" y1="16" x2="26" y2="16"/>
      <circle cx="8" cy="16" r="2.5" fill="currentColor" stroke="none"/>
      <circle cx="24" cy="16" r="2.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  knob: (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="16" cy="16" r="6"/>
      <circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  cup: (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M6 12 Q6 22 16 22 Q26 22 26 12"/>
      <line x1="6" y1="12" x2="26" y2="12"/>
    </svg>
  ),
  hidden: (
    <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="3 2">
      <rect x="6" y="13" width="20" height="6" rx="1"/>
    </svg>
  ),
};

// ─── Color / finish helpers ───────────────────────────────────────────────────

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
  if (t.includes("quartz"))                                     return "#e8e4de";
  if (t.includes("marble"))                                     return "#f0ede8";
  if (t.includes("granite"))                                    return "#9a9088";
  if (t.includes("concrete"))                                   return "#9a9898";
  if (t.includes("soapstone"))                                  return "#6a7070";
  if (t.includes("butcher") || t.includes("wood"))             return "#b8905a";
  if (t.includes("hardwood") || t.includes("plank"))           return "#c09a6a";
  if (t.includes("tile") || t.includes("ceramic") || t.includes("porcelain")) return "#d0cdc8";
  if (t.includes("slate"))                                      return "#7a7870";
  if (t.includes("limestone"))                                  return "#d4cfc0";
  if (t.includes("terracotta"))                                 return "#c8785a";
  return null;
}

export function finishCodeToHex(code, finishFamily, name, description) {
  const fromName = matchColorKeywords(name);
  if (fromName) return fromName;
  const fromCode = matchColorKeywords(code);
  if (fromCode) return fromCode;
  const fromDesc = matchColorKeywords(description);
  if (fromDesc) return fromDesc;
  if ((finishFamily || "").toLowerCase() === "stained") return "#7a5c3a";
  return "#d4cfc8";
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

/** Section header with optional chevron toggle */
function SectionHeader({ label, badge, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 group focus:outline-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-stone-700 group-hover:text-stone-900 transition-colors truncate">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] text-stone-400 truncate">· {badge}</span>
        )}
      </div>
      <svg
        className={[
          "w-3.5 h-3.5 text-stone-400 transition-transform duration-200 shrink-0",
          isOpen ? "rotate-90" : "",
        ].join(" ")}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  );
}

/** Swatch chip for colors / finishes / countertops / flooring */
function SwatchChip({ name, swatchUrl, hex, isSelected, onClick }) {
  return (
    <button
      type="button"
      title={name}
      onClick={onClick}
      className={[
        "relative w-9 h-9 rounded-lg overflow-hidden border-2 transition-all duration-100 shrink-0 focus:outline-none",
        isSelected
          ? "border-blue-500 shadow-md ring-2 ring-blue-200"
          : "border-stone-200 hover:border-stone-400 hover:scale-105",
      ].join(" ")}
    >
      {swatchUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={swatchUrl} alt={name} className="w-full h-full object-cover" draggable={false}/>
      ) : hex ? (
        <span className="block w-full h-full" style={{ backgroundColor: hex }}/>
      ) : (
        <span className="block w-full h-full bg-stone-200"/>
      )}
      {isSelected && (
        <span className="absolute inset-0 flex items-center justify-center bg-blue-500/25">
          <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </span>
      )}
    </button>
  );
}

/** Small "×" clear button */
function ClearChip({ onClick }) {
  return (
    <button
      type="button"
      title="Clear"
      onClick={onClick}
      className="w-9 h-9 rounded-lg border-2 border-dashed border-stone-300 text-stone-400 flex items-center justify-center hover:border-red-300 hover:text-red-400 transition shrink-0"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  );
}

// ─── Draggable product card ───────────────────────────────────────────────────

function DraggableProduct({ product, onQuickAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `sidebar-${product.id}`,
    data: { type: "product", product },
  });

  const catColors = CATEGORY_COLORS[normalizeCategory(product.category)];
  const isFixture = product.category === "Sink" || product.category === "Range" || product.category === "Refrigerator";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onQuickAdd?.(product)}
      className={[
        "flex items-center gap-3 px-3 py-2.5 sm:py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-100 select-none group min-h-[44px]",
        isDragging
          ? "opacity-30 scale-95 border-stone-200 bg-stone-50"
          : "border-stone-100 bg-white hover:border-stone-300 hover:shadow-sm active:bg-stone-50",
      ].join(" ")}
      style={{ touchAction: "none" }}
    >
      {/* Thumbnail */}
      <div className={[
        "w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center",
        isFixture ? "bg-stone-50 border border-stone-100" : "bg-stone-50 border border-stone-100",
      ].join(" ")}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" draggable={false}/>
        ) : (
          FIXTURE_ICONS[product.category] || (
            <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          )
        )}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-800 truncate leading-snug">{product.name}</p>
        <p className="text-[10px] text-stone-400 mt-0.5">{product.widthFt}ft × {product.depthFt}ft</p>
      </div>

      {/* Drag indicator */}
      <svg className="w-3.5 h-3.5 text-stone-300 shrink-0 group-hover:text-stone-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16"/>
      </svg>
    </div>
  );
}

// ─── PRODUCTS TAB ─────────────────────────────────────────────────────────────

function ProductsTab({ products, grouped, presentCategories, openCategories, toggleCategory, onQuickAdd }) {
  return (
    <div className="flex flex-col gap-0">

      {/* Cabinet catalog */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-stone-400">
          <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <p className="text-xs text-center text-stone-400">No products in catalog yet.</p>
        </div>
      ) : (
        <div className="px-3 py-2">
          {/* Section label */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2 px-0.5">
            Cabinet Catalog
          </p>
          <div className="space-y-0.5">
            {presentCategories.map((cat) => {
              const items  = grouped[cat] || [];
              const isOpen = openCategories.has(cat);
              const colors = CATEGORY_COLORS[cat];

              return (
                <div key={cat} className="rounded-xl overflow-hidden">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={[
                      "w-full flex items-center justify-between px-3 py-2.5 transition-colors",
                      isOpen ? "bg-stone-100" : "bg-stone-50 hover:bg-stone-100",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={["w-2 h-2 rounded-full shrink-0", colors?.dot || "bg-stone-300"].join(" ")}/>
                      <span className="text-xs font-semibold text-stone-700">{cat}</span>
                      <span className="text-[10px] text-stone-400 font-normal">({items.length})</span>
                    </div>
                    <svg
                      className={["w-3.5 h-3.5 text-stone-400 transition-transform duration-200", isOpen ? "rotate-90" : ""].join(" ")}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>

                  {/* Product list */}
                  {isOpen && (
                    <div className="bg-white border-t border-stone-100 px-2 py-2 space-y-1">
                      {items.map((product) => (
                        <DraggableProduct key={product.id} product={product} onQuickAdd={onQuickAdd}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-stone-100"/>

      {/* Kitchen Fixtures */}
      <div className="px-3 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2 px-0.5">
          Kitchen Fixtures
        </p>
        <div className="space-y-1">
          {FIXTURES.map((f) => (
            <DraggableProduct key={f.id} product={f} onQuickAdd={onQuickAdd}/>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-stone-100"/>

      {/* Doors & Windows — renders its own accordion card */}
      <div className="px-3 pb-4">
        <DoorWindowPanel/>
      </div>

      {/* Tip */}
      <div className="mx-3 mb-4 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
        <p className="text-[10px] text-stone-400 text-center leading-relaxed">
          Tap a product to place it at center · Drag to a specific spot
        </p>
      </div>
    </div>
  );
}

// ─── DESIGN TAB ───────────────────────────────────────────────────────────────

function DesignTab({ finishes, countertops, floorColors }) {
  return (
    <div className="px-3 py-3 space-y-1">

      {/* Cabinet Colors */}
      <CabinetColorsSection finishes={finishes}/>

      {/* Divider */}
      <div className="pt-1 border-t border-stone-100"/>

      {/* Door Style */}
      <DoorStyleSection/>

      {/* Drawer Style */}
      <DrawerStyleSection/>

      {/* Hardware */}
      <HardwareSection/>

      {/* Divider */}
      {(countertops?.length > 0 || floorColors?.length > 0) && (
        <div className="pt-1 border-t border-stone-100"/>
      )}

      {/* Countertop */}
      <CountertopSection countertops={countertops}/>

      {/* Flooring */}
      <FlooringSection floorColors={floorColors}/>

      {/* Bottom padding */}
      <div className="h-4"/>
    </div>
  );
}

// ─── INSIGHTS TAB ─────────────────────────────────────────────────────────────

function InsightsTab({ primaryColor }) {
  return (
    <div className="px-3 py-3 space-y-2.5">

      {/* Design Recommendations — renders its own card list */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
          Design Tips
        </p>
        <DesignRecommendations/>
      </div>

      {/* Divider */}
      <div className="border-t border-stone-100 pt-1"/>

      {/* Mood Board — has its own accordion card */}
      <MoodBoard primaryColor={primaryColor}/>

      {/* Health Score — has its own accordion card */}
      <KitchenHealthScore primaryColor={primaryColor}/>

      {/* Kitchen Insights — work triangle, clearances, wall coverage, corners */}
      <KitchenInsightsPanel primaryColor={primaryColor}/>

      {/* Cost Estimator — has its own accordion card */}
      <CostEstimator primaryColor={primaryColor}/>

      {/* Storage Analytics — has its own accordion card */}
      <StorageAnalytics/>

      {/* Proposal Generator — has its own accordion card */}
      <ProposalGenerator primaryColor={primaryColor}/>

      <div className="h-4"/>
    </div>
  );
}

// ─── Design section sub-components ───────────────────────────────────────────

function CabinetColorsSection({ finishes }) {
  const upperCabinetColor    = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor    = usePlannerStore((s) => s.lowerCabinetColor);
  const setUpperCabinetColor = usePlannerStore((s) => s.setUpperCabinetColor);
  const setLowerCabinetColor = usePlannerStore((s) => s.setLowerCabinetColor);

  const [openUpper, setOpenUpper] = useState(true);
  const [openLower, setOpenLower] = useState(true);

  if (finishes.length === 0) return null;

  const handleSelect = (slot, finish) => {
    const payload = {
      id: finish.id, name: finish.name, code: finish.code,
      finishFamily: finish.finishFamily, swatchUrl: finish.swatchUrl,
      hex: finishCodeToHex(finish.code, finish.finishFamily, finish.name, finish.description),
    };
    if (slot === "upper") setUpperCabinetColor(upperCabinetColor?.id === finish.id ? null : payload);
    else                  setLowerCabinetColor(lowerCabinetColor?.id === finish.id ? null : payload);
  };

  const rows = [
    { key: "upper", label: "Upper Cabinets", selected: upperCabinetColor, isOpen: openUpper, toggle: () => setOpenUpper((v) => !v) },
    { key: "lower", label: "Lower Cabinets", selected: lowerCabinetColor, isOpen: openLower, toggle: () => setOpenLower((v) => !v) },
  ];

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">
        Cabinet Colors
      </p>
      {rows.map((row) => (
        <div key={row.key}>
          {/* Sub-row header */}
          <button
            onClick={row.toggle}
            className="w-full flex items-center justify-between py-2 group focus:outline-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Color preview dot */}
              <span
                className="w-4 h-4 rounded-full border border-stone-300 shrink-0"
                style={
                  row.selected?.swatchUrl
                    ? { backgroundImage: `url(${row.selected.swatchUrl})`, backgroundSize: "cover" }
                    : { backgroundColor: row.selected?.hex ?? "#e7e5e4" }
                }
              />
              <span className="text-xs font-medium text-stone-600 group-hover:text-stone-800 transition-colors">{row.label}</span>
              {row.selected && (
                <span className="text-[10px] text-stone-400 truncate">· {row.selected.name}</span>
              )}
            </div>
            <svg
              className={["w-3 h-3 text-stone-400 transition-transform duration-200 shrink-0", row.isOpen ? "rotate-90" : ""].join(" ")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          {row.isOpen && (
            <div className="flex flex-wrap gap-1.5 pb-2 pl-6">
              {finishes.map((finish) => {
                const hex = finishCodeToHex(finish.code, finish.finishFamily, finish.name, finish.description);
                return (
                  <SwatchChip
                    key={finish.id}
                    name={finish.name}
                    swatchUrl={finish.swatchUrl}
                    hex={hex}
                    isSelected={row.selected?.id === finish.id}
                    onClick={() => handleSelect(row.key, finish)}
                  />
                );
              })}
              {row.selected && (
                <ClearChip onClick={() => row.key === "upper" ? setUpperCabinetColor(null) : setLowerCabinetColor(null)}/>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DoorStyleSection() {
  const selectedDoorStyle    = usePlannerStore((s) => s.selectedDoorStyle);
  const setSelectedDoorStyle = usePlannerStore((s) => s.setSelectedDoorStyle);
  const [isOpen, setIsOpen]  = useState(true);

  return (
    <div>
      <SectionHeader
        label="Door Style"
        badge={selectedDoorStyle?.name}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="grid grid-cols-4 gap-1.5 pb-2">
          {DOOR_STYLE_OPTIONS.map((opt) => {
            const sel = selectedDoorStyle?.id === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.name}
                onClick={() => setSelectedDoorStyle(sel ? null : { id: opt.id, name: opt.name })}
                className={[
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-100 focus:outline-none",
                  sel
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                ].join(" ")}
              >
                <span className={["block w-8 h-8", sel ? "text-blue-500" : "text-stone-400"].join(" ")}>
                  {opt.icon}
                </span>
                <span className={["text-[9px] font-medium leading-tight text-center", sel ? "text-blue-700" : "text-stone-500"].join(" ")}>
                  {opt.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DrawerStyleSection() {
  const selectedDrawerStyle    = usePlannerStore((s) => s.selectedDrawerStyle);
  const setSelectedDrawerStyle = usePlannerStore((s) => s.setSelectedDrawerStyle);
  const [isOpen, setIsOpen]    = useState(false);

  return (
    <div>
      <SectionHeader
        label="Drawer Style"
        badge={selectedDrawerStyle?.name}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="grid grid-cols-4 gap-1.5 pb-2">
          {DOOR_STYLE_OPTIONS.map((opt) => {
            const sel = selectedDrawerStyle?.id === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.name}
                onClick={() => setSelectedDrawerStyle(sel ? null : { id: opt.id, name: opt.name })}
                className={[
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-100 focus:outline-none",
                  sel
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                ].join(" ")}
              >
                <span className={["block w-8 h-8", sel ? "text-blue-500" : "text-stone-400"].join(" ")}>
                  {opt.icon}
                </span>
                <span className={["text-[9px] font-medium leading-tight text-center", sel ? "text-blue-700" : "text-stone-500"].join(" ")}>
                  {opt.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HardwareSection() {
  const selectedHardware    = usePlannerStore((s) => s.selectedHardware);
  const setSelectedHardware = usePlannerStore((s) => s.setSelectedHardware);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <SectionHeader
        label="Hardware / Pulls"
        badge={selectedHardware?.name}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="grid grid-cols-4 gap-1.5 pb-2">
          {HARDWARE_STYLES.map((hw) => {
            const sel = selectedHardware?.id === hw.id;
            return (
              <button
                key={hw.id}
                type="button"
                title={hw.name}
                onClick={() => setSelectedHardware(sel ? null : hw)}
                className={[
                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-100 focus:outline-none",
                  sel
                    ? "border-blue-500 bg-blue-50 shadow-sm text-blue-600"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-500",
                ].join(" ")}
              >
                {HARDWARE_ICONS[hw.type]}
                <span className={["text-[9px] font-medium leading-tight text-center", sel ? "text-blue-700" : "text-stone-500"].join(" ")}>
                  {hw.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CountertopSection({ countertops }) {
  const selectedCountertop    = usePlannerStore((s) => s.selectedCountertop);
  const setSelectedCountertop = usePlannerStore((s) => s.setSelectedCountertop);
  const [isOpen, setIsOpen]   = useState(true);

  if (!countertops || countertops.length === 0) return null;

  return (
    <div>
      <SectionHeader
        label="Countertop"
        badge={selectedCountertop?.name}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {countertops.map((c) => {
            const hex = finishCodeToHex(c.code, null, c.name, c.description);
            return (
              <SwatchChip
                key={c.id}
                name={c.name}
                swatchUrl={c.swatchUrl}
                hex={hex}
                isSelected={selectedCountertop?.id === c.id}
                onClick={() => {
                  const payload = { id: c.id, name: c.name, code: c.code, description: c.description, swatchUrl: c.swatchUrl, hex };
                  setSelectedCountertop(selectedCountertop?.id === c.id ? null : payload);
                }}
              />
            );
          })}
          {selectedCountertop && <ClearChip onClick={() => setSelectedCountertop(null)}/>}
        </div>
      )}
    </div>
  );
}

function FlooringSection({ floorColors }) {
  const selectedFlooring    = usePlannerStore((s) => s.selectedFlooring);
  const setSelectedFlooring = usePlannerStore((s) => s.setSelectedFlooring);
  const [isOpen, setIsOpen] = useState(false);

  if (!floorColors || floorColors.length === 0) return null;

  return (
    <div>
      <SectionHeader
        label="Flooring"
        badge={selectedFlooring?.name}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {floorColors.map((c) => {
            const hex = finishCodeToHex(c.code, null, c.name, c.description);
            return (
              <SwatchChip
                key={c.id}
                name={c.name}
                swatchUrl={c.swatchUrl}
                hex={hex}
                isSelected={selectedFlooring?.id === c.id}
                onClick={() => {
                  const payload = { id: c.id, name: c.name, code: c.code, description: c.description, swatchUrl: c.swatchUrl, hex };
                  setSelectedFlooring(selectedFlooring?.id === c.id ? null : payload);
                }}
              />
            );
          })}
          {selectedFlooring && <ClearChip onClick={() => setSelectedFlooring(null)}/>}
        </div>
      )}
    </div>
  );
}

// ─── Tab nav ──────────────────────────────────────────────────────────────────

const TABS = [
  {
    id: "products",
    label: "Products",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    ),
  },
  {
    id: "design",
    label: "Design",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
      </svg>
    ),
  },
  {
    id: "insights",
    label: "Insights",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
  },
];

// ─── Sidebar content (shared between desktop + mobile drawer) ─────────────────

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
  primaryColor = "#1C1917",
}) {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Tab bar */}
      <div className="shrink-0 border-b border-stone-200 bg-white">
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all duration-150 relative focus:outline-none",
                  isActive
                    ? "text-stone-900"
                    : "text-stone-400 hover:text-stone-600",
                ].join(" ")}
              >
                <span className={isActive ? "opacity-100" : "opacity-60"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        {activeTab === "products" && (
          <ProductsTab
            products={products}
            grouped={grouped}
            presentCategories={presentCategories}
            openCategories={openCategories}
            toggleCategory={toggleCategory}
            onQuickAdd={onQuickAdd}
          />
        )}
        {activeTab === "design" && (
          <DesignTab
            finishes={finishes}
            countertops={countertops}
            floorColors={floorColors}
          />
        )}
        {activeTab === "insights" && (
          <InsightsTab primaryColor={primaryColor}/>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ProductSidebar({
  products = [],
  finishes = [],
  structures = [],
  countertops = [],
  floorColors = [],
  isOpen,
  onToggle,
  onQuickAdd,
  primaryColor = "#1C1917",
}) {
  // Build grouped + ordered categories
  const orderedPresent = CATEGORY_ORDER.filter((cat) =>
    products.some((p) => normalizeCategory(p.category) === cat)
  );
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

  const grouped = {};
  for (const p of products) {
    const cat = normalizeCategory(p.category) || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  const sharedProps = {
    products, finishes, countertops, floorColors,
    grouped, presentCategories, openCategories, toggleCategory,
    onQuickAdd, primaryColor,
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <div
        className={[
          "hidden md:flex flex-col border-r border-stone-200 transition-all duration-200 shrink-0 overflow-hidden",
          isOpen ? "w-72" : "w-0",
        ].join(" ")}
      >
        {isOpen && <SidebarContent {...sharedProps}/>}
      </div>

      {/* ── Mobile: floating button + full-screen drawer ─────────────────── */}
      <div className="md:hidden">
        {/* Floating "Design" pill button — left edge, above toolbar + safe area */}
        <div
          className="fixed left-0 z-30"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 4px)" }}
        >
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-r-full bg-white border border-l-0 border-stone-300 shadow-lg text-xs font-semibold text-stone-700 active:bg-stone-50 transition-all"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </span>
            Design
          </button>
        </div>

        {/* Mobile drawer */}
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex" style={{ touchAction: "none" }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onToggle}/>
            {/* Drawer panel — slides from left, overscroll-contain prevents body scroll bleed */}
            <div className="relative w-[min(300px,92vw)] h-full bg-white shadow-2xl flex flex-col overscroll-contain">
              {/* Drawer header — top safe area for notched phones */}
              <div
                className="flex items-center justify-between px-4 border-b border-stone-200 shrink-0"
                style={{
                  paddingTop: "calc(0.875rem + env(safe-area-inset-top, 0px))",
                  paddingBottom: "0.875rem",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </span>
                  <p className="text-sm font-semibold text-stone-900">Kitchen Planner</p>
                </div>
                <button
                  onClick={onToggle}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200 active:text-stone-700 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              {/* Drawer content — bottom safe area so content clears the iOS home indicator */}
              <div
                className="flex-1 overflow-hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                <SidebarContent {...sharedProps}/>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
