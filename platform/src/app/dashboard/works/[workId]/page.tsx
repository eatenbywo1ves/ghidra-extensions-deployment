"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authHeaders } from "@/components/auth/AuthGuard";

interface WorkDetail {
  id: string;
  title: string;
  contentType: string;
  genre: string | null;
  description: string | null;
  status: string;
  uploadedAt: string;
  wordCount: number | null;
  contentHash: string | null;
  rights: {
    licenseType: string;
    allowPublicPreview: boolean;
    drmEnabled: boolean;
    previewWordLimit: number;
    watermarkEnabled: boolean;
    certificateKey: string | null;
  } | null;
  analysis: {
    status: string;
    genre: string | null;
    genreConfidence: number | null;
    themes: string[] | null;
    narrativeArc: string | null;
  } | null;
  _count: { accessLogs: number; visualizations: number };
}

export default function WorkDetailPage() {
  const params = useParams();
  const workId = params.workId as string;
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/works/${workId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then(setWork)
      .finally(() => setLoading(false));
  }, [workId]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/works/${workId}/analyze`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      // Refresh work data
      const updated = await fetch(`/api/works/${workId}`, {
        headers: authHeaders(),
      }).then((r) => r.json());
      setWork(updated);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!work) {
    return <p className="text-gray-500">Work not found.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/works"
              className="text-sm text-indigo-600 hover:underline"
            >
              My Works
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold text-gray-900">{work.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{work.contentType.replace("_", " ")}</span>
            {work.genre && <span>· {work.genre}</span>}
            {work.wordCount && (
              <span>· {work.wordCount.toLocaleString()} words</span>
            )}
          </div>
        </div>
        <StatusBadge status={work.status} />
      </div>

      {/* Description */}
      {work.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{work.description}</p>
      )}

      {/* Quick nav */}
      <div className="flex gap-3">
        <Link
          href={`/dashboard/works/${workId}/visualize`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          🎨 Visualizations ({work._count.visualizations})
        </Link>
        <Link
          href={`/dashboard/works/${workId}/rights`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          🔒 Rights & Licensing
        </Link>
        {work.rights?.allowPublicPreview && (
          <a
            href={`/works/${workId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            👁️ Public Preview
          </a>
        )}
      </div>

      {/* Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">AI Analysis</h2>
        {!work.analysis && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Run AI analysis to extract characters, scenes, and themes — and
              generate visualizations.
            </p>
            {analyzeError && (
              <p className="text-sm text-red-600">{analyzeError}</p>
            )}
            <button
              onClick={handleAnalyze}
              disabled={analyzing || work.status !== "READY"}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {analyzing ? "Analyzing…" : "Analyze Work"}
            </button>
          </div>
        )}
        {work.analysis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={work.analysis.status} />
              {work.analysis.genre && (
                <span className="text-sm text-gray-600">
                  Genre: <span className="font-medium">{work.analysis.genre}</span>
                  {work.analysis.genreConfidence != null && (
                    <span className="text-gray-400 ml-1">
                      ({Math.round(work.analysis.genreConfidence * 100)}% confidence)
                    </span>
                  )}
                </span>
              )}
            </div>
            {work.analysis.themes && work.analysis.themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {work.analysis.themes.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rights summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Rights</h2>
          <Link
            href={`/dashboard/works/${workId}/rights`}
            className="text-sm text-indigo-600 hover:underline"
          >
            Edit
          </Link>
        </div>
        {work.rights ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400">License</dt>
              <dd className="font-medium text-gray-800">
                {work.rights.licenseType.replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Public Preview</dt>
              <dd className="font-medium text-gray-800">
                {work.rights.allowPublicPreview ? "Enabled" : "Disabled"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">DRM</dt>
              <dd className="font-medium text-gray-800">
                {work.rights.drmEnabled
                  ? `On (${work.rights.previewWordLimit} word limit)`
                  : "Off"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Watermark</dt>
              <dd className="font-medium text-gray-800">
                {work.rights.watermarkEnabled ? "Enabled" : "Disabled"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-400">No rights record</p>
        )}
        {work.contentHash && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Content Hash (SHA-256)</p>
            <code className="text-xs text-gray-600 font-mono break-all">
              {work.contentHash}
            </code>
          </div>
        )}
      </div>

      {/* Access stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">Access Stats</h2>
        <p className="text-3xl font-bold text-gray-900">{work._count.accessLogs}</p>
        <p className="text-sm text-gray-500">total preview views</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    READY: "bg-green-50 text-green-700",
    PROCESSING: "bg-yellow-50 text-yellow-700",
    UPLOADING: "bg-blue-50 text-blue-700",
    FAILED: "bg-red-50 text-red-700",
    PENDING: "bg-gray-100 text-gray-600",
    GENERATED: "bg-green-50 text-green-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
