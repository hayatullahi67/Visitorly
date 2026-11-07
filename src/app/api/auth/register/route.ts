import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(120),
  email: z.string().email("Valid email is required").max(254),
  phone: z.string().max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["resident", "estate_admin", "estate_security"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { fullName, email, phone, password, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone?.trim() || null;

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_IN_USE",
            message: "An account with this email already exists. Please sign in.",
          },
        },
        { status: 409 }
      );
    }

    if (normalizedPhone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });
      if (phoneExists) {
        return NextResponse.json(
          {
            error: {
              code: "PHONE_IN_USE",
              message: "This phone number is already linked to another account.",
            },
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        emailVerifiedAt: null,
        mustChangePassword: false,
      },
    });

    // For estate_admin we would normally create an Organization here.
    // For now we just create the user. Membership/organization linking
    // will be handled in a later step (or by super admin approval).

    return NextResponse.json(
      {
        message: "Account created successfully. You can now sign in.",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
