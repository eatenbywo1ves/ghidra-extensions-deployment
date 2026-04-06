"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Account</h2>
        <p className="text-sm text-gray-500">
          Profile editing and password changes are coming soon.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Plan</h2>
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
          <p className="text-sm font-medium text-indigo-900">Free Plan</p>
          <p className="text-xs text-indigo-700 mt-1">
            Up to 3 works · 5MB per work · 1 visualization set per work
          </p>
        </div>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
