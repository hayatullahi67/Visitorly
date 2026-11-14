import { NextResponse } from "next/server";
import { createAccessToken, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isSuperAdmin: true,
        status: true,
        mustChangePassword: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user || user.status !== "active") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in again." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        organization: true,
        house: { include: { street: true } },
        requestedHouse: { include: { street: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    let activeMembershipId = session.membershipId ?? null;
    let promotedToken: string | null = null;

    // If current session has no active membership bound, check if the user now has an active one
    if (!activeMembershipId) {
      const firstActive = memberships.find(
        (m) => m.status === "active" && m.organization.status === "active"
      );
      if (firstActive) {
        activeMembershipId = firstActive.id;
        await prisma.refreshToken.updateMany({
          where: {
            familyId: session.sessionId,
            userId: user.id,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { membershipId: firstActive.id },
        });
        promotedToken = await createAccessToken({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          sessionId: session.sessionId,
          isSuperAdmin: user.isSuperAdmin,
          membershipId: firstActive.id,
          organizationId: firstActive.organizationId,
          role: firstActive.role,
          mustChangePassword: user.mustChangePassword,
        });
      }
    }

    const activeMembershipObj = memberships.find((m) => m.id === activeMembershipId) || null;

    const response = NextResponse.json(
      {
        user: { ...user, emailVerified: !!user.emailVerifiedAt },
        memberships: memberships.map((membership) => ({
          id: membership.id,
          role: membership.role,
          status: membership.status,
          assignedGate: membership.assignedGate,
          shift: membership.shift,
          organization: {
            id: membership.organization.id,
            name: membership.organization.name,
            address: membership.organization.address,
            city: membership.organization.city,
            status: membership.organization.status,
          },
          house: membership.house
            ? {
                id: membership.house.id,
                number: membership.house.number,
                streetId: membership.house.streetId,
                street: membership.house.street.name,
              }
            : null,
          requestedHouse: membership.requestedHouse
            ? {
                id: membership.requestedHouse.id,
                number: membership.requestedHouse.number,
                streetId: membership.requestedHouse.streetId,
                street: membership.requestedHouse.street.name,
              }
            : null,
        })),
        activeMembershipId,
        activeRole: activeMembershipObj?.role ?? null,
        activeOrganizationId: activeMembershipObj?.organizationId ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    if (promotedToken) {
      response.cookies.set("access_token", promotedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load profile." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
