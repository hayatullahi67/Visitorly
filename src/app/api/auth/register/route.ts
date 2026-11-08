import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { clientIp, enforceRateLimit, issueAuthCode } from "@/lib/auth-security";

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(8).max(128),
}).strict();

export async function POST(req: NextRequest) {
  try {
    if (!(await enforceRateLimit("register:" + clientIp(req), 5, 60 * 60))) {
      return NextResponse.json({ error: { message: "Too many registration attempts. Try again later." } }, { status: 429 });
    }
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check your details and try again.", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    const { fullName, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone?.replace(/[\s().-]/g, "") || null;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] }, select: { email: true, phone: true } });
    if (existing?.email === email) return NextResponse.json({ error: { code: "EMAIL_IN_USE", message: "An account with this email already exists. Please sign in." } }, { status: 409 });
    if (phone && existing?.phone === phone) return NextResponse.json({ error: { code: "PHONE_IN_USE", message: "This phone number is already linked to another account." } }, { status: 409 });
    const user = await prisma.user.create({
      data: { fullName: fullName.trim(), email, phone, passwordHash: await hashPassword(password) },
      select: { id: true, fullName: true, email: true },
    });
    try {
      await issueAuthCode(user.id, user.email, "email_verification");
    } catch (error) {
      console.error("Registration verification email error:", error);
      return NextResponse.json({ message: "Your account was created, but we could not send the verification code. Use the resend option on the verification screen.", user }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ message: "Your account was created. Enter the six-digit code sent to your email.", user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: { code: "ACCOUNT_EXISTS", message: "An account with these details already exists." } }, { status: 409 });
    console.error("Register error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}