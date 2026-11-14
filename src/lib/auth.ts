import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error("JWT_SECRET must be set to at least 32 characters in production.");
}
const JWT_SECRET = new TextEncoder().encode(
  configuredSecret || "local-development-secret-change-before-deploy-123456"
);
const ACCESS_TOKEN_EXPIRY = "15m";

export type SessionPayload = {
  userId: number;
  email: string;
  fullName: string;
  sessionId: string;
  isSuperAdmin?: boolean;
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
    isSuperAdmin: payload.isSuperAdmin,
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
    const allowedOrgStatuses =
      session.role === "estate_admin" ? ["active", "pending", "suspended"] : ["active"];
    const membership = await prisma.membership.findFirst({
      where: {
        id: session.membershipId,
        userId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        status: "active",
        organization: { status: { in: allowedOrgStatuses as ("active" | "pending" | "suspended")[] } },
      },
      select: {
        id: true,
        organization: { select: { id: true, status: true, activeUntil: true } },
      },
    });
    if (!membership) return null;

    if (
      membership.organization.status === "active" &&
      membership.organization.activeUntil &&
      new Date() > membership.organization.activeUntil
    ) {
      await prisma.organization.update({
        where: { id: membership.organization.id },
        data: { status: "suspended" },
      });
      if (session.role !== "estate_admin") {
        return null;
      }
    }
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

export async function requireActiveEstateAdmin(): Promise<SessionPayload> {
  const session = await requireRole("estate_admin");
  if (!session.organizationId) throw new Error("FORBIDDEN");

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { id: true, status: true, activeUntil: true },
  });
  if (!org) throw new Error("FORBIDDEN");

  if (org.status === "pending") {
    throw new Error("ESTATE_PENDING");
  }
  if (org.status === "suspended" || org.status === "rejected") {
    throw new Error("ESTATE_DEACTIVATED");
  }
  if (org.activeUntil && new Date() > org.activeUntil) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { status: "suspended" },
    });
    throw new Error("ESTATE_EXPIRED");
  }

  return session;
}

export function getEstateAccessErrorMessage(code: string): string | null {
  switch (code) {
    case "ESTATE_PENDING":
      return "Your estate is pending Super Admin verification. You cannot perform this action until your estate is activated.";
    case "ESTATE_DEACTIVATED":
      return "Your estate access has been deactivated by the Super Admin.";
    case "ESTATE_EXPIRED":
      return "Your estate activation timeframe has expired. Contact the Super Admin to reactivate.";
    default:
      return null;
  }
}

export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true, status: true },
  });
  if (!user || user.status !== "active" || !user.isSuperAdmin) {
    throw new Error("FORBIDDEN");
  }
  return { ...session, isSuperAdmin: true };
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
