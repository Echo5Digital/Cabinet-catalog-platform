"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import StepCustomerInfo    from "./StepCustomerInfo";
import StepRoomDimensions  from "./StepRoomDimensions";
import StepProjectDetails  from "./StepProjectDetails";
import StepDesignStyle     from "./StepDesignStyle";
import StepGenerate        from "./StepGenerate";
import StepQuoteBuilder    from "./StepQuoteBuilder";

const STEPS = [
  { label: "Customer",   num: 1 },
  { label: "Dimensions", num: 2 },
  { label: "Project",    num: 3 },
  { label: "Style",      num: 4 },
  { label: "Generate",   num: 5 },
  { label: "Quote",      num: 6 },
];

const INITIAL_FORM = {
  // Step 1 — Customer
  customerName:    "",
  customerEmail:   "",
  // Step 2 — Dimensions
  roomWidth:       "",
  roomDepth:       "",
  roomHeight:      "",
  styleNotes:      "",
  // Step 3 — Project Details
  projectType:     "",
  layout:          "",
  imageStatus:     "No",
  imageUrl:        "",
  // Step 4 — Design Style
  cabinetStyle:    "",
  upperColor:      "",
  lowerColor:      "",
  countertop:      "",
  flooring:        "",
  budgetStyle:     "",
  hoodStyle:       "",
  hardware:        "",
  applianceColor:  "",
  designComments:  "",
  // Step 5 — Generate
  svgFloorPlan:      "",
  designImageUrl:    "",
  floorPlanProducts: [],
  // Step 6 — Quote
  quoteItems:      [],
  quoteNotes:      "",
  taxRate:         "8",
};

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center shrink-0">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "text-white"
                    : active
                    ? "text-white ring-4 ring-offset-2"
                    : "text-stone-400 border-2 border-stone-200 bg-white"
                }`}
                style={
                  done
                    ? { background: "#6E1020" }
                    : active
                    ? { background: "#6E1020", ringColor: "rgba(110,16,32,0.2)" }
                    : {}
                }
              >
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
                  active ? "text-[#6E1020]" : done ? "text-stone-400" : "text-stone-300"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className="h-px w-8 sm:w-12 mx-1 mb-5 shrink-0 transition-all"
                style={{ background: i < current ? "#6E1020" : "#e7e5e4" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DesignWizard() {
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit") || null;

  const [currentStep, setCurrentStep] = useState(0);
  const [formData,    setFormData]    = useState(INITIAL_FORM);
  const [notify,      setNotify]      = useState(null);
  const [hydrating,   setHydrating]   = useState(!!editId);

  // Auto-dismiss toast
  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(null), 3000);
    return () => clearTimeout(t);
  }, [notify]);

  // Edit mode: hydrate from DB
  useEffect(() => {
    if (!editId) return;
    async function load() {
      try {
        const res = await fetch(`/api/design-quotes/${editId}`);
        if (!res.ok) throw new Error("Failed to load quote");
        const { quote } = await res.json();
        const p = quote.design_params || {};
        setFormData({
          customerName:    quote.customer_name    || "",
          customerEmail:   quote.customer_email   || "",
          roomWidth:       String(quote.room_width  || ""),
          roomDepth:       String(quote.room_depth  || ""),
          roomHeight:      String(quote.room_height || ""),
          styleNotes:      quote.style_notes      || "",
          projectType:     p.projectType     || "",
          layout:          p.layout          || "",
          imageStatus:     p.imageStatus     || "No",
          imageUrl:        p.imageUrl        || "",
          cabinetStyle:    p.cabinetStyle    || "",
          upperColor:      p.upperColor      || "",
          lowerColor:      p.lowerColor      || "",
          countertop:      p.countertop      || "",
          flooring:        p.flooring        || "",
          budgetStyle:     p.budgetStyle     || "",
          hoodStyle:       p.hoodStyle       || "",
          hardware:        p.hardware        || "",
          applianceColor:  p.applianceColor  || "",
          designComments:  p.designComments  || "",
          svgFloorPlan:      quote.svg_floor_plan    || "",
          designImageUrl:    quote.design_image_url  || "",
          floorPlanProducts: Array.isArray(p.floorPlanProducts) ? p.floorPlanProducts : [],
          quoteItems:        Array.isArray(quote.quote_items) ? quote.quote_items : [],
          quoteNotes:      quote.quote_notes      || "",
          taxRate:         String(quote.tax_rate  ?? "8"),
        });
      } catch {
        setNotify({ type: "error", message: "Failed to load design. Starting fresh." });
      } finally {
        setHydrating(false);
      }
    }
    load();
  }, [editId]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (hydrating) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500 text-sm">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading design…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8F6F3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#6E1020]/60 uppercase tracking-widest mb-1">
            Admin · Design Studio
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {editId ? "Edit Design Quote" : "New Kitchen Design"}
          </h1>
          <p className="text-sm text-stone-500 mt-1.5">
            Generate an AI kitchen design and build an itemized quote for your customer.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={currentStep} />

        {/* Step content */}
        <div>
          {currentStep === 0 && (
            <StepCustomerInfo
              formData={formData}
              onChange={handleChange}
              onNext={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 1 && (
            <StepRoomDimensions
              formData={formData}
              onChange={handleChange}
              onNext={() => setCurrentStep(2)}
              onBack={() => setCurrentStep(0)}
            />
          )}
          {currentStep === 2 && (
            <StepProjectDetails
              formData={formData}
              onChange={handleChange}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <StepDesignStyle
              formData={formData}
              onChange={handleChange}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 4 && (
            <StepGenerate
              formData={formData}
              onChange={handleChange}
              onNext={() => setCurrentStep(5)}
              onBack={() => setCurrentStep(3)}
            />
          )}
          {currentStep === 5 && (
            <StepQuoteBuilder
              formData={formData}
              onChange={handleChange}
              onBack={() => setCurrentStep(4)}
              editId={editId}
              setNotify={setNotify}
            />
          )}
        </div>
      </div>

      {/* Toast notification */}
      {notify && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold max-w-xs border ${
            notify.type === "success"
              ? "bg-white text-[#3D0810] border-[rgba(110,16,32,0.2)]"
              : "bg-white text-red-700 border-red-200"
          }`}
        >
          {notify.type === "success" ? (
            <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#6E1020" }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          {notify.message}
        </div>
      )}
    </div>
  );
}
