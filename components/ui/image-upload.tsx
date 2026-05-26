"use client";

import { useState, useRef } from "react";
import { Upload, Link, X, ImageIcon } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (images.length >= maxImages) return;
    if (!file.type.startsWith("image/")) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        onChange([...images, data.url]);
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function addUrl() {
    const url = urlInput.trim();
    if (url && images.length < maxImages) {
      onChange([...images, url]);
      setUrlInput("");
      setShowUrlInput(false);
    }
  }

  async function removeImage(index: number) {
    const removed = images[index];
    if (removed && removed.startsWith("https://") && !removed.startsWith(window.location.origin)) {
      try {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: removed }),
        });
      } catch {
        // Non-critical — file may already be gone or URL is external
      }
    }
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={images.length >= maxImages}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Link className="w-4 h-4" />
          Add URL
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="input flex-1"
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
          />
          <button type="button" onClick={addUrl} className="btn-primary text-sm">
            Add
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* Preview area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="grid grid-cols-5 gap-2 min-h-[80px]"
      >
        {images.length === 0 && (
          <div className="col-span-5 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            <ImageIcon className="w-8 h-8 mx-auto mb-1" />
            Drop images here or use the buttons above
          </div>
        )}
        {images.map((url, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={url}
              alt={`Image ${i + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23f3f4f6' width='100' height='100'/><text x='50' y='55' text-anchor='middle' fill='%239ca3af' font-size='10'>Broken</text></svg>";
              }}
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {uploading && (
          <div className="aspect-square rounded-lg border-2 border-dashed border-primary-300 bg-primary-50 flex items-center justify-center animate-pulse">
            <span className="text-xs text-primary-600">Uploading...</span>
          </div>
        )}
      </div>
    </div>
  );
}
