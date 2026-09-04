"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CATEGORIES = [
  { value: "american", label: "American" },
  { value: "euro", label: "Euro" },
  { value: "general", label: "General" },
];

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function UploadForm({ onUploaded }) {
  const [category, setCategory] = useState("general");
  const [altText, setAltText] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function pickFiles(fileList) {
    const picked = Array.from(fileList || []).filter((f) => f instanceof File);
    if (picked.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...picked.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
    setError("");
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      for (const { file } of files) formData.append("files", file);
      formData.append("category", category);
      if (altText) formData.append("alt_text", altText);

      const res = await fetch("/api/gallery", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      for (const image of data.images || []) onUploaded(image);
      if (data.failed?.length) {
        setError(`${data.failed.length} file(s) failed: ${data.failed.map((f) => f.filename).join(", ")}`);
      }
      setFiles([]);
      setAltText("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white space-y-4"
    >
      <h2 className="font-semibold text-gray-800 text-sm">Upload Photos</h2>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-4 sm:p-6 text-center cursor-pointer transition ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => pickFiles(e.target.files)}
        />
        {files.length > 0 ? (
          <div
            className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {files.map((f, idx) => (
              <div key={idx} className="relative group/thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-full aspect-square rounded-lg object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 flex items-center justify-center text-xs font-medium transition"
            >
              + Add more
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Drag & drop images, or <span className="text-blue-600 font-medium">browse</span>
            <span className="block text-xs text-gray-400 mt-1">You can select multiple images at once</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Caption (optional)</label>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Modern white kitchen"
          />
        </div>
      </div>
      {files.length > 1 && (
        <p className="text-xs text-gray-400">Caption will be applied to all {files.length} photos.</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={files.length === 0 || uploading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
        >
          {uploading
            ? "Uploading…"
            : files.length > 1
            ? `Upload ${files.length} Photos`
            : "Upload"}
        </button>
      </div>
    </form>
  );
}

function ImageCard({ image, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this gallery photo? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/gallery/${image.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onDelete(image.id);
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.public_url}
        alt={image.alt_text || "Gallery photo"}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs bg-white/90 text-red-600 rounded-full px-2.5 py-1 font-medium hover:bg-white disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
        {image.alt_text && (
          <p className="text-white text-xs leading-tight line-clamp-2">{image.alt_text}</p>
        )}
      </div>
      <span className="absolute top-2 left-2 text-[10px] font-medium bg-black/60 text-white rounded-full px-2 py-0.5 capitalize">
        {categoryLabel(image.gallery_category)}
      </span>
    </div>
  );
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchImages = useCallback(async () => {
    const res = await fetch("/api/gallery");
    const data = res.ok ? await res.json() : {};
    setImages(data.images || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  function handleUploaded(image) {
    setImages((prev) => [image, ...prev]);
  }

  function handleDelete(id) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  const displayed = filter ? images.filter((img) => img.gallery_category === filter) : images;

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.value] = images.filter((img) => img.gallery_category === c.value).length;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gallery</h1>
        <a
          href="/catalog/gallery"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View public gallery →
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Upload inspiration photos for the public Design Gallery. Pick a category so it shows up in the right section.
      </p>

      <div className="mb-6">
        <UploadForm onUploaded={handleUploaded} />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition ${
            filter === "" ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          All ({images.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition ${
              filter === c.value ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {c.label} ({counts[c.value] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">
            {filter ? `No photos in "${categoryLabel(filter)}" yet.` : "No gallery photos yet — upload one above."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayed.map((image) => (
            <ImageCard key={image.id} image={image} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
