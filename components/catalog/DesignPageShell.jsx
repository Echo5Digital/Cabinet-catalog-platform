"use client";
import { useState } from "react";
import KitchenDesignForm from "./KitchenDesignForm";

export default function DesignPageShell({ countertopColors, floorColors, finishes, structures }) {
  const [designVerified, setDesignVerified] = useState(false);

  return (
    <div className="bg-[#F8F6F3]">
      {/* Banner — hidden once design is verified */}
      {!designVerified && (
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #4A0A15 0%, #6E1020 55%, #7D1528 100%)" }}>
          {/* Warm radial glow — right side */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 80% at 95% 50%, rgba(180,30,60,0.15) 0%, transparent 65%)" }} />
          {/* Diagonal grid texture */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 text-center">
            {/* AI badge */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 icon-float">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-widest text-rose-300 uppercase">Powered by AI</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-white mb-4 anim-fade-in-up leading-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Kitchen Design AI
            </h1>
            <p className="text-red-100/75 max-w-xl mx-auto leading-relaxed mb-8">
              Tell us about your dream kitchen and we&apos;ll generate personalized design concepts,
              cabinet recommendations, and a sales-ready summary — instantly.
            </p>

            {/* How it works — 3 cards in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Fill in your details", desc: "Layout, style, colors, and what you need" },
                { step: "2", title: "AI generates concepts", desc: "2–3 realistic designs matched to your inputs" },
                { step: "3", title: "Request your quote", desc: "Browse the catalog and start building your order" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl design-step-card">
                  <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                    {item.step}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white/90">{item.title}</p>
                    <p className="text-xs text-red-200/55 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="relative">
        {/* Background image at 50% opacity — separate layer so content stays fully opaque */}
        <div
          className="absolute inset-0 bg-cover bg-left bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/design-bg.webp')", opacity: 0.5 }}
          aria-hidden="true"
        />
        <div className={`relative max-w-5xl mx-auto px-4 sm:px-6 ${designVerified ? "py-6" : "py-12"}`}>
          <KitchenDesignForm
            countertopColors={countertopColors}
            floorColors={floorColors}
            finishes={finishes}
            structures={structures}
            onVerified={() => setDesignVerified(true)}
          />
        </div>
      </div>
    </div>
  );
}
