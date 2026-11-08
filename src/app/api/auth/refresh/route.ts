import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createAccessToken, createRefreshToken } from "@/lib/auth";

const REFRESH_COOKIE = "refresh_token";

function clearRefresh(response: NextResponse) {
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/api/auth" });
  response.cookies.set("access_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}

export async function POST(req: NextRequest) {
  const rawToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!rawToken) {
    return clearRefresh(NextResponse.json({ error: { code: "SESSION_EXPIRED", message: "Your session has ended. Sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } }));
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true, membership: { include: { organization: true } } },
  });

  if (!stored) {
    return clearRefresh(NextResponse.json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Your session has ended. Sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } }));
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    return clearRefresh(NextResponse.json({ error: { code: "REFRESH_TOKEN_REUSED", message: "For your security, this session has been signed out. Please sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } }));
  }

  if (stored.expiresAt <= new Date() || stored.user.status !== "active") {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    return clearRefresh(NextResponse.json({ error: { code: "SESSION_EXPIRED", message: "Your session has ended. Sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } }));
  }

  const membership = stored.membership &&
    stored.membership.status === "active" &&
    stored.membership.organization.status === "active"
      ? stored.membership
      : null;

  const nextRefreshToken = createRefreshToken();
  const nextHash = createHash("sha256").update(nextRefreshToken).digest("hex");
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (claimed.count !== 1) throw new Error("REFRESH_ALREADY_USED");

      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          familyId: stored.familyId,
          tokenHash: nextHash,
          membershipId: membership?.id ?? null,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: req.headers.get("user-agent")?.slice(0, 255),
        },
      });
    });
  } catch {
    await prisma.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    return clearRefresh(NextResponse.json({ error: { code: "SESSION_EXPIRED", message: "Your session has ended. Sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } }));
  }

  const accessToken = await createAccessToken({
    userId: stored.user.id,
    email: stored.user.email,
    fullName: stored.user.fullName,
    sessionId: stored.familyId,
    membershipId: membership?.id,
    organizationId: membership?.organizationId,
    role: membership?.role,
    mustChangePassword: stored.user.mustChangePassword,
  });

  const response = NextResponse.json({ message: "Session renewed." }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60, path: "/" });
  response.cookies.set(REFRESH_COOKIE, nextRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60, path: "/api/auth" });
  return response;
}
