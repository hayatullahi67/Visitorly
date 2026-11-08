import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createAccessToken, createRefreshToken, verifyPassword } from "@/lib/auth";
import { clientIp, enforceRateLimit } from "@/lib/auth-security";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone is required").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { identifier, password } = parsed.data;
    const rateKey = "login:" + clientIp(req);
    if (!(await enforceRateLimit(rateKey, 10, 15 * 60)) || !(await enforceRateLimit("login-identifier:" + identifier.toLowerCase(), 8, 15 * 60))) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Please wait and try again." } }, { status: 429, headers: { "Cache-Control": "no-store" } });
    const isEmail = identifier.includes("@");
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { phone: identifier.replace(/[\s().-]/g, "") },
      include: {
        memberships: {
          where: { status: { in: ["active", "pending"] } },
          include: { organization: true, house: { include: { street: true } } },
        },
      },
    });

    if (!user || user.status !== "active" || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email/phone or password" } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!user.emailVerifiedAt) return NextResponse.json({ error: { code: "EMAIL_NOT_VERIFIED", message: "Verify your email address before signing in." } }, { status: 403, headers: { "Cache-Control": "no-store" } });

    const activeMembership = user.memberships.find(
      (membership) => membership.status === "active" && membership.organization.status === "active"
    );
    const familyId = randomUUID();
    const refreshToken = createRefreshToken();
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          familyId,
          tokenHash,
          membershipId: activeMembership?.id ?? null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: req.headers.get("user-agent")?.slice(0, 255),
        },
      }),
    ]);

    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      sessionId: familyId,
      membershipId: activeMembership?.id,
      organizationId: activeMembership?.organizationId,
      role: activeMembership?.role,
      mustChangePassword: user.mustChangePassword,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword,
        emailVerified: !!user.emailVerifiedAt,
      },
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          type: membership.organization.type,
          status: membership.organization.status,
        },
        house: membership.house
          ? { id: membership.house.id, number: membership.house.number, street: membership.house.street.name }
          : null,
        assignedGate: membership.assignedGate,
        shift: membership.shift,
      })),
    }, { headers: { "Cache-Control": "no-store" } });

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/api/auth",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
