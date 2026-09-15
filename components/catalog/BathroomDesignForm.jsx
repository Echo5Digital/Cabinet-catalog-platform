"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import BathroomDesignResultBoard from "@/components/catalog/BathroomDesignResultBoard";
import { MagicCard } from "@/registry/magicui/magic-card";
import { TypingAnimation } from "@/registry/magicui/typing-animation";

const BATHROOM_TYPES = ["Full Bathroom", "Vanity", "Shower Area"];

// 4 hardcoded room-layout styles for Full Bathroom — simple inline SVG icons,
// same shape language as the Kitchen Layout picker (KitchenDesignForm.jsx).
const FULL_BATHROOM_STYLES = [
  {
    name: "L-Shaped",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
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
    name: "Single Wall",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "U-Shaped",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6"  y="8"  width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6"  y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

const VANITY_STYLES = [
  {
    name: "Floating",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="14" y="24" width="52" height="16" rx="2" fill="currentColor" />
        <rect x="20" y="14" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    name: "Furniture Style",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="10" y="20" width="60" height="26" rx="2" fill="currentColor" />
        <rect x="14" y="46" width="8" height="8" fill="currentColor" />
        <rect x="58" y="46" width="8" height="8" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Double Sink",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="22" width="68" height="20" rx="2" fill="currentColor" />
        <circle cx="24" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="56" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
];

const SHOWER_AREA_STYLES = [
  {
    name: "Walk-in Glass",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="10" y="8" width="4" height="44" fill="currentColor" />
        <rect x="18" y="8" width="52" height="44" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    name: "Framed Enclosure",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="10" y="8" width="60" height="44" rx="1" fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1="40" y1="8" x2="40" y2="52" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    name: "Tub & Shower Combo",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="8" y="30" width="64" height="18" rx="4" fill="currentColor" />
        <rect x="8" y="8" width="64" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
];

const BATHROOM_TYPE_STYLES = {
  "Full Bathroom": FULL_BATHROOM_STYLES,
  "Vanity": VANITY_STYLES,
  "Shower Area": SHOWER_AREA_STYLES,
};

// Hardcoded faucet styles — simple inline SVG icons (no DB/catalog dependency to ship).
const VANITY_FAUCET_STYLES = [
  {
    name: "Waterfall",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="34" y="8" width="8" height="26" rx="1" fill="currentColor" />
        <rect x="26" y="8" width="24" height="7" rx="1" fill="currentColor" />
        <rect x="30" y="42" width="20" height="6" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Wide Waterfall",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="30" y="8" width="8" height="22" rx="1" fill="currentColor" />
        <rect x="16" y="8" width="36" height="7" rx="1" fill="currentColor" />
        <rect x="20" y="40" width="28" height="6" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Gooseneck",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="34" y="20" width="7" height="24" rx="1" fill="currentColor" />
        <path d="M37 20 C37 8, 54 8, 54 22 L54 34" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="28" y="44" width="19" height="5" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Single-Lever",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="36" y="16" width="6" height="26" rx="2" fill="currentColor" />
        <path d="M39 16 C39 10, 48 10, 48 16" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="26" y="12" width="14" height="4" rx="2" fill="currentColor" />
        <rect x="30" y="44" width="18" height="5" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Widespread",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <circle cx="20" cy="26" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="60" cy="26" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M40 16 L40 30 C40 36, 46 36, 46 30" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="18" y="44" width="44" height="5" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Vessel-Height",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="35" y="4" width="7" height="32" rx="1" fill="currentColor" />
        <rect x="27" y="4" width="23" height="6" rx="1" fill="currentColor" />
        <ellipse cx="40" cy="46" rx="20" ry="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      </svg>
    ),
  },
];

const SHOWER_FAUCET_STYLES = [
  {
    name: "Round Rain Shower",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <path d="M12 12 L30 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="40" cy="12" rx="14" ry="5" fill="currentColor" opacity="0.55" />
        <circle cx="12" cy="30" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="8" y="38" width="8" height="4" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Square Rain Shower",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <path d="M12 12 L28 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <rect x="30" y="6" width="24" height="12" rx="1" fill="currentColor" opacity="0.55" />
        <circle cx="12" cy="30" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="8" y="38" width="8" height="4" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Round Arm Shower",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <path d="M14 14 L52 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="58" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="10" y="10" width="6" height="8" rx="1" fill="currentColor" />
        <rect x="8" y="38" width="8" height="4" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Square Arm Shower",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <path d="M14 14 L50 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <rect x="50" y="8" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="10" y="10" width="6" height="8" rx="1" fill="currentColor" />
        <rect x="8" y="38" width="8" height="4" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Exposed Valve + Handheld",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="10" y="18" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M20 23 L34 23" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="42" cy="23" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M14 28 L14 44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 3" />
        <rect x="10" y="44" width="8" height="5" rx="2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Concealed Valve + Overhead",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <circle cx="16" cy="26" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="16" cy="26" r="2.5" fill="currentColor" />
        <path d="M24 14 L48 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="58" cy="14" rx="12" ry="5" fill="currentColor" opacity="0.55" />
      </svg>
    ),
  },
];

// Faucet finish colors — rendered as glossy metal spheres (radial-gradient
// highlight simulating a light source) rather than flat swatches, so each
// option reads visually as its actual metal finish.
const FAUCET_COLORS = [
  {
    name: "Silver",
    gradient: "radial-gradient(circle at 32% 28%, #ffffff 0%, #d7dbe0 22%, #9aa1ab 55%, #6b7280 80%, #4b5157 100%)",
  },
  {
    name: "Gold",
    gradient: "radial-gradient(circle at 32% 28%, #fff6d8 0%, #f0d27a 22%, #cf9f3f 55%, #a97c1f 80%, #7a5613 100%)",
  },
  {
    name: "Black",
    gradient: "radial-gradient(circle at 32% 28%, #6b6b6b 0%, #3a3a3a 25%, #1c1c1c 55%, #0a0a0a 80%, #000000 100%)",
  },
  {
    name: "Bronze",
    gradient: "radial-gradient(circle at 32% 28%, #e8c9a0 0%, #b9834a 22%, #8a5a2e 55%, #603c1c 80%, #3d240f 100%)",
  },
];

const BUDGET_STYLES = [
  { id: "Budget-friendly", label: "Budget-friendly", desc: "Affordable, functional & clean" },
  { id: "Modern Euro",     label: "Modern Euro",     desc: "Sleek, handleless, contemporary" },
  { id: "Premium Luxury",  label: "Premium Luxury",  desc: "High-end materials & custom details" },
];

// Optional enhancement keywords — not covered by any wizard step, but woven into the
// AI prompt (via design_comments) at generation time when selected.
const ENHANCEMENT_OPTIONS = [
  { id: "Storage Enhancement",     desc: "Add extra drawers, shelving, or built-in storage" },
  { id: "Improved Lighting",       desc: "Layered task, ambient, and accent lighting" },
  { id: "Better Ventilation",      desc: "Exhaust fan or window for moisture control" },
  { id: "Heated Flooring",         desc: "Radiant floor heating for comfort" },
  { id: "Anti-Fog Mirror",         desc: "Defogging mirror for a clear post-shower view" },
  { id: "Water-Efficient Fixtures", desc: "Low-flow faucet and showerhead options" },
];

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// Match a Full-Bathroom layout name (e.g. "L-Shaped") to its uploaded structure
// image. Bathroom layout structures are coded "bathroom-{layout}" (e.g.
// "bathroom-l-shape") to keep them distinct from the kitchen's own L-Shaped/
// Galley/etc. structure rows — see admin → Catalog → Structures.
function findStructureImage(layoutName, structures) {
  if (!structures || structures.length === 0) return null;
  // Normalize "shaped" → "shape" so "bathroom-l-shape" (a natural filename to
  // type) still matches the form's "L-Shaped" label without requiring the
  // exact irregular spelling in the admin structure code.
  const norm = (s) => s.toLowerCase().replace(/[-\s]/g, "").replace(/shaped\b/g, "shape");
  const key  = norm(layoutName);
  const found = structures.find((s) => norm(s.code || s.name).includes(key));
  return found?.image_url ?? null;
}

export default function BathroomDesignForm({ countertopColors, floorColors, finishes, structures = [], onVerified }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bathroom_type: "",
    style: "",
    vanity_finish: "",
    countertop: "",
    flooring: "",
    budget_style: "",
    faucet_style: "",
    shower_faucet_style: "",
    faucet_color: "",
    enhancements: [],
    design_comments: "",
    image_status: "No",
    image_url: "",
    image_source: "url",
    image_file_data: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const [currentStep, setCurrentStep] = useState(0); // 0-6
  const wizardTopRef = useRef(null);
  const otpSendInFlight = useRef(false); // guards against duplicate/overlapping send-otp calls invalidating a code the user already has

  function navigateTo(step) {
    setCurrentStep(step);
    if (wizardTopRef.current) {
      const navHeight = document.querySelector("header")?.offsetHeight ?? 88;
      const top = wizardTopRef.current.getBoundingClientRect().top + window.pageYOffset - navHeight - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

  const [resultState,  setResultState]  = useState(null); // null | "pending" | "verified"
  const [otpSending,   setOtpSending]   = useState(false);
  const [otpSent,      setOtpSent]      = useState(false);
  const [otpInput,     setOtpInput]     = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError,     setOtpError]     = useState("");
  const [otpSendError, setOtpSendError] = useState("");

  const [touched, setTouched] = useState({});
  function touch(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const [quoteStatus, setQuoteStatus] = useState("idle");
  const [quoteError, setQuoteError] = useState("");

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleEnhancement(id) {
    setForm((prev) => ({
      ...prev,
      enhancements: prev.enhancements.includes(id)
        ? prev.enhancements.filter((e) => e !== id)
        : [...prev.enhancements, id],
    }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("image_file_data", ev.target.result);
    reader.readAsDataURL(file);
  }

  async function sendOTP() {
    // Prevent overlapping sends (e.g. auto-send + a near-simultaneous manual
    // resend) from racing — each send invalidates the previous code, so a
    // duplicate call can silently expire a code the user already has open.
    if (otpSendInFlight.current) return;
    otpSendInFlight.current = true;
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
      setOtpInput("");
      setOtpError("");
    } catch (err) {
      setOtpSendError(err.message);
    } finally {
      setOtpSending(false);
      otpSendInFlight.current = false;
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
    await new Promise((r) => setTimeout(r, 0));
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

      // Fold selected enhancement keywords into design_comments — the AI route/prompt
      // already treat design_comments as freeform special requirements, so no other
      // change is needed downstream for these to influence the generated design.
      const combinedComments = [
        form.enhancements.length > 0 ? `Requested enhancements: ${form.enhancements.join(", ")}.` : "",
        form.design_comments.trim(),
      ].filter(Boolean).join(" ");

      const res = await fetch("/api/ai/bathroom-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_url: effectiveImageUrl, design_comments: combinedComments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setResult(data);
      setResultState("pending");
      if (effectiveImageUrl) {
        setOriginalPhotoUrl(effectiveImageUrl);
      }
      sendOTP();
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
        `AI Bathroom Design — ${result.concept?.name || "Custom Design"}`,
        `Bathroom Type: ${form.bathroom_type || "—"} | Style: ${form.style || "—"} | Budget Style: ${form.budget_style || "—"}`,
        `Vanity Finish: ${form.vanity_finish || "—"} | Countertop: ${form.countertop || "—"} | Flooring: ${form.flooring || "—"}`,
        `Vanity Faucet: ${form.faucet_style || "—"} | Shower Faucet: ${form.shower_faucet_style || "—"} | Faucet Color: ${form.faucet_color || "—"}`,
        form.enhancements.length > 0 ? `Enhancements: ${form.enhancements.join(", ")}` : "",
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
          before_photo: originalPhotoUrl || undefined,
          source: "design_ai_bathroom",
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

  const finishImageMap = Object.fromEntries((finishes || []).map((f) => [f.name, f.image_url]));
  const countertopImageMap = Object.fromEntries((countertopColors || []).map((c) => [c.name, c.image_url]));
  const floorImageMap = Object.fromEntries((floorColors || []).map((c) => [c.name, c.image_url]));

  function canProceedFromStep(step) {
    if (step === 0) {
      return !!(
        form.name.trim() && form.email.trim() && isValidEmail(form.email) &&
        form.phone.trim() && form.address.trim()
      );
    }
    if (step === 1) {
      return !!(form.bathroom_type && form.style);
    }
    return true;
  }

  const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
  const labelCls = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";
  const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
  const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6E1020] hover:bg-[#7D1528] !text-white transition disabled:bg-[#6E1020]/50 disabled:cursor-not-allowed";

  const WIZARD_STEPS = [
    { label: "Your Info", icon: <BStepIconPerson /> },
    { label: "Type",      icon: <BStepIconBathroom /> },
    { label: "Colors",    icon: <BStepIconPalette /> },
    { label: "Budget",    icon: <BStepIconTag /> },
    { label: "Faucets",   icon: <BStepIconFaucet /> },
    { label: "Notes",     icon: <BStepIconChat /> },
    { label: "Generate",  icon: <BStepIconSparkle /> },
  ];

  const styleOptions = BATHROOM_TYPE_STYLES[form.bathroom_type] || [];

  return (
    <div ref={wizardTopRef}>
      {resultState !== "verified" && (
      <>
      <WizardStepper currentStep={currentStep} steps={WIZARD_STEPS} />

      <form onSubmit={handleSubmit}>
      <div className="min-h-[380px] sm:min-h-[420px]">

        {/* Step 0 — Your Information */}
        {currentStep === 0 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
              <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
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
                  {touched.name && !form.name.trim() && <p className="text-xs text-red-500 mt-1.5">Name is required</p>}
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
                    <p className="text-xs text-red-500 mt-1.5">{!form.email.trim() ? "Email is required" : "Enter a valid email address"}</p>
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
                  {touched.phone && !form.phone.trim() && <p className="text-xs text-red-500 mt-1.5">Phone is required</p>}
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
                  {touched.address && !form.address.trim() && <p className="text-xs text-red-500 mt-1.5">Address is required</p>}
                </div>
              </div>
              </MagicCard>
            </section>
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

        {/* Step 1 — Bathroom Type + Style */}
        {currentStep === 1 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
              <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>2</span>
                <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Bathroom Type</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className={labelCls}>What are you designing? *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                    {BATHROOM_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, bathroom_type: t, style: "" }))}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition ${
                          form.bathroom_type === t
                            ? "border-[#1C1917] bg-[#1C1917] text-white"
                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {form.bathroom_type && (
                  <div>
                    <label className={labelCls}>
                      {form.bathroom_type === "Full Bathroom" ? "Choose a Layout *" : "Choose a Style *"}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                      {styleOptions.map(({ name, svg }) => {
                        const selected = form.style === name;
                        const imgUrl = form.bathroom_type === "Full Bathroom"
                          ? findStructureImage(name, structures)
                          : null;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => set("style", name)}
                            className={`flex flex-col items-center rounded-xl border overflow-hidden transition ${
                              selected
                                ? "border-[#6E1020] bg-[#6E1020] text-white"
                                : "border-stone-200 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-700"
                            }`}
                          >
                            {imgUrl ? (
                              <div className="w-full relative" style={{ paddingTop: "66%" }}>
                                <Image
                                  src={imgUrl}
                                  alt={name}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                                  className={`object-cover transition-opacity ${selected ? "opacity-80" : "opacity-100"}`}
                                />
                                {selected && (
                                  <div className="absolute inset-0 bg-stone-900/30" />
                                )}
                              </div>
                            ) : (
                              <div className="w-16 h-12 my-3">{svg}</div>
                            )}
                            <span className={`text-xs font-medium leading-tight text-center py-2 px-1 ${selected ? "text-white" : "text-stone-700"}`}>
                              {name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.bathroom_type && (
                  <div>
                    <label className={labelCls}>
                      Existing Bathroom Photo
                      <span className="ml-1.5 text-stone-400 font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <div className="flex items-center gap-3 mb-3">
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
                                <div className="relative w-16 h-16 rounded-lg border border-stone-200 overflow-hidden">
                                  <Image src={form.image_file_data} alt="Preview" fill unoptimized sizes="64px" className="object-cover" />
                                </div>
                                <button type="button" onClick={() => set("image_file_data", "")} className="text-xs text-red-500 hover:text-red-700 transition">Remove</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <input type="url" className={inputCls} placeholder="https://example.com/my-bathroom.jpg"
                            value={form.image_url} onChange={(e) => set("image_url", e.target.value)} />
                        )}
                        <p className="text-xs text-stone-400">The AI will analyze your existing bathroom and redesign it — preserving room layout and structure.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </MagicCard>
            </section>
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(0)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button type="button" onClick={() => { if (canProceedFromStep(1)) navigateTo(2); }} disabled={!canProceedFromStep(1)} className={nextBtnCls}>
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Colors & Materials */}
        {currentStep === 2 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
              <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>3</span>
                <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Colors &amp; Materials</h2>
              </div>
              <BathroomColorMaterialsSection
                finishes={finishes}
                countertopColors={countertopColors}
                floorColors={floorColors}
                form={form}
                set={set}
              />
              </MagicCard>
            </section>
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

        {/* Step 3 — Budget */}
        {currentStep === 3 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
              <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>4</span>
                <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Budget Range</h2>
              </div>
              <div>
                <label className={labelCls}>Bathroom Style</label>
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
                      <span className={`text-sm font-semibold mb-0.5 ${form.budget_style === s.id ? "text-white" : "text-stone-900"}`}>{s.label}</span>
                      <span className={`text-xs ${form.budget_style === s.id ? "text-white/70" : "text-stone-400"}`}>{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              </MagicCard>
            </section>
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

        {/* Step 4 — Faucets */}
        {currentStep === 4 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
              <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>5</span>
                <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Faucets</h2>
              </div>

              <div className="space-y-6">
                {/* Vanity Faucets — shown for Full Bathroom + Vanity */}
                {form.bathroom_type !== "Shower Area" && (
                  <div>
                    <label className={labelCls}>Vanity Faucets</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                      {VANITY_FAUCET_STYLES.map(({ name, svg }) => {
                        const selected = form.faucet_style === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => set("faucet_style", name)}
                            className={`flex flex-col items-center rounded-xl border overflow-hidden transition ${
                              selected
                                ? "border-[#6E1020] bg-[#6E1020] text-white"
                                : "border-stone-200 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-700"
                            }`}
                          >
                            <div className="w-16 h-12 my-3">{svg}</div>
                            <span className={`text-xs font-medium leading-tight text-center py-2 px-1 ${selected ? "text-white" : "text-stone-700"}`}>
                              {name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shower Faucets — shown for Full Bathroom + Shower Area */}
                {form.bathroom_type !== "Vanity" && (
                  <div>
                    <label className={labelCls}>Shower Faucets</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                      {SHOWER_FAUCET_STYLES.map(({ name, svg }) => {
                        const selected = form.shower_faucet_style === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => set("shower_faucet_style", name)}
                            className={`flex flex-col items-center rounded-xl border overflow-hidden transition ${
                              selected
                                ? "border-[#6E1020] bg-[#6E1020] text-white"
                                : "border-stone-200 bg-white text-stone-400 hover:border-stone-400 hover:text-stone-700"
                            }`}
                          >
                            <div className="w-16 h-12 my-3">{svg}</div>
                            <span className={`text-xs font-medium leading-tight text-center py-2 px-1 ${selected ? "text-white" : "text-stone-700"}`}>
                              {name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Faucet Color — glossy metal-sphere swatches */}
                <div>
                  <label className={labelCls}>Faucet Color</label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {FAUCET_COLORS.map(({ name, gradient }) => {
                      const selected = form.faucet_color === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => set("faucet_color", name)}
                          className="flex flex-col items-center gap-1.5 group"
                          aria-pressed={selected}
                        >
                          <span
                            className={`block w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-inner transition-all ${
                              selected
                                ? "ring-2 ring-offset-2 ring-[#6E1020] scale-105"
                                : "ring-1 ring-black/10 group-hover:scale-105"
                            }`}
                            style={{ backgroundImage: gradient }}
                          />
                          <span className={`text-xs font-medium ${selected ? "text-[#6E1020]" : "text-stone-600"}`}>
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

        {/* Step 5 — Notes */}
        {currentStep === 5 && (
          <>
            <section className="form-section-card rounded-2xl overflow-hidden">
              <MagicCard gradientColor="#7D152825" gradientSize={280} className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>6</span>
                <h2 className="text-base font-semibold text-stone-800 tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Comments / Notes</h2>
              </div>
              <div className="mb-6">
                <label className={labelCls}>
                  Enhancements <span className="ml-1.5 text-stone-400 font-normal normal-case tracking-normal">(optional — select any that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ENHANCEMENT_OPTIONS.map((opt) => {
                    const selected = form.enhancements.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.desc}
                        onClick={() => toggleEnhancement(opt.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                          selected
                            ? "border-[#6E1020] bg-[#6E1020] text-white"
                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                        }`}
                      >
                        {opt.id}
                      </button>
                    );
                  })}
                </div>
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
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={() => navigateTo(4)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button type="button" onClick={() => navigateTo(6)} className={nextBtnCls}>
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* Step 6 — Generate */}
        {currentStep === 6 && (
          <>
            <div className="mb-5">
              <button type="button" onClick={() => navigateTo(5)} className={backBtnCls}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #3D0810 0%, #6E1020 45%, #7D1528 100%)" }}>
              {error && (
                <div className="mx-5 sm:mx-8 mt-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm">
                  {error}
                </div>
              )}
              <div className="px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Generate My Design
                </h3>
                <p className="text-white/70 text-sm mb-7 max-w-xs leading-relaxed">
                  Your personalized AI bathroom design, ready in seconds
                </p>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !form.name.trim() || !form.email.trim() || !isValidEmail(form.email) ||
                    !form.phone.trim() || !form.address.trim() ||
                    !form.bathroom_type || !form.style
                  }
                  className="w-full sm:w-auto px-10 py-4 rounded-full text-sm font-bold bg-white text-stone-900 hover:bg-stone-100 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  GENERATE MY DESIGN
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <div className="flex items-center flex-wrap justify-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-white/10 w-full">
                  <span className="flex items-center gap-1.5 text-xs text-white/70">Free to use</span>
                  <span className="flex items-center gap-1.5 text-xs text-white/70">AI-Powered</span>
                  <span className="flex items-center gap-1.5 text-xs text-white/70">No commitment</span>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
      </form>
      </>
      )}

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

      {/* Pending: blurred preview + OTP */}
      {result && resultState === "pending" && (
        <div id="design-result" className="mt-4">
          <div className="form-section-card rounded-2xl overflow-hidden relative">
            {result.image_url && (
              <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                <Image
                  src={result.image_url}
                  alt="Design preview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-cover"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ filter: "blur(1.5px)", userSelect: "none", pointerEvents: "none" }}
                />
                <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow">
                    <span className="text-sm font-semibold text-stone-800">Verify email to unlock</span>
                  </div>
                </div>
              </div>
            )}
            {!result.image_url && (
              <div className="px-5 pt-5 pb-3 flex items-start gap-3 border-b border-amber-100 bg-amber-50">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">Visual render unavailable.</span>{" "}
                  {result.render_error ? result.render_error : "The AI render could not be generated at this time."}{" "}
                  Your design concept and product recommendations are still ready — verify your email below to view them.
                </p>
              </div>
            )}
            <div className="p-5 sm:p-7 space-y-3" style={{ filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }}>
              <div className="h-5 bg-stone-200 rounded w-2/3" />
              <div className="h-4 bg-stone-100 rounded w-full" />
              <div className="h-4 bg-stone-100 rounded w-5/6" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
            </div>
          </div>

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
              <button type="button" onClick={sendOTP} disabled={otpSending} className="text-xs text-stone-400 hover:text-stone-600 transition underline underline-offset-2 shrink-0">
                {otpSending ? "Sending…" : "Resend code"}
              </button>
            </div>
            {otpError && <p className="mt-2 text-xs text-red-600">{otpError}</p>}
          </div>
        </div>
      )}

      {/* Verified: full design */}
      {result && resultState === "verified" && (
        <div id="design-result" className="mt-4 form-section-card rounded-2xl p-5 sm:p-8">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Your Design Concept
            </h2>
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-stone-600 text-sm hover:border-stone-400 hover:text-stone-900 transition">
              {copied ? "Copied!" : "Copy Summary"}
            </button>
          </div>

          <BathroomDesignResultBoard
            concept={result.concept}
            image_url={result.image_url}
            original_image_url={originalPhotoUrl}
            products={result.products}
            sales_summary={result.sales_summary}
            next_steps={result.next_steps}
            color_suggestions={result.color_suggestions}
            bathroom_type={result.bathroom_type}
            finishImageMap={finishImageMap}
            countertopImageMap={countertopImageMap}
            floorImageMap={floorImageMap}
            design_concept={result.design_concept}
            material_plan={result.material_plan}
            fixture_plan={result.fixture_plan}
            budget_logic={result.budget_logic}
            product_recommendations={result.product_recommendations}
            design_validation={result.design_validation}
          />

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
                <a href="/catalog" className="mt-2 inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-white transition" style={{ background: "linear-gradient(135deg, #6E1020 0%, #7D1528 100%)" }}>
                  Browse Collection
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
                    <p className="text-stone-500 text-xs">{form.bathroom_type} · {form.style}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-stone-200 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Products</p>
                    <p className="text-stone-700 font-medium">{result.products?.length || 0} items selected</p>
                    <p className="text-stone-500 text-xs">{result.products?.slice(0, 2).map(p => p.sku).join(", ")}{result.products?.length > 2 ? "…" : ""}</p>
                  </div>
                </div>
                {quoteError && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{quoteError}</div>
                )}
                <button
                  type="button"
                  onClick={handleQuoteSubmit}
                  disabled={quoteStatus === "submitting"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-rose-800 hover:bg-rose-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quoteStatus === "submitting" ? "Submitting…" : "Confirm & Request Quote"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabbed grid for Colors & Materials ────────────────────────────────────────
// ── Tab icons for the Colors & Materials section ──────────────────────────────
function BathroomTabIcon({ id, active }) {
  const cls = `w-4 h-4 shrink-0 ${active ? "text-rose-800" : "text-stone-400"}`;
  if (id === "vanity_finish")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M3 9V6a1 1 0 011-1h16a1 1 0 011 1v3M3 9v9a1 1 0 001 1h16a1 1 0 001-1V9M8 13h8" />
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

// ── Tabbed grid for Colors & Materials — mirrors KitchenDesignForm's ColorMaterialsSection ──
function BathroomColorMaterialsSection({ finishes, countertopColors, floorColors, form, set }) {
  const [activeTab, setActiveTab] = useState("vanity_finish");

  const TABS = [
    { id: "vanity_finish", label: "Vanity Finish", shortLabel: "Vanity", subtitle: "Select the perfect finish for your vanity cabinet", items: finishes },
    { id: "countertop",    label: "Countertop",    shortLabel: "Countertop", subtitle: "Choose your countertop material and color",         items: countertopColors },
    { id: "flooring",      label: "Flooring",      shortLabel: "Flooring",   subtitle: "Pick the perfect flooring finish",                   items: floorColors },
  ];

  const tab = TABS.find((t) => t.id === activeTab);
  const items = tab?.items || [];
  const value = form[activeTab];

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
            <BathroomTabIcon id={t.id} active={activeTab === t.id} />
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

        {/* ── Grid ── */}
        <div className="relative">
          <div className="flex flex-wrap gap-3">
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
                        <Image src={item.image_url} alt={item.name} fill sizes="110px" className="object-cover" />
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
        </div>
      </div>
    </div>
  );
}

// ── Wizard Stepper — mirrors KitchenDesignForm.jsx's WizardStepper ───────────
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
        @keyframes bwz-ring {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes bwz-check {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          65%  { transform: scale(1.2) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes bwz-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: 0.7; }
        }
        .bwz-circle {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: default;
        }
        .bwz-circle:hover { transform: scale(1.1); }
      `}</style>

      <div className="w-full overflow-x-auto pb-1 mb-7" ref={scrollContainerRef}>
        <div className="flex items-center justify-center min-w-max mx-auto px-2 py-3">
          {steps.map((step, i) => {
            const done   = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} className="flex items-center" ref={active ? activeStepRef : null}>
                <div className="flex flex-col items-center">
                  <div
                    className="bwz-circle relative rounded-full flex items-center justify-center"
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
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          border: "2px solid rgba(110,16,32,0.35)",
                          animation: "bwz-ring 1.8s ease-out infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {done ? (
                      <svg
                        className="w-5 h-5 text-white"
                        style={{ animation: "bwz-check 0.35s ease forwards" }}
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

                  <div className="h-2 flex items-center justify-center mt-1.5">
                    {active && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "#6E1020", animation: "bwz-dot 1.4s ease-in-out infinite" }}
                      />
                    )}
                  </div>
                </div>

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

// ── Wizard step icons (bathroom / AI design themed) ──────────────────────────

// Step 1 — Your Info: contact card
function BStepIconPerson() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Step 2 — Bathroom Type: bathtub / fixture
function BStepIconBathroom() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5M4.5 12V6.75A2.25 2.25 0 016.75 4.5h.75m0 0a1.5 1.5 0 013 0M4.5 12v6a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 18v-6" />
    </svg>
  );
}

// Step 3 — Colors & Materials: paint swatch / finish
function BStepIconPalette() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

// Step 4 — Budget Range: currency / wallet
function BStepIconTag() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Step 5 — Faucets: water droplet
function BStepIconFaucet() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c3 3.6 6 7.03 6 10.125a6 6 0 11-12 0c0-3.096 3-6.525 6-10.125z" />
    </svg>
  );
}

// Step 6 — Notes: pencil / edit
function BStepIconChat() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

// Step 7 — Generate: sparkle (AI design)
function BStepIconSparkle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}
