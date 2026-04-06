"use client";

interface WatermarkOverlayProps {
  authorName: string;
  year?: number;
  className?: string;
}

/**
 * Client-side visual reinforcement watermark overlay.
 * This is UX only — DRM truncation is enforced server-side.
 */
export function WatermarkOverlay({
  authorName,
  year = new Date().getFullYear(),
  className = "",
}: WatermarkOverlayProps) {
  const text = `© ${year} ${authorName}`;

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Diagonal tiled watermark */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.04]">
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <span
              key={`${row}-${col}`}
              className="absolute text-sm font-medium text-gray-900 whitespace-nowrap"
              style={{
                transform: "rotate(-30deg)",
                top: `${row * 14 + col * 3}%`,
                left: `${col * 20 - 5}%`,
              }}
            >
              {text}
            </span>
          ))
        )}
      </div>

      {/* Bottom fade gradient with copyright notice */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/90 to-transparent flex items-end px-4 pb-3">
        <p className="text-xs text-gray-500">{text} — Preview only</p>
      </div>
    </div>
  );
}
