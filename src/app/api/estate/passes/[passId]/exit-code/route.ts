import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatPassResponse, generateCode } from "@/lib/pass-utils";

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

    if (pass.status !== "checked_in") {
      return NextResponse.json(
        {
          error: {
            code: "VISITOR_NOT_INSIDE",
            message:
              "An exit code can only be generated for a visitor who is currently checked in.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let exitCode = generateCode(6);
    let attempts = 0;
    while (attempts < 10) {
      const collision = await prisma.visitorPass.findFirst({
        where: {
          organizationId: session.organizationId,
          OR: [{ code: exitCode }, { exitCode }],
        },
      });
      if (!collision) break;
      exitCode = generateCode(6);
      attempts++;
    }

    const exitCodeValidTo = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const updated = await prisma.visitorPass.update({
      where: { id: pass.id },
      data: {
        exitCode,
        exitCodeValidTo,
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
        message: `Exit code ready for ${updated.visitorName}. Valid for 15 minutes.`,
        exitCode: updated.exitCode,
        exitCodeValidTo: updated.exitCodeValidTo,
        pass: formatPassResponse(updated),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/estate/passes/[passId]/exit-code error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to generate exit code.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
