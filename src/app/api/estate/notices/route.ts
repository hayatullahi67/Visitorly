import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, getSession, requireActiveEstateAdmin } from "@/lib/auth";

const createNoticeSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(150),
    message: z.string().trim().min(2, "Message is required").max(4000).optional(),
    body: z.string().trim().min(2, "Message is required").max(4000).optional(),
  })
  .refine((data) => Boolean(data.message || data.body), {
    message: "Notice message is required",
    path: ["message"],
  });

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const page = Math.max(
      1,
      parseInt(req.nextUrl.searchParams.get("page") || "1", 10)
    );
    const pageSize = 25;

    const [total, notices] = await Promise.all([
      prisma.notice.count({ where: { organizationId: session.organizationId } }),
      prisma.notice.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { fullName: true } },
        },
      }),
    ]);

    return NextResponse.json(
      {
        notices: notices.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          body: n.message,
          tag: "general" as const,
          createdAt: n.createdAt,
          authorName: n.createdBy.fullName,
        })),
        page,
        pageSize,
        total,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/estate/notices error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load notices." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = createNoticeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide a valid title and message.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const content = (parsed.data.message || parsed.data.body || "").trim();

    const notice = await prisma.notice.create({
      data: {
        organizationId: session.organizationId,
        title: parsed.data.title,
        message: content,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    return NextResponse.json(
      {
        message: "Notice published to estate members.",
        notice: {
          id: notice.id,
          title: notice.title,
          message: notice.message,
          body: notice.message,
          tag: "general" as const,
          createdAt: notice.createdAt,
          authorName: notice.createdBy.fullName,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    const estateErr = getEstateAccessErrorMessage(error?.message);
    if (estateErr) {
      return NextResponse.json(
        { error: { code: error.message, message: estateErr } },
        { status: 403 }
      );
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only estate admins can post notices." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("POST /api/estate/notices error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to publish notice." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
