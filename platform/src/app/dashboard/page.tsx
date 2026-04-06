"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/components/auth/AuthGuard";

interface WorkSummary {
  id: string;
  title: string;
  contentType: string;
  status: string;
  uploadedAt: string;
  _count: { visualizations: number; accessLogs: number };
  rights: { licenseType: string; allowPublicPreview: boolean } | null;
  analysis: { status: string; genre: string | null } | null;
}

export default function DashboardPage() {
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/works?pageSize=5", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setWorks(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalViews = works.reduce((sum, w) => sum + w._count.accessLogs, 0);
  const readyWorks = works.filter((w) => w.status === "READY").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your author workspace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Works", value: total, icon: "📚" },
          { label: "Ready", value: readyWorks, icon: "✅" },
          { label: "Preview Views", value: totalViews, icon: "👁️" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent works */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Works</h2>
          <Link
            href="/dashboard/works"
            className="text-sm text-indigo-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : works.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 text-sm mb-4">No works yet</p>
              <Link
                href="/dashboard/works/new"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Upload your first work
              </Link>
            </div>
          ) : (
            works.map((work) => (
              <Link
                key={work.id}
                href={`/dashboard/works/${work.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {work.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {work.contentType.replace("_", " ")} ·{" "}
                    {work.analysis?.genre ?? "Unanalyzed"} ·{" "}
                    {new Date(work.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={work.status} />
                  <span className="text-xs text-gray-400">
                    {work._count.accessLogs} views
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/works/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Upload new work
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    READY: "bg-green-50 text-green-700 border-green-200",
    PROCESSING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    UPLOADING: "bg-blue-50 text-blue-700 border-blue-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}
