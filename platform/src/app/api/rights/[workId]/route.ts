import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromToken } from "@/lib/auth/session";
import type { UpdateRightsRequest } from "@/types/api";

const VALID_LICENSE_TYPES = new Set([
  "ALL_RIGHTS_RESERVED",
  "CC_BY",
  "CC_BY_SA",
  "CC_BY_NC",
  "CC_BY_ND",
  "CC_BY_NC_SA",
  "CC_BY_NC_ND",
  "PUBLIC_DOMAIN",
]);

type Params = { params: Promise<{ workId: string }> };

// GET /api/rights/[workId]
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
    include: { rights: true },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(work.rights);
}

// PATCH /api/rights/[workId]
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: UpdateRightsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.licenseType && !VALID_LICENSE_TYPES.has(body.licenseType)) {
    return NextResponse.json({ error: "Invalid licenseType" }, { status: 422 });
  }

  const updated = await prisma.rightsRecord.update({
    where: { workId },
    data: {
      ...(body.licenseType && { licenseType: body.licenseType as never }),
      ...(body.watermarkEnabled !== undefined && { watermarkEnabled: body.watermarkEnabled }),
      ...(body.watermarkText !== undefined && { watermarkText: body.watermarkText }),
      ...(body.drmEnabled !== undefined && { drmEnabled: body.drmEnabled }),
      ...(body.allowPublicPreview !== undefined && { allowPublicPreview: body.allowPublicPreview }),
      ...(body.previewWordLimit !== undefined && {
        previewWordLimit: Math.max(100, Math.min(body.previewWordLimit, 10000)),
      }),
    },
  });

  return NextResponse.json(updated);
}
