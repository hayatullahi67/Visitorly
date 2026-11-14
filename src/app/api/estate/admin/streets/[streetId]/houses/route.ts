import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin } from "@/lib/auth";

const addHousesSchema = z.object({
  numbers: z.union([z.array(z.string()), z.string()]),
});

function parseHouseNumbers(input: string[] | string): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[,;\n]+/);
  const unique = new Set<string>();
  for (const item of raw) {
    const trimmed = item.trim();
    if (trimmed && trimmed.length <= 50) {
      unique.add(trimmed);
    }
  }
  return Array.from(unique);
}

export async function POST(
  req: NextRequest,
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

    const parsed = addHousesSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide at least one house number.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const numbers = parseHouseNumbers(parsed.data.numbers);
    if (numbers.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please enter at least one valid house number.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const street = await prisma.street.findFirst({
      where: { id: streetId, organizationId: session.organizationId },
      include: { houses: true },
    });

    if (!street) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Street not found." } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const existingSet = new Set(
      street.houses.map((h) => h.number.toLowerCase())
    );
    const toCreate = numbers.filter(
      (num) => !existingSet.has(num.toLowerCase())
    );
    const skipped = numbers.length - toCreate.length;

    if (toCreate.length > 0) {
      await prisma.house.createMany({
        data: toCreate.map((number) => ({
          organizationId: session.organizationId!,
          streetId: street.id,
          number,
        })),
        skipDuplicates: true,
      });
    }

    const updatedHouses = await prisma.house.findMany({
      where: { streetId: street.id },
      orderBy: { number: "asc" },
      include: {
        _count: {
          select: { residents: true, passes: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: `${toCreate.length} house(s) added${skipped > 0 ? ` (${skipped} duplicate skipped)` : ""}.`,
        added: toCreate.length,
        skipped,
        houses: updatedHouses.map((h) => ({
          id: h.id,
          number: h.number,
          residentCount: h._count.residents,
          passCount: h._count.passes,
        })),
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
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Administrator access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("POST /api/estate/admin/streets/[streetId]/houses error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to add houses." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
