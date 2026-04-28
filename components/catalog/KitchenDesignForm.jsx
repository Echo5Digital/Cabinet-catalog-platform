"use client";

import { useState } from "react";
import Link from "next/link";
import DesignResultBoard from "@/components/catalog/DesignResultBoard";

const PROJECT_TYPES = [
  "New Kitchen",
  "Remodel Existing Kitchen",
  "Replace Cabinets Only",
  "Countertop Only",
  "Full Design + Quote",
];

const LAYOUT_CONFIGS = [
  {
    name: "L-shaped",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "U-shaped",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6"  y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Galley",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6" y="42" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Island",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="22" y="30" width="28" height="12" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Single Wall",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "G-shaped",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6"  y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="16" y="42" width="28" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

const CABINET_STYLES = ["Euro", "Shaker", "Modern", "Traditional", "American"];

const HARDWARE_OPTIONS = ["Gold", "Silver", "Black", "Bronze", "None"];

const APPLIANCE_COLORS = ["Stainless", "White", "Black", "Panel Ready"];

export default function KitchenDesignForm({ countertopColors, floorColors, finishes }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    project_type: "",
    layout: "",
    cabinet_style: "",
    upper_color: "",
    lower_color: "",
    countertop: "",
    flooring: "",
    hood_style: "",
    backsplash: "",
    hardware: "",
    appliance_color: "",
    items_list: "",
    image_status: "No",
    image_url: "",
    image_source: "url",
    image_file_data: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("image_file_data", ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const effectiveImageUrl =
        form.image_status === "Yes"
          ? form.image_source === "upload"
            ? form.image_file_data
            : form.image_url
          : "";

      const res = await fetch("/api/ai/kitchen-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_url: effectiveImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setResult(data);
      // Scroll to result
      setTimeout(() => {
        document.getElementById("design-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.sales_summary) return;
    await navigator.clipboard.writeText(result.sales_summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Build name → image_url maps from props for the result board
  const finishImageMap = Object.fromEntries((finishes || []).map((f) => [f.name, f.image_url]));
  const countertopImageMap = Object.fromEntries((countertopColors || []).map((c) => [c.name, c.image_url]));
  const floorImageMap = Object.fromEntries((floorColors || []).map((c) => [c.name, c.image_url]));

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 placeholder:text-stone-400";
  const selectCls = `${inputCls} cursor-pointer`;
  const labelCls = "block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide";

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── Section 1: Your Info ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Your Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                placeholder="Full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                className={inputCls}
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Section 2: Project ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Project Details
          </h2>
          <div className="space-y-6">
            <div>
              <label className={labelCls}>Project Type *</label>
              <select
                required
                className={selectCls}
                value={form.project_type}
                onChange={(e) => set("project_type", e.target.value)}
              >
                <option value="">— Select project type —</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Kitchen Layout *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                {LAYOUT_CONFIGS.map(({ name, svg }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => set("layout", name)}
                    className={`flex flex-col items-center rounded-xl border p-3 transition ${
                      form.layout === name
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-700"
                    }`}
                  >
                    <div className="w-16 h-12 mb-2">
                      {svg}
                    </div>
                    <span className={`text-xs font-medium leading-tight text-center ${
                      form.layout === name ? "text-white" : "text-stone-700"
                    }`}>
                      {name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Style ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Design Style
          </h2>
          <div>
            <label className={labelCls}>Cabinet Style *</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1">
              {CABINET_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => set("cabinet_style", style)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition ${
                    form.cabinet_style === style
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Colors ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Colors &amp; Materials
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SwatchPicker
              label="Upper Cabinet Color"
              items={finishes}
              value={form.upper_color}
              onChange={(val) => set("upper_color", val)}
            />
            <SwatchPicker
              label="Lower Cabinet Color"
              items={finishes}
              value={form.lower_color}
              onChange={(val) => set("lower_color", val)}
            />
            <SwatchPicker
              label="Countertop"
              items={countertopColors}
              value={form.countertop}
              onChange={(val) => set("countertop", val)}
            />
            <SwatchPicker
              label="Flooring"
              items={floorColors}
              value={form.flooring}
              onChange={(val) => set("flooring", val)}
            />
          </div>
        </section>

        {/* ── Section 5: Details ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Additional Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Hood Style</label>
              <input
                className={inputCls}
                placeholder="e.g. Chimney, Downdraft, Under-cabinet"
                value={form.hood_style}
                onChange={(e) => set("hood_style", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Backsplash</label>
              <input
                className={inputCls}
                placeholder="e.g. Subway tile, Marble, Mosaic"
                value={form.backsplash}
                onChange={(e) => set("backsplash", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Hardware Style</label>
              <select
                className={selectCls}
                value={form.hardware}
                onChange={(e) => set("hardware", e.target.value)}
              >
                <option value="">— Select hardware —</option>
                {HARDWARE_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Appliance Color</label>
              <select
                className={selectCls}
                value={form.appliance_color}
                onChange={(e) => set("appliance_color", e.target.value)}
              >
                <option value="">— Select appliance color —</option>
                {APPLIANCE_COLORS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Section 6: Items Needed ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Items Needed
          </h2>
          <div>
            <label className={labelCls}>List what you need (one item per line)</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={5}
              placeholder={"Base cabinets\nWall cabinets\nCorner cabinet\nSink base\nIsland"}
              value={form.items_list}
              onChange={(e) => set("items_list", e.target.value)}
            />
          </div>
        </section>

        {/* ── Section 7: Kitchen Photo ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Kitchen Photo <span className="text-stone-400 font-normal text-base">(optional)</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-stone-700">Do you have a photo of your kitchen?</label>
              <div className="flex items-center gap-3">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set("image_status", opt)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                      form.image_status === opt
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {form.image_status === "Yes" && (
              <div className="space-y-3">
                {/* Source toggle */}
                <div className="flex items-center gap-2">
                  {[
                    { value: "upload", label: "Upload from device" },
                    { value: "url",    label: "Paste URL" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("image_source", opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        form.image_source === opt.value
                          ? "border-stone-700 bg-stone-800 text-white"
                          : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Upload mode */}
                {form.image_source === "upload" && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                    />
                    {form.image_file_data && (
                      <div className="mt-2 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.image_file_data}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded-lg border border-stone-200"
                        />
                        <div>
                          <p className="text-xs text-stone-600 font-medium">Image ready</p>
                          <button
                            type="button"
                            onClick={() => set("image_file_data", "")}
                            className="text-xs text-red-500 hover:text-red-700 transition mt-0.5"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-stone-400 mt-1">
                      Select an image from your device. The AI will analyze it.
                    </p>
                  </div>
                )}

                {/* URL mode */}
                {form.image_source === "url" && (
                  <div>
                    <label className={labelCls}>Image URL</label>
                    <input
                      type="url"
                      className={inputCls}
                      placeholder="https://example.com/my-kitchen.jpg"
                      value={form.image_url}
                      onChange={(e) => set("image_url", e.target.value)}
                    />
                    <p className="text-xs text-stone-400 mt-1">
                      Paste a publicly accessible URL to your kitchen photo. The AI will analyze it.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Submit ── */}
        <div className="pt-2">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !form.project_type || !form.layout}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating your design…
              </>
            ) : (
              "Generate Design Concepts →"
            )}
          </button>
          {(!form.project_type || !form.layout) && (
            <p className="text-xs text-stone-400 mt-2">Project type and layout are required to generate concepts.</p>
          )}
        </div>
      </form>

      {/* ── Result ── */}
      {result && (
        <div id="design-result" className="mt-16 pt-10 border-t border-stone-200">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2
              className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Your Design Concept
            </h2>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-stone-600 text-sm hover:border-stone-400 hover:text-stone-900 transition"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Summary
                </>
              )}
            </button>
          </div>

          <DesignResultBoard
            concept={result.concept}
            image_url={result.image_url}
            products={result.products}
            sales_summary={result.sales_summary}
            next_steps={result.next_steps}
            layout={result.layout}
            finishImageMap={finishImageMap}
            countertopImageMap={countertopImageMap}
            floorImageMap={floorImageMap}
          />

          <div className="mt-8 text-center">
            <p className="text-stone-500 text-sm mb-4">
              Ready to move forward? Our team will help you build the perfect quote.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition"
            >
              Browse Collections &amp; Request a Quote →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SwatchPicker — image card picker for colors / finishes ────────────────────
function SwatchPicker({ label, items, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {items.length === 0 ? (
        <p className="text-xs text-stone-400 italic">No options available</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.name)}
              className={`flex flex-col items-center rounded-lg border overflow-hidden transition ${
                value === item.name
                  ? "border-stone-900 ring-2 ring-stone-900 ring-offset-1"
                  : "border-stone-200 hover:border-stone-400"
              }`}
            >
              {/* Image area */}
              <div className="w-full aspect-square bg-stone-200 overflow-hidden shrink-0">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-stone-400 text-xs font-semibold uppercase">
                      {item.name.slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              {/* Name bar */}
              <div className={`w-full px-1 py-1 ${value === item.name ? "bg-stone-900" : "bg-white"}`}>
                <p className={`text-[10px] font-medium leading-tight truncate text-center ${
                  value === item.name ? "text-white" : "text-stone-700"
                }`}>
                  {item.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
