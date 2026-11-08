import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true, phone: true, status: true, mustChangePassword: true, emailVerifiedAt: true, createdAt: true, lastLoginAt: true },
  });
  if (!user || user.status !== "active") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true, house: { include: { street: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    user: { ...user, emailVerified: !!user.emailVerifiedAt },
    memberships: memberships.map((membership) => ({
      id: membership.id,
      role: membership.role,
      status: membership.status,
      organization: { id: membership.organization.id, name: membership.organization.name, status: membership.organization.status },
      house: membership.house ? { id: membership.house.id, number: membership.house.number, street: membership.house.street.name } : null,
    })),
    activeMembershipId: session.membershipId ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
