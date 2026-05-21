"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

const CATEGORY_ORDER = ["Base Cabinets", "Wall Cabinets", "Tall Units", "Appliances"];
const CATEGORY_COLORS = {
  "Base Cabinets": "bg-stone-100 text-stone-600 border-stone-200",
  "Wall Cabinets": "bg-blue-50 text-blue-600 border-blue-100",
  "Tall Units":    "bg-emerald-50 text-emerald-600 border-emerald-100",
  Appliances:      "bg-amber-50 text-amber-600 border-amber-100",
  All:             "bg-stone-50 text-stone-600 border-stone-200",
};
const CATEGORY_DOTS = {
  "Base Cabinets": "bg-stone-400",
  "Wall Cabinets": "bg-blue-400",
  "Tall Units":    "bg-emerald-400",
  Appliances:      "bg-amber-400",
};

// Individual draggable product card
function DraggableProduct({ product }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `sidebar-${product.id}`,
    data: { type: "product", product },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
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
          <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-800 truncate leading-tight">{product.name}</p>
        {product.sku && (
          <p className="text-[10px] text-stone-400 truncate">{product.sku}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={[
              "inline-block w-1.5 h-1.5 rounded-full shrink-0",
              CATEGORY_DOTS[product.category] || "bg-stone-300",
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

export default function ProductSidebar({ products = [], isOpen, onToggle }) {
  const [activeCategory, setActiveCategory] = useState("All");

  // Determine which categories are present in the product list
  const presentCategories = ["All", ...CATEGORY_ORDER.filter((cat) =>
    products.some((p) => p.category === cat)
  )];

  const filtered = activeCategory === "All"
    ? products
    : products.filter((p) => p.category === activeCategory);

  // Group by category for display
  const grouped = {};
  for (const p of filtered) {
    const cat = p.category || "Other";
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
        {isOpen && <SidebarContent
          products={products}
          filtered={filtered}
          grouped={grouped}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          presentCategories={presentCategories}
        />}
      </div>

      {/* Mobile: bottom sheet trigger + drawer */}
      <div className="md:hidden">
        {/* Mobile toggle strip */}
        <div className="absolute bottom-14 left-0 z-20">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-2 rounded-r-xl bg-white border border-l-0 border-stone-200 shadow-md text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Products
          </button>
        </div>

        {/* Mobile drawer */}
        {isOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40" onClick={onToggle} />
            <div className="relative ml-auto w-72 h-full bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <p className="text-sm font-semibold text-stone-900">Products</p>
                <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 transition text-stone-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarContent
                products={products}
                filtered={filtered}
                grouped={grouped}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                presentCategories={presentCategories}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SidebarContent({ products, filtered, grouped, activeCategory, setActiveCategory, presentCategories }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-stone-100">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Products <span className="text-stone-400">({products.length})</span>
        </p>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {presentCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                "px-2.5 py-1 rounded-full text-[10px] font-semibold border transition",
                activeCategory === cat
                  ? (CATEGORY_COLORS[cat] || CATEGORY_COLORS.All) + " opacity-100"
                  : "bg-transparent text-stone-400 border-stone-100 hover:border-stone-200 hover:text-stone-600",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-stone-400">
            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-xs text-center">No products available in the catalog yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-8">No products in this category.</p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2 px-1">
                {cat}
              </p>
              <div className="space-y-1.5">
                {items.map((product) => (
                  <DraggableProduct key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tip */}
      <div className="px-4 py-3 border-t border-stone-100">
        <p className="text-[10px] text-stone-400 text-center">
          Drag products onto the canvas to place them
        </p>
      </div>
    </div>
  );
}
