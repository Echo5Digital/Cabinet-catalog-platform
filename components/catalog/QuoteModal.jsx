"use client";

import { useState } from "react";
import { useQuote } from "@/lib/context/quote";

export default function QuoteModal() {
  const { items, modalOpen, setModalOpen, clearQuote } = useQuote();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    project_description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        project_description: form.project_description || undefined,
        source: "catalog",
        items: items.map((item) => ({
          sku: item.sku,
          finish_code: item.finish_code || undefined,
          quantity: item.quantity,
        })),
      };
      const res = await fetch("/api/public/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setModalOpen(false);
    if (submitted) {
      clearQuote();
      setSubmitted(false);
      setForm({ name: "", email: "", phone: "", company: "", project_description: "" });
    }
  }

  if (!modalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

          {submitted ? (
            /* Success state */
            <div className="px-8 py-12 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                Thank you, {form.name.split(" ")[0]}.
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-1">
                Your quote request has been received.
              </p>
              <p className="text-stone-400 text-sm mb-8">
                We&apos;ll be in touch at <strong className="text-stone-600">{form.email}</strong> within 1 business day.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 text-sm border border-stone-200 rounded-xl hover:bg-stone-50 transition"
                >
                  Back to Home
                </button>
                <button
                  onClick={() => { setModalOpen(false); setSubmitted(false); clearQuote(); setForm({ name: "", email: "", phone: "", company: "", project_description: "" }); }}
                  className="flex-1 py-2.5 text-sm bg-stone-900 text-white rounded-xl hover:bg-stone-700 transition"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-stone-100">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Request a Quote</h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {items.length} product{items.length !== 1 ? "s" : ""} selected
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition text-xl"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Product summary */}
                <div className="px-6 py-4 bg-stone-50 border-b border-stone-100">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Your Selection</p>
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={`${item.sku}-${item.finish_id}`} className="flex items-center justify-between text-sm">
                        <span className="text-stone-700">
                          <span className="font-mono font-semibold text-stone-800">{item.sku}</span>
                          {item.finish_name && (
                            <span className="text-stone-400"> · {item.finish_name}</span>
                          )}
                        </span>
                        <span className="text-stone-400 text-xs">×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Form */}
                <form id="quote-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Your Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        autoFocus
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="Sarah Johnson"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="sarah@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Phone</label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Company</label>
                      <input
                        name="company"
                        type="text"
                        value={form.company}
                        onChange={handleChange}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Project Details
                      <span className="text-stone-400 font-normal ml-1">(optional)</span>
                    </label>
                    <textarea
                      name="project_description"
                      rows={3}
                      value={form.project_description}
                      onChange={handleChange}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                      placeholder="Kitchen remodel, new construction, bathroom renovation…"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-100 space-y-3">
                <button
                  type="submit"
                  form="quote-form"
                  disabled={submitting}
                  className="w-full py-3 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-700 transition disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Quote Request"}
                </button>
                <p className="text-xs text-center text-stone-400">
                  We&apos;ll respond within 1 business day.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
