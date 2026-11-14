import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchEstateSchema = z.object({
  status: z.enum(["pending", "active", "suspended", "rejected"]).optional(),
  name: z.string().trim().min(2).max(150).optional(),
  address: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  durationValue: z.number().int().positive().max(1000).optional(),
  durationUnit: z.enum(["hours", "days", "weeks", "months", "years"]).optional(),
  activeUntil: z.string().datetime().optional().nullable(),
  unlimited: z.boolean().optional(),
});

function computeActiveUntil(value: number, unit: "hours" | "days" | "weeks" | "months" | "years"): Date {
  const target = new Date();
  switch (unit) {
    case "hours":
      target.setHours(target.getHours() + value);
      break;
    case "days":
      target.setDate(target.getDate() + value);
      break;
    case "weeks":
      target.setDate(target.getDate() + value * 7);
      break;
    case "months":
      target.setMonth(target.getMonth() + value);
      break;
    case "years":
      target.setFullYear(target.getFullYear() + value);
      break;
  }
  return target;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ estateId: string }> }
) {
  try {
    await requireSuperAdmin();
    const { estateId: rawId } = await context.params;
    const estateId = Number(rawId);
    if (!Number.isInteger(estateId) || estateId <= 0) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid estate ID." } }, { status: 400 });
    }

    const estate = await prisma.organization.findUnique({
      where: { id: estateId },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true, phone: true } },
        streets: {
          orderBy: { name: "asc" },
          include: {
            _count: { select: { houses: true } },
          },
        },
        memberships: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true },
            },
            house: {
              include: { street: { select: { id: true, name: true } } },
            },
          },
        },
        passes: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            house: { include: { street: { select: { name: true } } } },
            createdBy: { select: { id: true, fullName: true, email: true } },
            admittedBy: { select: { id: true, fullName: true } },
          },
        },
        gateLogs: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            officer: { select: { id: true, fullName: true } },
            pass: {
              select: {
                id: true,
                visitorName: true,
                purpose: true,
                house: { include: { street: { select: { name: true } } } },
              },
            },
          },
        },
        notices: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            createdBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!estate) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Estate not found." } }, { status: 404 });
    }

    let resolvedStatus = estate.status;
    if (resolvedStatus === "active" && estate.activeUntil && new Date() > estate.activeUntil) {
      await prisma.organization.update({
        where: { id: estate.id },
        data: { status: "suspended" },
      });
      resolvedStatus = "suspended";
    }

    return NextResponse.json(
      {
        estate: {
          id: estate.id,
          name: estate.name,
          type: estate.type,
          address: estate.address,
          city: estate.city,
          totalHouses: estate.totalHouses,
          status: resolvedStatus,
          activatedAt: estate.activatedAt,
          activeUntil: estate.activeUntil,
          createdAt: estate.createdAt,
          createdBy: estate.createdBy,
          streets: estate.streets.map((s) => ({
            id: s.id,
            name: s.name,
            housesCount: s._count.houses,
          })),
          admins: estate.memberships
            .filter((m) => m.role === "estate_admin")
            .map((m) => ({
              membershipId: m.id,
              status: m.status,
              createdAt: m.createdAt,
              user: m.user,
            })),
          residents: estate.memberships
            .filter((m) => m.role === "resident")
            .map((m) => ({
              membershipId: m.id,
              status: m.status,
              createdAt: m.createdAt,
              user: m.user,
              house: m.house ? { id: m.house.id, number: m.house.number, street: m.house.street.name } : null,
            })),
          securityStaff: estate.memberships
            .filter((m) => m.role === "estate_security")
            .map((m) => ({
              membershipId: m.id,
              status: m.status,
              assignedGate: m.assignedGate,
              shift: m.shift,
              createdAt: m.createdAt,
              user: m.user,
            })),
          passes: estate.passes.map((p) => ({
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
            createdAt: p.createdAt,
            house: p.house ? { number: p.house.number, street: p.house.street.name } : null,
            createdBy: p.createdBy,
            admittedBy: p.admittedBy,
          })),
          gateLogs: estate.gateLogs.map((l) => ({
            id: l.id,
            code: l.code,
            action: l.action,
            result: l.result,
            reason: l.reason,
            createdAt: l.createdAt,
            officer: l.officer,
            visitorName: l.pass?.visitorName ?? null,
            house: l.pass?.house ? { number: l.pass.house.number, street: l.pass.house.street.name } : null,
          })),
          notices: estate.notices,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Super Admin access required." } }, { status: 403 });
    }
    console.error("Super admin estate detail error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load estate details." } }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ estateId: string }> }
) {
  try {
    await requireSuperAdmin();
    const { estateId: rawId } = await context.params;
    const estateId = Number(rawId);
    if (!Number.isInteger(estateId) || estateId <= 0) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid estate ID." } }, { status: 400 });
    }

    const parsed = patchEstateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid estate update." } }, { status: 400 });
    }

    const { status, name, address, city, durationValue, durationUnit, activeUntil, unlimited } = parsed.data;
    const now = new Date();
    let computedActiveUntil: Date | null | undefined = undefined;
    let computedActivatedAt: Date | undefined = undefined;

    if (status === "active") {
      computedActivatedAt = now;
      if (unlimited) {
        computedActiveUntil = null;
      } else if (activeUntil !== undefined) {
        computedActiveUntil = activeUntil ? new Date(activeUntil) : null;
      } else if (durationValue && durationUnit) {
        computedActiveUntil = computeActiveUntil(durationValue, durationUnit);
      }
    }

    const updated = await prisma.organization.update({
      where: { id: estateId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(computedActivatedAt !== undefined ? { activatedAt: computedActivatedAt } : {}),
        ...(computedActiveUntil !== undefined ? { activeUntil: computedActiveUntil } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
      },
    });

    return NextResponse.json({ estate: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Super Admin access required." } }, { status: 403 });
    }
    console.error("Update estate error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update estate." } }, { status: 500 });
  }
}
