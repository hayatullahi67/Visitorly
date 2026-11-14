import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, hashPassword, requireActiveEstateAdmin, requireRole } from "@/lib/auth";
import type { MembershipStatus, Prisma, Role } from "@prisma/client";

const createMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Starting password must be at least 8 characters")
    .max(128)
    .optional()
    .or(z.literal("")),
  role: z.enum(["resident", "estate_security"]),
  houseId: z.coerce.number().int().positive().optional().nullable(),
  assignedGate: z.string().trim().max(60).optional().nullable(),
  shift: z.string().trim().max(60).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("estate_admin");
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orgId = session.organizationId;
    const roleParam = req.nextUrl.searchParams.get("role");
    const statusParam = req.nextUrl.searchParams.get("status");
    const streetIdParam = req.nextUrl.searchParams.get("streetId");
    const searchParam = req.nextUrl.searchParams.get("search")?.trim() || "";

    const where: Prisma.MembershipWhereInput = {
      organizationId: orgId,
      role:
        roleParam === "resident" || roleParam === "estate_security" || roleParam === "estate_admin"
          ? (roleParam as Role)
          : { in: ["resident", "estate_security"] },
    };

    if (
      statusParam === "pending" ||
      statusParam === "active" ||
      statusParam === "suspended" ||
      statusParam === "rejected"
    ) {
      where.status = statusParam as MembershipStatus;
    }

    if (streetIdParam && Number.isInteger(Number(streetIdParam))) {
      where.house = { streetId: Number(streetIdParam) };
    }

    if (searchParam) {
      where.OR = [
        { user: { fullName: { contains: searchParam, mode: "insensitive" } } },
        { user: { email: { contains: searchParam, mode: "insensitive" } } },
        { user: { phone: { contains: searchParam, mode: "insensitive" } } },
        { house: { number: { contains: searchParam, mode: "insensitive" } } },
        { house: { street: { name: { contains: searchParam, mode: "insensitive" } } } },
        { assignedGate: { contains: searchParam, mode: "insensitive" } },
      ];
    }

    const memberships = await prisma.membership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        house: {
          include: {
            street: true,
          },
        },
        requestedHouse: {
          include: {
            street: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      {
        members: memberships.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          status: m.status,
          assignedGate: m.assignedGate,
          shift: m.shift,
          changeRequestedAt: m.changeRequestedAt,
          reviewedAt: m.reviewedAt,
          createdAt: m.createdAt,
          user: m.user,
          house: m.house
            ? {
                id: m.house.id,
                number: m.house.number,
                streetId: m.house.streetId,
                street: m.house.street.name,
              }
            : null,
          requestedHouse: m.requestedHouse
            ? {
                id: m.requestedHouse.id,
                number: m.requestedHouse.number,
                streetId: m.requestedHouse.streetId,
                street: m.requestedHouse.street.name,
              }
            : null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    const estateErr = getEstateAccessErrorMessage(error?.message);
    if (estateErr) {
      return NextResponse.json(
        { error: { code: error.message, message: estateErr } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Administrator access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("GET /api/estate/admin/members error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load estate members." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = createMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please fill in all required member details accurately.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orgId = session.organizationId;
    const {
      fullName,
      email,
      phone,
      password,
      role,
      houseId,
      assignedGate,
      shift,
    } = parsed.data;

    const normalizedPhone = phone ? phone.replace(/[\s().-]/g, "") : null;

    if (role === "resident") {
      if (!houseId) {
        return NextResponse.json(
          {
            error: {
              code: "HOUSE_REQUIRED",
              message: "Please select a street and house for this resident.",
            },
          },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      const validHouse = await prisma.house.findFirst({
        where: { id: houseId, organizationId: orgId },
      });

      if (!validHouse) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_HOUSE",
              message: "The selected house does not belong to your estate.",
            },
          },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser && (!password || password.length < 8)) {
      return NextResponse.json(
        {
          error: {
            code: "PASSWORD_REQUIRED",
            message:
              "Please provide a starting password (at least 8 characters) for this new account.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!existingUser && normalizedPhone) {
      const phoneTaken = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });
      if (phoneTaken) {
        return NextResponse.json(
          {
            error: {
              code: "PHONE_IN_USE",
              message: "That phone number is already linked to another user account.",
            },
          },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const createdOrUpdated = await prisma.$transaction(async (tx) => {
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
              ...(passwordHash
                ? { passwordHash, mustChangePassword: true }
                : {}),
            },
          })
        : await tx.user.create({
            data: {
              fullName,
              email,
              phone: normalizedPhone,
              passwordHash: passwordHash!,
              emailVerifiedAt: new Date(),
              mustChangePassword: true,
              status: "active",
            },
          });

      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_organizationId_role: {
            userId: user.id,
            organizationId: orgId,
            role,
          },
        },
      });

      const membership = existingMembership
        ? await tx.membership.update({
            where: { id: existingMembership.id },
            data: {
              status: "active",
              houseId: role === "resident" ? houseId ?? null : null,
              assignedGate: role === "estate_security" ? assignedGate || null : null,
              shift: role === "estate_security" ? shift || null : null,
              reviewedById: session.userId,
              reviewedAt: new Date(),
            },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  status: true,
                  lastLoginAt: true,
                  createdAt: true,
                },
              },
              house: { include: { street: true } },
            },
          })
        : await tx.membership.create({
            data: {
              userId: user.id,
              organizationId: orgId,
              role,
              status: "active",
              houseId: role === "resident" ? houseId ?? null : null,
              assignedGate: role === "estate_security" ? assignedGate || null : null,
              shift: role === "estate_security" ? shift || null : null,
              reviewedById: session.userId,
              reviewedAt: new Date(),
            },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  status: true,
                  lastLoginAt: true,
                  createdAt: true,
                },
              },
              house: { include: { street: true } },
            },
          });

      return membership;
    });

    return NextResponse.json(
      {
        message: `${
          role === "resident" ? "Resident" : "Security officer"
        } added and activated.`,
        member: {
          id: createdOrUpdated.id,
          userId: createdOrUpdated.userId,
          role: createdOrUpdated.role,
          status: createdOrUpdated.status,
          assignedGate: createdOrUpdated.assignedGate,
          shift: createdOrUpdated.shift,
          user: createdOrUpdated.user,
          house: createdOrUpdated.house
            ? {
                id: createdOrUpdated.house.id,
                number: createdOrUpdated.house.number,
                streetId: createdOrUpdated.house.streetId,
                street: createdOrUpdated.house.street.name,
              }
            : null,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    const estateErr = getEstateAccessErrorMessage(error?.message);
    if (estateErr) {
      return NextResponse.json(
        { error: { code: error.message, message: estateErr } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Administrator access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("POST /api/estate/admin/members error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to create member account." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
