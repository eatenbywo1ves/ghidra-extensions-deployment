"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { authHeaders } from "@/components/auth/AuthGuard";
import type { VisualizationStatus } from "@/types/api";

interface VisualizationGalleryProps {
  workId: string;
  analysisData?: {
    scenes?: Array<{ title: string; setting: string; mood: string }>;
    characters?: Array<{ name: string; role: string }>;
    typographyMood?: string;
    narrativeArc?: string;
    themes?: string[];
  } | null;
}

export function VisualizationGallery({
  workId,
  analysisData,
}: VisualizationGalleryProps) {
  const [visualizations, setVisualizations] = useState<VisualizationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchVisualizations = useCallback(async () => {
    try {
      const res = await fetch(`/api/visualizations/${workId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data: VisualizationStatus[] = await res.json();
        setVisualizations(data);
        // Continue polling if any are still pending
        const hasPending = data.some((v) => v.status === "PENDING");
        setPolling(hasPending);
      }
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    fetchVisualizations();
  }, [fetchVisualizations]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchVisualizations, 3000);
    return () => clearInterval(interval);
  }, [polling, fetchVisualizations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (visualizations.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 px-8 py-12 text-center">
        <p className="text-gray-500 text-sm">
          No visualizations yet. Click &quot;Analyze Work&quot; to generate them.
        </p>
      </div>
    );
  }

  const coverArt = visualizations.find((v) => v.type === "COVER_ART");
  const portraits = visualizations.filter((v) => v.type === "CHARACTER_PORTRAIT");
  const scenes = visualizations.filter((v) => v.type === "SCENE_ILLUSTRATION");
  const typography = visualizations.find((v) => v.type === "TYPOGRAPHY_PREVIEW");
  const readingFlow = visualizations.find((v) => v.type === "READING_FLOW");

  return (
    <div className="space-y-10">
      {/* Cover Art */}
      {coverArt && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cover Art Concept</h3>
          <VizCard viz={coverArt} aspectRatio="2/3" />
        </section>
      )}

      {/* Character Portraits */}
      {portraits.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Character Portraits
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portraits.map((viz, i) => (
              <VizCard
                key={viz.id}
                viz={viz}
                label={analysisData?.characters?.[i]?.name}
                aspectRatio="1/1"
              />
            ))}
          </div>
        </section>
      )}

      {/* Scene Illustrations */}
      {scenes.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Scene Illustrations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenes.map((viz, i) => (
              <VizCard
                key={viz.id}
                viz={viz}
                label={analysisData?.scenes?.[i]?.title}
                aspectRatio="16/9"
              />
            ))}
          </div>
        </section>
      )}

      {/* Typography Preview */}
      {typography && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Typography Mood
          </h3>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-sm text-gray-600 italic mb-3">
              {analysisData?.typographyMood ?? typography.prompt}
            </p>
            <div className="flex flex-wrap gap-3">
              {["serif", "sans-serif", "display", "monospace"].map((family) => (
                <div
                  key={family}
                  className="rounded-md bg-white border border-gray-200 px-4 py-3 shadow-sm"
                  style={{ fontFamily: family }}
                >
                  <p className="text-lg">The quick brown fox</p>
                  <p className="text-xs text-gray-400 mt-1">{family}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reading Flow Diagram */}
      {readingFlow && analysisData?.scenes && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Narrative Flow
          </h3>
          <ReadingFlowDiagram
            scenes={analysisData.scenes}
            arc={analysisData.narrativeArc}
            themes={analysisData.themes ?? []}
          />
        </section>
      )}
    </div>
  );
}

function VizCard({
  viz,
  label,
  aspectRatio,
}: {
  viz: VisualizationStatus;
  label?: string;
  aspectRatio: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
      <div
        className="relative bg-gray-100"
        style={{ aspectRatio }}
      >
        {viz.status === "PENDING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
            <p className="text-xs text-gray-400">Generating…</p>
          </div>
        )}
        {viz.status === "FAILED" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-red-400">Generation failed</p>
          </div>
        )}
        {viz.status === "GENERATED" && viz.url && (
          <Image
            src={viz.url}
            alt={label ?? viz.type}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
      </div>
      {(label || viz.prompt) && (
        <div className="px-3 py-2">
          {label && (
            <p className="text-sm font-medium text-gray-800">{label}</p>
          )}
          {viz.prompt && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
              {viz.prompt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReadingFlowDiagram({
  scenes,
  arc,
  themes,
}: {
  scenes: Array<{ title: string; setting: string; mood: string }>;
  arc?: string;
  themes: string[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 overflow-x-auto">
      <div className="flex items-start gap-2 min-w-max">
        {scenes.map((scene, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-3 w-3 rounded-full ring-2 ${
                  i === 0
                    ? "bg-indigo-600 ring-indigo-200"
                    : i === scenes.length - 1
                    ? "bg-emerald-600 ring-emerald-200"
                    : "bg-amber-500 ring-amber-200"
                }`}
              />
              <div className="w-28 rounded-md border border-gray-200 bg-gray-50 p-2 text-center">
                <p className="text-xs font-medium text-gray-800 line-clamp-1">
                  {scene.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {scene.setting}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-xs ${moodColor(scene.mood)}`}
                >
                  {scene.mood}
                </span>
              </div>
            </div>
            {i < scenes.length - 1 && (
              <div className="h-0.5 w-8 bg-gray-300 flex-shrink-0 mt-3" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {arc && (
          <span className="text-xs text-gray-500">
            Arc: <span className="font-medium">{arc}</span>
          </span>
        )}
        {themes.slice(0, 5).map((t) => (
          <span
            key={t}
            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function moodColor(mood: string): string {
  const m = mood.toLowerCase();
  if (m.includes("dark") || m.includes("tense") || m.includes("fear")) {
    return "bg-red-100 text-red-700";
  }
  if (m.includes("hopeful") || m.includes("joy") || m.includes("triumph")) {
    return "bg-green-100 text-green-700";
  }
  if (m.includes("melanchol") || m.includes("sad")) {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-gray-100 text-gray-600";
}
