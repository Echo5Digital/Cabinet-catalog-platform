"use client";
import { useEffect, useState, useCallback } from "react";
import ZoomPanel from "./ZoomPanel";

const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white !text-white transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function StepGenerate({ formData, onChange, onNext, onBack }) {
  const [floorLoading,  setFloorLoading]  = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [floorError,    setFloorError]    = useState("");
  const [renderError,   setRenderError]   = useState("");

  const fetchFloorPlan = useCallback(async () => {
    setFloorLoading(true);
    setFloorError("");
    try {
      const res = await fetch("/api/ai/floor-plan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          width:         formData.roomWidth,
          depth:         formData.roomDepth,
          height:        formData.roomHeight,
          styleNotes:    formData.styleNotes,
          cabinet_style: formData.cabinetStyle || "",
          layout:        formData.layout || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.svg) throw new Error(data.error || "Failed to generate floor plan");
      onChange("svgFloorPlan", data.svg);
      onChange("floorPlanProducts", data.product_selections || []);
    } catch (e) {
      setFloorError(e.message);
    } finally {
      setFloorLoading(false);
    }
  }, [formData.roomWidth, formData.roomDepth, formData.roomHeight, formData.styleNotes, formData.cabinetStyle, formData.layout, onChange]);

  const fetchRender = useCallback(async () => {
    setRenderLoading(true);
    setRenderError("");
    try {
      const res = await fetch("/api/ai/kitchen-design", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:            formData.customerName    || "",
          email:           formData.customerEmail   || "",
          project_type:    formData.projectType     || "New Kitchen",
          layout:          formData.layout          || "",
          cabinet_style:   formData.cabinetStyle    || "",
          upper_color:     formData.upperColor       || "",
          lower_color:     formData.lowerColor       || "",
          countertop:      formData.countertop       || "",
          flooring:        formData.flooring         || "",
          budget_style:    formData.budgetStyle      || "",
          hood_style:      formData.hoodStyle        || "",
          hardware:        formData.hardware         || "",
          appliance_color: formData.applianceColor   || "",
          design_comments: formData.designComments   || formData.styleNotes || "",
          room_width:      formData.roomWidth,
          room_length:     formData.roomDepth,
          ceiling_height:  formData.roomHeight,
          image_status:    formData.imageStatus      || "No",
          image_url:       formData.imageUrl         || "",
        }),
      });
      const data = await res.json();
      // Hard errors (non-2xx): surface the error message and stop
      if (!res.ok) throw new Error(data.error || "Failed to generate kitchen render");
      if (data.image_url) {
        onChange("designImageUrl", data.image_url);
      } else {
        // Image generation failed (non-fatal for the admin — floor plan is still usable)
        setRenderError(data.render_error || data.error || "Kitchen render generation failed. You can retry or continue to the quote step.");
      }
    } catch (e) {
      setRenderError(e.message);
    } finally {
      setRenderLoading(false);
    }
  }, [formData.customerName, formData.customerEmail, formData.projectType, formData.layout, formData.cabinetStyle, formData.upperColor, formData.lowerColor, formData.countertop, formData.flooring, formData.budgetStyle, formData.hoodStyle, formData.hardware, formData.applianceColor, formData.designComments, formData.styleNotes, formData.roomWidth, formData.roomDepth, formData.roomHeight, formData.imageStatus, formData.imageUrl, onChange]);

  useEffect(() => {
    if (!formData.svgFloorPlan) fetchFloorPlan();
    if (!formData.designImageUrl) fetchRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Floor plan is required; render is optional (can fail/be skipped and still proceed)
  const floorReady = !!formData.svgFloorPlan;
  const anyLoading = floorLoading || renderLoading;

  return (
    <>
      <section className="form-section-card-admin rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header-admin flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#4F46E5" }}
            >
              5
            </span>
            <h2
              className="text-base font-semibold text-stone-800 tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              AI-Generated Design
            </h2>
          </div>

          <p className="text-sm text-stone-500 mb-6">
            Your floor plan and kitchen render have been generated from the room dimensions.
            Use zoom controls to inspect, or regenerate either panel.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ZoomPanel label="Floor Plan" onRegenerate={fetchFloorPlan} loading={floorLoading}>
              {floorError ? (
                <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">{floorError}</div>
              ) : formData.svgFloorPlan ? (
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{
                    __html: formData.svgFloorPlan.startsWith("<svg") ? formData.svgFloorPlan : "",
                  }}
                />
              ) : null}
            </ZoomPanel>

            {Array.isArray(formData.floorPlanProducts) && formData.floorPlanProducts.length > 0 && (
              <p className="mt-2 text-xs text-stone-500 px-1 col-span-full xl:col-span-1">
                <span className="font-semibold text-[#4F46E5]">{formData.floorPlanProducts.length}</span>{" "}
                product{formData.floorPlanProducts.length !== 1 ? "s" : ""} suggested — review in the Quote step.
              </p>
            )}

            <ZoomPanel label="Kitchen Render" onRegenerate={fetchRender} loading={renderLoading}>
              {renderError ? (
                <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">{renderError}</div>
              ) : formData.designImageUrl ? (
                <img
                  src={formData.designImageUrl}
                  alt="AI kitchen render"
                  className="w-full h-auto rounded"
                />
              ) : null}
            </ZoomPanel>
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
        <button onClick={onNext} disabled={!floorReady || anyLoading} className={nextBtnCls}>
          {anyLoading ? "Generating…" : "Continue to Quote"}
          {!anyLoading && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
