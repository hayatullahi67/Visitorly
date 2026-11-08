import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, hashCode } from "@/lib/auth-security";

const schema = z.object({ email: z.string().trim().email().max(254), code: z.string().regex(/^\d{6}$/) }).strict();
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { message: "Enter a valid email and six-digit code." } }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    if (!(await enforceRateLimit("verify-code-ip:" + clientIp(req), 10, 15 * 60)) ||
        !(await enforceRateLimit("verify-code-email:" + email, 10, 15 * 60))) {
      return NextResponse.json({ error: { message: "Too many attempts. Please try again later." } }, { status: 429 });
    }
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true, status: true } });
    if (!user || user.status !== "active") return NextResponse.json({ error: { message: "The code is invalid or expired." } }, { status: 400 });
    if (user.emailVerifiedAt) return NextResponse.json({ message: "Your email is already verified." });
    const record = await prisma.authCode.findFirst({
      where: { userId: user.id, purpose: "email_verification", consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return NextResponse.json({ error: { message: "The code is invalid or expired. Request a new one." } }, { status: 400 });
    const claimed = await prisma.authCode.updateMany({ where: { id: record.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } } });
    if (claimed.count !== 1 || record.codeHash !== hashCode(parsed.data.code)) {
      if (record.attempts + 1 >= 5) await prisma.authCode.updateMany({ where: { id: record.id, consumedAt: null }, data: { consumedAt: new Date() } });
      return NextResponse.json({ error: { message: "The code is invalid or expired." } }, { status: 400 });
    }
    const done = await prisma.$transaction(async tx => {
      const consumed = await tx.authCode.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) return false;
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      return true;
    });
    if (!done) return NextResponse.json({ error: { message: "This code has already been used." } }, { status: 400 });
    return NextResponse.json({ message: "Email verified successfully. You can now sign in." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Email verification confirmation error:", error);
    return NextResponse.json({ error: { message: "Unable to verify your email right now." } }, { status: 500 });
  }
}