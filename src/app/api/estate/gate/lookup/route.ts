import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/estate/gate/lookup — Security Officer verifies an entry or exit code
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "estate_security" && session.role !== "estate_admin") {
      return NextResponse.json({ message: "Forbidden: Security access required" }, { status: 403 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ message: "Pass code is required" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if the code matches either an entry pass code OR an exit code within this estate
    const pass = await prisma.visitorPass.findFirst({
      where: {
        organizationId: session.organizationId,
        OR: [{ code: normalizedCode }, { exitCode: normalizedCode }],
      },
      include: {
        house: { include: { street: true } },
        createdBy: { select: { fullName: true, phone: true } },
        admittedBy: { select: { fullName: true } },
        hostMembership: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
      },
    });

    if (!pass) {
      return NextResponse.json(
        {
          verdict: "invalid",
          isExit: false,
          canAdmit: false,
          canLetOut: false,
          message: "No visitor pass or exit code matches this code in your estate.",
          code: normalizedCode,
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExitCodeMatch = pass.exitCode === normalizedCode;

    const houseLabel = pass.house
      ? `House ${pass.house.number}, ${pass.house.street.name}`.trim()
      : "Estate Common Area";
    const hostName =
      pass.hostMembership?.user?.fullName || pass.createdBy.fullName;
    const hostPhone =
      pass.hostMembership?.user?.phone || pass.createdBy.phone || null;

    // 1. If the officer entered an EXIT CODE
    if (isExitCodeMatch) {
      let verdict: "valid" | "expired" | "already_used" = "valid";
      let canLetOut = false;
      let message = "Valid exit code. Visitor can be let out.";

      if (pass.status === "checked_out") {
        verdict = "already_used";
        message = "This visitor has already left the estate.";
      } else if (pass.status !== "checked_in") {
        verdict = "already_used";
        message = "This visitor is not currently checked in.";
      } else if (!pass.exitCodeValidTo || now > pass.exitCodeValidTo) {
        verdict = "expired";
        message =
          "This exit code has expired. Ask the resident to generate a new 15-minute exit code.";
      } else {
        verdict = "valid";
        canLetOut = true;
      }

      return NextResponse.json({
        verdict,
        isExit: true,
        canAdmit: false,
        canLetOut,
        message,
        passId: pass.id,
        code: normalizedCode,
        entryCode: pass.code,
        visitorName: pass.visitorName,
        phone: pass.phone,
        purpose: pass.purpose,
        status: pass.status,
        house: houseLabel,
        hostName,
        hostPhone,
        createdByName: pass.createdBy.fullName,
        createdByRole: pass.createdByRole,
        admittedByName: pass.admittedBy?.fullName ?? null,
        validFrom: pass.validFrom,
        validTo: pass.validTo,
        exitCodeValidTo: pass.exitCodeValidTo,
        checkedInAt: pass.checkedInAt,
        checkedOutAt: pass.checkedOutAt,
      });
    }

    // 2. Otherwise, the officer entered an ENTRY CODE
    let verdict:
      | "valid"
      | "expired"
      | "revoked"
      | "already_used"
      | "not_yet_valid" = "valid";
    let canAdmit = false;
    let message = "Pass is valid and ready for entry.";

    if (pass.status === "revoked") {
      verdict = "revoked";
      message = "This visitor pass was cancelled by the resident.";
    } else if (pass.status === "checked_out") {
      verdict = "already_used";
      message = "This pass has already been used and the visitor has checked out.";
    } else if (pass.status === "checked_in") {
      verdict = "already_used";
      message = "This visitor is already inside the estate.";
    } else if (now < pass.validFrom) {
      verdict = "not_yet_valid";
      message = `Pass is not active yet. Valid from ${pass.validFrom.toLocaleString()}.`;
    } else if (now > pass.validTo) {
      verdict = "expired";
      message = "This visitor pass has expired.";
    } else {
      verdict = "valid";
      canAdmit = true;
    }

    return NextResponse.json({
      verdict,
      isExit: false,
      canAdmit,
      canLetOut: false,
      message,
      passId: pass.id,
      code: pass.code,
      visitorName: pass.visitorName,
      phone: pass.phone,
      purpose: pass.purpose,
      status: pass.status,
      house: houseLabel,
      hostName,
      hostPhone,
      createdByName: pass.createdBy.fullName,
      createdByRole: pass.createdByRole,
      admittedByName: pass.admittedBy?.fullName ?? null,
      validFrom: pass.validFrom,
      validTo: pass.validTo,
      checkedInAt: pass.checkedInAt,
      checkedOutAt: pass.checkedOutAt,
    });
  } catch (error) {
    console.error("[POST /api/estate/gate/lookup] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
