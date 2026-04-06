"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authHeaders } from "@/components/auth/AuthGuard";
import { VisualizationGallery } from "@/components/visualizations/VisualizationGallery";

interface AnalysisData {
  scenes?: Array<{ title: string; setting: string; mood: string }>;
  characters?: Array<{ name: string; role: string }>;
  typographyMood?: string;
  narrativeArc?: string;
  themes?: string[];
}

export default function VisualizePage() {
  const params = useParams();
  const workId = params.workId as string;
  const [title, setTitle] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/works/${workId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title ?? "");
        if (data.analysis?.status === "GENERATED") {
          setAnalysis({
            scenes: data.analysis.scenes ?? [],
            characters: data.analysis.characters ?? [],
            typographyMood: data.analysis.typographyMood,
            narrativeArc: data.analysis.narrativeArc,
            themes: data.analysis.themes ?? [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [workId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/works/${workId}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          {title}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Visualizations</h1>
      </div>

      <VisualizationGallery workId={workId} analysisData={analysis} />
    </div>
  );
}
