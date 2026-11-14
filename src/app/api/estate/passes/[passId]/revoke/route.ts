import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatPassResponse } from "@/lib/pass-utils";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ passId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.organizationId || !session.membershipId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { passId: rawPassId } = await context.params;
    const passId = Number(rawPassId);
    if (!Number.isInteger(passId) || passId <= 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid pass ID." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id: passId,
        organizationId: session.organizationId,
        ...(session.role === "resident"
          ? { hostMembershipId: session.membershipId }
          : {}),
      },
    });

    if (!pass) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Visitor pass not found." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (pass.status !== "active") {
      return NextResponse.json(
        {
          error: {
            code: "CANNOT_REVOKE",
            message: `Only active visitor passes can be revoked (current status: ${pass.status.replace("_", " ")}).`,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const updated = await prisma.visitorPass.update({
      where: { id: pass.id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
      include: {
        house: { include: { street: true } },
        createdBy: { select: { fullName: true } },
        admittedBy: { select: { fullName: true } },
        hostMembership: {
          include: { user: { select: { fullName: true } } },
        },
      },
    });

    return NextResponse.json(
      {
        message: `Visitor pass for ${updated.visitorName} has been revoked.`,
        pass: formatPassResponse(updated),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/estate/passes/[passId]/revoke error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to revoke pass." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
