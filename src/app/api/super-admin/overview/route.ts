import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    // Auto-deactivate any active estates whose activation timeframe has expired
    await prisma.organization.updateMany({
      where: {
        status: "active",
        activeUntil: { lt: new Date() },
      },
      data: { status: "suspended" },
    });

    const { searchParams } = new URL(req.url);
    const estateIdParam = searchParams.get("estateId");
    const estateId = estateIdParam && /^\d+$/.test(estateIdParam) ? Number(estateIdParam) : null;
    const estateWhere = estateId ? { organizationId: estateId } : {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      estates,
      admins,
      residents,
      securityStaff,
      recentPasses,
      recentGateLogs,
      recentNotices,
      totalUsers,
      totalPasses,
      activePasses,
      insideNowPasses,
      totalGateLogs,
      gateLogsToday,
      deniedToday,
      totalNotices,
    ] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          memberships: {
            where: { role: "estate_admin" },
            include: {
              user: {
                select: { id: true, fullName: true, email: true, phone: true, lastLoginAt: true },
              },
            },
          },
          _count: {
            select: {
              streets: true,
              houses: true,
              passes: true,
              gateLogs: true,
              notices: true,
            },
          },
        },
      }),
      prisma.membership.findMany({
        where: { role: "estate_admin", ...estateWhere },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true },
          },
          organization: {
            select: { id: true, name: true, city: true, status: true, activatedAt: true, activeUntil: true },
          },
        },
      }),
      prisma.membership.findMany({
        where: { role: "resident", ...estateWhere },
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true },
          },
          organization: {
            select: { id: true, name: true, status: true },
          },
          house: {
            include: { street: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.membership.findMany({
        where: { role: "estate_security", ...estateWhere },
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true, status: true, lastLoginAt: true },
          },
          organization: {
            select: { id: true, name: true, status: true },
          },
        },
      }),
      prisma.visitorPass.findMany({
        where: estateWhere,
        orderBy: { createdAt: "desc" },
        take: 150,
        include: {
          organization: { select: { id: true, name: true } },
          house: { include: { street: { select: { name: true } } } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          admittedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.gateLog.findMany({
        where: estateWhere,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          organization: { select: { id: true, name: true } },
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
      }),
      prisma.notice.findMany({
        where: estateWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          organization: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.user.count(),
      prisma.visitorPass.count({ where: estateWhere }),
      prisma.visitorPass.count({ where: { ...estateWhere, status: "active", validTo: { gt: new Date() } } }),
      prisma.visitorPass.count({ where: { ...estateWhere, status: "checked_in" } }),
      prisma.gateLog.count({ where: estateWhere }),
      prisma.gateLog.count({ where: { ...estateWhere, createdAt: { gte: startOfToday } } }),
      prisma.gateLog.count({ where: { ...estateWhere, result: "denied", createdAt: { gte: startOfToday } } }),
      prisma.notice.count({ where: estateWhere }),
    ]);

    // Membership counts grouped per estate
    const membershipCounts = await prisma.membership.groupBy({
      by: ["organizationId", "role", "status"],
      _count: { _all: true },
    });

    const insideCounts = await prisma.visitorPass.groupBy({
      by: ["organizationId"],
      where: { status: "checked_in" },
      _count: { _all: true },
    });

    const estateStatsMap = new Map<
      number,
      {
        residentsActive: number;
        residentsPending: number;
        securityActive: number;
        adminsCount: number;
        insideNow: number;
      }
    >();

    for (const row of membershipCounts) {
      const entry = estateStatsMap.get(row.organizationId) ?? {
        residentsActive: 0,
        residentsPending: 0,
        securityActive: 0,
        adminsCount: 0,
        insideNow: 0,
      };
      if (row.role === "resident" && row.status === "active") entry.residentsActive += row._count._all;
      if (row.role === "resident" && row.status === "pending") entry.residentsPending += row._count._all;
      if (row.role === "estate_security" && row.status === "active") entry.securityActive += row._count._all;
      if (row.role === "estate_admin") entry.adminsCount += row._count._all;
      estateStatsMap.set(row.organizationId, entry);
    }

    for (const row of insideCounts) {
      const entry = estateStatsMap.get(row.organizationId) ?? {
        residentsActive: 0,
        residentsPending: 0,
        securityActive: 0,
        adminsCount: 0,
        insideNow: 0,
      };
      entry.insideNow = row._count._all;
      estateStatsMap.set(row.organizationId, entry);
    }

    const totalResidents = await prisma.membership.count({
      where: { role: "resident", status: "active", ...estateWhere },
    });
    const pendingResidents = await prisma.membership.count({
      where: { role: "resident", status: "pending", ...estateWhere },
    });
    const totalAdmins = await prisma.membership.count({
      where: { role: "estate_admin", status: "active", ...estateWhere },
    });
    const totalSecurity = await prisma.membership.count({
      where: { role: "estate_security", status: "active", ...estateWhere },
    });

    return NextResponse.json(
      {
        stats: {
          totalEstates: estates.length,
          activeEstates: estates.filter((e) => e.status === "active").length,
          pendingEstates: estates.filter((e) => e.status === "pending").length,
          suspendedEstates: estates.filter((e) => e.status === "suspended").length,
          totalUsers,
          totalResidents,
          pendingResidents,
          totalAdmins,
          totalSecurity,
          totalPasses,
          activePasses,
          insideNowPasses,
          totalGateLogs,
          gateLogsToday,
          deniedToday,
          totalNotices,
        },
        estates: estates.map((estate) => {
          const counts = estateStatsMap.get(estate.id) ?? {
            residentsActive: 0,
            residentsPending: 0,
            securityActive: 0,
            adminsCount: 0,
            insideNow: 0,
          };
          return {
            id: estate.id,
            name: estate.name,
            type: estate.type,
            address: estate.address,
            city: estate.city,
            totalHouses: estate.totalHouses,
            status: estate.status,
            activatedAt: estate.activatedAt,
            activeUntil: estate.activeUntil,
            createdAt: estate.createdAt,
            createdBy: estate.createdBy,
            admins: estate.memberships.map((m) => ({
              membershipId: m.id,
              status: m.status,
              ...m.user,
            })),
            counts: {
              ...counts,
              streets: estate._count.streets,
              houses: estate._count.houses,
              passes: estate._count.passes,
              gateLogs: estate._count.gateLogs,
              notices: estate._count.notices,
            },
          };
        }),
        admins: admins.map((m) => ({
          membershipId: m.id,
          status: m.status,
          createdAt: m.createdAt,
          user: m.user,
          organization: m.organization,
        })),
        residents: residents.map((m) => ({
          membershipId: m.id,
          status: m.status,
          createdAt: m.createdAt,
          user: m.user,
          organization: m.organization,
          house: m.house
            ? { id: m.house.id, number: m.house.number, street: m.house.street.name }
            : null,
        })),
        securityStaff: securityStaff.map((m) => ({
          membershipId: m.id,
          status: m.status,
          assignedGate: m.assignedGate,
          shift: m.shift,
          createdAt: m.createdAt,
          user: m.user,
          organization: m.organization,
        })),
        recentPasses: recentPasses.map((p) => ({
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
          organization: p.organization,
          house: p.house ? { number: p.house.number, street: p.house.street.name } : null,
          createdBy: p.createdBy,
          admittedBy: p.admittedBy,
        })),
        recentGateLogs: recentGateLogs.map((l) => ({
          id: l.id,
          code: l.code,
          action: l.action,
          result: l.result,
          reason: l.reason,
          createdAt: l.createdAt,
          organization: l.organization,
          officer: l.officer,
          visitorName: l.pass?.visitorName ?? null,
          purpose: l.pass?.purpose ?? null,
          house: l.pass?.house
            ? { number: l.pass.house.number, street: l.pass.house.street.name }
            : null,
        })),
        recentNotices: recentNotices.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
          organization: n.organization,
          createdBy: n.createdBy,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Super Admin access required." } },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("Super admin overview error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load platform overview." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
