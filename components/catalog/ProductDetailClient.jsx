"use client";

import { useState } from "react";
import { useQuote } from "@/lib/context/quote";

// ─── Image viewer ─────────────────────────────────────────────────────────────
function ImageViewer({ images, productName }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = images[activeIdx];

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-stone-100 rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-stone-200">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No image available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Primary image */}
      <div className="aspect-square bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden flex items-center justify-center mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={active.alt || productName}
          className="w-full h-full object-contain p-8"
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                i === activeIdx ? "border-stone-900" : "border-stone-100 hover:border-stone-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt || ""} className="w-full h-full object-contain p-1 bg-stone-50" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Finish swatch selector ───────────────────────────────────────────────────
function FinishSelector({ finishes, selectedId, onSelect }) {
  const SHOW_COUNT = 5;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? finishes : finishes.slice(0, SHOW_COUNT);
  const hiddenCount = finishes.length - SHOW_COUNT;

  if (finishes.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Finish</p>
      <div className="flex flex-wrap gap-2.5 mb-2">
        {visible.map((finish) => {
          const selected = finish.id === selectedId;
          return (
            <button
              key={finish.id}
              onClick={() => !finish.incompatible && onSelect(finish)}
              disabled={finish.incompatible}
              title={finish.incompatible ? `${finish.name} — not available for this product` : finish.name}
              className={`flex flex-col items-center gap-1.5 transition group ${finish.incompatible ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Swatch circle */}
              <div
                className={`w-10 h-10 rounded-full border-2 overflow-hidden transition ${
                  selected
                    ? "border-stone-900 ring-2 ring-stone-900 ring-offset-2"
                    : finish.incompatible
                    ? "border-stone-200"
                    : "border-stone-200 group-hover:border-stone-400"
                }`}
              >
                {finish.swatch_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={finish.swatch_url} alt={finish.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-stone-200 flex items-center justify-center">
                    <span className="text-stone-400 text-[10px]">?</span>
                  </div>
                )}
              </div>
              {/* Name — only show for selected */}
              {selected && (
                <span className="text-[11px] font-medium text-stone-700 text-center leading-tight max-w-[56px]">
                  {finish.name}
                </span>
              )}
            </button>
          );
        })}

        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-10 h-10 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-xs text-stone-400 hover:border-stone-400 hover:text-stone-600 transition self-center"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {/* Selected finish name */}
      {selectedId && (
        <p className="text-sm text-stone-600">
          <span className="text-stone-400">Selected: </span>
          <span className="font-medium">{finishes.find((f) => f.id === selectedId)?.name}</span>
        </p>
      )}

      {/* Incompatibility note */}
      {finishes.some((f) => f.incompatible) && (
        <p className="text-xs text-stone-400 mt-1.5">
          Grayed finishes are not available for this product.
        </p>
      )}
    </div>
  );
}

// ─── Collapsible specs section ────────────────────────────────────────────────
function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-stone-100 pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-medium text-stone-700 hover:text-stone-900 transition"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────
export default function ProductDetailClient({ product, images, finishes, dimensionNotes, lineSlug }) {
  const { addItem, setPanelOpen } = useQuote();

  const defaultFinish = finishes.find((f) => f.is_default && !f.incompatible) || finishes.find((f) => !f.incompatible) || null;
  const [selectedFinish, setSelectedFinish] = useState(defaultFinish);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAddToQuote() {
    addItem({
      sku: product.sku,
      name: product.name,
      finish_id: selectedFinish?.id || null,
      finish_code: selectedFinish?.code || null,
      finish_name: selectedFinish?.name || null,
      swatch_url: selectedFinish?.swatch_url || null,
      quantity: qty,
      line_slug: lineSlug,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const hasDims = product.width_in || product.height_in || product.depth_in;
  const hasBoxDims = product.box_width_in || product.box_height_in || product.box_depth_in;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
      {/* Left: image viewer */}
      <div>
        <ImageViewer images={images} productName={product.name} />
      </div>

      {/* Right: product info */}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-1">
            {product.catalog_line?.name}
            {product.category ? ` · ${product.category.name}` : ""}
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {product.name}
          </h1>
          <p className="font-mono text-xs text-stone-400 mt-1">{product.sku}</p>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-stone-600 text-sm leading-relaxed">{product.description}</p>
        )}

        {/* Quick dimensions */}
        {hasDims && (
          <div className="flex gap-4 text-sm">
            {product.width_in && (
              <div className="text-center">
                <p className="font-semibold text-stone-900">{product.width_in}&quot;</p>
                <p className="text-xs text-stone-400">Width</p>
              </div>
            )}
            {product.height_in && (
              <div className="text-center">
                <p className="font-semibold text-stone-900">{product.height_in}&quot;</p>
                <p className="text-xs text-stone-400">Height</p>
              </div>
            )}
            {product.depth_in && (
              <div className="text-center">
                <p className="font-semibold text-stone-900">{product.depth_in}&quot;</p>
                <p className="text-xs text-stone-400">Depth</p>
              </div>
            )}
          </div>
        )}

        {/* Finish selector */}
        {finishes.length > 0 && (
          <FinishSelector
            finishes={finishes}
            selectedId={selectedFinish?.id || null}
            onSelect={setSelectedFinish}
          />
        )}

        {/* Dimension notes */}
        {dimensionNotes.length > 0 && (
          <div className="space-y-1.5">
            {dimensionNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-stone-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <span className="text-amber-400 shrink-0">⚠</span>
                {note}
              </div>
            ))}
          </div>
        )}

        {/* Add to quote */}
        <div className="flex items-center gap-3 pt-2">
          {/* Quantity */}
          <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-semibold text-stone-800">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToQuote}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition ${
              added
                ? "bg-green-600 text-white"
                : "bg-stone-900 text-white hover:bg-stone-700"
            }`}
          >
            {added ? "✓ Added to Quote" : "Add to Quote"}
          </button>
        </div>

        <button
          onClick={() => setPanelOpen(true)}
          className="w-full text-sm text-stone-400 hover:text-stone-600 transition py-1"
        >
          View quote →
        </button>

        {/* ── Collapsible sections ──────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Full specifications */}
          {hasDims && (
            <CollapsibleSection title="Specifications">
              <div className="space-y-2 text-sm">
                {hasDims && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {product.width_in && (
                      <><p className="text-stone-400">Width</p><p className="text-stone-700 font-medium">{product.width_in}&quot;</p></>
                    )}
                    {product.height_in && (
                      <><p className="text-stone-400">Height</p><p className="text-stone-700 font-medium">{product.height_in}&quot;</p></>
                    )}
                    {product.depth_in && (
                      <><p className="text-stone-400">Depth</p><p className="text-stone-700 font-medium">{product.depth_in}&quot;</p></>
                    )}
                    {product.door_count != null && (
                      <><p className="text-stone-400">Doors</p><p className="text-stone-700 font-medium">{product.door_count}</p></>
                    )}
                    {product.drawer_count != null && (
                      <><p className="text-stone-400">Drawers</p><p className="text-stone-700 font-medium">{product.drawer_count}</p></>
                    )}
                  </div>
                )}
                {hasBoxDims && (
                  <div className="pt-2 border-t border-stone-100">
                    <p className="text-xs text-stone-400 uppercase tracking-wide mb-1.5">Box Dimensions</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {product.box_width_in && (
                        <><p className="text-stone-400">Width</p><p className="text-stone-700">{product.box_width_in}&quot;</p></>
                      )}
                      {product.box_height_in && (
                        <><p className="text-stone-400">Height</p><p className="text-stone-700">{product.box_height_in}&quot;</p></>
                      )}
                      {product.box_depth_in && (
                        <><p className="text-stone-400">Depth</p><p className="text-stone-700">{product.box_depth_in}&quot;</p></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Notes */}
          {product.notes && (
            <CollapsibleSection title="Additional Notes">
              <p className="text-sm text-stone-600 leading-relaxed">{product.notes}</p>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
