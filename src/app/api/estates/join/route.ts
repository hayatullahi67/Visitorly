import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const joinEstateSchema = z.object({
  organizationId: z.coerce.number().int().positive("Select a valid estate"),
  role: z.enum(["resident", "estate_security"]),
  houseId: z.coerce.number().int().positive().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in first." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = joinEstateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please complete all required fields.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { organizationId, role, houseId } = parsed.data;

    const estate = await prisma.organization.findFirst({
      where: { id: organizationId, type: "estate", status: "active" },
    });

    if (!estate) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Selected estate was not found or is inactive." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (role === "resident") {
      if (!houseId) {
        return NextResponse.json(
          { error: { code: "HOUSE_REQUIRED", message: "Please select your street and house number." } },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      const house = await prisma.house.findFirst({
        where: { id: houseId, organizationId },
      });

      if (!house) {
        return NextResponse.json(
          { error: { code: "INVALID_HOUSE", message: "The selected house does not belong to this estate." } },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const existing = await prisma.membership.findUnique({
      where: {
        userId_organizationId_role: {
          userId: session.userId,
          organizationId,
          role,
        },
      },
    });

    if (existing && existing.status === "active") {
      return NextResponse.json(
        { error: { code: "ALREADY_MEMBER", message: "You are already an active member of this estate." } },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (existing && existing.status === "suspended") {
      return NextResponse.json(
        { error: { code: "MEMBERSHIP_SUSPENDED", message: "Your access to this estate has been suspended by the administrator." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const membership = existing
      ? await prisma.membership.update({
          where: { id: existing.id },
          data: {
            status: "pending",
            houseId: role === "resident" ? houseId ?? null : null,
            reviewedById: null,
            reviewedAt: null,
          },
          include: {
            organization: true,
            house: { include: { street: true } },
          },
        })
      : await prisma.membership.create({
          data: {
            userId: session.userId,
            organizationId,
            role,
            status: "pending",
            houseId: role === "resident" ? houseId ?? null : null,
          },
          include: {
            organization: true,
            house: { include: { street: true } },
          },
        });

    return NextResponse.json(
      {
        message: "Your request to join the estate has been sent for administrator approval.",
        membership: {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          organization: {
            id: membership.organization.id,
            name: membership.organization.name,
            status: membership.organization.status,
          },
          house: membership.house
            ? {
                id: membership.house.id,
                number: membership.house.number,
                street: membership.house.street.name,
              }
            : null,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/estates/join error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
