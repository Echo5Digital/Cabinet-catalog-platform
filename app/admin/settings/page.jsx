"use client";

import { useState, useEffect, useRef } from "react";

function ColorSwatch({ color }) {
  return (
    <div
      className="w-8 h-8 rounded-md border border-gray-200 shrink-0"
      style={{ backgroundColor: color || "#cccccc" }}
    />
  );
}

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    primary_color: "#1a1a1a",
    accent_color: "#3b82f6",
    logo_url: "",
  });

  const logoInputRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tenant");
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Failed to load settings");
        }
        const data = await res.json();
        const t = data.tenant;
        setForm({
          name: t.name || "",
          contact_email: t.contact_email || "",
          contact_phone: t.contact_phone || "",
          website_url: t.website_url || "",
          primary_color: t.primary_color || "#1a1a1a",
          accent_color: t.accent_color || "#3b82f6",
          logo_url: t.logo_url || "",
        });
        setLoaded(true);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tenant/logo", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }
      const data = await res.json();
      handleChange("logo_url", data.logo_url);
    } catch (e) {
      setError(e.message);
    } finally {
      setLogoUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-400 text-sm">Loading settings…</div>
    );
  }

  if (!loaded) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Branding & Settings</h1>
        </div>
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || "Failed to load settings."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Branding & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your business information and how your catalog looks to customers.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Info */}
        <Section
          title="Business Information"
          description="This information appears in your catalog and customer communications."
        >
          <Field label="Business Name" hint="Shown in the catalog header and admin panel">
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cabinet & Remodeling Depot"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Email">
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sales@example.com"
              />
            </Field>
            <Field label="Contact Phone">
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 555-5555"
              />
            </Field>
          </div>

          <Field label="Website URL">
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => handleChange("website_url", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://yourwebsite.com"
            />
          </Field>
        </Section>

        {/* Branding */}
        <Section
          title="Branding"
          description="Colors used in your public-facing catalog. Changes take effect immediately after saving."
        >
          {/* Color preview bar */}
          <div
            className="w-full h-10 rounded-lg flex items-center justify-between px-4 mb-4"
            style={{ backgroundColor: form.primary_color }}
          >
            <span className="text-white text-sm font-semibold opacity-90">Your Catalog Name</span>
            <div
              className="px-3 py-1 rounded text-sm font-medium text-white"
              style={{ backgroundColor: form.accent_color }}
            >
              Request Quote
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary Color" hint="Used for header, navigation, and backgrounds">
              <div className="flex items-center gap-3">
                <ColorSwatch color={form.primary_color} />
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => handleChange("primary_color", e.target.value)}
                  className="h-9 w-20 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) => handleChange("primary_color", e.target.value)}
                  maxLength={7}
                  pattern="#[0-9a-fA-F]{6}"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#1a1a1a"
                />
              </div>
            </Field>

            <Field label="Accent Color" hint="Used for buttons and interactive elements">
              <div className="flex items-center gap-3">
                <ColorSwatch color={form.accent_color} />
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) => handleChange("accent_color", e.target.value)}
                  className="h-9 w-20 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.accent_color}
                  onChange={(e) => handleChange("accent_color", e.target.value)}
                  maxLength={7}
                  pattern="#[0-9a-fA-F]{6}"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#3b82f6"
                />
              </div>
            </Field>
          </div>

          {/* Logo */}
          <Field label="Logo" hint="Appears in the catalog header. Recommended: PNG or SVG, transparent background, at least 400px wide.">
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 flex items-center justify-center w-24 h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logo_url}
                    alt="Logo"
                    className="max-h-12 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg w-24 h-16 flex items-center justify-center text-gray-400 text-xs text-center">
                  No logo
                </div>
              )}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  {logoUploading ? "Uploading…" : "Upload Logo"}
                </button>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={() => handleChange("logo_url", "")}
                    className="block text-xs text-red-500 hover:text-red-700"
                  >
                    Remove logo
                  </button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </Field>
        </Section>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Settings saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
