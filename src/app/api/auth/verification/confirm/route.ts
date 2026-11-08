import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, hashCode } from "@/lib/auth-security";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { message: "Please sign in first." } }, { status: 401 });
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { message: "Enter the six-digit code." } }, { status: 400 });
    if (!(await enforceRateLimit("verifycode:" + clientIp(req), 10, 15 * 60))) {
      return NextResponse.json({ error: { message: "Too many attempts. Please try again later." } }, { status: 429 });
    }
    const record = await prisma.authCode.findFirst({
      where: { userId: session.userId, purpose: "email_verification", consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
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
    const result = await prisma.$transaction(async tx => {
      const consumed = await tx.authCode.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) return false;
      await tx.user.update({ where: { id: session.userId }, data: { emailVerifiedAt: new Date() } });
      return true;
    });
    if (!result) return NextResponse.json({ error: { message: "The code has already been used." } }, { status: 400 });
    return NextResponse.json({ message: "Your email has been verified." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: { message: "Unable to verify your email right now." } }, { status: 500 });
  }
}