import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { clientIp, enforceRateLimit, hashCode } from "@/lib/auth-security";

const schema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { message: "Enter your email, six-digit code and a password of at least 8 characters." } }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    if (!(await enforceRateLimit("pwverify:" + clientIp(req), 10, 15 * 60))) {
      return NextResponse.json({ error: { message: "Too many attempts. Please try again later." } }, { status: 429 });
    }
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } });
    if (!user || user.status !== "active") return NextResponse.json({ error: { message: "The code is invalid or expired." } }, { status: 400 });
    const record = await prisma.authCode.findFirst({
      where: { userId: user.id, purpose: "password_reset", consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return NextResponse.json({ error: { message: "The code is invalid or expired. Request a new one." } }, { status: 400 });
    const claimed = await prisma.authCode.updateMany({
      where: { id: record.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count !== 1 || record.codeHash !== hashCode(parsed.data.code)) {
      if (record.attempts + 1 >= 5) await prisma.authCode.updateMany({ where: { id: record.id, consumedAt: null }, data: { consumedAt: new Date() } });
      return NextResponse.json({ error: { message: "The code is invalid or expired." } }, { status: 400 });
    }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    const used = await prisma.$transaction(async tx => {
      const consume = await tx.authCode.updateMany({ where: { id: record.id, consumedAt: null, attempts: { lte: 5 }, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consume.count !== 1) return false;
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.authCode.updateMany({ where: { userId: user.id, purpose: "password_reset", consumedAt: null }, data: { consumedAt: new Date() } });
      return true;
    });
    if (!used) return NextResponse.json({ error: { message: "The code has already been used. Request a new one." } }, { status: 400 });
    return NextResponse.json({ message: "Your password has been reset. You can now sign in." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Password reset confirmation error:", error);
    return NextResponse.json({ error: { message: "Unable to reset your password right now." } }, { status: 500 });
  }
}