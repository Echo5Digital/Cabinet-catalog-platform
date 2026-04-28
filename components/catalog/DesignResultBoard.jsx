"use client";

// ── Layout SVG configs (self-contained — mirrors KitchenDesignForm.jsx) ──────
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

// ── Shared sub-components ─────────────────────────────────────────────────────

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
      <div className={`${cls} rounded-md overflow-hidden border border-stone-200 shrink-0`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name || "swatch"} className="w-full h-full object-cover" />
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
      <svg
        className="w-8 h-8 text-stone-300"
        fill="none" viewBox="0 0 24 24"
        stroke="currentColor" strokeWidth={1}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DesignResultBoard({
  concept,
  image_url,
  products = [],
  sales_summary,
  next_steps = [],
  layout,
  finishImageMap = {},
  countertopImageMap = {},
  floorImageMap = {},
}) {
  const {
    name: conceptName = "Your Design",
    style_summary = "",
    upper_color,
    lower_color,
    countertop,
    flooring,
    why_it_works = [],
    budget_range,
  } = concept || {};

  const layoutConfig = LAYOUT_CONFIGS.find(
    (l) => l.name.toLowerCase() === (layout || "").toLowerCase()
  );

  const upperImageUrl   = finishImageMap[upper_color]    || null;
  const lowerImageUrl   = finishImageMap[lower_color]    || null;
  const counterImageUrl = countertopImageMap[countertop] || null;
  const floorImg        = floorImageMap[flooring]        || null;

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-white">

      {/* ── Zone 1: Hero render ───────────────────────────────────────────── */}
      <div className="relative w-full bg-stone-900" style={{ aspectRatio: "16/7" }}>
        {image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_url}
            alt={conceptName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-stone-500 text-sm">Render unavailable</p>
          </div>
        )}
        {/* Concept name + summary overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/65 to-transparent">
          <p
            className="text-white font-bold text-xl sm:text-2xl leading-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {conceptName}
          </p>
          {style_summary && (
            <p className="text-white/75 text-sm mt-1 leading-snug max-w-xl">
              {style_summary}
            </p>
          )}
        </div>
        {/* Budget badge */}
        {budget_range && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow">
              {budget_range}
            </span>
          </div>
        )}
      </div>

      {/* ── Zone 2: Info strip ────────────────────────────────────────────── */}
      <div className="border-t border-stone-200 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-stone-100">

          {/* Col 1: Layout SVG */}
          <InfoColumn label="Layout">
            {layoutConfig ? (
              <div className="w-16 h-12 text-stone-700">
                {layoutConfig.svg}
              </div>
            ) : (
              <p className="text-xs text-stone-500 font-medium">{layout || "—"}</p>
            )}
            <p className="text-xs text-stone-600 font-medium">{layout || "—"}</p>
          </InfoColumn>

          {/* Col 2: Cabinet Colors */}
          <InfoColumn label="Cabinet Colors">
            <div className="flex gap-2 items-start justify-center">
              <div className="flex flex-col items-center gap-1">
                <SwatchCell imageUrl={upperImageUrl} name={upper_color} size="sm" />
                <p className="text-[9px] text-stone-400 uppercase tracking-wide">Upper</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <SwatchCell imageUrl={lowerImageUrl} name={lower_color} size="sm" />
                <p className="text-[9px] text-stone-400 uppercase tracking-wide">Lower</p>
              </div>
            </div>
          </InfoColumn>

          {/* Col 3: Countertop */}
          <InfoColumn label="Countertop">
            <SwatchCell imageUrl={counterImageUrl} name={countertop} />
          </InfoColumn>

          {/* Col 4: Flooring */}
          <InfoColumn label="Flooring">
            <SwatchCell imageUrl={floorImg} name={flooring} />
          </InfoColumn>

          {/* Col 5: View thumbnail */}
          <InfoColumn label="View">
            <div className="w-16 h-12 rounded overflow-hidden border border-stone-200 bg-stone-100">
              {image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image_url} alt="thumbnail" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                  </svg>
                </div>
              )}
            </div>
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
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Zone 4: Product grid ──────────────────────────────────────────── */}
      {products.length > 0 && (
        <div className="px-6 py-6 border-t border-stone-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">
            Sample Cabinets Used
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => (
              <div
                key={product.sku}
                className="border border-stone-200 rounded-xl overflow-hidden bg-white"
              >
                <div className="aspect-square bg-stone-50 overflow-hidden">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-3"
                    />
                  ) : (
                    <ProductPlaceholder />
                  )}
                </div>
                <div className="px-3 py-2 border-t border-stone-100">
                  <p className="font-mono text-[10px] text-stone-400 tracking-wide uppercase">
                    {product.sku}
                  </p>
                  <p className="text-xs font-semibold text-stone-900 mt-0.5 leading-snug line-clamp-2">
                    {product.name}
                  </p>
                  {product.type && (
                    <p className="text-[10px] text-stone-400 mt-0.5 font-medium uppercase tracking-wide">
                      {product.type}
                    </p>
                  )}
                  {product.dimensions && (
                    <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                      {product.dimensions}
                    </p>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                Design Summary
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">{sales_summary}</p>
            </div>
          )}
          {Array.isArray(next_steps) && next_steps.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                Next Steps
              </p>
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
  );
}
