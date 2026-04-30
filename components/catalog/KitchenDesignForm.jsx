"use client";

import { useState, useRef, useEffect } from "react";
import DesignResultBoard from "@/components/catalog/DesignResultBoard";

const PROJECT_TYPES = [
  "New Kitchen",
  "Remodel Existing Kitchen",
  "Replace Cabinets Only",
  "Countertop Only",
  "Full Design + Quote",
];

// Project types that REQUIRE a kitchen photo (existing kitchen present)
const PHOTO_REQUIRED_TYPES = ["Remodel Existing Kitchen", "Replace Cabinets Only", "Countertop Only"];

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

const CABINET_STYLES = ["American", "Euro", "Shaker", "Modern", "Traditional"];

const HARDWARE_OPTIONS = ["Gold", "Silver", "Black", "Bronze", "None"];

const APPLIANCE_COLORS = ["Stainless", "White", "Black", "Panel Ready"];

const BUDGET_STYLES = [
  { id: "Budget-friendly", label: "Budget-friendly", desc: "Affordable, functional & clean" },
  { id: "Modern Euro",     label: "Modern Euro",     desc: "Sleek, handleless, contemporary" },
  { id: "Premium Luxury",  label: "Premium Luxury",  desc: "High-end materials & custom details" },
];

// RFC-5321 inspired regex: requires local@domain.tld (TLD ≥ 2 chars, no spaces)
function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// Match a layout name to the closest structure by normalising both sides
function findStructureImage(layoutName, structures) {
  if (!structures || structures.length === 0) return null;
  const norm = (s) => s.toLowerCase().replace(/[-\s]/g, "");
  const key  = norm(layoutName);
  const found = structures.find((s) => norm(s.name).includes(key));
  return found?.image_url ?? null;
}

