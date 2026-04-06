"use client";

import { useState, useRef } from "react";
import { authHeaders } from "@/components/auth/AuthGuard";

const ALLOWED_EXTENSIONS = [".txt", ".pdf", ".docx"];
const ALLOWED_MIME_TYPES: Record<string, string> = {
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

type ContentType =
  | "BOOK"
  | "SHORT_STORY"
  | "ARTICLE"
  | "SCRIPT"
  | "POEM"
  | "OTHER";

interface UploadFormProps {
  onSuccess: (workId: string) => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [contentType, setContentType] = useState<ContentType>("BOOK");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      const mimeType = ALLOWED_MIME_TYPES[ext] ?? "application/octet-stream";

      // Step 1: Create work record and get presigned upload URL
      const createRes = await fetch("/api/works", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: title.trim(),
          genre: genre.trim() || undefined,
          contentType,
          description: description.trim() || undefined,
          fileName: file.name,
          fileSize: file.size,
          mimeType,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error ?? "Failed to create work");
      }

      const { workId, uploadUrl } = await createRes.json();

      // Step 2: Upload directly to S3 via presigned URL
      await uploadWithProgress(file, uploadUrl, mimeType, setProgress);

      // Step 3: Mark work as READY
      await fetch(`/api/works/${workId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ status: "READY" }),
      });

      onSuccess(workId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Enter your work's title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Type
          </label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="BOOK">Book / Novel</option>
            <option value="SHORT_STORY">Short Story</option>
            <option value="ARTICLE">Article / Essay</option>
            <option value="SCRIPT">Script / Screenplay</option>
            <option value="POEM">Poetry</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genre
          </label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            placeholder="e.g. Fantasy, Thriller"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Brief synopsis or description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Manuscript File <span className="text-red-500">*</span>
        </label>
        <div
          className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 py-8 cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-center">
            {file ? (
              <p className="text-sm text-indigo-600 font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-indigo-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  TXT, PDF, DOCX — up to 5MB (free tier)
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || !file || !title.trim()}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? "Uploading…" : "Upload Work"}
      </button>
    </form>
  );
}

async function uploadWithProgress(
  file: File,
  url: string,
  mimeType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Upload network error")));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.send(file);
  });
}
