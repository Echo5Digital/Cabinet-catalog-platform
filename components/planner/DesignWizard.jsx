"use client";

import { useState } from "react";
import usePlannerStore from "@/store/plannerStore";

// ─── Wizard questions ─────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "cooks",
    question: "How many people usually cook at once?",
    options: [
      { label: "Just me", value: "solo",    icon: "👤" },
      { label: "2 people", value: "couple", icon: "👥" },
      { label: "Family",   value: "family", icon: "👨‍👩‍👧" },
    ],
  },
  {
    id: "space",
    question: "How would you describe your kitchen space?",
    options: [
      { label: "Small / narrow",  value: "small",  icon: "📐" },
      { label: "Medium",          value: "medium", icon: "🏠" },
      { label: "Large / open",    value: "large",  icon: "🏡" },
    ],
  },
  {
    id: "style",
    question: "What cooking style fits you best?",
    options: [
      { label: "Quick meals",   value: "quick",    icon: "⚡" },
      { label: "Home cooking",  value: "home",     icon: "🍳" },
      { label: "Entertaining",  value: "entertain", icon: "🥂" },
    ],
  },
  {
    id: "storage",
    question: "How much storage do you need?",
    options: [
      { label: "Minimal",    value: "minimal",   icon: "📦" },
      { label: "Moderate",   value: "moderate",  icon: "🗄️" },
      { label: "Maximum",    value: "maximum",   icon: "🏪" },
    ],
  },
];

// ─── Recommendation engine ────────────────────────────────────────────────────

function recommendLayout(answers) {
  const { cooks, space, style, storage } = answers;

  // Simple decision tree
  if (space === "small") {
    return {
      layout:  "Straight",
      reason:  "A straight layout maximizes efficiency in compact spaces.",
      cabinet: "Euro",
    };
  }
  if (space === "small" && cooks === "couple") {
    return {
      layout:  "Parallel",
      reason:  "A galley layout gives two cooks dedicated work zones in a narrow space.",
      cabinet: "American",
    };
  }
  if (style === "entertain" && space === "large") {
    return {
      layout:  "Island",
      reason:  "An island layout is perfect for entertaining — extra prep surface and seating.",
      cabinet: "American",
    };
  }
  if (cooks === "family" && (space === "medium" || space === "large")) {
    return {
      layout:  storage === "maximum" ? "G-Shape" : "U-Shape",
      reason:  "A U-shape gives a family multiple simultaneous work zones.",
      cabinet: "American",
    };
  }
  if (style === "entertain" || space === "large") {
    return {
      layout:  "L-Shape",
      reason:  "An L-shape opens the room up and flows well for social cooking.",
      cabinet: "American",
    };
  }
  if (cooks === "couple") {
    return {
      layout:  "Parallel",
      reason:  "A parallel layout gives each person their own dedicated workspace.",
      cabinet: "Euro",
    };
  }

  // Default
  return {
    layout:  "L-Shape",
    reason:  "An L-shape is one of the most versatile kitchen layouts for any style.",
    cabinet: "American",
  };
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function WizardQuestion({ question, options, onSelect, currentIndex, total }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 px-2">
      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              i < currentIndex ? "w-6 bg-emerald-400" : i === currentIndex ? "w-8 bg-stone-900" : "w-4 bg-stone-200",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Question text */}
      <p className="text-base font-semibold text-stone-900 text-center leading-snug max-w-xs">
        {question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-stone-200 bg-white hover:border-stone-900 hover:bg-stone-50 transition-all duration-150 text-left group"
          >
            <span className="text-2xl leading-none">{opt.icon}</span>
            <span className="text-sm font-medium text-stone-800 group-hover:text-stone-900">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WizardResult({ result, onApply, onSkip }) {
  const LAYOUT_ICONS = {
    "Straight":  (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
    "L-Shape":   (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
    "U-Shape":   (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
      </svg>
    ),
    "Parallel":  (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6" y="42" width="68" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
    "Island":    (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="22" y="30" width="28" height="12" rx="1" fill="currentColor" />
      </svg>
    ),
    "G-Shape":   (
      <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
        <rect x="6" y="8" width="68" height="10" rx="1" fill="currentColor" />
        <rect x="6" y="18" width="10" height="34" rx="1" fill="currentColor" />
        <rect x="64" y="18" width="10" height="20" rx="1" fill="currentColor" />
        <rect x="38" y="28" width="26" height="10" rx="1" fill="currentColor" />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4 px-2">
      {/* Check */}
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-xs text-stone-400 uppercase tracking-wide font-semibold mb-1">Recommended Layout</p>
        <p className="text-2xl font-bold text-stone-900">{result.layout}</p>
        <p className="text-sm text-stone-500 mt-1 max-w-xs">{result.reason}</p>
      </div>

      {/* Icon preview */}
      <div className="w-32 h-24 text-stone-700">
        {LAYOUT_ICONS[result.layout] || LAYOUT_ICONS["L-Shape"]}
      </div>

      {/* Cabinet style hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200">
        <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs text-stone-600">
          <span className="font-medium">{result.cabinet}-style</span> cabinets recommended for this layout
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={onApply}
          className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 transition"
        >
          Apply this layout
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 rounded-xl text-stone-500 text-sm hover:text-stone-700 transition"
        >
          Choose manually instead
        </button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

// Map wizard 'cooks' answer to lifestyle profile
const COOKS_TO_PROFILE = {
  solo:    "solo",
  couple:  "couple",
  family:  "family",
};

export default function DesignWizard({ onClose, primaryColor = "#1C1917" }) {
  const setLayout           = usePlannerStore((s) => s.setLayout);
  const setCabinetStyle     = usePlannerStore((s) => s.setCabinetStyle);
  const setLifestyleProfile = usePlannerStore((s) => s.setLifestyleProfile);

  const [step, setStep]    = useState(0);    // 0..QUESTIONS.length = result
  const [answers, setAnswers] = useState({});
  const [result, setResult]   = useState(null);

  const handleAnswer = (value) => {
    const q       = QUESTIONS[step];
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // All answered — compute recommendation
      setResult(recommendLayout(newAnswers));
      setStep(QUESTIONS.length);  // go to result screen
    }
  };

  const handleApply = () => {
    if (result) {
      setLayout(result.layout);
      setCabinetStyle(result.cabinet);
      // Derive lifestyle profile from wizard answers
      const cooksAnswer = answers.cooks;
      const styleAnswer = answers.style;
      const profile =
        styleAnswer === "entertain" ? "entertainer"
        : COOKS_TO_PROFILE[cooksAnswer] ?? null;
      if (profile) setLifestyleProfile(profile);
    }
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const currentQuestion = QUESTIONS[step];
  const showResult = step === QUESTIONS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            {/* Back button (not on first question or result) */}
            {step > 0 && !showResult && (
              <button
                onClick={handleBack}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-500 transition mr-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Design Wizard</p>
              {!showResult && (
                <p className="text-[10px] text-stone-400">
                  Question {step + 1} of {QUESTIONS.length}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-400 transition"
            aria-label="Close wizard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          {showResult ? (
            <WizardResult result={result} onApply={handleApply} onSkip={handleSkip} />
          ) : (
            <WizardQuestion
              question={currentQuestion.question}
              options={currentQuestion.options}
              onSelect={handleAnswer}
              currentIndex={step}
              total={QUESTIONS.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}
