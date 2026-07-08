"use client";

import { useState, useCallback } from "react";
import usePlannerStore from "@/store/plannerStore";
import { selectProjectedItems } from "@/lib/planner/selectors";

/**
 * ProposalGenerator
 *
 * Multi-step flow:
 *  Step 1 — Contact form (Name, Phone, Email)
 *  Step 2 — OTP verification (6-digit code sent to email)
 *  Step 3 — Project details + Download
 *
 * On verified download: lead is stored in planner_leads via /api/planner/proposal.
 */
export default function ProposalGenerator({ primaryColor = "#1C1917" }) {
  const scene              = usePlannerStore((s) => s.scene);
  const layout             = usePlannerStore((s) => s.layout);
  const roomDimensions     = usePlannerStore((s) => s.roomDimensions);
  const upperCabinetColor  = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor  = usePlannerStore((s) => s.lowerCabinetColor);
  const selectedDoorStyle  = usePlannerStore((s) => s.selectedDoorStyle);
  const selectedHardware   = usePlannerStore((s) => s.selectedHardware);
  const selectedCountertop = usePlannerStore((s) => s.selectedCountertop);
  const selectedFlooring   = usePlannerStore((s) => s.selectedFlooring);
  const aiImageUrl         = usePlannerStore((s) => s.aiImageUrl);

  // Flow state
  const [open,          setOpen]          = useState(false);
  const [step,          setStep]          = useState(1); // 1=contact, 2=otp, 3=download

  // Step 1 — Contact info
  const [name,          setName]          = useState("");
  const [phone,         setPhone]         = useState("");
  const [email,         setEmail]         = useState("");

  // Step 2 — OTP
  const [otpDigits,     setOtpDigits]     = useState(["", "", "", "", "", ""]);
  const [verifyToken,   setVerifyToken]   = useState(null);
  const [sendLoading,   setSendLoading]   = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sendCooldown,  setSendCooldown]  = useState(0);

  // Step 3 — Project details
  const [projectName,   setProjectName]   = useState("My Kitchen Design");
  const [notes,         setNotes]         = useState("");
  const [dlLoading,     setDlLoading]     = useState(false);

  // Shared
  const [error,         setError]         = useState(null);

  const hasItems = scene.items.length > 0;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function reset() {
    setStep(1);
    setName(""); setPhone(""); setEmail("");
    setOtpDigits(["", "", "", "", "", ""]);
    setVerifyToken(null);
    setProjectName("My Kitchen Design"); setNotes("");
    setError(null);
    setSendCooldown(0);
  }

  function handleToggle() {
    if (open) { setOpen(false); reset(); }
    else       { setOpen(true); setError(null); }
  }

  // ─── Step 1 → Send OTP ──────────────────────────────────────────────────────

  const handleSendOTP = useCallback(async () => {
    setError(null);
    if (!name.trim())  return setError("Please enter your name.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address.");

    setSendLoading(true);
    try {
      const res  = await fetch("/api/planner/otp/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code.");

      setStep(2);
      setSendCooldown(60);
      const timer = setInterval(() => {
        setSendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendLoading(false);
    }
  }, [name, email]);

  // ─── Step 2 → Verify OTP ────────────────────────────────────────────────────

  const handleVerifyOTP = useCallback(async () => {
    setError(null);
    const code = otpDigits.join("").trim();
    if (code.length !== 6) return setError("Please enter the full 6-digit code.");

    setVerifyLoading(true);
    try {
      const res  = await fetch("/api/planner/otp/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email: email.trim(),
          otp:   code,
          name:  name.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Verification failed.");

      setVerifyToken(data.token);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  }, [otpDigits, email, name, phone]);

  // ─── Step 3 → Download PDF ──────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    setError(null);
    setDlLoading(true);
    try {
      const res = await fetch("/api/planner/proposal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifyToken,
          clientName:  name.trim()  || "Valued Client",
          clientEmail: email.trim(),
          clientPhone: phone.trim() || null,
          projectName: projectName.trim() || "Kitchen Design",
          layout,
          roomDimensions,
          items:             selectProjectedItems(scene),
          upperCabinetColor,
          lowerCabinetColor,
          selectedDoorStyle,
          selectedHardware,
          selectedCountertop,
          selectedFlooring,
          aiImageUrl,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate proposal.");

      const byteArr   = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
      const blob      = new Blob([byteArr], { type: "application/pdf" });
      const url       = URL.createObjectURL(blob);
      const anchor    = document.createElement("a");
      anchor.href     = url;
      anchor.download = data.filename || "Kitchen_Proposal.pdf";
      anchor.click();
      URL.revokeObjectURL(url);

      setTimeout(() => { setOpen(false); reset(); }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setDlLoading(false);
    }
  }, [
    verifyToken, name, email, phone, projectName, layout, roomDimensions,
    scene, upperCabinetColor, lowerCabinetColor, selectedDoorStyle, selectedHardware,
    selectedCountertop, selectedFlooring, aiImageUrl, notes,
  ]);

  // ─── OTP digit input helpers ─────────────────────────────────────────────────

  function handleOtpChange(idx, val) {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[idx]  = char;
    setOtpDigits(next);
    if (char && idx < 5) document.getElementById(`pg-otp-${idx + 1}`)?.focus();
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0)
      document.getElementById(`pg-otp-${idx - 1}`)?.focus();
    if (e.key === "Enter") handleVerifyOTP();
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setOtpDigits(next);
    const lastIdx = Math.min(pasted.length, 5);
    document.getElementById(`pg-otp-${lastIdx}`)?.focus();
  }

  // ─── Spinner icon ────────────────────────────────────────────────────────────

  const Spinner = () => (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  // ─── Field component ─────────────────────────────────────────────────────────

  function Field({ label, required, children }) {
    return (
      <div>
        <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
      </div>
    );
  }

  // ─── Step labels ─────────────────────────────────────────────────────────────

  const STEP_LABELS = ["Contact Info", "Verify Email", "Download"];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Trigger row */}
      <button
        onClick={handleToggle}
        disabled={!hasItems}
        className={[
          "w-full flex items-center gap-3 px-4 py-3 text-left transition",
          hasItems ? "hover:bg-stone-50" : "opacity-50 cursor-not-allowed",
        ].join(" ")}
        aria-expanded={open}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-white"
          style={{ backgroundColor: hasItems ? primaryColor : "#a8a29e" }}
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">Generate Proposal</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {hasItems ? "Download a professional PDF proposal" : "Place items first"}
          </p>
        </div>
        {hasItems && (
          <svg
            className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {/* Expanded body */}
      {open && hasItems && (
        <div className="border-t border-stone-100 bg-stone-50/50">

          {/* Progress bar + step label */}
          <div className="px-4 pt-3">
            <div className="flex gap-1 mb-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={[
                    "h-1 rounded-full flex-1 transition-all duration-300",
                    s < step  ? "bg-emerald-400" :
                    s === step ? "bg-stone-800"   : "bg-stone-200",
                  ].join(" ")}
                />
              ))}
            </div>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
              Step {step} of 3 — {STEP_LABELS[step - 1]}
            </p>
          </div>

          {/* ── Step 1: Contact form ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
              <Field label="Full Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555 000 0000"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
                />
              </Field>

              <Field label="Email Address" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  placeholder="e.g. jane@email.com"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
                />
                <p className="text-[10px] text-stone-400 mt-1">A 6-digit code will be sent to verify your email.</p>
              </Field>

              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
              )}

              <button
                onClick={handleSendOTP}
                disabled={sendLoading}
                className={[
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white transition-all",
                  sendLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 active:scale-95",
                ].join(" ")}
                style={{ backgroundColor: primaryColor }}
              >
                {sendLoading ? <><Spinner /> Sending code…</> : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Verification Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 2: OTP verification ──────────────────────────────────── */}
          {step === 2 && (
            <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-emerald-800 break-all">Code sent to {email}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Check inbox &amp; spam. Expires in 10 minutes.</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Enter 6-digit code
                </label>
                <div className="flex gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`pg-otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="flex-1 min-w-0 h-11 text-center text-base font-bold rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-stone-900 transition"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={verifyLoading || otpDigits.join("").length < 6}
                className={[
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white transition-all",
                  (verifyLoading || otpDigits.join("").length < 6)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90 active:scale-95",
                ].join(" ")}
                style={{ backgroundColor: primaryColor }}
              >
                {verifyLoading ? <><Spinner /> Verifying…</> : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify Code
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  onClick={() => { setStep(1); setError(null); setOtpDigits(["","","","","",""]); }}
                  className="text-[11px] text-stone-400 hover:text-stone-600 transition"
                >
                  ← Change email
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={sendCooldown > 0 || sendLoading}
                  className={[
                    "text-[11px] transition",
                    sendCooldown > 0 ? "text-stone-300 cursor-not-allowed" : "text-stone-500 hover:text-stone-700",
                  ].join(" ")}
                >
                  {sendCooldown > 0 ? `Resend in ${sendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Project details + Download ───────────────────────── */}
          {step === 3 && (
            <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <p className="text-xs font-semibold text-emerald-700 truncate">{email} — verified</p>
              </div>

              <Field label="Project Name">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Main Kitchen Renovation"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300"
                />
              </Field>

              <Field label="Design Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes for the proposal…"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300 resize-none"
                />
              </Field>

              {aiImageUrl && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  AI kitchen visualization will be included in the proposal.
                </p>
              )}

              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
              )}

              <button
                onClick={handleDownload}
                disabled={dlLoading}
                className={[
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white transition-all",
                  dlLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 active:scale-95",
                ].join(" ")}
                style={{ backgroundColor: primaryColor }}
              >
                {dlLoading ? <><Spinner /> Generating PDF…</> : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Proposal PDF
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
