"use client";

import { useQuote } from "@/lib/context/quote";
import Link from "next/link";

function QuantityInput({ value, onChange }) {
  return (
    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition text-sm"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-medium text-stone-800">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition text-sm"
      >
        +
      </button>
    </div>
  );
}

export default function QuotePanel() {
  const { items, panelOpen, setPanelOpen, setModalOpen, removeItem, updateItem, totalItems } = useQuote();

  if (!panelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
        onClick={() => setPanelOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div>
            <h2 className="font-semibold text-stone-900 text-base">Your Quote</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {items.length === 0
                ? "No products selected"
                : `${items.length} product${items.length !== 1 ? "s" : ""} · ${totalItems} total`}
            </p>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-stone-400 text-sm mb-1">Your quote is empty.</p>
              <p className="text-stone-400 text-xs">
                Browse products and click &quot;Add to Quote&quot; to build your list.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={`${item.sku}-${item.finish_id}`} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    {/* Swatch */}
                    {item.swatch_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.swatch_url}
                        alt={item.finish_name || ""}
                        className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 shrink-0 mt-0.5" />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/catalog/${item.line_slug}/${item.sku.toLowerCase()}`}
                        onClick={() => setPanelOpen(false)}
                        className="font-medium text-stone-800 text-sm hover:text-stone-600 transition"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs font-mono text-stone-400 mt-0.5">{item.sku}</p>
                      {item.finish_name && (
                        <p className="text-xs text-stone-500 mt-0.5">{item.finish_name}</p>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.sku, item.finish_id)}
                      className="text-stone-300 hover:text-red-400 transition text-lg leading-none mt-0.5 shrink-0"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>

                  {/* Quantity */}
                  <div className="mt-3 ml-13 flex items-center gap-2 pl-[52px]">
                    <span className="text-xs text-stone-400">Qty</span>
                    <QuantityInput
                      value={item.quantity}
                      onChange={(qty) => updateItem(item.sku, item.finish_id, { quantity: qty })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-stone-100 space-y-3">
          {items.length > 0 && (
            <button
              onClick={() => { setPanelOpen(false); setModalOpen(true); }}
              className="w-full py-3 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-700 transition"
            >
              Request Quote →
            </button>
          )}
          <button
            onClick={() => setPanelOpen(false)}
            className="w-full py-2.5 text-sm text-stone-500 hover:text-stone-700 transition"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </>
  );
}
