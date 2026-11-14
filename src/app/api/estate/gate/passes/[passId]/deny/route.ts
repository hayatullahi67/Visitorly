import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/estate/gate/passes/[passId]/deny — Security officer refuses entry at the gate
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
    const reason =
      typeof body.reason === "string" && body.reason.trim().length > 0
        ? body.reason.trim()
        : "Refused at gate";

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id: numericPassId,
        organizationId: session.organizationId,
      },
    });

    if (!pass) {
      return NextResponse.json({ message: "Visitor pass not found" }, { status: 404 });
    }

    const gateLog = await prisma.gateLog.create({
      data: {
        organizationId: session.organizationId,
        passId: pass.id,
        code: pass.code,
        action: "entry",
        result: "denied",
        reason,
        officerId: session.userId,
      },
    });

    return NextResponse.json({
      message: `Entry refused for ${pass.visitorName}. Logged in gate records.`,
      gateLog,
    });
  } catch (error) {
    console.error("[POST /api/estate/gate/passes/[passId]/deny] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
