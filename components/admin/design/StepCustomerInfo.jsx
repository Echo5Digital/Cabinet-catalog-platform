"use client";
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 shadow-sm placeholder:text-stone-400 transition";
const labelCls = "block text-xs font-semibold text-[#111827] mb-1.5 uppercase tracking-wide";
const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white !text-white transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function StepCustomerInfo({ formData, onChange, onNext }) {
  const [touched, setTouched] = useState({});

  const touch = (field) => setTouched((p) => ({ ...p, [field]: true }));

  const nameValid  = formData.customerName.trim().length > 0;
  const emailValid = EMAIL_RE.test(formData.customerEmail.trim());
  const canNext    = nameValid && emailValid;

  function handleNext() {
    setTouched({ customerName: true, customerEmail: true });
    if (canNext) onNext();
  }

  return (
    <>
      <section className="form-section-card-admin rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header-admin flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#4F46E5" }}
            >
              1
            </span>
            <h2
              className="text-base font-semibold text-stone-800 tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Customer Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => onChange("customerName", e.target.value)}
                onBlur={() => touch("customerName")}
                placeholder="Jane Smith"
                className={`${inputCls} ${touched.customerName && !nameValid ? "border-red-400 focus:ring-red-300" : ""}`}
              />
              {touched.customerName && !nameValid && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Name is required
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => onChange("customerEmail", e.target.value)}
                onBlur={() => touch("customerEmail")}
                placeholder="jane@example.com"
                className={`${inputCls} ${touched.customerEmail && !emailValid ? "border-red-400 focus:ring-red-300" : ""}`}
              />
              {touched.customerEmail && !emailValid && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {!formData.customerEmail.trim() ? "Email is required" : "Enter a valid email address"}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end mt-5">
        <button onClick={handleNext} disabled={!canNext} className={nextBtnCls}>
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </>
  );
}
