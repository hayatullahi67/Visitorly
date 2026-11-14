import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/estate/gate/passes/[passId]/admit — Security officer lets a visitor into the estate
export async function POST(
  _req: Request,
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

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id: numericPassId,
        organizationId: session.organizationId,
      },
    });

    if (!pass) {
      return NextResponse.json({ message: "Visitor pass not found" }, { status: 404 });
    }

    const now = new Date();

    if (pass.status === "checked_in") {
      return NextResponse.json(
        { message: "This visitor is already checked in inside the estate." },
        { status: 400 }
      );
    }

    if (pass.status !== "active") {
      return NextResponse.json(
        { message: `Cannot admit visitor with a ${pass.status.replace("_", " ")} pass.` },
        { status: 400 }
      );
    }

    if (now < pass.validFrom) {
      return NextResponse.json(
        { message: "This pass is not active yet." },
        { status: 400 }
      );
    }

    if (now > pass.validTo) {
      return NextResponse.json(
        { message: "This visitor pass has expired." },
        { status: 400 }
      );
    }

    const [updatedPass, gateLog] = await prisma.$transaction([
      prisma.visitorPass.update({
        where: { id: pass.id },
        data: {
          status: "checked_in",
          checkedInAt: now,
          admittedById: session.userId,
        },
      }),
      prisma.gateLog.create({
        data: {
          organizationId: session.organizationId,
          passId: pass.id,
          code: pass.code,
          action: "entry",
          result: "success",
          officerId: session.userId,
        },
      }),
    ]);

    return NextResponse.json({
      message: `${pass.visitorName} has been admitted into the estate.`,
      pass: updatedPass,
      gateLog,
    });
  } catch (error) {
    console.error("[POST /api/estate/gate/passes/[passId]/admit] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
