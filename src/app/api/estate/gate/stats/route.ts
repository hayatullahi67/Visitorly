import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/estate/gate/stats — Live gate metrics & security officer shift details
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "estate_security" && session.role !== "estate_admin") {
      return NextResponse.json({ message: "Forbidden: Security access required" }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      expected,
      insideNow,
      admittedToday,
      deniedToday,
      exitedToday,
      membership,
    ] = await Promise.all([
      prisma.visitorPass.count({
        where: {
          organizationId: session.organizationId,
          status: "active",
          validTo: { gt: now },
        },
      }),
      prisma.visitorPass.count({
        where: {
          organizationId: session.organizationId,
          status: "checked_in",
        },
      }),
      prisma.gateLog.count({
        where: {
          organizationId: session.organizationId,
          action: "entry",
          result: "success",
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.gateLog.count({
        where: {
          organizationId: session.organizationId,
          result: "denied",
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.gateLog.count({
        where: {
          organizationId: session.organizationId,
          action: "exit",
          result: "success",
          createdAt: { gte: startOfToday },
        },
      }),
      session.membershipId
        ? prisma.membership.findUnique({
            where: { id: session.membershipId },
            include: { organization: true },
          })
        : null,
    ]);

    return NextResponse.json({
      stats: {
        expected,
        insideNow,
        admittedToday,
        deniedToday,
        exitedToday,
      },
      officer: {
        name: session.fullName,
        email: session.email,
        role: session.role,
        assignedGate: membership?.assignedGate || "Main Gate",
        shift: membership?.shift || "Day Shift",
        estateName: membership?.organization?.name || "Estate",
        estateLocation: membership?.organization?.city || membership?.organization?.address || null,
      },
    });
  } catch (error) {
    console.error("[GET /api/estate/gate/stats] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
