import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit } from "@/lib/auth-security";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
}).strict();

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401 });
  }

  if (!(await enforceRateLimit("change-password-ip:" + clientIp(req), 10, 15 * 60)) ||
      !(await enforceRateLimit("change-password-user:" + session.userId, 5, 60 * 60))) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many password-change attempts. Please wait before trying again." } }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Enter your current password and a new password of at least 8 characters." } }, { status: 400 });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: { code: "SAME_PASSWORD", message: "Your new password must be different." } }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "active" || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: { code: "INCORRECT_PASSWORD", message: "Your current password is incorrect." } }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, familyId: { not: session.sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Your password has been changed." }, { headers: { "Cache-Control": "no-store" } });
}
