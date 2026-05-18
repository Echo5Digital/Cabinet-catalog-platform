"use client";
import { useState, useEffect } from "react";

const CABINET_STYLES = ["American", "Euro", "Shaker", "Modern", "Traditional"];
const HARDWARE_OPTIONS = ["Gold", "Silver", "Black", "Bronze", "None"];
const APPLIANCE_COLORS = ["Stainless", "White", "Black", "Panel Ready"];
const BUDGET_STYLES = [
  { id: "Budget-friendly", label: "Budget-friendly", desc: "Affordable, functional & clean" },
  { id: "Modern Euro",     label: "Modern Euro",     desc: "Sleek, handleless, contemporary" },
  { id: "Premium Luxury",  label: "Premium Luxury",  desc: "High-end materials & custom details" },
];

const STYLE_FILTERED = ["American", "Euro"]; // styles that filter finishes by style_category

// Same logic as app/catalog/design/page.jsx
function getStyleCategory(lineName) {
  if (!lineName) return null;
  const lower = lineName.toLowerCase();
  if (lower.includes("american")) return "American";
  if (lower.includes("euro")) return "Euro";
  return null;
}

const inputCls  = "w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-700/20 focus:border-rose-600 shadow-sm placeholder:text-stone-400 transition";
const selectCls = `${inputCls} cursor-pointer`;
const labelCls  = "block text-xs font-semibold text-[#3D0810] mb-1.5 uppercase tracking-wide";
const backBtnCls = "flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:border-stone-400 transition";
const nextBtnCls = "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6E1020] hover:bg-[#7D1528] text-white transition disabled:opacity-50 disabled:cursor-not-allowed";

