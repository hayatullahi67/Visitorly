import { NextRequest, NextResponse } from "next/server";
import { createAccessToken, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.strictObject({ membershipId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose a valid estate account." } }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: parsed.data.membershipId,
      userId: session.userId,
      status: "active",
      organization: { status: "active" },
    },
    include: { organization: true },
  });
  if (!membership) {
    return NextResponse.json({ error: { code: "MEMBERSHIP_NOT_ACTIVE", message: "That estate account is not active." } }, { status: 403 });
  }

  await prisma.refreshToken.updateMany({
    where: { familyId: session.sessionId, userId: session.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { membershipId: membership.id },
  });

  const accessToken = await createAccessToken({
    ...session,
    membershipId: membership.id,
    organizationId: membership.organizationId,
    role: membership.role,
  });
  const response = NextResponse.json({ message: "Estate account selected.", membership: { id: membership.id, role: membership.role, organization: membership.organization.name } }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  return response;
}
