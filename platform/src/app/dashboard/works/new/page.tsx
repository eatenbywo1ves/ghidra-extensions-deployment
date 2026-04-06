"use client";

import { useRouter } from "next/navigation";
import { UploadForm } from "@/components/works/UploadForm";

export default function NewWorkPage() {
  const router = useRouter();

  function handleSuccess(workId: string) {
    router.push(`/dashboard/works/${workId}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload a New Work</h1>
        <p className="mt-1 text-sm text-gray-500">
          After uploading, you can generate AI visualizations and configure rights.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <UploadForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
