import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  createAccessToken,
  createRefreshToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, enforceRateLimit } from "@/lib/auth-security";

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required").max(120),
    email: z.string().trim().email("Enter a valid email address").max(254),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    role: z.enum(["resident", "estate_security", "estate_admin"]).default("resident"),
    // For estate_admin (ALL required)
    estateName: z.string().trim().max(150).optional(),
    address: z.string().trim().max(255).optional(),
    city: z.string().trim().max(100).optional(),
    totalHouses: z.coerce.number().int().optional(),
    // For resident & estate_security
    estateId: z.coerce.number().int().positive().optional(),
    organizationId: z.coerce.number().int().positive().optional(),
    streetId: z.coerce.number().int().positive().optional(),
    houseId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    const resolvedEstateId = data.estateId || data.organizationId;
    if (data.role === "estate_admin") {
      if (!data.estateName || data.estateName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estateName"],
          message: "Estate Name is required",
        });
      }
      if (!data.address || data.address.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Estate Physical Address is required",
        });
      }
      if (!data.city || data.city.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["city"],
          message: "City / State is required",
        });
      }
      if (!data.totalHouses || data.totalHouses < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalHouses"],
          message: "Total Number of Houses is required (at least 1)",
        });
      }
    } else if (data.role === "resident") {
      if (!resolvedEstateId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estateId"],
          message: "Estate selection is required",
        });
      }
      if (!data.streetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["streetId"],
          message: "Street selection is required",
        });
      }
      if (!data.houseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["houseId"],
          message: "House / Unit selection is required",
        });
      }
    } else if (data.role === "estate_security") {
      if (!resolvedEstateId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estateId"],
          message: "Estate selection is required",
        });
      }
    }
  });

export async function POST(req: NextRequest) {
  try {
    if (!(await enforceRateLimit("register:" + clientIp(req), 25, 60 * 60))) {
      return NextResponse.json(
        { error: { message: "Too many registration attempts. Try again later." } },
        { status: 429 }
      );
    }

    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] ||
        "Check your registration details and try again.";
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: firstError,
            details: fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const {
      fullName,
      password,
      role,
      estateName,
      address,
      city,
      totalHouses,
      streetId,
      houseId,
    } = parsed.data;
    const estateId = parsed.data.estateId || parsed.data.organizationId;
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone?.replace(/[\s().-]/g, "") || null;

    // Validate target estate & house for resident / estate_security before creating user
    if (role === "resident" || role === "estate_security") {
      const targetEstate = await prisma.organization.findFirst({
        where: { id: estateId!, type: "estate", status: "active" },
      });
      if (!targetEstate) {
        return NextResponse.json(
          {
            error: {
              code: "ESTATE_NOT_FOUND",
              message: "The selected estate was not found or is not active.",
            },
          },
          { status: 404 }
        );
      }

      if (role === "resident") {
        const targetHouse = await prisma.house.findFirst({
          where: {
            id: houseId!,
            organizationId: estateId!,
            ...(streetId ? { streetId } : {}),
          },
        });
        if (!targetHouse) {
          return NextResponse.json(
            {
              error: {
                code: "HOUSE_NOT_FOUND",
                message:
                  "The selected street and house do not belong to this estate.",
              },
            },
          { status: 400 }
        );
      }
      }
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      const passwordMatches = await verifyPassword(
        password,
        existingByEmail.passwordHash
      );
      if (!passwordMatches) {
        return NextResponse.json(
          {
            error: {
              code: "EMAIL_IN_USE",
              message:
                "An account with this email already exists. Please sign in or enter your existing account password.",
            },
          },
          { status: 409 }
        );
      }
    } else if (phone) {
      const existingByPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingByPhone) {
        return NextResponse.json(
          {
            error: {
              code: "PHONE_IN_USE",
              message: "This phone number is already linked to another account.",
            },
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = existingByEmail
      ? existingByEmail.passwordHash
      : await hashPassword(password);

    const familyId = randomUUID();
    const refreshToken = createRefreshToken();
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

    const result = await prisma.$transaction(async (tx) => {
      const account = existingByEmail
        ? await tx.user.update({
            where: { id: existingByEmail.id },
            data: {
              emailVerifiedAt: existingByEmail.emailVerifiedAt || new Date(),
              lastLoginAt: new Date(),
            },
          })
        : await tx.user.create({
            data: {
              fullName: fullName.trim(),
              email,
              phone,
              passwordHash,
              emailVerifiedAt: new Date(),
              lastLoginAt: new Date(),
            },
          });

      let activeMembership: {
        id: number;
        organizationId: number;
        role: "resident" | "estate_security" | "estate_admin";
      } | null = null;

      if (role === "estate_admin") {
        const org = await tx.organization.create({
          data: {
            type: "estate",
            name: estateName!.trim(),
            address: address!.trim(),
            city: city!.trim(),
            totalHouses: totalHouses!,
            status: "pending",
            createdById: account.id,
          },
        });

        const adminMembership = await tx.membership.create({
          data: {
            userId: account.id,
            organizationId: org.id,
            role: "estate_admin",
            status: "active",
            reviewedById: account.id,
            reviewedAt: new Date(),
          },
        });

        activeMembership = {
          id: adminMembership.id,
          organizationId: org.id,
          role: "estate_admin",
        };
      } else {
        const existingMembership = await tx.membership.findUnique({
          where: {
            userId_organizationId_role: {
              userId: account.id,
              organizationId: estateId!,
              role,
            },
          },
        });

        if (existingMembership && existingMembership.status === "active") {
          throw new Error("ALREADY_ACTIVE_MEMBER");
        }

        if (existingMembership) {
          await tx.membership.update({
            where: { id: existingMembership.id },
            data: {
              status: "pending",
              houseId: role === "resident" ? houseId! : null,
              reviewedById: null,
              reviewedAt: null,
            },
          });
        } else {
          await tx.membership.create({
            data: {
              userId: account.id,
              organizationId: estateId!,
              role,
              status: "pending",
              houseId: role === "resident" ? houseId! : null,
            },
          });
        }
      }

      await tx.refreshToken.create({
        data: {
          userId: account.id,
          familyId,
          tokenHash,
          membershipId: activeMembership?.id ?? null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: req.headers.get("user-agent")?.slice(0, 255),
        },
      });

      return {
        user: {
          id: account.id,
          fullName: account.fullName,
          email: account.email,
          emailVerifiedAt: account.emailVerifiedAt,
        },
        activeMembership,
      };
    });

    const accessToken = await createAccessToken({
      userId: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      sessionId: familyId,
      membershipId: result.activeMembership?.id,
      organizationId: result.activeMembership?.organizationId,
      role: result.activeMembership?.role,
      mustChangePassword: false,
    });

    const redirectTo = role === "estate_admin" ? "/admin" : "/pending";

    const response = NextResponse.json(
      {
        message:
          role === "estate_admin"
            ? "Your estate and administrator account have been created and are pending Super Admin verification."
            : "Your registration and estate membership request have been submitted for approval.",
        user: result.user,
        emailAlreadyVerified: true,
        redirectTo,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );

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
  } catch (error: any) {
    if (error?.message === "ALREADY_ACTIVE_MEMBER") {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_ACTIVE_MEMBER",
            message: "You are already an active member of this estate with that role.",
          },
        },
        { status: 409 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_EXISTS",
            message: "An account with these details already exists.",
          },
        },
        { status: 409 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
          detail: error?.message || String(error),
        },
      },
      { status: 500 }
    );
  }
}
