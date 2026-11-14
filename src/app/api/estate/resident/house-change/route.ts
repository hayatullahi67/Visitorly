import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const houseChangeSchema = z.object({
  houseId: z.coerce.number().int().positive("Select a valid house"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("resident");
    if (!session.membershipId || !session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active resident membership." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = houseChangeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Please select a valid street and house." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { houseId } = parsed.data;

    const targetHouse = await prisma.house.findFirst({
      where: { id: houseId, organizationId: session.organizationId },
      include: { street: true },
    });

    if (!targetHouse) {
      return NextResponse.json(
        { error: { code: "INVALID_HOUSE", message: "That house does not belong to your estate." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const currentMembership = await prisma.membership.findUnique({
      where: { id: session.membershipId },
    });

    if (currentMembership?.houseId === houseId) {
      return NextResponse.json(
        { error: { code: "SAME_HOUSE", message: "You are already assigned to this house." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await prisma.membership.update({
      where: { id: session.membershipId },
      data: {
        requestedHouseId: houseId,
        changeRequestedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: `House change request to ${targetHouse.street.name}, House ${targetHouse.number} has been sent to your estate administrator.`,
        requestedHouse: {
          id: targetHouse.id,
          number: targetHouse.number,
          streetId: targetHouse.streetId,
          street: targetHouse.street.name,
        },
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
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Resident access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("POST /api/estate/resident/house-change error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to submit house change request." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE() {
  try {
    const session = await requireRole("resident");
    if (!session.membershipId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active resident membership." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    await prisma.membership.update({
      where: { id: session.membershipId },
      data: {
        requestedHouseId: null,
        changeRequestedAt: null,
      },
    });

    return NextResponse.json(
      { message: "Pending house change request cancelled." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("DELETE /api/estate/resident/house-change error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to cancel house change request." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
