import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromToken } from "@/lib/auth/session";
import { deleteObject } from "@/lib/storage/s3";
import type { UpdateWorkRequest } from "@/types/api";

type Params = { params: Promise<{ workId: string }> };

// GET /api/works/[workId]
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
    include: {
      rights: true,
      analysis: true,
      visualizations: {
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { accessLogs: true } },
    },
  });

  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(work);
}

// PATCH /api/works/[workId] — update metadata or status after upload
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: UpdateWorkRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.work.update({
    where: { id: workId },
    data: {
      ...(body.title && { title: body.title.trim() }),
      ...(body.genre !== undefined && { genre: body.genre?.trim() ?? null }),
      ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
      ...(body.status && { status: body.status }),
      ...(body.contentHash && { contentHash: body.contentHash }),
      ...(body.wordCount !== undefined && { wordCount: body.wordCount }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/works/[workId]
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
    include: { visualizations: true },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete S3 objects
  const keysToDelete = [
    work.storageKey,
    ...work.visualizations.map((v) => v.storageKey).filter(Boolean) as string[],
  ];

  await Promise.allSettled(keysToDelete.map((key) => deleteObject(key)));

  // Cascade delete via DB (Prisma onDelete: Cascade covers related records)
  await prisma.work.delete({ where: { id: workId } });

  return new NextResponse(null, { status: 204 });
}
