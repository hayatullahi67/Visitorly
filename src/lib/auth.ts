import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-in-production-32chars"
);
const ACCESS_TOKEN_EXPIRY = "15m";

export type SessionPayload = {
  userId: number;
  email: string;
  fullName: string;
  sessionId: string;
  membershipId?: number;
  organizationId?: number;
  role?: Role;
  mustChangePassword?: boolean;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function createAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    fullName: payload.fullName,
    sessionId: payload.sessionId,
    membershipId: payload.membershipId,
    organizationId: payload.organizationId,
    role: payload.role,
    mustChangePassword: payload.mustChangePassword,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("visitorly-api")
    .setAudience("visitorly-web")
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/** Refresh tokens are random opaque values. Only their SHA-256 hashes are stored. */
export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "visitorly-api",
      audience: "visitorly-web",
    });

    if (
      typeof payload.userId !== "number" ||
      typeof payload.sessionId !== "string" ||
      !payload.sessionId ||
      typeof payload.email !== "string" ||
      typeof payload.fullName !== "string"
    ) return null;

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** A signed token is not enough: its session and account must still be active. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const session = await verifyAccessToken(token);
  if (!session) return null;

  const storedSession = await prisma.refreshToken.findFirst({
    where: {
      familyId: session.sessionId,
      userId: session.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { status: "active" },
    },
    select: { id: true },
  });

  if (!storedSession) return null;

  if (session.membershipId) {
    const membership = await prisma.membership.findFirst({
      where: {
        id: session.membershipId,
        userId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        status: "active",
        organization: { status: "active" },
      },
      select: { id: true },
    });
    if (!membership) return null;
  }

  return session;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session.role || !roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}

export async function getActiveMembership(userId: number) {
  return prisma.membership.findFirst({
    where: {
      userId,
      status: "active",
      organization: { status: "active" },
    },
    include: {
      organization: true,
      house: { include: { street: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
