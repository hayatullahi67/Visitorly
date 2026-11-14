import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatPassResponse, generateCode } from "@/lib/pass-utils";

const createPassSchema = z.object({
  visitorName: z.string().trim().min(2, "Visitor name is required").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  purpose: z
    .enum(["personal", "delivery", "maintenance", "event_guest", "other"])
    .default("personal"),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  houseId: z.coerce.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!session.membershipId || !session.organizationId) {
      return NextResponse.json(
        { error: { code: "NO_MEMBERSHIP", message: "No active estate membership" } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await req.json();
    const parsed = createPassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please check the visitor pass details.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { visitorName, phone, purpose, validFrom, validTo } = parsed.data;

    const from = new Date(validFrom);
    const to = new Date(validTo);

    if (to <= from) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_WINDOW",
            message: "End time must be after start time",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (to <= new Date()) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_WINDOW",
            message: "End time must be in the future",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const membership = await prisma.membership.findUnique({
      where: { id: session.membershipId },
      include: { house: true },
    });

    if (!membership || membership.status !== "active") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Membership not active" } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    let houseId = membership.houseId;
    if (session.role === "estate_admin" && parsed.data.houseId) {
      houseId = parsed.data.houseId;
    }

    if (!houseId) {
      return NextResponse.json(
        {
          error: {
            code: "NO_HOUSE",
            message: "No house is linked to your resident account.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.visitorPass.findUnique({
        where: {
          organizationId_code: {
            organizationId: session.organizationId,
            code,
          },
        },
      });
      if (!exists) break;
      code = generateCode();
      attempts++;
    }

    const pass = await prisma.visitorPass.create({
      data: {
        organizationId: session.organizationId,
        code,
        visitorName: visitorName.trim(),
        phone: phone?.trim() || null,
        purpose,
        houseId,
        hostMembershipId:
          session.role === "resident" ? session.membershipId : null,
        createdById: session.userId,
        createdByRole: session.role as any,
        validFrom: from,
        validTo: to,
        status: "active",
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
        pass: formatPassResponse(pass),
        code: pass.code,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Create pass error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 20;
    const now = new Date();

    const baseWhere: any = {
      organizationId: session.organizationId,
    };

    if (session.role === "resident" && session.membershipId) {
      baseWhere.hostMembershipId = session.membershipId;
    }

    const where: any = { ...baseWhere };

    if (status && status !== "all") {
      if (status === "active") {
        where.status = "active";
        where.validTo = { gt: now };
      } else if (status === "expired") {
        where.status = "active";
        where.validTo = { lte: now };
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { visitorName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, passes, activePassesCount, insideNowCount, totalPassesCount, noticesCount] =
      await Promise.all([
        prisma.visitorPass.count({ where }),
        prisma.visitorPass.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            house: { include: { street: true } },
            createdBy: { select: { fullName: true } },
            admittedBy: { select: { fullName: true } },
            hostMembership: {
              include: { user: { select: { fullName: true } } },
            },
          },
        }),
        prisma.visitorPass.count({
          where: {
            ...baseWhere,
            status: "active",
            validTo: { gt: now },
          },
        }),
        prisma.visitorPass.count({
          where: {
            ...baseWhere,
            status: "checked_in",
          },
        }),
        prisma.visitorPass.count({ where: baseWhere }),
        prisma.notice.count({
          where: { organizationId: session.organizationId },
        }),
      ]);

    return NextResponse.json(
      {
        passes: passes.map(formatPassResponse),
        stats: {
          activePasses: activePassesCount,
          insideNow: insideNowCount,
          totalPasses: totalPassesCount,
          notices: noticesCount,
        },
        page,
        pageSize,
        total,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("List passes error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
