import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromToken } from "@/lib/auth/session";
import { getPresignedUploadUrl, manuscriptKey } from "@/lib/storage/s3";
import type { CreateWorkRequest, CreateWorkResponse } from "@/types/api";

const ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const FREE_TIER_MAX_WORKS = parseInt(
  process.env.FREE_TIER_MAX_WORKS ?? "3",
  10
);
const FREE_TIER_MAX_FILE_BYTES =
  parseInt(process.env.FREE_TIER_MAX_FILE_SIZE_MB ?? "5", 10) * 1024 * 1024;

// GET /api/works — list the authenticated author's works
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = Math.min(
    parseInt(request.nextUrl.searchParams.get("pageSize") ?? "20", 10),
    100
  );
  const skip = (page - 1) * pageSize;

  const [works, total] = await Promise.all([
    prisma.work.findMany({
      where: { authorId: user.id },
      orderBy: { uploadedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        rights: { select: { licenseType: true, allowPublicPreview: true } },
        analysis: { select: { status: true, genre: true, genreConfidence: true } },
        _count: { select: { visualizations: true, accessLogs: true } },
      },
    }),
    prisma.work.count({ where: { authorId: user.id } }),
  ]);

  return NextResponse.json({ data: works, total, page, pageSize });
}

// POST /api/works — create a work record and return a presigned upload URL
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CreateWorkRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, genre, contentType, description, fileName, fileSize, mimeType } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: .txt, .pdf, .docx" },
      { status: 422 }
    );
  }

  // Enforce free tier limits
  if (user.planTier === "FREE") {
    if (fileSize > FREE_TIER_MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Free tier file size limit is ${process.env.FREE_TIER_MAX_FILE_SIZE_MB ?? 5}MB` },
        { status: 422 }
      );
    }
    const workCount = await prisma.work.count({ where: { authorId: user.id } });
    if (workCount >= FREE_TIER_MAX_WORKS) {
      return NextResponse.json(
        { error: `Free tier is limited to ${FREE_TIER_MAX_WORKS} works. Upgrade to Pro for unlimited works.` },
        { status: 422 }
      );
    }
  }

  // Determine file extension from MIME type
  const extMap: Record<string, string> = {
    "text/plain": "txt",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
  };
  const ext = extMap[mimeType] ?? "bin";

  // Create work record (status = UPLOADING)
  const work = await prisma.work.create({
    data: {
      authorId: user.id,
      title: title.trim(),
      genre: genre?.trim() ?? null,
      contentType: contentType ?? "BOOK",
      description: description?.trim() ?? null,
      status: "UPLOADING",
      storageKey: "pending", // Updated after we have the ID
    },
  });

  const key = manuscriptKey(user.id, work.id, ext);

  // Update with real storage key
  await prisma.work.update({
    where: { id: work.id },
    data: { storageKey: key },
  });

  // Create default rights record
  await prisma.rightsRecord.create({
    data: {
      workId: work.id,
      licenseType: "ALL_RIGHTS_RESERVED",
      watermarkEnabled: true,
      drmEnabled: true,
      allowPublicPreview: false,
      previewWordLimit: 500,
    },
  });

  const uploadUrl = await getPresignedUploadUrl(key, mimeType);

  const response: CreateWorkResponse = {
    workId: work.id,
    uploadUrl,
    storageKey: key,
  };

  return NextResponse.json(response, { status: 201 });
}
