import { jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/db/client";
import type { User } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production"
);

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
}

/**
 * Verify a locally-issued JWT token (the JWT fallback auth path).
 * Returns the decoded payload or null if invalid.
 */
export async function verifyJwt(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.userId || !payload.email) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Extract the bearer token from an Authorization header.
 */
export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

/**
 * Resolve a User from a request's Authorization header (JWT path).
 * Returns null if the token is missing, invalid, or the user does not exist.
 */
export async function getUserFromToken(
  authHeader: string | null
): Promise<User | null> {
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  const payload = await verifyJwt(token);
  if (!payload?.userId) return null;

  return prisma.user.findUnique({ where: { id: payload.userId } });
}
