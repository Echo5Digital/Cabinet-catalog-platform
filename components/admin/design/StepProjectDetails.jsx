"use client";

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

const selectCls = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition cursor-pointer";
const inputCls  = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
const labelCls  = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";
const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6E1020] hover:bg-[#7D1528] text-white transition disabled:opacity-50 disabled:cursor-not-allowed";

export default function StepProjectDetails({ formData, onChange, onNext, onBack }) {
  const photoRequired = PHOTO_REQUIRED_TYPES.includes(formData.projectType);
  const hasPhoto = !!formData.imageUrl?.trim();

  function handleProjectTypeChange(val) {
    onChange("projectType", val);
    if (PHOTO_REQUIRED_TYPES.includes(val)) {
      onChange("imageStatus", "Yes");
    } else {
      onChange("imageStatus", "No");
    }
  }

  const canProceed = !!(
    formData.projectType &&
    formData.layout &&
    (!photoRequired || hasPhoto)
  );

  return (
    <>
      <section className="form-section-card rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#6E1020" }}
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
                    <p className="text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
                      A photo of the existing kitchen is required for <strong>{formData.projectType}</strong>. The AI will use it as a reference.
                    </p>
                    <input
                      type="url"
                      className={inputCls}
                      placeholder="https://... (paste image URL)"
                      value={formData.imageUrl}
                      onChange={(e) => onChange("imageUrl", e.target.value)}
                    />
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
                        placeholder="https://... (paste image URL)"
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
                          ? "border-[#6E1020] bg-[#FDF4F2] text-[#6E1020]"
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
