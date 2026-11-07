import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const lookupSchema = z.object({
  code: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    if (session.role !== "estate_security" && session.role !== "estate_admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only security can use the gate" } },
        { status: 403 }
      );
    }

    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "NO_MEMBERSHIP", message: "No active membership" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = lookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Enter a valid code" } },
        { status: 400 }
      );
    }

    const code = parsed.data.code.trim().toUpperCase().replace(/[\s-]/g, "");

    const pass = await prisma.visitorPass.findFirst({
      where: {
        organizationId: session.organizationId,
        OR: [{ code }, { exitCode: code }],
      },
      include: {
        house: { include: { street: true } },
      },
    });

    if (!pass) {
      return NextResponse.json({
        verdict: "invalid",
        canAdmit: false,
        message: "This code does not match any visitor pass",
        code,
      });
    }

    const now = new Date();
    let verdict = "valid";
    let canAdmit = false;
    let message = "";

    if (pass.status === "revoked") {
      verdict = "revoked";
      message = "This pass has been revoked";
    } else if (pass.status === "checked_out") {
      verdict = "already_used";
      message = "This visitor has already left";
    } else if (pass.status === "checked_in") {
      verdict = "already_used";
      message = "This visitor is already inside";
    } else if (now < pass.validFrom) {
      verdict = "not_yet_valid";
      message = `This pass is only valid from ${pass.validFrom.toLocaleString()}`;
    } else if (now > pass.validTo) {
      verdict = "expired";
      message = "This pass has expired";
    } else if (pass.status === "active") {
      verdict = "valid";
      canAdmit = true;
      message = "Visitor can be let in";
    }

    return NextResponse.json({
      passId: pass.id,
      code: pass.code,
      visitorName: pass.visitorName,
      phone: pass.phone,
      purpose: pass.purpose,
      status: pass.status,
      house: pass.house
        ? `${pass.house.number}, ${pass.house.street.name}`
        : null,
      validFrom: pass.validFrom,
      validTo: pass.validTo,
      verdict,
      canAdmit,
      message,
    });
  } catch (error) {
    console.error("Gate lookup error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        },
      },
      { status: 500 }
    );
  }
}
