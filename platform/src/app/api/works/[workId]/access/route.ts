import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromToken } from "@/lib/auth/session";

type Params = { params: Promise<{ workId: string }> };

// POST /api/works/[workId]/access — log a public preview access event
export async function POST(request: NextRequest, { params }: Params) {
  const { workId } = await params;

  // Verify work exists and has public preview enabled
  const work = await prisma.work.findFirst({
    where: { id: workId, status: "READY" },
    include: { rights: { select: { allowPublicPreview: true } } },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!work.rights?.allowPublicPreview) {
    return NextResponse.json({ error: "Preview not available" }, { status: 403 });
  }

  // Get viewer IP — anonymize to first 3 octets
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ipPrefix = rawIp.split(".").slice(0, 3).join(".");

  // Optional authenticated viewer
  const viewer = await getUserFromToken(request.headers.get("Authorization"));

  let body: { fingerprint?: string; previewDepth?: number } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  await prisma.accessLog.create({
    data: {
      workId,
      viewerId: viewer?.id ?? null,
      viewerIpPrefix: ipPrefix !== "unknown" ? ipPrefix : null,
      viewerFingerprint: body.fingerprint ?? null,
      previewDepth: body.previewDepth ?? 0,
      referrer: request.headers.get("referer") ?? null,
      userAgent: request.headers.get("user-agent") ?? null,
    },
  });

  return NextResponse.json({ logged: true });
}

// GET /api/works/[workId]/access — author retrieves access log (paginated)
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  // Verify ownership
  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = Math.min(
    parseInt(request.nextUrl.searchParams.get("pageSize") ?? "50", 10),
    200
  );
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      where: { workId },
      orderBy: { accessedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.accessLog.count({ where: { workId } }),
  ]);

  return NextResponse.json({ data: logs, total, page, pageSize });
}
