import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/client";
import { createHash } from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production"
);

/** Minimal password hash for local JWT auth (dev/self-hosted only) */
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; name?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, name, action = "login" } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const emailLower = email.toLowerCase().trim();
  const passwordHash = hashPassword(password);

  if (action === "register") {
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: emailLower,
        name: name?.trim() ?? null,
        authProvider: "JWT",
        externalId: passwordHash, // Store hash as externalId for JWT path
      },
    });

    const token = await issueToken(user.id, user.email);
    return NextResponse.json({ token, userId: user.id }, { status: 201 });
  }

  // Login
  const user = await prisma.user.findFirst({
    where: { email: emailLower, authProvider: "JWT", externalId: passwordHash },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = await issueToken(user.id, user.email);
  return NextResponse.json({ token, userId: user.id });
}

async function issueToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}
