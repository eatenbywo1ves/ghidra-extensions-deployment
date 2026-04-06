"use client";

import { useState } from "react";
import { authHeaders } from "@/components/auth/AuthGuard";
import { LICENSES, type LicenseType } from "@/lib/rights/licenses";

interface RightsData {
  licenseType: LicenseType;
  watermarkEnabled: boolean;
  watermarkText: string | null;
  drmEnabled: boolean;
  allowPublicPreview: boolean;
  previewWordLimit: number;
  certificateKey: string | null;
}

interface RightsPanelProps {
  workId: string;
  initial: RightsData;
}

export function RightsPanel({ workId, initial }: RightsPanelProps) {
  const [rights, setRights] = useState<RightsData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rights/${workId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(rights),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const license = LICENSES[rights.licenseType];

  return (
    <div className="space-y-8">
      {/* License Selection */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3">License</h3>
        <div className="grid gap-3">
          {(Object.keys(LICENSES) as LicenseType[]).map((id) => {
            const l = LICENSES[id];
            return (
              <label
                key={id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  rights.licenseType === id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <input
                  type="radio"
                  name="license"
                  value={id}
                  checked={rights.licenseType === id}
                  onChange={() =>
                    setRights((r) => ({ ...r, licenseType: id }))
                  }
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {l.shortName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{l.description}</p>
                  {l.url && (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View license
                    </a>
                  )}
                </div>
              </label>
            );
          })}
        </div>
        {license && (
          <div className="mt-3 flex flex-wrap gap-2">
            {license.requiresAttribution && (
              <Badge color="blue">Attribution required</Badge>
            )}
            {license.allowsCommercialUse ? (
              <Badge color="green">Commercial use allowed</Badge>
            ) : (
              <Badge color="red">No commercial use</Badge>
            )}
            {license.allowsDerivatives ? (
              <Badge color="green">Derivatives allowed</Badge>
            ) : (
              <Badge color="red">No derivatives</Badge>
            )}
            {license.requiresShareAlike && (
              <Badge color="yellow">Share-alike required</Badge>
            )}
          </div>
        )}
      </section>

      {/* Watermarking */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Watermarking</h3>
        <Toggle
          label="Embed copyright watermark in generated visuals"
          checked={rights.watermarkEnabled}
          onChange={(v) => setRights((r) => ({ ...r, watermarkEnabled: v }))}
        />
        {rights.watermarkEnabled && (
          <div className="mt-3">
            <label className="block text-sm text-gray-700 mb-1">
              Watermark text{" "}
              <span className="text-gray-400">(leave blank for default)</span>
            </label>
            <input
              type="text"
              value={rights.watermarkText ?? ""}
              onChange={(e) =>
                setRights((r) => ({
                  ...r,
                  watermarkText: e.target.value || null,
                }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="© 2024 Your Name"
            />
          </div>
        )}
      </section>

      {/* DRM / Public Preview */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Public Preview
        </h3>
        <Toggle
          label="Allow public preview of this work"
          checked={rights.allowPublicPreview}
          onChange={(v) => setRights((r) => ({ ...r, allowPublicPreview: v }))}
        />
        {rights.allowPublicPreview && (
          <div className="mt-3 space-y-3">
            <Toggle
              label="Enable DRM (server-side content truncation)"
              checked={rights.drmEnabled}
              onChange={(v) => setRights((r) => ({ ...r, drmEnabled: v }))}
            />
            {rights.drmEnabled && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Preview word limit:{" "}
                  <span className="font-medium">{rights.previewWordLimit} words</span>
                </label>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={rights.previewWordLimit}
                  onChange={(e) =>
                    setRights((r) => ({
                      ...r,
                      previewWordLimit: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>100 words</span>
                  <span>5,000 words</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Save */}
      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
          {error}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save Rights Settings"}
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "blue" | "green" | "red" | "yellow";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}
    >
      {children}
    </span>
  );
}
