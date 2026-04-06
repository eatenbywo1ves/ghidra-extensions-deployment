"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/components/auth/AuthGuard";

interface Work {
  id: string;
  title: string;
  contentType: string;
  genre: string | null;
  status: string;
  uploadedAt: string;
  wordCount: number | null;
  _count: { visualizations: number; accessLogs: number };
  rights: { licenseType: string; allowPublicPreview: boolean } | null;
}

export default function WorksLibraryPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/works?page=${page}&pageSize=${PAGE_SIZE}`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        setWorks(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Works</h1>
          <p className="mt-1 text-sm text-gray-500">{total} work{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/works/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          + Upload Work
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : works.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 px-8 py-16 text-center">
          <p className="text-gray-500 mb-4">
            You haven&apos;t uploaded any works yet
          </p>
          <Link
            href="/dashboard/works/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Upload your first work
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {works.map((work) => (
            <Link
              key={work.id}
              href={`/dashboard/works/${work.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-gray-900 truncate">
                      {work.title}
                    </h2>
                    <StatusBadge status={work.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span>{work.contentType.replace("_", " ")}</span>
                    {work.genre && <span>· {work.genre}</span>}
                    {work.wordCount && (
                      <span>· {work.wordCount.toLocaleString()} words</span>
                    )}
                    <span>· Uploaded {new Date(work.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400">
                    {work._count.visualizations} visual{work._count.visualizations !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-gray-400">
                    {work._count.accessLogs} preview view{work._count.accessLogs !== 1 ? "s" : ""}
                  </span>
                  {work.rights && (
                    <span className="text-xs text-indigo-600">
                      {work.rights.licenseType.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    READY: "bg-green-50 text-green-700",
    PROCESSING: "bg-yellow-50 text-yellow-700",
    UPLOADING: "bg-blue-50 text-blue-700",
    FAILED: "bg-red-50 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
