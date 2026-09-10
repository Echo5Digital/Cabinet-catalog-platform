"use client";

import { useState, useCallback } from "react";
import usePlannerStore from "@/store/plannerStore";
import { selectProjectedItems } from "@/lib/planner/selectors";

// Defined outside the component so it has a stable identity across renders —
// otherwise every keystroke (which re-renders SaveQuoteModal) would remount
// the input and drop focus after a single character.
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * SaveQuoteModal — confirmation dialog opened by the "Save and Get Quote"
 * button in Step 3 of the planner.
 *
 * Name, Email, Phone, Address were already collected on Step 1 and are
 * shown here read-only (auto-filled from the store). Only Project Name and
 * Notes are editable here. Submitting saves the contact details together
 * with a full snapshot of the current 2D/3D design to planner_leads via
 * /api/planner/save-quote. The saved design becomes viewable from the
 * admin Planner Leads dashboard.
 */
export default function SaveQuoteModal({ onClose, primaryColor = "#1C1917" }) {
  const customerName       = usePlannerStore((s) => s.customerName);
  const customerEmail      = usePlannerStore((s) => s.customerEmail);
  const customerPhone      = usePlannerStore((s) => s.customerPhone);
  const customerAddress    = usePlannerStore((s) => s.customerAddress);
  const layout             = usePlannerStore((s) => s.layout);
  const cabinetStyle       = usePlannerStore((s) => s.cabinetStyle);
  const roomDimensions     = usePlannerStore((s) => s.roomDimensions);
  const scene              = usePlannerStore((s) => s.scene);
  const doorWindows        = usePlannerStore((s) => s.doorWindows);
  const upperCabinetColor  = usePlannerStore((s) => s.upperCabinetColor);
  const lowerCabinetColor  = usePlannerStore((s) => s.lowerCabinetColor);
  const selectedDoorStyle  = usePlannerStore((s) => s.selectedDoorStyle);
  const selectedDrawerStyle = usePlannerStore((s) => s.selectedDrawerStyle);
  const selectedHardware   = usePlannerStore((s) => s.selectedHardware);
  const selectedCountertop = usePlannerStore((s) => s.selectedCountertop);
  const selectedFlooring   = usePlannerStore((s) => s.selectedFlooring);
  const aiImageUrl         = usePlannerStore((s) => s.aiImageUrl);

  const [projectName, setProjectName] = useState("My Kitchen Design");
  const [notes,       setNotes]       = useState("");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const [done,   setDone]   = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/planner/save-quote", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:  customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
          projectName: projectName.trim() || "My Kitchen Design",
          notes,
          layout,
          cabinetStyle,
          roomDimensions,
          scene,
          doorWindows,
          items: selectProjectedItems(scene),
          upperCabinetColor,
          lowerCabinetColor,
          selectedDoorStyle,
          selectedDrawerStyle,
          selectedHardware,
          selectedCountertop,
          selectedFlooring,
          aiImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save your design.");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [
    customerName, customerEmail, customerPhone, customerAddress, projectName, notes,
    layout, cabinetStyle, roomDimensions, scene, doorWindows,
    upperCabinetColor, lowerCabinetColor, selectedDoorStyle, selectedDrawerStyle,
    selectedHardware, selectedCountertop, selectedFlooring, aiImageUrl,
  ]);

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={saving ? undefined : onClose}>
        {/* Dialog */}
        <div
          className="w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 leading-tight">Save and Get Quote</p>
                <p className="text-xs text-stone-400 mt-0.5">We&apos;ll save your design and follow up</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition shrink-0 disabled:opacity-40"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          {done ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-base font-semibold text-stone-900">Your design has been saved!</p>
              <p className="text-sm text-stone-500 max-w-xs">
                Our team will review your kitchen design and reach out to you shortly with a quote.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
              {/* Read-only contact info — collected on Step 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-100">
                {[
                  { label: "Name",    value: customerName    },
                  { label: "Email",   value: customerEmail   },
                  { label: "Phone",   value: customerPhone   },
                  { label: "Address", value: customerAddress },
                ].map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-stone-800 font-medium truncate">{value || "—"}</p>
                  </div>
                ))}
              </div>

              <Field label="Project Name">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Main Kitchen Renovation"
                  className={inputClass}
                  autoFocus
                />
              </Field>

              <Field label="Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything else we should know…"
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className={[
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all mt-1",
                  saving ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 active:scale-95",
                ].join(" ")}
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  "Save and Get Quote"
                )}
              </button>
              <p className="text-[10px] text-stone-400 text-center -mt-1">
                By submitting, you agree to be contacted about your kitchen project.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
