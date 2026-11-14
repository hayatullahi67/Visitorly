import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAccessToken, getSession } from "@/lib/auth";

const createEstateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Estate Name is required")
    .max(150, "Estate name is too long"),
  address: z
    .string()
    .trim()
    .min(2, "Estate Physical Address is required")
    .max(255, "Address is too long"),
  city: z
    .string()
    .trim()
    .min(2, "City / State is required")
    .max(100, "City / State is too long"),
  totalHouses: z.coerce
    .number()
    .int("Enter a valid number of houses")
    .min(1, "Total Number of Houses must be at least 1")
    .max(50000),
});

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.trim() || "";

    const estates = await prisma.organization.findMany({
      where: {
        type: "estate",
        status: "active",
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        totalHouses: true,
        streets: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            houses: {
              orderBy: { number: "asc" },
              select: {
                id: true,
                number: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return NextResponse.json(
      { estates },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/estates error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load estates." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in first." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = createEstateSchema.safeParse(await req.json());
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] ||
        "Please complete all required estate fields.";
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: firstError,
            details: fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { name, address, city, totalHouses } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          type: "estate",
          name,
          address,
          city,
          totalHouses,
          status: "pending",
          createdById: session.userId,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: session.userId,
          organizationId: organization.id,
          role: "estate_admin",
          status: "active",
          reviewedById: session.userId,
          reviewedAt: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          familyId: session.sessionId,
          userId: session.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { membershipId: membership.id },
      });

      return { organization, membership };
    });

    const accessToken = await createAccessToken({
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
      sessionId: session.sessionId,
      isSuperAdmin: session.isSuperAdmin,
      membershipId: result.membership.id,
      organizationId: result.organization.id,
      role: "estate_admin",
      mustChangePassword: session.mustChangePassword,
    });

    const response = NextResponse.json(
      {
        message: "Estate created successfully.",
        estate: {
          id: result.organization.id,
          name: result.organization.name,
          address: result.organization.address,
          city: result.organization.city,
          totalHouses: result.organization.totalHouses,
        },
        membership: {
          id: result.membership.id,
          role: result.membership.role,
          status: result.membership.status,
        },
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

    return response;
  } catch (error) {
    console.error("POST /api/estates error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong while creating the estate.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
