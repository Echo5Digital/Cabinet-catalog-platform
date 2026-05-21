"use client";

import usePlannerStore from "@/store/plannerStore";

const LAYOUTS = [
  {
    id: "Straight",
    label: "Straight",
    description: "Single wall, linear run",
    icon: (
      <svg viewBox="0 0 80 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
        <rect x="8" y="30" width="64" height="14" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="30" width="64" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="24" y1="30" x2="24" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="40" y1="30" x2="40" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="56" y1="30" x2="56" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "L-Shape",
    label: "L-Shape",
    description: "Two walls at a corner",
    icon: (
      <svg viewBox="0 0 80 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
        {/* Back wall */}
        <rect x="8" y="8" width="64" height="14" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="8" width="64" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Left wall */}
        <rect x="8" y="8" width="14" height="44" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="8" width="14" height="44" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="28" y1="8" x2="28" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="44" y1="8" x2="44" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="60" y1="8" x2="60" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="8" y1="26" x2="22" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="8" y1="38" x2="22" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "U-Shape",
    label: "U-Shape",
    description: "Three walls, horseshoe",
    icon: (
      <svg viewBox="0 0 80 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
        {/* Back wall */}
        <rect x="8" y="8" width="64" height="12" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="8" width="64" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Left wall */}
        <rect x="8" y="8" width="12" height="44" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="8" width="12" height="44" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Right wall */}
        <rect x="60" y="8" width="12" height="44" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="60" y="8" width="12" height="44" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="28" y1="8" x2="28" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="44" y1="8" x2="44" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "Parallel",
    label: "Parallel",
    description: "Galley — two facing walls",
    icon: (
      <svg viewBox="0 0 80 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
        {/* Top run */}
        <rect x="8" y="8" width="64" height="13" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="8" width="64" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Bottom run */}
        <rect x="8" y="39" width="64" height="13" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="39" width="64" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="24" y1="8" x2="24" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="40" y1="8" x2="40" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="56" y1="8" x2="56" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="24" y1="39" x2="24" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="40" y1="39" x2="40" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="56" y1="39" x2="56" y2="52" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "Island",
    label: "Island",
    description: "Open plan with center island",
    icon: (
      <svg viewBox="0 0 80 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
        {/* Back wall */}
        <rect x="8" y="8" width="64" height="12" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="8" width="64" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Island */}
        <rect x="24" y="32" width="32" height="14" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="24" y="32" width="32" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="40" y1="32" x2="40" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="28" y1="8" x2="28" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="52" y1="8" x2="52" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
];

export default function LayoutSelector({ primaryColor = "#1C1917" }) {
  const layout    = usePlannerStore((s) => s.layout);
  const setLayout = usePlannerStore((s) => s.setLayout);
  const setStep   = usePlannerStore((s) => s.setStep);

  function handleContinue() {
    if (layout) setStep(2);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-76px)] bg-[#FAFAF9] flex flex-col">
      {/* Hero section */}
      <div
        className="py-12 sm:py-16 px-4 text-center"
        style={{ background: "linear-gradient(160deg, #1c1917 0%, #292524 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-stone-300 bg-white/10 ring-1 ring-white/20 mb-4">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 012-2V7" />
            </svg>
            Kitchen Planner — Step 1 of 3
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Choose Your Kitchen Layout
          </h1>
          <p className="text-stone-400 text-base max-w-lg mx-auto">
            Select the layout that best matches your kitchen space. You can adjust dimensions in the next step.
          </p>
        </div>
      </div>

      {/* Layout cards */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {LAYOUTS.map((l) => {
            const isSelected = layout === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={[
                  "group relative flex flex-col items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-150 text-left cursor-pointer",
                  isSelected
                    ? "border-stone-800 bg-stone-900 shadow-lg"
                    : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-md",
                ].join(" ")}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : {}}
              >
                {/* Icon */}
                <div
                  className={[
                    "w-full aspect-[4/3] rounded-xl flex items-center justify-center p-3 transition-colors",
                    isSelected ? "bg-stone-100/10" : "bg-stone-50 group-hover:bg-stone-100",
                  ].join(" ")}
                  style={isSelected ? { color: primaryColor } : { color: "#78716c" }}
                >
                  {l.icon}
                </div>

                {/* Label */}
                <div className="w-full">
                  <p
                    className={[
                      "text-sm font-semibold mb-0.5 transition-colors",
                      isSelected ? "text-stone-900" : "text-stone-700",
                    ].join(" ")}
                    style={isSelected ? { color: primaryColor } : {}}
                  >
                    {l.label}
                  </p>
                  <p className="text-xs text-stone-500">{l.description}</p>
                </div>

                {/* Selected check */}
                {isSelected && (
                  <span
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!layout}
            className={[
              "flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold text-white transition-all duration-150 shadow-sm",
              layout ? "hover:opacity-90 cursor-pointer" : "opacity-40 cursor-not-allowed",
            ].join(" ")}
            style={{ backgroundColor: primaryColor }}
          >
            Continue
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {layout && (
          <p className="mt-3 text-center text-xs text-stone-400">
            Selected: <span className="font-medium text-stone-600">{layout}</span>
          </p>
        )}
      </div>
    </div>
  );
}
