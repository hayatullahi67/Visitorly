import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/estate/gate/passes/[passId]/checkout — Manual check-out without an exit code (reason required)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ passId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "estate_security" && session.role !== "estate_admin") {
      return NextResponse.json({ message: "Forbidden: Security access required" }, { status: 403 });
    }

    const { passId } = await params;
    const numericPassId = Number(passId);
    if (!Number.isInteger(numericPassId) || numericPassId <= 0) {
      return NextResponse.json({ message: "Invalid pass ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (reason.length < 3) {
      return NextResponse.json(
        {
          message:
            "A valid reason is required when checking out a visitor without a resident exit code.",
        },
        { status: 400 }
      );
    }

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id: numericPassId,
        organizationId: session.organizationId,
      },
    });

    if (!pass) {
      return NextResponse.json({ message: "Visitor pass not found" }, { status: 404 });
    }

    if (pass.status !== "checked_in") {
      return NextResponse.json(
        { message: "This visitor is not currently checked in." },
        { status: 400 }
      );
    }

    const now = new Date();

    const [updatedPass, gateLog] = await prisma.$transaction([
      prisma.visitorPass.update({
        where: { id: pass.id },
        data: {
          status: "checked_out",
          checkedOutAt: now,
          exitCode: null,
          exitCodeValidTo: null,
        },
      }),
      prisma.gateLog.create({
        data: {
          organizationId: session.organizationId,
          passId: pass.id,
          code: pass.code,
          action: "exit",
          result: "success",
          reason: `Manual checkout: ${reason}`,
          officerId: session.userId,
        },
      }),
    ]);

    return NextResponse.json({
      message: `${pass.visitorName} checked out of the estate.`,
      pass: updatedPass,
      gateLog,
    });
  } catch (error) {
    console.error("[POST /api/estate/gate/passes/[passId]/checkout] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
