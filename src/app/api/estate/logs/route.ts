import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (session.role !== "estate_security" && session.role !== "estate_admin") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Gate activity is restricted to estate security and estate administrators.",
          },
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const result = searchParams.get("result") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 25;

    const where: any = {
      organizationId: session.organizationId,
    };

    if (action === "entry" || action === "exit") {
      where.action = action;
    }

    if (result === "success" || result === "denied") {
      where.result = result;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { pass: { visitorName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.gateLog.count({ where }),
      prisma.gateLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          officer: { select: { fullName: true } },
          pass: {
            include: {
              house: { include: { street: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        logs: logs.map((log) => ({
          id: log.id,
          code: log.code,
          action: log.action,
          result: log.result,
          reason: log.reason,
          createdAt: log.createdAt,
          officerName: log.officer.fullName,
          visitorName: log.pass?.visitorName || "Unknown Visitor",
          purpose: log.pass?.purpose || null,
          house: log.pass?.house
            ? `House ${log.pass.house.number}, ${log.pass.house.street.name}`
            : null,
        })),
        page,
        pageSize,
        total,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/estate/logs error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load gate activity." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
