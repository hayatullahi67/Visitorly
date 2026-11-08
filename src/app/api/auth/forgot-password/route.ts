import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, issueAuthCode } from "@/lib/auth-security";

const schema = z.object({ email: z.string().trim().email().max(254) }).strict();
export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: { message: "Enter a valid email address." } }, { status: 400 });
    const email = body.data.email.toLowerCase();
    const allowed = await enforceRateLimit("pwreq:" + clientIp(req), 5, 15 * 60) &&
      await enforceRateLimit("pwemail:" + email, 3, 60 * 60);
    if (!allowed) return NextResponse.json({ message: "If an account exists, a reset code will be sent. Please wait before trying again." }, { status: 200 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, status: true } });
    if (user?.status === "active") {
      try { await issueAuthCode(user.id, user.email, "password_reset"); }
      catch (error) { console.error("Password reset email error:", error); }
    }
    return NextResponse.json({ message: "If an account exists, a reset code will be sent to that email address." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: { message: "Unable to process this request right now." } }, { status: 500 });
  }
}