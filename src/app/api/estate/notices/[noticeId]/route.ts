import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin } from "@/lib/auth";

// DELETE /api/estate/notices/[noticeId] — Estate Admin deletes a notice
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403 }
      );
    }

    const { noticeId } = await params;
    const numericId = Number(noticeId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: { code: "INVALID_ID", message: "Invalid notice ID." } },
        { status: 400 }
      );
    }

    const notice = await prisma.notice.findFirst({
      where: {
        id: numericId,
        organizationId: session.organizationId,
      },
    });

    if (!notice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Notice not found." } },
        { status: 404 }
      );
    }

    await prisma.notice.delete({
      where: { id: notice.id },
    });

    return NextResponse.json({
      message: "Notice deleted.",
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401 }
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
        { error: { code: "FORBIDDEN", message: "Only estate admins can delete notices." } },
        { status: 403 }
      );
    }
    console.error("DELETE /api/estate/notices/[noticeId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to delete notice." } },
      { status: 500 }
    );
  }
}
