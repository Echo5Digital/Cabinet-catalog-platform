"use client";

import { useState } from "react";
import Image from "next/image";
import BeforeAfterLightbox from "./BeforeAfterLightbox";

function InfoColumn({ label, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-5 text-center min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 shrink-0">
        {label}
      </p>
      {children}
    </div>
  );
}

function SwatchCell({ imageUrl, name, size = "md" }) {
  const cls = size === "sm" ? "w-10 h-10" : "w-14 h-14";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${cls} rounded-md overflow-hidden border border-stone-200 shrink-0 relative`}>
        {imageUrl ? (
          <Image src={imageUrl} alt={name || "swatch"} fill sizes={size === "sm" ? "40px" : "56px"} className="object-cover" />
        ) : (
          <div className="w-full h-full bg-stone-200 flex items-center justify-center">
            <span className="text-[9px] font-bold text-stone-400 uppercase">
              {name ? name.slice(0, 2) : "—"}
            </span>
          </div>
        )}
      </div>
      {name && (
        <p className="text-[10px] text-stone-600 font-medium leading-tight text-center line-clamp-2 max-w-[72px]">
          {name}
        </p>
      )}
    </div>
  );
}

function ProductPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-stone-100">
      <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    </div>
  );
}

const SUGGESTION_FIELD_LABELS = {
  vanity_finish: "Vanity Finish",
  countertop: "Countertop",
  flooring: "Flooring",
  faucet_finish: "Faucet Finish",
};

export default function BathroomDesignResultBoard({
  concept,
  image_url,
  original_image_url = null,
  products = [],
  sales_summary,
  next_steps = [],
  color_suggestions = [],
  bathroom_type,
  finishImageMap = {},
  countertopImageMap = {},
  floorImageMap = {},
  design_concept = null,
  material_plan = null,
  fixture_plan = [],
  budget_logic = null,
  product_recommendations = [],
  design_validation = null,
}) {
  const {
    name: conceptName = "Your Design",
    style_summary = "",
    vanity_finish,
    countertop,
    flooring,
    faucet_finish,
    why_it_works = [],
    budget_range,
  } = concept || {};

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false);
  const [viewMode, setViewMode] = useState("generated"); // "generated" | "compare"

  const vanityImageUrl  = finishImageMap[vanity_finish]  || null;
  const counterImageUrl = countertopImageMap[countertop] || null;
  const floorImg        = floorImageMap[flooring]        || null;

  return (
    <>
    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-white">

      {/* ── Zone 1: Hero render ───────────────────────────────────────────── */}
      {original_image_url && image_url && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-50 border-b border-stone-200">
          <span className="text-xs text-stone-500 font-medium mr-1">View:</span>
          {[
            { id: "generated", label: "AI Generated" },
            { id: "compare",   label: "Compare Before / After" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                viewMode === tab.id
                  ? "bg-[#6E1020] text-white border-[#6E1020]"
                  : "bg-white text-stone-600 border-stone-300 hover:border-[#6E1020] hover:text-[#6E1020]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative w-full bg-stone-900" style={{ aspectRatio: "16/7" }}>
        {viewMode === "compare" && original_image_url && image_url ? (
          <button
            type="button"
            className="absolute inset-0 flex w-full h-full cursor-zoom-in"
            onClick={() => setBeforeAfterOpen(true)}
            aria-label="Open before and after comparison"
          >
            <div className="relative flex-1 overflow-hidden border-r border-white/20">
              <Image src={original_image_url} alt="Original bathroom" fill sizes="(max-width: 1024px) 50vw, 512px" className="object-cover" />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
                Before
              </span>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <Image src={image_url} alt={conceptName} fill sizes="(max-width: 1024px) 50vw, 512px" className="object-cover" />
              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-stone-900/70 text-white text-[10px] font-semibold backdrop-blur-sm">
                AI Generated
              </span>
            </div>
            <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 text-white text-[10px] font-medium backdrop-blur-sm">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm-6-3v6m-3-3h6" />
              </svg>
              Click to compare
            </span>
          </button>
        ) : image_url ? (
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
            aria-label="View full size"
          >
            <Image src={image_url} alt={conceptName} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
            <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 text-white text-[10px] font-medium backdrop-blur-sm">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm-6-3v6m-3-3h6" />
              </svg>
              Click to enlarge
            </span>
          </button>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-stone-500 text-sm">Render unavailable</p>
          </div>
        )}
        {viewMode !== "compare" && (
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/65 to-transparent">
            <p className="text-white font-bold text-xl sm:text-2xl leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {conceptName}
            </p>
            {style_summary && (
              <p className="text-white/75 text-sm mt-1 leading-snug max-w-xl">{style_summary}</p>
            )}
          </div>
        )}
        {budget_range && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-800 text-white shadow">
              {budget_range}
            </span>
          </div>
        )}
      </div>

      {/* ── Zone 2: Info strip ────────────────────────────────────────────── */}
      <div className="border-t border-stone-200 bg-white overflow-x-auto">
        <div className="flex min-w-[420px] sm:min-w-0 sm:grid sm:grid-cols-5 divide-x divide-stone-100">

          <InfoColumn label="Bathroom Type">
            <p className="text-xs text-stone-600 font-medium">{bathroom_type || "—"}</p>
          </InfoColumn>

          <InfoColumn label="Vanity Finish">
            <SwatchCell imageUrl={vanityImageUrl} name={vanity_finish} size="sm" />
          </InfoColumn>

          <InfoColumn label="Countertop">
            <SwatchCell imageUrl={counterImageUrl} name={countertop} />
          </InfoColumn>

          <InfoColumn label="Flooring">
            <SwatchCell imageUrl={floorImg} name={flooring} />
          </InfoColumn>

          <InfoColumn label="Faucet">
            <SwatchCell imageUrl={null} name={faucet_finish} size="sm" />
          </InfoColumn>

        </div>
      </div>

      {/* ── Zone 3: Why it works ──────────────────────────────────────────── */}
      {Array.isArray(why_it_works) && why_it_works.length > 0 && (
        <div className="px-6 py-5 border-t border-stone-100 bg-stone-50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
            Why It Works
          </p>
          <ul className="space-y-1.5">
            {why_it_works.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-800 shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Zone 3b: AI Color Suggestions ────────────────────────────────── */}
      {Array.isArray(color_suggestions) && color_suggestions.length > 0 && (
        <div className="px-6 py-5 border-t border-rose-100 bg-rose-50">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-3.5 h-3.5 text-rose-800 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.303 0l-.347-.347z" />
            </svg>
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-800">
              AI Suggestions
            </p>
          </div>
          <div className="space-y-3">
            {color_suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-rose-100">
                <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-rose-700" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-700">
                    {SUGGESTION_FIELD_LABELS[s.field] || s.field}
                    <span className="font-normal text-stone-400 mx-1.5">·</span>
                    <span className="line-through text-stone-400">{s.current_value}</span>
                    <span className="mx-1.5 text-stone-400">→</span>
                    <span className="text-rose-800 font-semibold">{s.suggested_value}</span>
                  </p>
                  {s.reason && (
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{s.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zone 3c: Expert Design Concept ───────────────────────────────── */}
      {design_concept && (design_concept.summary || design_concept.style_rationale || design_concept.space_optimization || design_concept.budget_strategy) && (
        <div className="px-6 py-5 border-t border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">
            Design Strategy
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {design_concept.style_rationale && (
              <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Style Rationale</p>
                <p className="text-xs text-stone-700 leading-relaxed">{design_concept.style_rationale}</p>
              </div>
            )}
            {design_concept.space_optimization && (
              <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Space</p>
                <p className="text-xs text-stone-700 leading-relaxed">{design_concept.space_optimization}</p>
              </div>
            )}
            {design_concept.budget_strategy && (
              <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Budget</p>
                <p className="text-xs text-stone-700 leading-relaxed">{design_concept.budget_strategy}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Zone 3e: Fixture Plan ─────────────────────────────────────────── */}
      {Array.isArray(fixture_plan) && fixture_plan.length > 0 && (
        <div className="px-6 py-5 border-t border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">
            Fixture Plan
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left text-[9px] font-bold uppercase tracking-widest text-stone-400 pb-2 pr-3">Fixture</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-widest text-stone-400 pb-2 pr-3">Configuration</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-widest text-stone-400 pb-2 pr-3">Placement</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-widest text-stone-400 pb-2">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {fixture_plan.map((f, i) => (
                  <tr key={i} className="group">
                    <td className="py-2 pr-3 font-medium text-stone-800">{f.fixture}</td>
                    <td className="py-2 pr-3 text-stone-600">{f.configuration}</td>
                    <td className="py-2 pr-3 text-stone-600">{f.placement}</td>
                    <td className="py-2 text-stone-500">{f.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Zone 3f: Budget Logic ─────────────────────────────────────────── */}
      {budget_logic && (
        Array.isArray(budget_logic.design_tradeoffs) && budget_logic.design_tradeoffs.length > 0 ||
        Array.isArray(budget_logic.cost_saving_choices) && budget_logic.cost_saving_choices.length > 0 ||
        Array.isArray(budget_logic.premium_features) && budget_logic.premium_features.length > 0
      ) && (
        <div className="px-6 py-5 border-t border-stone-100 bg-stone-50/70">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">
            Budget Analysis — {budget_logic.tier || ""}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {Array.isArray(budget_logic.design_tradeoffs) && budget_logic.design_tradeoffs.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Tradeoffs</p>
                <ul className="space-y-1">
                  {budget_logic.design_tradeoffs.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                      <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-stone-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(budget_logic.cost_saving_choices) && budget_logic.cost_saving_choices.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Cost Savings</p>
                <ul className="space-y-1">
                  {budget_logic.cost_saving_choices.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                      <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-green-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(budget_logic.premium_features) && budget_logic.premium_features.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Premium Features</p>
                <ul className="space-y-1">
                  {budget_logic.premium_features.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                      <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-rose-700" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Zone 3g: Design Validation ────────────────────────────────────── */}
      {design_validation && Array.isArray(design_validation.notes) && design_validation.notes.length > 0 && (
        <div className="px-6 py-4 border-t border-blue-100 bg-blue-50/40">
          <div className="flex items-center gap-2 mb-2.5">
            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Design Validation</p>
            <div className="flex items-center gap-2 ml-auto">
              {design_validation.type_valid && (
                <span className="text-[9px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">Type ✓</span>
              )}
              {design_validation.style_valid && (
                <span className="text-[9px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">Style ✓</span>
              )}
              {design_validation.budget_aligned && (
                <span className="text-[9px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">Budget ✓</span>
              )}
            </div>
          </div>
          <ul className="space-y-1">
            {design_validation.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-blue-700">
                <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-300" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Zone 4: Product grid ──────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="px-6 py-6 border-t border-stone-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">
            Vanity Products Used
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <div key={product.sku} className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                <div className="aspect-square bg-stone-50 overflow-hidden relative">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px" className="object-contain p-3" />
                  ) : (
                    <ProductPlaceholder />
                  )}
                </div>
                <div className="px-3 py-2 border-t border-stone-100">
                  <p className="font-mono text-[10px] text-stone-400 tracking-wide uppercase">{product.sku}</p>
                  <p className="text-xs font-semibold text-stone-900 mt-0.5 leading-snug line-clamp-2">{product.name}</p>
                  {product.type && (
                    <p className="text-[10px] text-stone-400 mt-0.5 font-medium uppercase tracking-wide">{product.type}</p>
                  )}
                  {product.dimensions && (
                    <p className="text-[10px] font-mono text-stone-400 mt-0.5">{product.dimensions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zone 5: Sales summary + next steps ───────────────────────────── */}
      {(sales_summary || next_steps.length > 0) && (
        <div className="px-6 py-6 border-t border-stone-200 bg-stone-50 grid sm:grid-cols-2 gap-6">
          {sales_summary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Design Summary</p>
              <p className="text-sm text-stone-700 leading-relaxed">{sales_summary}</p>
            </div>
          )}
          {Array.isArray(next_steps) && next_steps.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Next Steps</p>
              <ol className="space-y-1.5">
                {next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-stone-900 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

    </div>

      {/* ── Lightbox: simple full-size image view ─────────────────────────── */}
      {lightboxOpen && image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-[92vw] max-h-[85vh] rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Image src={image_url} alt={conceptName} width={1600} height={1200} className="max-w-[92vw] max-h-[85vh] w-auto h-auto object-contain" />
          </div>
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {original_image_url && image_url && (
        <BeforeAfterLightbox
          open={beforeAfterOpen}
          onClose={() => setBeforeAfterOpen(false)}
          beforeUrl={original_image_url}
          afterUrl={image_url}
          title={conceptName}
        />
      )}
    </>
  );
}
