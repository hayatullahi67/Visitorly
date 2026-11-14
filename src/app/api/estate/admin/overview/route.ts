import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEstateAccessErrorMessage, requireActiveEstateAdmin, requireRole } from "@/lib/auth";

const updateEstateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Estate Name is required")
    .max(150, "Estate name is too long"),
  address: z
    .string()
    .trim()
    .min(2, "Estate Physical Address is required")
    .max(255),
  city: z
    .string()
    .trim()
    .min(2, "City / State is required")
    .max(100),
  totalHouses: z.coerce
    .number()
    .int()
    .min(1, "Total Number of Houses must be at least 1")
    .max(50000),
});

export async function GET() {
  try {
    const session = await requireRole("estate_admin");
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const orgId = session.organizationId;

    const [
      organization,
      activeResidents,
      pendingApprovals,
      pendingHouseChanges,
      activeSecurity,
      totalStreets,
      totalHouses,
      activePasses,
      checkedInVisitors,
    ] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          totalHouses: true,
          status: true,
          activatedAt: true,
          activeUntil: true,
          createdAt: true,
        },
      }),
      prisma.membership.count({
        where: { organizationId: orgId, role: "resident", status: "active" },
      }),
      prisma.membership.count({
        where: {
          organizationId: orgId,
          role: { in: ["resident", "estate_security"] },
          status: "pending",
        },
      }),
      prisma.membership.count({
        where: {
          organizationId: orgId,
          role: "resident",
          status: "active",
          requestedHouseId: { not: null },
        },
      }),
      prisma.membership.count({
        where: {
          organizationId: orgId,
          role: "estate_security",
          status: "active",
        },
      }),
      prisma.street.count({ where: { organizationId: orgId } }),
      prisma.house.count({ where: { organizationId: orgId } }),
      prisma.visitorPass.count({
        where: {
          organizationId: orgId,
          status: "active",
          validTo: { gt: new Date() },
        },
      }),
      prisma.visitorPass.count({
        where: {
          organizationId: orgId,
          status: "checked_in",
        },
      }),
    ]);

    let resolvedOrganization = organization;
    if (
      resolvedOrganization &&
      resolvedOrganization.status === "active" &&
      resolvedOrganization.activeUntil &&
      new Date() > resolvedOrganization.activeUntil
    ) {
      await prisma.organization.update({
        where: { id: resolvedOrganization.id },
        data: { status: "suspended" },
      });
      resolvedOrganization = { ...resolvedOrganization, status: "suspended" };
    }

    return NextResponse.json(
      {
        organization: resolvedOrganization,
        stats: {
          activeResidents,
          pendingApprovals,
          pendingHouseChanges,
          activeSecurity,
          totalStreets,
          totalHouses,
          activePasses,
          checkedInVisitors,
        },
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
    console.error("GET /api/estate/admin/overview error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load estate overview." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireActiveEstateAdmin();
    if (!session.organizationId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No active estate selected." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = updateEstateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide valid estate details.",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const updated = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        totalHouses: parsed.data.totalHouses ?? null,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        totalHouses: true,
        status: true,
      },
    });

    return NextResponse.json(
      { message: "Estate details updated.", organization: updated },
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
    console.error("PATCH /api/estate/admin/overview error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to update estate details." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
