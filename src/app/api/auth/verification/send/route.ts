import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, issueAuthCode } from "@/lib/auth-security";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { message: "Please sign in first." } }, { status: 401 });
  try {
    if (!(await enforceRateLimit("verify:" + clientIp(req), 5, 15 * 60)) ||
        !(await enforceRateLimit("verifyuser:" + session.userId, 3, 60 * 60))) {
      return NextResponse.json({ error: { message: "Too many code requests. Please try again later." } }, { status: 429 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, emailVerifiedAt: true } });
    if (!user) return NextResponse.json({ error: { message: "Account not found." } }, { status: 404 });
    if (user.emailVerifiedAt) return NextResponse.json({ message: "Your email is already verified." });
    await issueAuthCode(user.id, user.email, "email_verification");
    return NextResponse.json({ message: "A verification code has been sent to your email." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Verification email error:", error);
    return NextResponse.json({ error: { message: "Unable to send a verification code right now." } }, { status: 503 });
  }
}