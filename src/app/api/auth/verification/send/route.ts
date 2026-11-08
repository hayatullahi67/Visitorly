import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, issueAuthCode } from "@/lib/auth-security";

const schema = z.object({ email: z.string().trim().email().max(254) }).strict();
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { message: "Enter a valid email address." } }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    if (!(await enforceRateLimit("verify-send-ip:" + clientIp(req), 5, 15 * 60)) ||
        !(await enforceRateLimit("verify-send-email:" + email, 3, 60 * 60))) {
      return NextResponse.json({ message: "If the account needs verification, a code will be sent. Please wait before trying again." });
    }
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true, status: true } });
    if (user && !user.emailVerifiedAt && user.status === "active") {
      try { await issueAuthCode(user.id, user.email, "email_verification"); }
      catch (error) { console.error("Verification send error:", error); }
    }
    return NextResponse.json({ message: "If the account needs verification, a code will be sent to its email address." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Verification request error:", error);
    return NextResponse.json({ error: { message: "Unable to process this request right now." } }, { status: 500 });
  }
}