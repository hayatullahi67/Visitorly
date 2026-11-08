import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const registerSchema = z.strictObject({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(254),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { fullName, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone?.replace(/[\\s().-]/g, "") || null;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { email: true, phone: true },
    });
    if (existing?.email === email) {
      return NextResponse.json({ error: { code: "EMAIL_IN_USE", message: "An account with this email already exists. Please sign in." } }, { status: 409 });
    }
    if (phone && existing?.phone === phone) {
      return NextResponse.json({ error: { code: "PHONE_IN_USE", message: "This phone number is already linked to another account." } }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email,
        phone,
        passwordHash: await hashPassword(password),
      },
      select: { id: true, fullName: true, email: true },
    });

    return NextResponse.json({
      message: "Your account has been created. Sign in and request access to your estate.",
      user,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: { code: "ACCOUNT_EXISTS", message: "An account with these details already exists." } }, { status: 409 });
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
