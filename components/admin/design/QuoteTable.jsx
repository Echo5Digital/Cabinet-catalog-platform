"use client";

const cellInput = "border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 shadow-sm placeholder:text-stone-400 transition";
const labelCls  = "block text-[10px] font-semibold text-[#111827] mb-0.5 uppercase tracking-wide";

const EMPTY_ROW = () => ({ sku: "", product: "", finish: "", qty: 1, unit_price: 0 });

export default function QuoteTable({ items, onChange }) {
  function update(index, field, value) {
    onChange(items.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }
  function addRow()        { onChange([...items, EMPTY_ROW()]); }
  function removeRow(i)    { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div>
      {/* Desktop table — md+ */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              {["SKU", "Product", "Finish", "Qty", "Unit Price", "Total", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-[10px] font-semibold text-[#111827] uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-stone-400 text-sm italic">
                  No items yet — click &quot;Add Row&quot; below to start building the quote.
                </td>
              </tr>
            )}
            {items.map((row, i) => {
              const lineTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
              return (
                <tr key={i} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-2 py-2">
                    <input type="text" value={row.sku} onChange={(e) => update(i, "sku", e.target.value)}
                      placeholder="SKU" className={`${cellInput} w-full`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.product} onChange={(e) => update(i, "product", e.target.value)}
                      placeholder="Product name" className={`${cellInput} w-full min-w-[140px]`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.finish} onChange={(e) => update(i, "finish", e.target.value)}
                      placeholder="Finish" className={`${cellInput} w-full`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="1" value={row.qty} onChange={(e) => update(i, "qty", e.target.value)}
                      className={`${cellInput} w-full text-right`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" value={row.unit_price}
                      onChange={(e) => update(i, "unit_price", e.target.value)}
                      className={`${cellInput} w-full text-right`} />
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-stone-700 whitespace-nowrap tabular-nums">
                    ${lineTotal.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => removeRow(i)}
                      className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Remove">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-3">
        {items.length === 0 && (
          <p className="text-center text-stone-400 text-sm italic py-6">
            No items yet — tap &quot;Add Row&quot; below to start.
          </p>
        )}
        {items.map((row, i) => {
          const lineTotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0);
          return (
            <div key={i} className="rounded-xl border border-stone-200 bg-white shadow-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#111827] uppercase tracking-wide">Row {i + 1}</span>
                <button
                  onClick={() => removeRow(i)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition py-2 px-3 min-h-[36px] rounded-lg hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>SKU</label>
                  <input type="text" value={row.sku} onChange={(e) => update(i, "sku", e.target.value)}
                    placeholder="SKU" className={`${cellInput} w-full`} />
                </div>
                <div>
                  <label className={labelCls}>Finish</label>
                  <input type="text" value={row.finish} onChange={(e) => update(i, "finish", e.target.value)}
                    placeholder="Finish" className={`${cellInput} w-full`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Product Name</label>
                <input type="text" value={row.product} onChange={(e) => update(i, "product", e.target.value)}
                  placeholder="Product name" className={`${cellInput} w-full`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Qty</label>
                  <input type="number" min="1" value={row.qty} onChange={(e) => update(i, "qty", e.target.value)}
                    className={`${cellInput} w-full text-right`} />
                </div>
                <div>
                  <label className={labelCls}>Unit Price ($)</label>
                  <input type="number" min="0" step="0.01" value={row.unit_price}
                    onChange={(e) => update(i, "unit_price", e.target.value)}
                    className={`${cellInput} w-full text-right`} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                <span className="text-[10px] font-semibold text-[#111827] uppercase tracking-wide">Line Total</span>
                <span className="text-sm font-bold text-stone-800 tabular-nums">${lineTotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Row
      </button>
    </div>
  );
}
