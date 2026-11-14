import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin, requireRole } from "@/lib/auth";

const createStreetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Street name is required")
    .max(100, "Street name is too long"),
  houses: z
    .union([z.array(z.string()), z.string()])
    .optional(),
  houseNumbers: z
    .union([z.array(z.string()), z.string()])
    .optional(),
  numbers: z
    .union([z.array(z.string()), z.string()])
    .optional(),
});

function parseHouseNumbers(input?: string[] | string): string[] {
  if (!input) return [];
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

export async function GET() {
  try {
    const session = await requireRole("estate_admin");
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const streets = await prisma.street.findMany({
      where: { organizationId: session.organizationId },
      include: {
        houses: {
          orderBy: { number: "asc" },
          include: {
            _count: {
              select: {
                residents: true,
                passes: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      {
        streets: streets.map((street) => ({
          id: street.id,
          name: street.name,
          createdAt: street.createdAt,
          houses: street.houses.map((house) => ({
            id: house.id,
            number: house.number,
            residentCount: house._count.residents,
            passCount: house._count.passes,
          })),
        })),
      },
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
    console.error("GET /api/estate/admin/streets error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load streets." } },
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

    const parsed = createStreetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide a valid street name.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orgId = session.organizationId;
    const streetName = parsed.data.name;
    const houseNumbers = parseHouseNumbers(
      parsed.data.houses || parsed.data.houseNumbers || parsed.data.numbers
    );

    const existing = await prisma.street.findFirst({
      where: {
        organizationId: orgId,
        name: { equals: streetName, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "DUPLICATE_STREET", message: "A street with this name already exists in your estate." } },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const createdStreet = await prisma.$transaction(async (tx) => {
      const street = await tx.street.create({
        data: {
          organizationId: orgId,
          name: streetName,
        },
      });

      if (houseNumbers.length > 0) {
        await tx.house.createMany({
          data: houseNumbers.map((number) => ({
            organizationId: orgId,
            streetId: street.id,
            number,
          })),
          skipDuplicates: true,
        });
      }

      return tx.street.findUnique({
        where: { id: street.id },
        include: {
          houses: {
            orderBy: { number: "asc" },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Street created successfully.",
        street: {
          id: createdStreet!.id,
          name: createdStreet!.name,
          houses: createdStreet!.houses.map((h) => ({
            id: h.id,
            number: h.number,
            residentCount: 0,
            passCount: 0,
          })),
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
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Administrator access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("POST /api/estate/admin/streets error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to create street." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
