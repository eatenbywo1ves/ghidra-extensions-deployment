"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authHeaders } from "@/components/auth/AuthGuard";
import { RightsPanel } from "@/components/works/RightsPanel";
import { AccessLogTable } from "@/components/dashboard/AccessLogTable";
import type { LicenseType } from "@/lib/rights/licenses";

interface RightsData {
  licenseType: LicenseType;
  watermarkEnabled: boolean;
  watermarkText: string | null;
  drmEnabled: boolean;
  allowPublicPreview: boolean;
  previewWordLimit: number;
  certificateKey: string | null;
}

export default function RightsPage() {
  const params = useParams();
  const workId = params.workId as string;
  const [title, setTitle] = useState("");
  const [rights, setRights] = useState<RightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/works/${workId}`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`/api/rights/${workId}`, { headers: authHeaders() }).then((r) => r.json()),
    ]).then(([work, rightsData]) => {
      setTitle(work.title ?? "");
      setRights(rightsData);
    }).finally(() => setLoading(false));
  }, [workId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!rights) return <p className="text-gray-500">Rights record not found.</p>;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/works/${workId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          {title}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Rights & Licensing</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <RightsPanel workId={workId} initial={rights} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-6">Preview Access Log</h2>
        <AccessLogTable workId={workId} />
      </div>
    </div>
  );
}