// Passes full item so callers can access style_category
function ColorCarousel({ items, selected, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="shrink-0 w-16 h-16 rounded-lg bg-stone-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return <p className="text-xs text-stone-400 italic">No options available for this style</p>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {items.map((item) => {
        const isSelected = selected === item.name;
        return (
          <button
            key={item.id ?? item.name}
            type="button"
            onClick={() => onSelect(item)}
            className={`shrink-0 flex flex-col rounded-xl overflow-hidden border-2 transition-all w-24 ${
              isSelected
                ? "border-[#6E1020] shadow-sm"
                : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
            }`}
          >
            <div className="relative bg-stone-100 w-full h-24">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-stone-400 text-sm font-bold uppercase">{item.name.slice(0, 2)}</span>
                </div>
              )}
              {isSelected && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#6E1020] flex items-center justify-center shadow">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <div className={`px-1.5 py-2 ${isSelected ? "bg-[#FDF4F2]" : "bg-white"}`}>
              <p className={`text-[11px] font-medium leading-snug line-clamp-2 text-center ${isSelected ? "text-[#6E1020]" : "text-stone-700"}`}>
                {item.name}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function StepDesignStyle({ formData, onChange, onNext, onBack }) {
  const [activeTab,        setActiveTab]        = useState(0);
  const [finishes,         setFinishes]         = useState([]);
  const [countertopColors, setCountertopColors] = useState([]);
  const [floorColors,      setFloorColors]      = useState([]);
  const [loadingColors,    setLoadingColors]    = useState(true);

  useEffect(() => {
    async function loadColors() {
      setLoadingColors(true);
      try {
        const [finRes, colRes] = await Promise.all([
          fetch("/api/finishes"),
          fetch("/api/colors"),
        ]);
        if (finRes.ok) {
          const d = await finRes.json();
          // Normalise: map swatch_asset.public_url → image_url, compute style_category from catalog_line.name
          setFinishes((d.finishes || []).map((f) => ({
            ...f,
            image_url:      f.swatch_asset?.public_url ?? null,
            style_category: getStyleCategory(f.catalog_line?.name),
          })));
        }
        if (colRes.ok) {
          const d = await colRes.json();
          // Normalise: map swatch_asset.public_url → image_url, use color_type (API field)
          const allColors = (d.colors || []).map((c) => ({
            ...c,
            image_url: c.swatch_asset?.public_url ?? null,
          }));
          setCountertopColors(allColors.filter((c) => c.color_type === "countertop"));
          setFloorColors(allColors.filter((c) => c.color_type === "floor"));
        }
      } catch {
        // silently fail — colors are optional
      } finally {
        setLoadingColors(false);
      }
    }
    loadColors();
  }, []);

  // Filter finishes for upper/lower tabs when American or Euro is selected (same as public page)
  function getFinishesForTab(tabIndex) {
    if (tabIndex === 0 || tabIndex === 1) {
      // upper or lower cabinet color
      if (STYLE_FILTERED.includes(formData.cabinetStyle)) {
        return finishes.filter((item) => item.style_category === formData.cabinetStyle);
      }
    }
    return finishes;
  }

  const tabConfig = [
    { field: "upperColor",  label: "Upper Cabinet Color", getItems: () => getFinishesForTab(0) },
    { field: "lowerColor",  label: "Lower Cabinet Color", getItems: () => getFinishesForTab(1) },
    { field: "countertop",  label: "Countertop",          getItems: () => countertopColors },
    { field: "flooring",    label: "Flooring",            getItems: () => floorColors },
  ];

  // When cabinet style changes: clear upper/lower if switching to/from filtered styles
  function handleCabinetStyleChange(newStyle) {
    const wasFiltered = STYLE_FILTERED.includes(formData.cabinetStyle);
    const willFilter  = STYLE_FILTERED.includes(newStyle);
    onChange("cabinetStyle", newStyle);
    if (wasFiltered || willFilter) {
      onChange("upperColor", "");
      onChange("lowerColor", "");
    }
  }

  // When a finish is selected: also auto-set cabinet style if the finish has style_category
  function handleFinishSelect(tabIndex, item) {
    const cfg = tabConfig[tabIndex];
    onChange(cfg.field, item.name);
    if ((tabIndex === 0 || tabIndex === 1) && item.style_category) {
      onChange("cabinetStyle", item.style_category);
    }
    // Auto-advance to next tab
    if (tabIndex < tabConfig.length - 1) {
      setTimeout(() => setActiveTab(tabIndex + 1), 260);
    }
  }

  return (
    <>
      <section className="form-section-card rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="form-section-header flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ background: "#6E1020" }}
            >
              4
            </span>
            <h2
              className="text-base font-semibold text-stone-800 tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Design Style
            </h2>
          </div>

          <div className="space-y-7">
            {/* Cabinet Style */}
            <div>
              <label className={labelCls}>Cabinet Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-1">
                {CABINET_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleCabinetStyleChange(s)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                      formData.cabinetStyle === s
                        ? "border-[#1C1917] bg-[#1C1917] text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors — tabbed carousel */}
            <div>
              <label className={labelCls}>Colors &amp; Materials</label>

              {/* Filter notice for American/Euro */}
              {STYLE_FILTERED.includes(formData.cabinetStyle) && (
                <p className="text-xs text-[#3D0810] bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
                  Showing <strong>{formData.cabinetStyle}</strong> style colors for upper and lower cabinets.
                </p>
              )}

              {/* Tab strip */}
              <div className="flex border-b border-stone-100 mb-4">
                {tabConfig.map((cfg, i) => {
                  const hasValue = !!formData[cfg.field];
                  return (
                    <button
                      key={cfg.field}
                      type="button"
                      onClick={() => setActiveTab(i)}
                      className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                        activeTab === i
                          ? "border-rose-800 text-rose-900 bg-rose-50/50"
                          : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <span className="leading-tight text-center">{cfg.label.replace(" Cabinet", "")}</span>
                      {hasValue && activeTab !== i && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6E1020] shrink-0 ml-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active carousel */}
              {tabConfig.map((cfg, i) => {
                const items = cfg.getItems();
                return (
                  <div key={cfg.field} className={activeTab === i ? "block" : "hidden"}>
                    <ColorCarousel
                      items={items}
                      selected={formData[cfg.field]}
                      onSelect={(item) => handleFinishSelect(i, item)}
                      loading={loadingColors}
                    />
                    {formData[cfg.field] && (
                      <p className="mt-2 text-xs text-stone-500">
                        Selected: <span className="font-semibold text-stone-700">{formData[cfg.field]}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Budget Style */}
            <div>
              <label className={labelCls}>Budget Style</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BUDGET_STYLES.map((b) => {
                  const selected = formData.budgetStyle === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onChange("budgetStyle", b.id)}
                      className={`flex flex-col text-left rounded-xl border p-4 transition ${
                        selected
                          ? "border-[#1C1917] bg-[#1C1917] text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      <span className={`text-sm font-semibold mb-0.5 ${selected ? "text-white" : "text-stone-900"}`}>
                        {b.label}
                      </span>
                      <span className={`text-xs ${selected ? "text-white/70" : "text-stone-400"}`}>{b.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hood Style, Hardware, Appliance Color */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Hood Style</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="e.g. Wall mount, Island"
                  value={formData.hoodStyle}
                  onChange={(e) => onChange("hoodStyle", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Hardware Finish</label>
                <select
                  className={selectCls}
                  value={formData.hardware}
                  onChange={(e) => onChange("hardware", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {HARDWARE_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Appliance Color</label>
                <select
                  className={selectCls}
                  value={formData.applianceColor}
                  onChange={(e) => onChange("applianceColor", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {APPLIANCE_COLORS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Design Comments */}
            <div>
              <label className={labelCls}>Design Comments</label>
              <textarea
                value={formData.designComments}
                onChange={(e) => onChange("designComments", e.target.value)}
                placeholder="e.g. White upper cabinets, dark lower cabinets, quartz countertop…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
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
        <button onClick={onNext} className={nextBtnCls}>
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </>
  );
}
