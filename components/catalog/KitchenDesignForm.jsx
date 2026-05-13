"use client";

import { useState, useRef, useEffect } from "react";
import DesignResultBoard from "@/components/catalog/DesignResultBoard";
import { MagicCard } from "@/registry/magicui/magic-card";
import { TypingAnimation } from "@/registry/magicui/typing-animation";

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

export default function KitchenDesignForm({ countertopColors, floorColors, finishes, structures = [], onVerified }) {
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

  // Wizard step
  const [currentStep, setCurrentStep] = useState(0); // 0-indexed, 0–7
  const wizardTopRef = useRef(null); // used to scroll page to stepper on step change

  // Navigate to a step AND scroll to the stepper top.
  // Called only from button handlers — never fires on initial page load.
  function navigateTo(step) {
    setCurrentStep(step);
    if (wizardTopRef.current) {
      const navHeight = document.querySelector("header")?.offsetHeight ?? 88;
      const top = wizardTopRef.current.getBoundingClientRect().top + window.pageYOffset - navHeight - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

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
      onVerified?.();
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
    // Yield to the browser so React can paint the "Generating…" state
    // before the synchronous JSON.stringify + fetch work begins.
    await new Promise((r) => setTimeout(r, 0));
    // Scroll to the flickering grid loading placeholder now it's mounted
    setTimeout(() => {
      document.getElementById("design-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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
        form.address ? `Address: ${form.address}` : "",
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

  // Per-step validation: steps 0-1 are gated; steps 2+ always allow proceeding
  function canProceedFromStep(step) {
    if (step === 0) {
      return !!(
        form.name.trim() && form.email.trim() && isValidEmail(form.email) &&
        form.phone.trim() && form.address.trim()
      );
    }
    if (step === 1) {
      return !!(form.project_type && form.layout && (!photoRequired || hasPhoto));
    }
    return true;
  }

  const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
  const selectCls = `${inputCls} cursor-pointer`;
  const labelCls = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";

  // Shared nav button classes
  const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
  const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6E1020] hover:bg-[#7D1528] text-white transition disabled:opacity-40 disabled:cursor-not-allowed";

  const WIZARD_STEPS = [
    { label: "Your Info",  icon: <StepIconPerson /> },
    { label: "Project",    icon: <StepIconCabinet /> },
    { label: "Style",      icon: <StepIconLamp /> },
    { label: "Colors",     icon: <StepIconPalette /> },
    { label: "Budget",     icon: <StepIconTag /> },
    { label: "Details",    icon: <StepIconClipboard /> },
    { label: "Notes",      icon: <StepIconChat /> },
    { label: "Advanced",   icon: <StepIconGear /> },
  ];

  return (
    <div ref={wizardTopRef}>
      {/* ── Wizard Stepper + Form — hidden once design is verified ── */}
      {resultState !== "verified" && (
      <>
      <WizardStepper currentStep={currentStep} steps={WIZARD_STEPS} />

      <form onSubmit={handleSubmit}>
      {/* Consistent-height content wrapper — keeps the layout stable across all steps */}
      <div className="min-h-[380px] sm:min-h-[420px]">

        {/* ══════════════════════════════════════
            Step 0 — Your Information
        ══════════════════════════════════════ */}
        {currentStep === 0 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-end mt-5">
              <button
                type="button"
                onClick={() => {
                  setTouched({ name: true, email: true, phone: true, address: true });
                  if (canProceedFromStep(0)) navigateTo(1);
                }}
                disabled={!canProceedFromStep(0)}
                className={nextBtnCls}
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 1 — Project Details
        ══════════════════════════════════════ */}
        {currentStep === 1 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(0)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={() => { if (canProceedFromStep(1)) navigateTo(2); }}
                disabled={!canProceedFromStep(1)}
                className={nextBtnCls}
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 2 — Design Style
        ══════════════════════════════════════ */}
        {currentStep === 2 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(1)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button type="button" onClick={() => navigateTo(3)} className={nextBtnCls}>
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 3 — Colors & Materials
        ══════════════════════════════════════ */}
        {currentStep === 3 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(2)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button type="button" onClick={() => navigateTo(4)} className={nextBtnCls}>
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 4 — Budget Range
        ══════════════════════════════════════ */}
        {currentStep === 4 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(3)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button type="button" onClick={() => navigateTo(5)} className={nextBtnCls}>
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 5 — Additional Details  (optional)
        ══════════════════════════════════════ */}
        {currentStep === 5 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(4)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigateTo(7)}
                  className="text-xs text-stone-400 hover:text-stone-600 transition underline underline-offset-2">
                  Skip to Generate
                </button>
                <button type="button" onClick={() => navigateTo(6)} className={nextBtnCls}>
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 6 — Comments / Notes  (optional)
        ══════════════════════════════════════ */}
        {currentStep === 6 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
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
            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(5)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigateTo(7)}
                  className="text-xs text-stone-400 hover:text-stone-600 transition underline underline-offset-2">
                  Skip to Generate
                </button>
                <button type="button" onClick={() => navigateTo(7)} className={nextBtnCls}>
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            Step 7 — Advanced + Generate  (optional)
        ══════════════════════════════════════ */}
        {currentStep === 7 && (
          <>
            {/* Back button row */}
            <div className="mb-5">
              <button type="button" onClick={() => navigateTo(6)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
            </div>

            {/* Section 8: Advanced (accordion) */}
            <section className="form-section-card rounded-2xl overflow-hidden mb-5">
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

            {/* ── Generate My Design card ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #3D0810 0%, #6E1020 45%, #7D1528 100%)" }}>
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
                  GENERATE MY DESIGN
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
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
          </>
        )}

      </div>{/* end consistent-height wrapper */}
      </form>
      </> )}{/* end resultState !== "verified" guard */}

      {/* ── Loading: Flickering grid placeholder ── */}
      {loading && (
        <div id="design-result" className="mt-4">
          <div className="form-section-card rounded-2xl overflow-hidden">
            <div
              className="relative w-full"
              style={{ height: "min(55vw, 320px)", background: "#0a0a0a" }}
            >
              {/* Animated conic mask — dots invisible by default, revealed by rotating window */}
              <style>{`
                @property --r-angle {
                  syntax: '<angle>';
                  inherits: false;
                  initial-value: 0deg;
                }
                @keyframes radar-sweep {
                  from { --r-angle: 0deg; }
                  to   { --r-angle: 360deg; }
                }
                .radar-dot-layer {
                  mask-image: conic-gradient(
                    from var(--r-angle) at 50% 50%,
                    transparent 0deg,
                    transparent 282deg,
                    rgba(0,0,0,0.12) 310deg,
                    rgba(0,0,0,0.55) 338deg,
                    black 355deg,
                    black 360deg
                  );
                  -webkit-mask-image: conic-gradient(
                    from var(--r-angle) at 50% 50%,
                    transparent 0deg,
                    transparent 282deg,
                    rgba(0,0,0,0.12) 310deg,
                    rgba(0,0,0,0.55) 338deg,
                    black 355deg,
                    black 360deg
                  );
                  animation: radar-sweep 3s linear infinite;
                }
              `}</style>
              {/* Dots — fully invisible outside the rotating mask window */}
              <div
                className="radar-dot-layer"
                style={{
                  position: "absolute", inset: 0,
                  backgroundImage: "radial-gradient(circle, #c41840 0%, rgba(160,20,50,0.65) 35%, transparent 50%)",
                  backgroundSize: "14px 14px",
                }}
              />
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div style={{
                  background: "rgba(10, 5, 5, 0.78)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  borderRadius: "9999px",
                  padding: "10px 28px",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}>
                  <TypingAnimation
                    showCursor={false}
                    duration={75}
                    pauseTime={1200}
                    className="text-white text-sm font-semibold tracking-[0.18em] uppercase select-none"
                  >
                    Generating your design...
                  </TypingAnimation>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <a
                  href="/catalog"
                  className="mt-2 inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-white transition"
                  style={{ background: "linear-gradient(135deg, #6E1020 0%, #7D1528 100%)" }}
                >
                  Browse Collection
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
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
                      // Auto-advance to next tab after a brief visual pause
                      const currentIdx = TABS.findIndex((t) => t.id === activeTab);
                      if (currentIdx < TABS.length - 1) {
                        setTimeout(() => setActiveTab(TABS[currentIdx + 1].id), 320);
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

// ── Wizard Stepper ────────────────────────────────────────────────────────────
function WizardStepper({ currentStep, steps }) {
  const activeStepRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // On mobile: scroll the active step into the center of the horizontal strip
  useEffect(() => {
    if (activeStepRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const item = activeStepRef.current;
      const scrollLeft = item.offsetLeft - container.clientWidth / 2 + item.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [currentStep]);

  return (
    <>
      <style>{`
        @keyframes wz-ring {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes wz-check {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          65%  { transform: scale(1.2) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes wz-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: 0.7; }
        }
        .wz-circle {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: default;
        }
        .wz-circle:hover { transform: scale(1.1); }
      `}</style>

      <div className="w-full overflow-x-auto pb-1 mb-7" ref={scrollContainerRef}>
        {/* Transparent — no background card */}
        <div className="flex items-center justify-center min-w-max mx-auto px-2 py-3">
          {steps.map((step, i) => {
            const done   = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} className="flex items-center" ref={active ? activeStepRef : null}>
                {/* Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className="wz-circle relative rounded-full flex items-center justify-center"
                    style={{
                      width: active ? 52 : 44,
                      height: active ? 52 : 44,
                      background: done ? "#6E1020" : active ? "#fff" : "rgba(255,255,255,0.6)",
                      border: done || active ? "2.5px solid #6E1020" : "2px solid #D1D5DB",
                      boxShadow: active
                        ? "0 0 0 4px rgba(110,16,32,0.10), 0 2px 10px rgba(110,16,32,0.18)"
                        : done
                        ? "0 1px 5px rgba(110,16,32,0.22)"
                        : "none",
                      flexShrink: 0,
                    }}
                  >
                    {/* Pulsing ring — active step only */}
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          border: "2px solid rgba(110,16,32,0.35)",
                          animation: "wz-ring 1.8s ease-out infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {done ? (
                      <svg
                        className="w-5 h-5 text-white"
                        style={{ animation: "wz-check 0.35s ease forwards" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span
                        className="flex items-center justify-center"
                        style={{
                          color: active ? "#6E1020" : "#B0B8C1",
                          transform: `scale(${active ? 1.55 : 1.3})`,
                        }}
                      >
                        {step.icon}
                      </span>
                    )}
                  </div>

                  {/* Active indicator dot */}
                  <div className="h-2 flex items-center justify-center mt-1.5">
                    {active && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "#6E1020", animation: "wz-dot 1.4s ease-in-out infinite" }}
                      />
                    )}
                  </div>
                </div>

                {/* Connector dots — not after last step */}
                {i < steps.length - 1 && (
                  <div className="flex items-center gap-1 shrink-0 mb-3" style={{ width: 16 }}>
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="rounded-full transition-all duration-500"
                        style={{
                          width: 4, height: 4,
                          background: i < currentStep ? "#6E1020" : "#D1D5DB",
                          opacity: i < currentStep ? 1 - d * 0.2 : 0.6 + d * 0.2,
                          transitionDelay: `${d * 60}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Wizard step icons (kitchen / AI design themed) ───────────────────────────

// Step 1 — Your Info: contact card
function StepIconPerson() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Step 2 — Project Details: house / kitchen layout
function StepIconCabinet() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

// Step 3 — Design Style: magic wand / sparkle (AI design)
function StepIconLamp() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

// Step 4 — Colors & Materials: paint swatch / finish
function StepIconPalette() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

// Step 5 — Budget Range: currency / wallet
function StepIconTag() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Step 6 — Additional Details: adjustments / sliders (appliances/hardware)
function StepIconClipboard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

// Step 7 — Comments / Notes: pencil / edit
function StepIconChat() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

// Step 8 — Advanced: measuring tape / room dimensions
function StepIconGear() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}
