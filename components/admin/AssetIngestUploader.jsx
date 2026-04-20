"use client";

import { useState, useRef } from "react";

export default function AssetIngestUploader({ tenantId, onComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setResults(null);
    setError(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    setFiles(dropped);
    setResults(null);
    setError(null);
  }

  async function handleUpload() {
    if (!files.length || !tenantId) return;

    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("tenantId", tenantId);
      for (const f of files) {
        formData.append("files", f);
      }

      const res = await fetch("/api/assets/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");

      setResults(data.ingested || []);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const confidenceBadge = (confidence) => {
    const colors = {
      mapped: "bg-green-100 text-green-700",
      partially_matched: "bg-yellow-100 text-yellow-700",
      unmatched: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[confidence] || "bg-gray-100 text-gray-600"}`}>
        {confidence?.replace("_", " ") || "—"}
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload Assets</h2>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition"
      >
        <p className="text-sm text-gray-500">
          Drag & drop files here, or <span className="text-blue-600 font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP supported</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* File list preview */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              {f.name}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {uploading ? `Uploading ${files.length} file(s)…` : `Upload ${files.length} file(s)`}
        </button>
      )}

      {/* Results */}
      {results && (
        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Ingestion complete — {results.length} file(s) processed
          </p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.filename}</p>
                  {r.error && <p className="text-xs text-red-500">{r.error}</p>}
                  {r.asset && (
                    <p className="text-xs text-gray-400">
                      Detected: {r.asset.parsed_asset_type || "unknown type"} ·{" "}
                      {r.asset.parsed_line_slug || "—"} ·{" "}
                      {r.asset.parsed_sku || r.asset.parsed_finish_code || "no SKU"}
                    </p>
                  )}
                </div>
                {r.confidence && confidenceBadge(r.confidence)}
              </div>
            ))}
          </div>
          <button
            onClick={onComplete}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Go to Mapping Review →
          </button>
        </div>
      )}
    </div>
  );
}
