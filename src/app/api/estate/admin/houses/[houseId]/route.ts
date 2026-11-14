import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ houseId: string }> }
) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { houseId: rawHouseId } = await context.params;
    const houseId = Number(rawHouseId);
    if (!Number.isInteger(houseId) || houseId <= 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid house ID." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const house = await prisma.house.findFirst({
      where: { id: houseId, organizationId: session.organizationId },
      include: {
        _count: {
          select: { residents: true, passes: true },
        },
      },
    });

    if (!house) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "House not found." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (house._count.residents > 0 || house._count.passes > 0) {
      return NextResponse.json(
        {
          error: {
            code: "HOUSE_IN_USE",
            message:
              "Cannot delete this house because it has assigned residents or visitor passes.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await prisma.house.delete({ where: { id: house.id } });

    return NextResponse.json(
      { message: "House deleted successfully." },
      { headers: { "Cache-Control": "no-store" } }
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
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Administrator access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("DELETE /api/estate/admin/houses/[houseId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to delete house." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
