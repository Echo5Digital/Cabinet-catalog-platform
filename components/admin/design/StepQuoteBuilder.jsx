"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QuoteTable from "./QuoteTable";

const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
const labelCls = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";
const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";

export default function StepQuoteBuilder({ formData, onChange, onBack, editId, setNotify }) {
  const router   = useRouter();
  const [saving,  setSaving]  = useState(false);
  const [sending, setSending] = useState(false);

  const subtotal = (formData.quoteItems || []).reduce(
    (sum, row) => sum + (parseFloat(row.qty) || 0) * (parseFloat(row.unit_price) || 0),
    0
  );
  const taxRate = parseFloat(formData.taxRate) || 0;
  const tax     = subtotal * (taxRate / 100);
  const total   = subtotal + tax;

  async function saveQuote() {
    const payload = {
      customer_name:    formData.customerName,
      customer_email:   formData.customerEmail,
      room_width:       formData.roomWidth,
      room_depth:       formData.roomDepth,
      room_height:      formData.roomHeight,
      style_notes:      formData.styleNotes,
      svg_floor_plan:   formData.svgFloorPlan,
      design_image_url: formData.designImageUrl,
      quote_items:      formData.quoteItems,
      quote_notes:      formData.quoteNotes,
      tax_rate:         formData.taxRate,
      design_params: {
        projectType:       formData.projectType,
        layout:            formData.layout,
        imageStatus:       formData.imageStatus,
        imageUrl:          formData.imageUrl,
        cabinetStyle:      formData.cabinetStyle,
        upperColor:        formData.upperColor,
        lowerColor:        formData.lowerColor,
        countertop:        formData.countertop,
        flooring:          formData.flooring,
        budgetStyle:       formData.budgetStyle,
        hoodStyle:         formData.hoodStyle,
        hardware:          formData.hardware,
        applianceColor:    formData.applianceColor,
        designComments:    formData.designComments,
        floorPlanProducts: formData.floorPlanProducts || [],
      },
    };

    if (editId) {
      const res = await fetch(`/api/design-quotes/${editId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update quote"); }
      return editId;
    } else {
      const res = await fetch("/api/design-quotes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save quote"); }
      const d = await res.json();
      return d.quote.id;
    }
  }

  async function handleSendToCustomer() {
    setSending(true);
    try {
      const quoteId = await saveQuote();
      const res = await fetch("/api/design-quotes/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ designQuoteId: quoteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send quote");
      setNotify({ type: "success", message: "Quote sent to customer successfully!" });
      router.push("/admin/design/saved");
    } catch (e) {
      setNotify({ type: "error", message: e.message });
    } finally {
      setSending(false);
    }
  }

  const downloadSVG = useCallback(() => {
    if (!formData.svgFloorPlan) return;
    const blob = new Blob([formData.svgFloorPlan], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `floor-plan-${(formData.customerName || "design").replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [formData.svgFloorPlan, formData.customerName]);

  const downloadImage = useCallback(async () => {
    if (!formData.designImageUrl) return;
    try {
      const res    = await fetch(formData.designImageUrl);
      const blob   = await res.blob();
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href       = url;
      a.download   = `kitchen-render-${(formData.customerName || "design").replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(formData.designImageUrl, "_blank");
    }
  }, [formData.designImageUrl, formData.customerName]);

  async function handlePreviewPDF() {
    setSaving(true);
    try {
      const quoteId = await saveQuote();
      const res = await fetch("/api/design-quotes/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ designQuoteId: quoteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate PDF");
      if (data.pdfUrl) window.open(data.pdfUrl, "_blank");
    } catch (e) {
      setNotify({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* ── Design Assets — floor plan + render for download / email ────────── */}
      {(formData.svgFloorPlan || formData.designImageUrl) && (
        <section className="form-section-card rounded-2xl overflow-hidden mb-5">
          <div className="p-5 sm:p-7">
            <div className="form-section-header flex items-center gap-3 mb-1">
              <span
                className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                style={{ background: "#6E1020" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </span>
              <h2
                className="text-base font-semibold text-stone-800 tracking-tight"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Design Assets
              </h2>
            </div>
            <p className="text-xs text-stone-400 mb-5 ml-9">
              Attached to the customer email. Download individually if needed.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Floor Plan */}
              {formData.svgFloorPlan && (
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100 bg-stone-50">
                    <span className="text-[10px] font-semibold text-[#3D0810] uppercase tracking-wide">Floor Plan</span>
                    <button
                      type="button"
                      onClick={downloadSVG}
                      className="flex items-center gap-1 text-xs font-medium text-[#6E1020] hover:text-[#7D1528] transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download SVG
                    </button>
                  </div>
                  <div
                    className="p-3 overflow-hidden [&_svg]:max-w-full [&_svg]:h-auto"
                    dangerouslySetInnerHTML={{
                      __html: formData.svgFloorPlan.startsWith("<svg") ? formData.svgFloorPlan : "",
                    }}
                  />
                </div>
              )}

              {/* Kitchen Render */}
              {formData.designImageUrl && (
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100 bg-stone-50">
                    <span className="text-[10px] font-semibold text-[#3D0810] uppercase tracking-wide">Kitchen Render</span>
                    <button
                      type="button"
                      onClick={downloadImage}
                      className="flex items-center gap-1 text-xs font-medium text-[#6E1020] hover:text-[#7D1528] transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.designImageUrl}
                    alt="AI kitchen render"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Build Quote ──────────────────────────────────────────────────────── */}
      <section className="form-section-card rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#6E1020" }}
            >
              6
            </span>
            <h2
              className="text-base font-semibold text-stone-800 tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Build Quote
            </h2>
          </div>

          <p className="text-sm text-stone-500 mb-6">
            Add products to the itemized quote. Totals update automatically.
          </p>

          <QuoteTable
            items={formData.quoteItems || []}
            onChange={(items) => onChange("quoteItems", items)}
          />

          {/* AI-Suggested Products — shown when floor plan generated product selections */}
          {Array.isArray(formData.floorPlanProducts) && formData.floorPlanProducts.length > 0 && (
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
                <div>
                  <p className="text-xs font-semibold text-[#3D0810] uppercase tracking-wide">
                    AI-Suggested Products
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Based on your floor plan — review and add to quote
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const mapped = (formData.floorPlanProducts || []).map((p) => ({
                      sku:        p.sku         || "",
                      product:    p.product_name || p.sku || "",
                      finish:     "",
                      qty:        p.qty || 1,
                      unit_price: 0,
                    }));
                    // Merge: only add SKUs not already present in quoteItems (idempotent)
                    const existingSkus = new Set((formData.quoteItems || []).map((r) => r.sku));
                    const toAdd = mapped.filter((r) => r.sku && !existingSkus.has(r.sku));
                    if (toAdd.length > 0) {
                      onChange("quoteItems", [...(formData.quoteItems || []), ...toAdd]);
                    }
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#6E1020] hover:bg-[#7D1528] text-white transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add All to Quote
                </button>
              </div>
              <div className="divide-y divide-stone-100">
                {formData.floorPlanProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 font-mono text-xs font-semibold text-[#3D0810] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                        {p.sku}
                      </span>
                      <span className="text-stone-700 truncate">{p.product_name}</span>
                      {p.wall && (
                        <span className="text-stone-400 text-xs capitalize shrink-0">{p.wall} wall</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <span className="text-stone-500 text-xs">
                        Qty: <span className="font-semibold text-stone-700">{p.qty}</span>
                      </span>
                      {p.placement && (
                        <span className="text-stone-400 text-xs hidden sm:inline">{p.placement}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax + Totals */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mt-6 pt-5 border-t border-stone-200">
            <div className="flex items-center gap-3">
              <label className={`${labelCls} mb-0 whitespace-nowrap`}>Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.taxRate}
                onChange={(e) => onChange("taxRate", e.target.value)}
                className="w-20 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm text-right transition"
              />
            </div>

            <div className="space-y-1.5 text-sm sm:min-w-[200px]">
              <div className="flex justify-between gap-8">
                <span className="text-stone-500 text-xs uppercase tracking-wide font-semibold">Subtotal</span>
                <span className="tabular-nums font-medium text-stone-800">${subtotal.toFixed(2)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between gap-8">
                  <span className="text-stone-500 text-xs uppercase tracking-wide font-semibold">Tax ({taxRate}%)</span>
                  <span className="tabular-nums font-medium text-stone-800">${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between gap-8 pt-2 border-t border-stone-200">
                <span className="text-xs uppercase tracking-wide font-bold text-[#3D0810]">Total</span>
                <span className="tabular-nums font-bold text-[#3D0810] text-base">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quote Notes */}
          <div className="mt-5">
            <label className={labelCls}>Quote Notes</label>
            <textarea
              value={formData.quoteNotes}
              onChange={(e) => onChange("quoteNotes", e.target.value)}
              placeholder="e.g. Lead time 4–6 weeks. Prices subject to change. Installation not included."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5">
        <button onClick={onBack} className={backBtnCls}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handlePreviewPDF}
            disabled={saving || sending}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-stone-300 bg-white text-stone-700 text-sm font-medium hover:border-stone-400 disabled:opacity-50 transition"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Preview PDF
          </button>

          <button
            onClick={handleSendToCustomer}
            disabled={saving || sending}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6E1020] hover:bg-[#7D1528] text-white disabled:opacity-50 transition"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
            Send to Customer
          </button>
        </div>
      </div>
    </>
  );
}
