"use client";

import { useState, useRef, useEffect } from "react";
import DesignResultBoard from "@/components/catalog/DesignResultBoard";
import { MagicCard } from "@/registry/magicui/magic-card";

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
    design_comments: "",
    image_status: "No",
    image_url: "",
    image_source: "url",
    image_file_data: "",
    room_width: "",
    room_length: "",
    ceiling_height: "",
    window_positions: "",
    door_positions: "",
    refrigerator_position: "",
    sink_position: "",
    special_features: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // OTP / email-verification state
  const [resultState,  setResultState]  = useState(null); // null | "pending" | "verified"
  const [otpSending,   setOtpSending]   = useState(false);
  const [otpSent,      setOtpSent]      = useState(false);
  const [otpInput,     setOtpInput]     = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError,     setOtpError]     = useState("");
  const [otpSendError, setOtpSendError] = useState("");

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

  async function sendOTP() {
    setOtpSending(true);
    setOtpSendError("");
    try {
      const res = await fetch("/api/public/design/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to send code.");
      }
      setOtpSent(true);
    } catch (err) {
      setOtpSendError(err.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOTP() {
    setOtpVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/public/design/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:   form.email,
          otp:     otpInput,
          name:    form.name,
          phone:   form.phone,
          address: form.address,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Verification failed.");
      setResultState("verified");
      setTimeout(() => {
        document.getElementById("design-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpVerifying(false);
    }
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
    setOriginalPhotoUrl(null);
    setQuoteStatus("idle");
    setResultState(null);
    setOtpInput("");
    setOtpError("");
    setOtpSendError("");
    setOtpSent(false);
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
      setResultState("pending");
      if (PHOTO_REQUIRED_TYPES.includes(form.project_type) && effectiveImageUrl) {
        setOriginalPhotoUrl(effectiveImageUrl);
      }
      sendOTP(); // auto-send OTP immediately
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

  const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
  const selectCls = `${inputCls} cursor-pointer`;
  const labelCls = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Section 1: Your Info ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-1">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>1</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Your Information</h2>
          </div>
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
          </MagicCard>
        </section>

        {/* ── Section 2: Project ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-2">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>2</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Project Details</h2>
          </div>
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
                    <p className="text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
                      {form.project_type === "Replace Cabinets Only"
                        ? <>A photo of your existing kitchen is required for <strong>Replace Cabinets Only</strong>. The AI will preserve your room geometry and only update cabinetry.</>
                        : form.project_type === "Countertop Only"
                        ? <>A photo of your existing kitchen is required for <strong>Countertop Only</strong>. The AI will preserve your room geometry and only update countertop.</>
                        : <>A photo of your existing kitchen is required for <strong>{form.project_type}</strong>. The AI will preserve your room geometry and only update cabinetry, countertop, and flooring.</>
                      }
                    </p>
                    <div className="flex items-center gap-2">
                      {[{ value: "upload", label: "Upload from device" }, { value: "url", label: "Paste URL" }].map((opt) => (
                        <button key={opt.value} type="button" onClick={() => set("image_source", opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            form.image_source === opt.value
                              ? "border-[#1C1917] bg-[#1C1917] text-white"
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
                              ? "border-[#1C1917] bg-[#1C1917] text-white"
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
                                  ? "border-[#1C1917] bg-[#1C1917] text-white"
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
                          ? "border-[#6E1020] bg-[#6E1020] text-white"
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
          </MagicCard>
        </section>

        {/* ── Section 3: Style ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-3">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>3</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Design Style</h2>
          </div>
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
                      ? "border-[#1C1917] bg-[#1C1917] text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          </MagicCard>
        </section>

        {/* ── Section 4: Colors ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-4">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>4</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Colors &amp; Materials</h2>
          </div>
          <ColorMaterialsSection
            finishes={finishes}
            countertopColors={countertopColors}
            floorColors={floorColors}
            form={form}
            set={set}
            setForm={setForm}
            cabinet_style={form.cabinet_style}
          />
          </MagicCard>
        </section>

        {/* ── Section 5: Budget Range ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-5">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>5</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Budget Range</h2>
          </div>
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
                      ? "border-[#1C1917] bg-[#1C1917] text-white"
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
          </MagicCard>
        </section>

        {/* ── Section 6: Details ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-6">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>6</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Additional Details</h2>
          </div>
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
          </MagicCard>
        </section>

        {/* ── Section 7: Comments ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-7">
          <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>7</span>
            <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Comments / Notes</h2>
          </div>
          <div>
            <label className={labelCls}>Any special requests, constraints, or notes for our team</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Any special requests, constraints, or notes for our team…"
              value={form.design_comments}
              onChange={(e) => set("design_comments", e.target.value)}
            />
          </div>
          </MagicCard>
        </section>

        {/* ── Section 8: Advanced (accordion) ── */}
        <section className="form-section-card rounded-2xl overflow-hidden anim-stagger-8">
          {/* Clickable header — always visible */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-5 sm:px-7 py-4 sm:py-[1.0625rem] text-left"
            style={{ background: "transparent" }}
          >
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#6E1020" }}
            >8</span>
            <h2
              className="text-base font-semibold text-[#4A0A15] tracking-tight flex-1"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >Advanced</h2>
            <span className="text-xs text-[#7D1528]/60 font-normal mr-2 hidden sm:inline">Optional</span>
            <svg
              className={`w-4 h-4 text-[#7D1528]/60 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible content */}
          {advancedOpen && (
            <MagicCard gradientColor="#7D152825" gradientSize={280}>
            <div className="px-5 sm:px-7 pb-6 border-t border-stone-100 pt-5 space-y-4">
              <p className="text-xs text-stone-400">
                Providing room details helps the AI generate a more accurate layout. All fields are optional.
              </p>

              {/* Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Kitchen Width</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      placeholder="e.g. 12"
                      value={form.room_width}
                      onChange={(e) => set("room_width", e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">ft</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Kitchen Length</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      placeholder="e.g. 14"
                      value={form.room_length}
                      onChange={(e) => set("room_length", e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">ft</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Ceiling Height</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      placeholder="e.g. 9"
                      value={form.ceiling_height}
                      onChange={(e) => set("ceiling_height", e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">ft</span>
                  </div>
                </div>
              </div>

              {/* Positions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Window Positions</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. South wall, 3 ft from left corner"
                    value={form.window_positions}
                    onChange={(e) => set("window_positions", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Door Positions</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Entry door on east wall"
                    value={form.door_positions}
                    onChange={(e) => set("door_positions", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Refrigerator Position</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Left end of kitchen, north wall"
                    value={form.refrigerator_position}
                    onChange={(e) => set("refrigerator_position", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sink Position</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Center of main counter, under window"
                    value={form.sink_position}
                    onChange={(e) => set("sink_position", e.target.value)}
                  />
                </div>
              </div>

              {/* Special features */}
              <div>
                <label className={labelCls}>Special Features / Constraints</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Pantry cabinet, breakfast bar, structural column in corner"
                  value={form.special_features}
                  onChange={(e) => set("special_features", e.target.value)}
                />
              </div>
            </div>
            </MagicCard>
          )}
        </section>

        {/* ── Submit ── */}
        <div className="rounded-2xl overflow-hidden anim-stagger-8" style={{ background: "linear-gradient(135deg, #3D0810 0%, #6E1020 45%, #7D1528 100%)" }}>
          {error && (
            <div className="mx-5 sm:mx-8 mt-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}
          <div className="px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.08)" }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>

            {/* Headline */}
            <h3
              className="text-xl sm:text-2xl font-bold text-white mb-2"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Generate My Design
            </h3>
            <p className="text-white/70 text-sm mb-7 max-w-xs leading-relaxed">
              Your personalized AI kitchen design, ready in seconds
            </p>

            {/* Button */}
            <button
              type="submit"
              disabled={
                loading ||
                !form.name.trim() || !form.email.trim() || !isValidEmail(form.email) ||
                !form.phone.trim() || !form.address.trim() ||
                !form.project_type || !form.layout ||
                (photoRequired && !hasPhoto)
              }
              className="w-full sm:w-auto px-10 py-4 rounded-full text-sm font-bold bg-white text-stone-900 hover:bg-stone-100 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <>
                  GENERATE MY DESIGN
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Validation hint */}
            {(!form.project_type || !form.layout || (photoRequired && !hasPhoto)) && (
              <p className="text-xs text-white/60 mt-3">
                {!form.project_type
                  ? "Project type and layout are required to generate concepts."
                  : !form.layout
                  ? "Please select a kitchen layout."
                  : "A kitchen photo is required for this project type."}
              </p>
            )}

            {/* Trust badges */}
            <div className="flex items-center flex-wrap justify-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-white/10 w-full">
              <span className="flex items-center gap-1.5 text-xs text-white/70">
                <svg className="w-3.5 h-3.5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Free to use
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/70">
                <svg className="w-3.5 h-3.5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI-Powered
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/70">
                <svg className="w-3.5 h-3.5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                No commitment
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* ── Result: Pending verification — blurred preview + OTP form ── */}
      {result && resultState === "pending" && (
        <div id="design-result" className="mt-4">
          {/* Blurred image preview */}
          <div className="form-section-card rounded-2xl overflow-hidden relative">
            {result.image_url && (
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.image_url}
                  alt="Design preview"
                  className="w-full block"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ filter: "blur(1.5px)", userSelect: "none", pointerEvents: "none" }}
                />
                <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow">
                    <svg className="w-4 h-4 text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-sm font-semibold text-stone-800">Verify email to unlock</span>
                  </div>
                </div>
              </div>
            )}
            {/* Blurred content placeholders */}
            <div className="p-5 sm:p-7 space-y-3" style={{ filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }}>
              <div className="h-5 bg-stone-200 rounded w-2/3" />
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-5/6" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
            </div>
          </div>

          {/* OTP verification card */}
          <div className="mt-4 form-section-card rounded-2xl p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-rose-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Verify your email to view your design</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {otpSending ? "Sending code…" : otpSent ? `Code sent to ${form.email}` : "Preparing your code…"}
                </p>
              </div>
            </div>

            {otpSendError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{otpSendError}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full sm:w-40 border border-stone-200 rounded-lg px-4 py-2.5 text-center text-lg font-mono tracking-widest text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm"
              />
              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={otpInput.length !== 6 || otpVerifying}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-semibold bg-rose-800 hover:bg-rose-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {otpVerifying ? "Verifying…" : "Verify & View Design"}
              </button>
              <button
                type="button"
                onClick={sendOTP}
                disabled={otpSending}
                className="text-xs text-stone-400 hover:text-stone-600 transition underline underline-offset-2 shrink-0"
              >
                {otpSending ? "Sending…" : "Resend code"}
              </button>
            </div>
            {otpError && (
              <p className="mt-2 text-xs text-red-600">{otpError}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Result: Verified — full design ── */}
      {result && resultState === "verified" && (
        <div id="design-result" className="mt-4 form-section-card rounded-2xl p-5 sm:p-8">
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
            original_image_url={originalPhotoUrl}
            products={result.products}
            sales_summary={result.sales_summary}
            next_steps={result.next_steps}
            color_suggestions={result.color_suggestions}
            layout={result.layout}
            finishImageMap={finishImageMap}
            countertopImageMap={countertopImageMap}
            floorImageMap={floorImageMap}
            design_concept={result.design_concept}
            layout_plan={result.layout_plan}
            material_plan={result.material_plan}
            budget_logic={result.budget_logic}
            cabinet_plan={result.cabinet_plan}
            product_recommendations={result.product_recommendations}
            design_validation={result.design_validation}
          />

          {/* ── Request a Quote ── */}
          <div className="mt-6 rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50/60 to-stone-50 p-6 sm:p-8">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-rose-800 hover:bg-rose-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
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
  const cls = `w-4 h-4 shrink-0 ${active ? "text-rose-800" : "text-stone-400"}`;
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
                ? "border-rose-800 text-rose-900 bg-rose-50/50"
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
                        ? "border-2 border-rose-800 shadow-sm"
                        : "border-2 border-stone-200 hover:border-stone-300 hover:shadow-sm"
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
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-rose-800 flex items-center justify-center shadow">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-2 ${selected ? "bg-rose-50" : "bg-white"}`}>
                      <p className={`text-[11px] font-medium leading-snug line-clamp-2 text-center ${selected ? "text-rose-900" : "text-stone-700"}`}>
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
                  i === activeDot ? "w-4 h-2 bg-rose-800" : "w-2 h-2 bg-stone-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
