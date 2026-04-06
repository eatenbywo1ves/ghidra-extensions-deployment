import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getObjectText } from "@/lib/storage/s3";
import { truncateToWords, injectTextWatermark } from "@/lib/rights/provenance";
import { formatCopyrightLine } from "@/lib/rights/licenses";
import { WatermarkOverlay } from "@/components/watermark/WatermarkOverlay";
import type { LicenseType } from "@/lib/rights/licenses";
import { headers } from "next/headers";

interface Props {
  params: Promise<{ workId: string }>;
}

export default async function PublicWorkPreviewPage({ params }: Props) {
  const { workId } = await params;
  const headersList = await headers();

  const work = await prisma.work.findFirst({
    where: { id: workId, status: "READY" },
    include: {
      author: { select: { name: true, email: true } },
      rights: true,
    },
  });

  if (!work) notFound();
  if (!work.rights?.allowPublicPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Preview Not Available
          </h1>
          <p className="text-sm text-gray-500">
            The author has not enabled public preview for this work.
          </p>
        </div>
      </div>
    );
  }

  // Fetch and process manuscript content
  let previewText = "";
  let wasTruncated = false;
  try {
    const rawText = await getObjectText(work.storageKey);
    const { text, truncated } = truncateToWords(
      rawText,
      work.rights.drmEnabled ? work.rights.previewWordLimit : 999_999
    );
    previewText = text;
    wasTruncated = truncated;

    // Inject watermark if enabled
    if (work.rights.watermarkEnabled) {
      const authorName =
        work.author.name ?? work.author.email.split("@")[0] ?? "Author";
      const customText = work.rights.watermarkText ?? undefined;
      previewText = injectTextWatermark(
        previewText,
        authorName,
        new Date(work.uploadedAt).getFullYear(),
        customText
      );
    }
  } catch {
    previewText = "[Preview not available at this time]";
  }

  // Log access event (fire and forget)
  void logAccess(workId, headersList).catch(() => {});

  const authorName = work.author.name ?? work.author.email.split("@")[0] ?? "Author";
  const year = new Date(work.uploadedAt).getFullYear();
  const copyrightLine = formatCopyrightLine(
    authorName,
    year,
    work.rights.licenseType as LicenseType
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="text-sm font-semibold text-indigo-700">
            AuthorVault
          </a>
          <span className="text-xs text-gray-400">Public Preview</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Work metadata */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{work.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>By {authorName}</span>
            <span>·</span>
            <span>{work.contentType.replace("_", " ")}</span>
            {work.genre && (
              <>
                <span>·</span>
                <span>{work.genre}</span>
              </>
            )}
          </div>
          {work.description && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed italic">
              {work.description}
            </p>
          )}
        </div>

        {/* Preview banner */}
        {wasTruncated && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Preview only:</strong> showing first {work.rights.previewWordLimit.toLocaleString()} words.
            Contact the author to access the full work.
          </div>
        )}

        {/* Content */}
        <div className="relative">
          <div className="prose prose-gray prose-sm max-w-none">
            {previewText.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-4 leading-relaxed text-gray-800">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Visual watermark overlay (UX reinforcement only — DRM is server-side) */}
          {wasTruncated && (
            <WatermarkOverlay
              authorName={authorName}
              year={year}
              className="absolute inset-0"
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>{copyrightLine}</p>
          {work.rights.licenseType !== "ALL_RIGHTS_RESERVED" && (
            <p className="mt-1">
              This work is licensed under{" "}
              <span className="font-medium">
                {work.rights.licenseType.replace(/_/g, " ")}
              </span>
              .
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

async function logAccess(
  workId: string,
  headersList: Awaited<ReturnType<typeof headers>>
): Promise<void> {
  const rawIp =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipPrefix = rawIp.split(".").slice(0, 3).join(".");

  await prisma.accessLog.create({
    data: {
      workId,
      viewerIpPrefix: ipPrefix !== "unknown" ? ipPrefix : null,
      referrer: headersList.get("referer") ?? null,
      userAgent: headersList.get("user-agent") ?? null,
    },
  });
}

export async function generateMetadata({ params }: Props) {
  const { workId } = await params;
  const work = await prisma.work.findFirst({
    where: { id: workId, status: "READY" },
    include: { author: { select: { name: true } } },
  });
  if (!work) return {};
  return {
    title: `${work.title} — Preview | AuthorVault`,
    description: work.description ?? `Read a preview of "${work.title}" on AuthorVault`,
  };
}