export default function KitchenDesignForm({ countertopColors, floorColors, finishes, structures = [] }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    project_type: "",
    layout: "",
    cabinet_style: "",
    budget_style: "",
    upper_color: "",
    lower_color: "",
    countertop: "",
    flooring: "",
    hood_style: "",
    hardware: "",
    appliance_color: "",
    items_list: "",
    design_comments: "",
    image_status: "No",
    image_url: "",
    image_source: "url",
    image_file_data: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Field touched tracking (shows inline errors after blur or submit attempt)
  const [touched, setTouched] = useState({});
  function touch(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  // Quote submission state
  const [quoteStatus, setQuoteStatus] = useState("idle"); // idle | submitting | success | error
  const [quoteError, setQuoteError] = useState("");

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
    // Mark all info fields as touched so errors become visible
    setTouched({ name: true, email: true, phone: true, address: true });
    if (
      !form.name.trim() ||
      !form.email.trim() || !isValidEmail(form.email) ||
      !form.phone.trim() ||
      !form.address.trim()
    ) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setQuoteStatus("idle");
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

  async function handleQuoteSubmit() {
    if (!result) return;
    setQuoteStatus("submitting");
    setQuoteError("");
    try {
      const projectDescription = [
        `AI Kitchen Design — ${result.concept?.name || "Custom Design"}`,
        `Style: ${form.cabinet_style || "—"} | Layout: ${form.layout || "—"} | Budget Style: ${form.budget_style || "—"}`,
        `Upper: ${form.upper_color || "—"} | Lower: ${form.lower_color || "—"} | Countertop: ${form.countertop || "—"} | Flooring: ${form.flooring || "—"}`,
        `Project Type: ${form.project_type || "—"}`,
        form.items_list ? `Items Requested:\n${form.items_list}` : "",
        form.design_comments ? `Comments: ${form.design_comments}` : "",
        result.image_url ? `Render URL: ${result.image_url}` : "",
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/public/design-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          project_description: projectDescription,
          notes: form.design_comments || undefined,
          products: result.products || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setQuoteStatus("success");
    } catch (err) {
      setQuoteError(err.message);
      setQuoteStatus("error");
    }
  }

  // Build name → image_url maps from props for the result board
  const finishImageMap = Object.fromEntries((finishes || []).map((f) => [f.name, f.image_url]));
  const countertopImageMap = Object.fromEntries((countertopColors || []).map((c) => [c.name, c.image_url]));
  const floorImageMap = Object.fromEntries((floorColors || []).map((c) => [c.name, c.image_url]));

  // Photo requirement logic
  const photoRequired = PHOTO_REQUIRED_TYPES.includes(form.project_type);
  const hasPhoto = form.image_source === "upload" ? !!form.image_file_data : !!form.image_url;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name <span className="text-red-500">*</span></label>
              <input
                required
                className={`${inputCls} ${touched.name && !form.name.trim() ? "border-red-400 focus:ring-red-300" : ""}`}
                placeholder="Full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => touch("name")}
              />
              {touched.name && !form.name.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Name is required
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Email <span className="text-red-500">*</span></label>
              <input
                required
                type="email"
                className={`${inputCls} ${touched.email && (!form.email.trim() || !isValidEmail(form.email)) ? "border-red-400 focus:ring-red-300" : ""}`}
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => touch("email")}
              />
              {touched.email && (!form.email.trim() || !isValidEmail(form.email)) && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {!form.email.trim() ? "Email is required" : "Enter a valid email address (e.g. name@domain.com)"}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
              <input
                required
                type="tel"
                className={`${inputCls} ${touched.phone && !form.phone.trim() ? "border-red-400 focus:ring-red-300" : ""}`}
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                onBlur={() => touch("phone")}
              />
              {touched.phone && !form.phone.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Phone is required
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Address <span className="text-red-500">*</span></label>
              <input
                required
                className={`${inputCls} ${touched.address && !form.address.trim() ? "border-red-400 focus:ring-red-300" : ""}`}
                placeholder="Street address, city, state…"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                onBlur={() => touch("address")}
              />
              {touched.address && !form.address.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Address is required
                </p>
              )}
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
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    project_type: val,
                    // Required types: force Yes. Optional/none: reset to No.
                    image_status: PHOTO_REQUIRED_TYPES.includes(val) ? "Yes" : "No",
                  }));
                }}
              >
                <option value="">— Select project type —</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* ── Kitchen Photo — positioned between Project Type and Layout ── */}
            {form.project_type && (
              <div>
                <label className={labelCls}>
                  Kitchen Photo
                  {photoRequired
                    ? <span className="text-red-500 ml-1">*</span>
                    : <span className="ml-1.5 text-stone-400 font-normal normal-case tracking-normal">(optional)</span>
                  }
                </label>

                {photoRequired ? (
                  /* Required: always-visible upload, no toggle */
                  <div className="space-y-3">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      A photo of your existing kitchen is required for <strong>{form.project_type}</strong>. The AI will preserve your room geometry and only update cabinetry, countertop, and flooring.
                    </p>
                    <div className="flex items-center gap-2">
                      {[{ value: "upload", label: "Upload from device" }, { value: "url", label: "Paste URL" }].map((opt) => (
                        <button key={opt.value} type="button" onClick={() => set("image_source", opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            form.image_source === opt.value
                              ? "border-stone-700 bg-stone-800 text-white"
                              : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.image_source === "upload" ? (
                      <div>
                        <input type="file" accept="image/*" onChange={handleFileChange}
                          className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" />
                        {form.image_file_data && (
                          <div className="mt-2 flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.image_file_data} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                            <div>
                              <p className="text-xs text-stone-600 font-medium">Image ready</p>
                              <button type="button" onClick={() => set("image_file_data", "")} className="text-xs text-red-500 hover:text-red-700 transition mt-0.5">Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input type="url" className={inputCls} placeholder="https://example.com/my-kitchen.jpg"
                          value={form.image_url} onChange={(e) => set("image_url", e.target.value)} />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Optional: Yes/No toggle */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {["Yes", "No"].map((opt) => (
                        <button key={opt} type="button" onClick={() => set("image_status", opt)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                            form.image_status === opt
                              ? "border-stone-900 bg-stone-900 text-white"
                              : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    {form.image_status === "Yes" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {[{ value: "upload", label: "Upload from device" }, { value: "url", label: "Paste URL" }].map((opt) => (
                            <button key={opt.value} type="button" onClick={() => set("image_source", opt.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                form.image_source === opt.value
                                  ? "border-stone-700 bg-stone-800 text-white"
                                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
                              }`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {form.image_source === "upload" ? (
                          <div>
                            <input type="file" accept="image/*" onChange={handleFileChange}
                              className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" />
                            {form.image_file_data && (
                              <div className="mt-2 flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={form.image_file_data} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                                <div>
                                  <p className="text-xs text-stone-600 font-medium">Image ready</p>
                                  <button type="button" onClick={() => set("image_file_data", "")} className="text-xs text-red-500 hover:text-red-700 transition mt-0.5">Remove</button>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-stone-400 mt-1">The AI will analyze your existing kitchen and redesign it — preserving room layout and structure.</p>
                          </div>
                        ) : (
                          <div>
                            <label className={labelCls}>Image URL</label>
                            <input type="url" className={inputCls} placeholder="https://example.com/my-kitchen.jpg"
                              value={form.image_url} onChange={(e) => set("image_url", e.target.value)} />
                            <p className="text-xs text-stone-400 mt-1">The AI will analyze your existing kitchen and redesign it — preserving room layout and structure.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Kitchen Layout *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                {LAYOUT_CONFIGS.map(({ name, svg }) => {
                  const imgUrl = findStructureImage(name, structures);
                  const selected = form.layout === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => set("layout", name)}
                      className={`flex flex-col items-center rounded-xl border overflow-hidden transition ${
                        selected
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-700"
                      }`}
                    >
                      {imgUrl ? (
                        <div className="w-full relative" style={{ paddingTop: "66%" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={name}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${selected ? "opacity-80" : "opacity-100"}`}
                          />
                          {selected && (
                            <div className="absolute inset-0 bg-stone-900/30" />
                          )}
                        </div>
                      ) : (
                        <div className="w-16 h-12 my-3">
                          {svg}
                        </div>
                      )}
                      <span className={`text-xs font-medium leading-tight text-center py-2 px-1 ${
                        selected ? "text-white" : "text-stone-700"
                      }`}>
                        {name}
                      </span>
                    </button>
                  );
                })}
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
                  onClick={() => {
                    setForm((prev) => {
                      const wasFiltered = ["American", "Euro"].includes(prev.cabinet_style);
                      const willFilter  = ["American", "Euro"].includes(style);
                      const clearColors = wasFiltered || willFilter;
                      return {
                        ...prev,
                        cabinet_style: style,
                        upper_color: clearColors ? "" : prev.upper_color,
                        lower_color: clearColors ? "" : prev.lower_color,
                      };
                    });
                  }}
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
          <ColorMaterialsSection
            finishes={finishes}
            countertopColors={countertopColors}
            floorColors={floorColors}
            form={form}
            set={set}
            setForm={setForm}
            cabinet_style={form.cabinet_style}
          />
        </section>

        {/* ── Section 5: Details ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Additional Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="space-y-4">
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
            <div>
              <label className={labelCls}>Comments / Notes</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Any special requests, constraints, or notes for our team…"
                value={form.design_comments}
                onChange={(e) => set("design_comments", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Section 7: Budget Range ── */}
        <section>
          <h2
            className="text-lg font-bold text-stone-900 mb-5 pb-3 border-b border-stone-100"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Budget Range
          </h2>
          <div>
            <label className={labelCls}>Kitchen Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              {BUDGET_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("budget_style", s.id)}
                  className={`flex flex-col text-left rounded-xl border p-4 transition ${
                    form.budget_style === s.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                  }`}
                >
                  <span className={`text-sm font-semibold mb-0.5 ${form.budget_style === s.id ? "text-white" : "text-stone-900"}`}>
                    {s.label}
                  </span>
                  <span className={`text-xs ${form.budget_style === s.id ? "text-white/70" : "text-stone-400"}`}>
                    {s.desc}
                  </span>
                </button>
              ))}
            </div>
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
            disabled={
              loading ||
              !form.name.trim() || !form.email.trim() || !isValidEmail(form.email) ||
              !form.phone.trim() || !form.address.trim() ||
              !form.project_type || !form.layout ||
              (photoRequired && !hasPhoto)
            }
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
          {(!form.project_type || !form.layout || (photoRequired && !hasPhoto)) && (
            <p className="text-xs text-stone-400 mt-2">
              {!form.project_type
                ? "Project type and layout are required to generate concepts."
                : !form.layout
                ? "Please select a kitchen layout."
                : "A kitchen photo is required for this project type."}
            </p>
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
            color_suggestions={result.color_suggestions}
            layout={result.layout}
            finishImageMap={finishImageMap}
            countertopImageMap={countertopImageMap}
            floorImageMap={floorImageMap}
          />

          {/* ── Request a Quote ── */}
          <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:p-8">
            {quoteStatus === "success" ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Quote Request Submitted!
                </h3>
                <p className="text-stone-600 text-sm max-w-md">
                  Your design and product selections have been sent to our team.
                  {form.email && <> We&apos;ll reach out at <strong>{form.email}</strong> shortly.</>}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-stone-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      Ready to get a quote for this design?
                    </h3>
                    <p className="text-stone-500 text-sm mt-1">
                      We&apos;ll send your design concept, selected products, and comments to our team.
                    </p>
                  </div>
                </div>

                {/* Summary of what will be submitted */}
                <div className="grid sm:grid-cols-3 gap-3 mb-5 text-sm">
                  <div className="rounded-xl bg-white border border-stone-200 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Contact</p>
                    <p className="text-stone-700 font-medium">{form.name || "—"}</p>
                    <p className="text-stone-500 text-xs">{form.email || "—"}</p>
                    {form.address && <p className="text-stone-400 text-xs mt-0.5">{form.address}</p>}
                  </div>
                  <div className="rounded-xl bg-white border border-stone-200 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Design</p>
                    <p className="text-stone-700 font-medium">{result.concept?.name || "Custom Design"}</p>
                    <p className="text-stone-500 text-xs">{form.layout} · {form.cabinet_style}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-stone-200 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Products</p>
                    <p className="text-stone-700 font-medium">{result.products?.length || 0} items selected</p>
                    <p className="text-stone-500 text-xs">{result.products?.slice(0, 2).map(p => p.sku).join(", ")}{result.products?.length > 2 ? "…" : ""}</p>
                  </div>
                </div>

                {quoteError && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {quoteError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleQuoteSubmit}
                  disabled={quoteStatus === "submitting"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quoteStatus === "submitting" ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Confirm &amp; Request Quote
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab icons for the Colors & Materials section ──────────────────────────────
function TabIcon({ id, active }) {
  const cls = `w-4 h-4 shrink-0 ${active ? "text-blue-500" : "text-stone-400"}`;
  if (id === "upper_color")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M3 9V6a1 1 0 011-1h16a1 1 0 011 1v3M3 9v9a1 1 0 001 1h16a1 1 0 001-1V9M8 13h8" />
      </svg>
    );
  if (id === "lower_color")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12V9a1 1 0 011-1h16a1 1 0 011 1v3M3 12v5a1 1 0 001 1h16a1 1 0 001-1v-5M8 16h8" />
      </svg>
    );
  if (id === "countertop")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 8h20v3H2zM6 11v7M18 11v7M6 18h12" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 11h4v4H4zM10 11h4v4h-4zM16 11h4v4h-4zM4 17h4v4H4zM10 17h4v4h-4zM16 17h4v4h-4z" />
    </svg>
  );
}

// ── Tabbed carousel for Colors & Materials ────────────────────────────────────
function ColorMaterialsSection({ finishes, countertopColors, floorColors, form, set, setForm, cabinet_style }) {
  const [activeTab, setActiveTab] = useState("upper_color");
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  const TABS = [
    { id: "upper_color", label: "Upper Cabinet Color", shortLabel: "Upper Color", subtitle: "Select the perfect color for your upper cabinets", items: finishes },
    { id: "lower_color", label: "Lower Cabinet Color", shortLabel: "Lower Color", subtitle: "Select the perfect color for your lower cabinets", items: finishes },
    { id: "countertop",  label: "Countertop",          shortLabel: "Countertop",  subtitle: "Choose your countertop material and color",          items: countertopColors },
    { id: "flooring",    label: "Flooring",             shortLabel: "Flooring",    subtitle: "Pick the perfect flooring finish",                   items: floorColors },
  ];

  const tab      = TABS.find((t) => t.id === activeTab);
  const rawItems = tab?.items || [];

  // Filter finishes for upper/lower tabs when American or Euro style is selected
  const items = (activeTab === "upper_color" || activeTab === "lower_color") &&
    (cabinet_style === "American" || cabinet_style === "Euro")
    ? rawItems.filter((item) => item.style_category === cabinet_style)
    : rawItems;
  const value = form[activeTab];

  // Reset scroll + re-check right-arrow on tab change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setCanScrollLeft(false);
    setActiveDot(0);
    setTimeout(() => {
      if (scrollRef.current) {
        setCanScrollRight(scrollRef.current.scrollWidth > scrollRef.current.clientWidth + 4);
      }
    }, 60);
  }, [activeTab]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
    if (maxScroll > 0) {
      const dots = Math.max(1, Math.ceil(items.length / 6));
      setActiveDot(Math.min(dots - 1, Math.round((el.scrollLeft / maxScroll) * (dots - 1))));
    }
  }

  function scrollByPage(dir) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  }

  const dotCount = Math.max(1, Math.ceil(items.length / 6));

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
      {/* ── Tab bar ── */}
      <div className="flex border-b border-stone-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-3.5 text-[11px] sm:text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-blue-500 text-blue-600 bg-blue-50/50"
                : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
            }`}
          >
            <TabIcon id={t.id} active={activeTab === t.id} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden leading-tight text-center">{t.shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-5 pt-4 pb-3">
        {/* ── Section header ── */}
        <div className="mb-3">
          <p className="text-sm font-semibold text-stone-900">{tab?.label}</p>
          <p className="text-xs text-stone-400 mt-0.5">{tab?.subtitle}</p>
        </div>

        {/* ── Carousel ── */}
        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 hidden sm:flex w-8 h-8 rounded-full bg-white border border-stone-200 shadow-md items-center justify-center text-stone-600 hover:border-stone-400 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-6">No options available</p>
            ) : (
              items.map((item) => {
                const selected = value === item.name;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      set(activeTab, item.name);
                      // Auto-select cabinet style when picking an American/Euro finish
                      if (
                        (activeTab === "upper_color" || activeTab === "lower_color") &&
                        item.style_category
                      ) {
                        setForm((prev) => ({
                          ...prev,
                          cabinet_style: item.style_category,
                        }));
                      }
                    }}
                    className={`flex-shrink-0 flex flex-col rounded-xl overflow-hidden transition-all ${
                      selected
                        ? "border-2 border-blue-500 shadow-sm"
                        : "border-2 border-stone-200 hover:border-stone-300"
                    }`}
                    style={{ width: 110 }}
                  >
                    <div className="relative bg-stone-100 w-full" style={{ height: 110 }}>
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-stone-400 text-sm font-bold uppercase">{item.name.slice(0, 2)}</span>
                        </div>
                      )}
                      {selected && (
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-2 ${selected ? "bg-blue-50" : "bg-white"}`}>
                      <p className={`text-[11px] font-medium leading-snug line-clamp-2 text-center ${selected ? "text-blue-700" : "text-stone-700"}`}>
                        {item.name}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 hidden sm:flex w-8 h-8 rounded-full bg-white border border-stone-200 shadow-md items-center justify-center text-stone-600 hover:border-stone-400 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Dot pagination ── */}
        {dotCount > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: dotCount }).map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === activeDot ? "w-4 h-2 bg-blue-500" : "w-2 h-2 bg-stone-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
