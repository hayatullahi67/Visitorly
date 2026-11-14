import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ streetId: string }> }
) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { streetId: rawStreetId } = await context.params;
    const streetId = Number(rawStreetId);
    if (!Number.isInteger(streetId) || streetId <= 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid street ID." } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const street = await prisma.street.findFirst({
      where: { id: streetId, organizationId: session.organizationId },
      include: {
        houses: {
          include: {
            _count: {
              select: { residents: true, passes: true },
            },
          },
        },
      },
    });

    if (!street) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Street not found." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const occupiedHouses = street.houses.filter(
      (h) => h._count.residents > 0 || h._count.passes > 0
    );
    if (occupiedHouses.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "STREET_IN_USE",
            message:
              "Cannot delete this street because one or more houses have assigned residents or visitor passes.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await prisma.street.delete({ where: { id: street.id } });

    return NextResponse.json(
      { message: "Street deleted successfully." },
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
    console.error("DELETE /api/estate/admin/streets/[streetId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to delete street." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
