"use client";
import { useState, useRef } from "react";

const PROJECT_TYPES = [
  "New Kitchen",
  "Remodel Existing Kitchen",
  "Replace Cabinets Only",
  "Countertop Only",
  "Full Design + Quote",
];

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

const selectCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 shadow-sm placeholder:text-stone-400 transition cursor-pointer";
const inputCls  = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 shadow-sm placeholder:text-stone-400 transition";
const labelCls  = "block text-xs font-semibold text-[#111827] mb-1.5 uppercase tracking-wide";
const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white !text-white transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function StepProjectDetails({ formData, onChange, onNext, onBack }) {
  const photoRequired = PHOTO_REQUIRED_TYPES.includes(formData.projectType);
  const hasPhoto = !!formData.imageUrl?.trim();

  // Upload-from-device state
  const [uploadMode,  setUploadMode]  = useState("upload"); // "upload" | "url"
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  function handleProjectTypeChange(val) {
    onChange("projectType", val);
    if (PHOTO_REQUIRED_TYPES.includes(val)) {
      onChange("imageStatus", "Yes");
    } else {
      onChange("imageStatus", "No");
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange("imageUrl", data.url);
    } catch (err) {
      setUploadError(err.message || "Upload failed. Try pasting a URL instead.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canProceed = !!(
    formData.projectType &&
    formData.layout &&
    (!photoRequired || hasPhoto)
  );

  return (
    <>
      <section className="form-section-card-admin rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header-admin flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#4F46E5" }}
            >
              3
            </span>
            <h2
              className="text-base font-semibold text-stone-800 tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Project Details
            </h2>
          </div>

          <div className="space-y-6">
            {/* Project Type */}
            <div>
              <label className={labelCls}>Project Type <span className="text-red-500">*</span></label>
              <select
                className={selectCls}
                value={formData.projectType}
                onChange={(e) => handleProjectTypeChange(e.target.value)}
              >
                <option value="">— Select project type —</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Kitchen Photo */}
            {formData.projectType && (
              <div>
                <label className={labelCls}>
                  Kitchen Photo
                  {photoRequired
                    ? <span className="text-red-500 ml-1">*</span>
                    : <span className="ml-1.5 text-stone-400 font-normal normal-case tracking-normal">(optional)</span>
                  }
                </label>

                {photoRequired ? (
                  <div className="space-y-3">
                    <p className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                      A photo of the existing kitchen is required for <strong>{formData.projectType}</strong>. The AI will use it as a reference.
                    </p>

                    {/* Upload mode toggle */}
                    <div className="flex gap-1.5">
                      {[
                        { id: "upload", label: "Upload from Device" },
                        { id: "url",    label: "Paste URL" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => { setUploadMode(opt.id); setUploadError(""); }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                            uploadMode === opt.id
                              ? "bg-[#1C1917] text-white border-[#1C1917]"
                              : "bg-white text-stone-900 border-stone-300 hover:border-stone-500"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {uploadMode === "upload" ? (
                      <div className="space-y-2">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />

                        {/* Upload button / drop zone */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 hover:border-[#4F46E5] hover:bg-[#EEF2FF] disabled:opacity-60 transition text-stone-500 hover:text-[#4F46E5] cursor-pointer"
                        >
                          {uploading ? (
                            <>
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                              <span className="text-xs font-medium">Uploading…</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                              <span className="text-xs font-medium">Click to upload kitchen photo</span>
                              <span className="text-[10px] text-stone-400">JPG, PNG, WEBP</span>
                            </>
                          )}
                        </button>

                        {uploadError && (
                          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{uploadError}</p>
                        )}

                        {/* Preview thumbnail once uploaded */}
                        {hasPhoto && !uploading && (
                          <div className="flex items-center gap-3 p-2.5 rounded-lg border border-stone-200 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={formData.imageUrl}
                              alt="Kitchen preview"
                              className="w-16 h-12 rounded object-cover border border-stone-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-stone-700 truncate">Photo uploaded</p>
                              <p className="text-[10px] text-stone-400 truncate">{formData.imageUrl}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { onChange("imageUrl", ""); setUploadError(""); }}
                              className="shrink-0 text-stone-400 hover:text-red-500 transition"
                              aria-label="Remove photo"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="url"
                        className={inputCls}
                        placeholder="https://… (paste image URL)"
                        value={formData.imageUrl}
                        onChange={(e) => onChange("imageUrl", e.target.value)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Yes/No toggle */}
                    <div className="flex gap-2">
                      {["No", "Yes"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => onChange("imageStatus", opt)}
                          className={`px-5 py-2.5 min-h-[44px] rounded-full text-sm font-medium border transition ${
                            formData.imageStatus === opt
                              ? "bg-[#1C1917] text-white border-[#1C1917]"
                              : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {formData.imageStatus === "Yes" && (
                      <input
                        type="url"
                        className={inputCls}
                        placeholder="https://… (paste image URL)"
                        value={formData.imageUrl}
                        onChange={(e) => onChange("imageUrl", e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Kitchen Layout */}
            <div>
              <label className={labelCls}>Kitchen Layout <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-1">
                {LAYOUT_CONFIGS.map((cfg) => {
                  const selected = formData.layout === cfg.name;
                  return (
                    <button
                      key={cfg.name}
                      type="button"
                      onClick={() => onChange("layout", cfg.name)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition min-h-[72px] ${
                        selected
                          ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]"
                          : "border-stone-200 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600"
                      }`}
                    >
                      <div className="w-10 h-8">{cfg.svg}</div>
                      <span className="text-[10px] font-semibold text-center leading-tight">{cfg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
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
        <button onClick={onNext} disabled={!canProceed} className={nextBtnCls}>
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </>
  );
}
