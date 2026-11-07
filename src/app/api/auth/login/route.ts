import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createAccessToken,
  createRefreshToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { randomUUID, createHash } from "crypto";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const isEmail = identifier.includes("@");

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase().trim() }
        : { phone: identifier.trim() },
      include: {
        memberships: {
          where: { status: { in: ["active", "pending"] } },
          include: {
            organization: true,
            house: { include: { street: true } },
          },
        },
      },
    });

    if (!user || user.status === "suspended") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email/phone or password",
          },
        },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email/phone or password",
          },
        },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const familyId = randomUUID();
    const refreshToken = await createRefreshToken({
      userId: user.id,
      familyId,
    });

    // Store hashed refresh token
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    // Prefer active membership, otherwise first one
    const activeMembership =
      user.memberships.find((m) => m.status === "active") ||
      user.memberships[0];

    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
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
      memberships: user.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          type: m.organization.type,
          status: m.organization.status,
        },
        house: m.house
          ? {
              id: m.house.id,
              number: m.house.number,
              street: m.house.street.name,
            }
          : null,
        assignedGate: m.assignedGate,
        shift: m.shift,
      })),
      accessToken,
      refreshToken,
    });

    // Set httpOnly cookies
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
