import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

const createPassSchema = z.object({
  visitorName: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
  purpose: z.enum(["personal", "delivery", "maintenance", "event_guest", "other"]).default("personal"),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  houseId: z.number().int().positive().optional(), // only needed for admin
});

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let code = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    if (!session.membershipId || !session.organizationId) {
      return NextResponse.json(
        { error: { code: "NO_MEMBERSHIP", message: "No active estate membership" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createPassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { visitorName, phone, purpose, validFrom, validTo } = parsed.data;

    const from = new Date(validFrom);
    const to = new Date(validTo);

    if (to <= from) {
      return NextResponse.json(
        { error: { code: "INVALID_WINDOW", message: "End time must be after start time" } },
        { status: 400 }
      );
    }

    if (to <= new Date()) {
      return NextResponse.json(
        { error: { code: "INVALID_WINDOW", message: "End time must be in the future" } },
        { status: 400 }
      );
    }

    // Get the membership to find the house
    const membership = await prisma.membership.findUnique({
      where: { id: session.membershipId },
      include: { house: true },
    });

    if (!membership || membership.status !== "active") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Membership not active" } },
        { status: 403 }
      );
    }

    // Residents use their own house; admins can pass houseId
    let houseId = membership.houseId;
    if (session.role === "estate_admin" && parsed.data.houseId) {
      houseId = parsed.data.houseId;
    }

    if (!houseId) {
      return NextResponse.json(
        { error: { code: "NO_HOUSE", message: "No house linked to this account" } },
        { status: 400 }
      );
    }

    // Generate unique code within the estate
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
        hostMembershipId: session.role === "resident" ? session.membershipId : null,
        createdById: session.userId,
        createdByRole: session.role as any,
        validFrom: from,
        validTo: to,
        status: "active",
      },
    });

    return NextResponse.json(
      {
        pass: {
          id: pass.id,
          code: pass.code,
          visitorName: pass.visitorName,
          phone: pass.phone,
          purpose: pass.purpose,
          status: pass.status,
          validFrom: pass.validFrom,
          validTo: pass.validTo,
          qrData: pass.code,
        },
        code: pass.code,
      },
      { status: 201 }
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
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 20;

    const where: any = {
      organizationId: session.organizationId,
    };

    // Residents only see their own passes
    if (session.role === "resident" && session.membershipId) {
      where.hostMembershipId = session.membershipId;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { visitorName: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, passes] = await Promise.all([
      prisma.visitorPass.count({ where }),
      prisma.visitorPass.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          house: { include: { street: true } },
        },
      }),
    ]);

    return NextResponse.json({
      passes: passes.map((p) => ({
        id: p.id,
        code: p.code,
        visitorName: p.visitorName,
        phone: p.phone,
        purpose: p.purpose,
        status: p.status,
        validFrom: p.validFrom,
        validTo: p.validTo,
        checkedInAt: p.checkedInAt,
        checkedOutAt: p.checkedOutAt,
        house: p.house
          ? `${p.house.number}, ${p.house.street.name}`
          : null,
      })),
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error("List passes error:", error);
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
