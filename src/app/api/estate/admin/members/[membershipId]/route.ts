import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin } from "@/lib/auth";

const updateMemberSchema = z.object({
  status: z.enum(["active", "suspended", "rejected", "pending"]).optional(),
  action: z.enum(["approve", "reject", "suspend", "activate"]).optional(),
  houseId: z.coerce.number().int().positive().optional().nullable(),
  assignedGate: z.string().trim().max(60).optional().nullable(),
  shift: z.string().trim().max(60).optional().nullable(),
  houseChangeDecision: z.enum(["approve", "reject"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { membershipId: rawId } = await context.params;
    const membershipId = Number(rawId);
    if (!Number.isInteger(membershipId) || membershipId <= 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid membership ID." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = updateMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid membership update parameters.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orgId = session.organizationId;
    const existing = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member record not found in your estate." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const {
      status,
      action,
      houseId,
      assignedGate,
      shift,
      houseChangeDecision,
    } = parsed.data;

    const actionStatusMap: Record<string, "active" | "rejected" | "suspended"> = {
      approve: "active",
      activate: "active",
      reject: "rejected",
      suspend: "suspended",
    };
    const resolvedStatus = status || (action ? actionStatusMap[action] : undefined);

    let nextHouseId = existing.houseId;
    let nextRequestedHouseId = existing.requestedHouseId;
    let nextChangeRequestedAt = existing.changeRequestedAt;

    if (houseId !== undefined) {
      if (houseId !== null) {
        const house = await prisma.house.findFirst({
          where: { id: houseId, organizationId: orgId },
        });
        if (!house) {
          return NextResponse.json(
            {
              error: {
                code: "INVALID_HOUSE",
                message: "The selected house does not belong to this estate.",
              },
            },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
      }
      nextHouseId = houseId;
    }

    if (houseChangeDecision === "approve") {
      if (!existing.requestedHouseId) {
        return NextResponse.json(
          {
            error: {
              code: "NO_HOUSE_REQUEST",
              message: "This resident has no pending house change request.",
            },
          },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      nextHouseId = existing.requestedHouseId;
      nextRequestedHouseId = null;
      nextChangeRequestedAt = null;
    } else if (houseChangeDecision === "reject") {
      nextRequestedHouseId = null;
      nextChangeRequestedAt = null;
    }

    const nextStatus = resolvedStatus ?? existing.status;

    if (
      existing.role === "resident" &&
      nextStatus === "active" &&
      !nextHouseId
    ) {
      return NextResponse.json(
        {
          error: {
            code: "HOUSE_REQUIRED",
            message:
              "Please assign a street and house before activating this resident.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.membership.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          houseId: existing.role === "resident" ? nextHouseId : null,
          requestedHouseId: nextRequestedHouseId,
          changeRequestedAt: nextChangeRequestedAt,
          ...(assignedGate !== undefined
            ? { assignedGate: assignedGate || null }
            : {}),
          ...(shift !== undefined ? { shift: shift || null } : {}),
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
          requestedHouse: { include: { street: true } },
        },
      });

      if (nextStatus === "suspended" || nextStatus === "rejected") {
        await tx.refreshToken.updateMany({
          where: { membershipId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return m;
    });

    return NextResponse.json(
      {
        message: "Member updated successfully.",
        member: {
          id: updated.id,
          userId: updated.userId,
          role: updated.role,
          status: updated.status,
          assignedGate: updated.assignedGate,
          shift: updated.shift,
          changeRequestedAt: updated.changeRequestedAt,
          reviewedAt: updated.reviewedAt,
          user: updated.user,
          house: updated.house
            ? {
                id: updated.house.id,
                number: updated.house.number,
                streetId: updated.house.streetId,
                street: updated.house.street.name,
              }
            : null,
          requestedHouse: updated.requestedHouse
            ? {
                id: updated.requestedHouse.id,
                number: updated.requestedHouse.number,
                streetId: updated.requestedHouse.streetId,
                street: updated.requestedHouse.street.name,
              }
            : null,
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
    console.error("PATCH /api/estate/admin/members/[membershipId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to update member." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
