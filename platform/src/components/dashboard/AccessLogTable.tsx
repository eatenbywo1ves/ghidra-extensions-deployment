"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/components/auth/AuthGuard";

interface AccessLogEntry {
  id: string;
  viewerIpPrefix: string | null;
  viewerFingerprint: string | null;
  previewDepth: number;
  referrer: string | null;
  accessedAt: string;
}

interface AccessLogTableProps {
  workId: string;
}

export function AccessLogTable({ workId }: AccessLogTableProps) {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/works/${workId}/access?page=${page}&pageSize=${PAGE_SIZE}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setLogs(data.data);
          setTotal(data.total);
        }
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [workId, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {total} preview access event{total !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">
          No access events yet
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preview Depth
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referrer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {new Date(log.accessedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.viewerIpPrefix
                      ? `${log.viewerIpPrefix}.xxx`
                      : "Anonymous"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${log.previewDepth}%` }}
                        />
                      </div>
                      <span className="text-gray-600 text-xs">
                        {log.previewDepth}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {log.referrer ?? "Direct"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
