import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/estate/gate/passes/[passId]/let-out — Let visitor out using their valid 15-min exit code
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
    const submittedCode =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

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
        { message: "Visitor is not currently checked in." },
        { status: 400 }
      );
    }

    const now = new Date();

    if (submittedCode && pass.exitCode && submittedCode !== pass.exitCode) {
      return NextResponse.json(
        { message: "Exit code does not match the active exit code for this visitor." },
        { status: 400 }
      );
    }

    if (!pass.exitCode || !pass.exitCodeValidTo || now > pass.exitCodeValidTo) {
      return NextResponse.json(
        {
          message:
            "Exit code is missing or expired. Ask the resident to generate a new exit code, or use manual check-out with a reason.",
        },
        { status: 400 }
      );
    }

    const exitCodeUsed = pass.exitCode;

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
          code: exitCodeUsed,
          action: "exit",
          result: "success",
          reason: "Verified exit code",
          officerId: session.userId,
        },
      }),
    ]);

    return NextResponse.json({
      message: `${pass.visitorName} has been let out of the estate.`,
      pass: updatedPass,
      gateLog,
    });
  } catch (error) {
    console.error("[POST /api/estate/gate/passes/[passId]/let-out] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
