"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import usePlannerStore from "@/store/plannerStore";
import { COMMANDS } from "@/lib/planner/engine/SpatialEngine";
import ViewModeToggle from "./ViewModeToggle";

// Dynamically import both canvases to avoid SSR issues (same pattern as PlannerShell)
const PlannerCanvas  = dynamic(() => import("./PlannerCanvas"),     { ssr: false });
const PlannerScene3D = dynamic(() => import("./3d/PlannerScene3D"), { ssr: false });

const ADMIN_ACCENT = "#4F46E5"; // indigo-600, matches the admin dashboard theme

/**
 * PlannerDesignViewer — read-only rendering of a saved planner_leads design
 * snapshot, styled to match the admin dashboard (indigo/gray), not the
 * burgundy/stone customer-facing planner theme.
 *
 * Hydrates the shared Zustand planner store (same store the live /planner
 * editor uses) from the lead's stored layout/scene/style fields, then
 * renders the same canvases in a non-editable shell. Also offers an
 * "AI Render" tab when the lead has a generated visualization image.
 *
 * Used by /admin/planner/[id] so staff can re-open exactly what a customer
 * designed when they submitted a "Save and Get Quote" request.
 */
export default function PlannerDesignViewer({ lead }) {
  const applyCommand   = usePlannerStore((s) => s.applyCommand);
  const setLayout      = usePlannerStore((s) => s.setLayout);
  const setCabinetStyle = usePlannerStore((s) => s.setCabinetStyle);
  const setDimensions  = usePlannerStore((s) => s.setDimensions);
  const setCatalogProducts = usePlannerStore((s) => s.setCatalogProducts);
  const setUpperCabinetColor   = usePlannerStore((s) => s.setUpperCabinetColor);
  const setLowerCabinetColor   = usePlannerStore((s) => s.setLowerCabinetColor);
  const setSelectedDoorStyle   = usePlannerStore((s) => s.setSelectedDoorStyle);
  const setSelectedDrawerStyle = usePlannerStore((s) => s.setSelectedDrawerStyle);
  const setSelectedHardware    = usePlannerStore((s) => s.setSelectedHardware);
  const setSelectedCountertop  = usePlannerStore((s) => s.setSelectedCountertop);
  const setSelectedFlooring    = usePlannerStore((s) => s.setSelectedFlooring);
  const clearDoorWindows       = usePlannerStore((s) => s.clearDoorWindows);
  const addDoorWindow          = usePlannerStore((s) => s.addDoorWindow);
  const viewMode = usePlannerStore((s) => s.viewMode);
  const setViewMode = usePlannerStore((s) => s.setViewMode);

  const hasAiImage = typeof lead.ai_image_url === "string" && lead.ai_image_url.length > 0;
  // "scene" (2D/3D live view) or "ai" (generated render)
  const [tab, setTab] = useState("scene");

  // Hydrate the store once with this lead's saved design snapshot.
  useEffect(() => {
    setCatalogProducts([]); // viewer doesn't need the live catalog
    if (lead.layout)        setLayout(lead.layout);
    if (lead.cabinet_style) setCabinetStyle(lead.cabinet_style);
    setDimensions({
      width:  lead.room_width  || 14,
      length: lead.room_length || 11,
      height: lead.room_height || 9,
    });

    const settings = lead.settings_json || {};
    if (settings.upperCabinetColor)   setUpperCabinetColor(settings.upperCabinetColor);
    if (settings.lowerCabinetColor)   setLowerCabinetColor(settings.lowerCabinetColor);
    if (settings.selectedDoorStyle)   setSelectedDoorStyle(settings.selectedDoorStyle);
    if (settings.selectedDrawerStyle) setSelectedDrawerStyle(settings.selectedDrawerStyle);
    if (settings.selectedHardware)    setSelectedHardware(settings.selectedHardware);
    if (settings.selectedCountertop)  setSelectedCountertop(settings.selectedCountertop);
    if (settings.selectedFlooring)    setSelectedFlooring(settings.selectedFlooring);

    clearDoorWindows();
    if (Array.isArray(lead.door_windows_json)) {
      lead.door_windows_json.forEach((dw) => addDoorWindow(dw));
    }

    if (lead.scene_json) {
      applyCommand({
        type:  COMMANDS.SET_ITEMS,
        items: lead.scene_json.items ?? [],
        zones: lead.scene_json.zones ?? [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-2.5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Read-only
          </span>
          <p className="text-xs text-gray-500 truncate">
            {lead.layout || "Custom"} · {lead.room_width || "?"}ft × {lead.room_length || "?"}ft
          </p>

          {/* Scene / AI Render tabs — only shown when an AI render exists */}
          {hasAiImage && (
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-gray-100 border border-gray-200 ml-1">
              {[
                { key: "scene", label: "2D / 3D" },
                { key: "ai",    label: "AI Render" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={[
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150",
                    tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700",
                  ].join(" ")}
                  aria-pressed={tab === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "scene" && <ViewModeToggle primaryColor={ADMIN_ACCENT} />}
      </div>

      {/* Content area — fills all remaining height. flex + min-h-0 so PlannerScene3D's
          own flex-1 can actually expand to fill it (Canvas/Konva both need a definite
          pixel height from their parent chain, not just CSS min-height). */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden bg-gray-100">
        {tab === "ai" && hasAiImage ? (
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <div className="relative w-full h-full">
              <Image
                src={lead.ai_image_url}
                alt="AI-generated kitchen visualization"
                fill
                sizes="100vw"
                className="object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        ) : viewMode === "3D" ? (
          <PlannerScene3D primaryColor={ADMIN_ACCENT} />
        ) : (
          <PlannerCanvas onDropRef={{ current: null }} />
        )}
      </div>
    </div>
  );
}
