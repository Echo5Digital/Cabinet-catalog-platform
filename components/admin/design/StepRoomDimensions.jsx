"use client";
import { useState } from "react";

const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
const labelCls = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";
const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6E1020] hover:bg-[#7D1528] text-white transition disabled:opacity-50 disabled:cursor-not-allowed";

function isValidDim(v) {
  const n = parseFloat(v);
  return !isNaN(n) && n >= 4 && n <= 100;
}

export default function StepRoomDimensions({ formData, onChange, onNext, onBack }) {
  const [touched, setTouched] = useState({});
  const touch = (field) => setTouched((p) => ({ ...p, [field]: true }));

  const widthOk  = isValidDim(formData.roomWidth);
  const depthOk  = isValidDim(formData.roomDepth);
  const heightOk = isValidDim(formData.roomHeight);
  const canNext  = widthOk && depthOk && heightOk;

  function handleNext() {
    setTouched({ roomWidth: true, roomDepth: true, roomHeight: true });
    if (canNext) onNext();
  }

  const dims = [
    { label: "Width (ft)", key: "roomWidth",  placeholder: "12" },
    { label: "Depth (ft)", key: "roomDepth",  placeholder: "14" },
    { label: "Ceiling Height (ft)", key: "roomHeight", placeholder: "9" },
  ];

  return (
    <>
      <section className="form-section-card rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#6E1020" }}
            >
              2
            </span>
            <h2
              className="text-base font-semibold text-stone-800 tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Room Dimensions
            </h2>
          </div>

          <p className="text-sm text-stone-500 mb-5">
            The AI will use these measurements to generate a proportional floor plan and kitchen render.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {dims.map(({ label, key, placeholder }) => {
              const invalid = touched[key] && !isValidDim(formData[key]);
              return (
                <div key={key}>
                  <label className={labelCls}>{label} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="4"
                    max="100"
                    step="0.5"
                    value={formData[key]}
                    onChange={(e) => onChange(key, e.target.value)}
                    onBlur={() => touch(key)}
                    placeholder={placeholder}
                    className={`${inputCls} ${invalid ? "border-red-400 focus:ring-red-300" : ""}`}
                  />
                  {invalid && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      Must be 4–100 ft
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label className={labelCls}>Style Notes</label>
            <textarea
              value={formData.styleNotes}
              onChange={(e) => onChange("styleNotes", e.target.value)}
              placeholder="e.g. Modern white shaker cabinets, dark countertops, open shelving on left wall…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-stone-400 mt-1.5">
              Optional. Describe the style, cabinet type, or any special features for this design.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between mt-5">
        <button onClick={onBack} className={backBtnCls}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <button onClick={handleNext} disabled={!canNext} className={nextBtnCls}>
          Generate Design
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </>
  );
}
