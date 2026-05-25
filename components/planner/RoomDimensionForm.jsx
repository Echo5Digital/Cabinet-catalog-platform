"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";

const FIELD_LIMITS = {
  width:  { min: 4, max: 50, label: "Room Width",         hint: "Typical kitchens: 8–20 ft" },
  length: { min: 4, max: 50, label: "Room Length",        hint: "Typical kitchens: 8–20 ft" },
  height: { min: 7, max: 20, label: "Ceiling Height",     hint: "Optional — default 9 ft"    },
};

function DimensionInput({ field, value, onChange, error }) {
  const { label, hint, min, max } = FIELD_LIMITS[field];
  const isOptional = field === "height";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`dim-${field}`} className="text-sm font-medium text-stone-700">
        {label}
        {isOptional && <span className="ml-1.5 text-xs text-stone-400 font-normal">(optional)</span>}
      </label>

      <div className="relative">
        <input
          id={`dim-${field}`}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step="0.5"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={field === "height" ? "9" : ""}
          className={[
            "w-full rounded-xl border px-4 py-3 pr-12 text-sm text-stone-900 bg-white outline-none transition",
            "placeholder:text-stone-300",
            error
              ? "border-red-300 focus:ring-2 focus:ring-red-200"
              : "border-stone-200 hover:border-stone-300 dim-input",
          ].join(" ")}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 pointer-events-none">
          ft
        </span>
      </div>

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <p className="text-xs text-stone-400">{hint}</p>
      )}
    </div>
  );
}

export default function RoomDimensionForm({ primaryColor = "#1C1917" }) {
  const layout       = usePlannerStore((s) => s.layout);
  const dims         = usePlannerStore((s) => s.roomDimensions);
  const setDimensions = usePlannerStore((s) => s.setDimensions);
  const setStep      = usePlannerStore((s) => s.setStep);

  const [values, setValues] = useState({
    width:  String(dims.width),
    length: String(dims.length),
    height: String(dims.height),
  });
  const [errors, setErrors] = useState({});

  function handleChange(field, raw) {
    setValues((v) => ({ ...v, [field]: raw }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const newErrors = {};
    const { min: wMin, max: wMax } = FIELD_LIMITS.width;
    const { min: lMin, max: lMax } = FIELD_LIMITS.length;
    const { min: hMin, max: hMax } = FIELD_LIMITS.height;

    const w = parseFloat(values.width);
    const l = parseFloat(values.length);
    const h = values.height ? parseFloat(values.height) : 9;

    if (!values.width || isNaN(w) || w < wMin || w > wMax) {
      newErrors.width = `Enter a value between ${wMin} and ${wMax} ft`;
    }
    if (!values.length || isNaN(l) || l < lMin || l > lMax) {
      newErrors.length = `Enter a value between ${lMin} and ${lMax} ft`;
    }
    if (values.height && (isNaN(h) || h < hMin || h > hMax)) {
      newErrors.height = `Enter a value between ${hMin} and ${hMax} ft`;
    }

    return newErrors;
  }

  function handleContinue() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setDimensions({
      width:  parseFloat(values.width),
      length: parseFloat(values.length),
      height: values.height ? parseFloat(values.height) : 9,
    });
    setStep(3);
  }

  return (
    <>
    <style>{`
      .dim-input:focus {
        border-color: ${primaryColor};
        box-shadow: 0 0 0 3px ${primaryColor}18;
        outline: none;
      }
    `}</style>
    <div className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-76px)] bg-[#FAFAF9] flex flex-col">
      {/* Hero */}
      <div
        className="py-10 sm:py-14 px-4 text-center"
        style={{ background: "linear-gradient(160deg, #1c1917 0%, #292524 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-stone-300 bg-white/10 ring-1 ring-white/20 mb-4">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
            </svg>
            Kitchen Planner — Step 2 of 3
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Enter Room Dimensions
          </h1>
          <p className="text-stone-400 text-base max-w-lg mx-auto">
            Tell us how big your kitchen is so we can set up the correct canvas scale.
          </p>
          {layout && (
            <p className="mt-3 text-stone-500 text-sm">
              Layout: <span className="text-stone-300 font-medium">{layout}</span>
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">

            {/* Visual diagram */}
            <div className="mb-6 flex justify-center">
              <div className="relative w-48 h-32 border-2 rounded-lg bg-stone-50 flex items-center justify-center" style={{ borderColor: `${primaryColor}55` }}>
                {/* Width arrow */}
                <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-center gap-1">
                  <div className="h-px flex-1 bg-stone-400" />
                  <span className="text-xs text-stone-500 font-medium px-1">Width</span>
                  <div className="h-px flex-1 bg-stone-400" />
                </div>
                {/* Length arrow */}
                <div className="absolute -right-6 top-0 bottom-0 flex flex-col items-center justify-center gap-1">
                  <div className="w-px flex-1 bg-stone-400" />
                  <span className="text-xs text-stone-500 font-medium px-1" style={{ writingMode: "vertical-rl" }}>Length</span>
                  <div className="w-px flex-1 bg-stone-400" />
                </div>
                <span className="text-xs text-stone-400 italic">Your room</span>
              </div>
            </div>

            <div className="space-y-5">
              <DimensionInput field="width"  value={values.width}  onChange={handleChange} error={errors.width}  />
              <DimensionInput field="length" value={values.length} onChange={handleChange} error={errors.length} />
              <DimensionInput field="height" value={values.height} onChange={handleChange} error={errors.height} />
            </div>

            {/* Example */}
            <div className="mt-5 p-3 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-xs text-stone-500">
                <span className="font-medium text-stone-600">Example:</span> Width 14 ft, Length 11 ft, Height 9 ft
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <button
              onClick={handleContinue}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Start Designing
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
