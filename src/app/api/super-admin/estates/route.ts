import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createEstateSchema = z.object({
  name: z.string().trim().min(2, "Estate name is required").max(150),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  totalHouses: z.number().int().positive().max(50000).optional(),
  status: z.enum(["active", "pending"]).optional(),
  adminName: z.string().trim().max(120).optional().or(z.literal("")),
  adminEmail: z.string().trim().email("Enter a valid admin email").optional().or(z.literal("")),
  adminPhone: z.string().trim().max(20).optional().or(z.literal("")),
  adminPassword: z.string().min(8).max(128).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const parsed = createEstateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid estate details", details: parsed.error.flatten().fieldErrors } },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { name, address, city, totalHouses, status, adminName, adminEmail, adminPhone, adminPassword } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const estate = await tx.organization.create({
        data: {
          type: "estate",
          name,
          address: address || null,
          city: city || null,
          totalHouses: totalHouses ?? null,
          status: status || "active",
          createdById: session.userId,
        },
      });

      if (adminEmail) {
        const normalizedEmail = adminEmail.toLowerCase();
        let adminUser = await tx.user.findUnique({ where: { email: normalizedEmail } });

        if (!adminUser) {
          if (!adminName || !adminPassword) {
            throw new Error("ADMIN_FIELDS_REQUIRED");
          }
          adminUser = await tx.user.create({
            data: {
              fullName: adminName,
              email: normalizedEmail,
              phone: adminPhone ? adminPhone.replace(/[\s().-]/g, "") : null,
              passwordHash: await hashPassword(adminPassword),
              mustChangePassword: true,
              emailVerifiedAt: new Date(),
              status: "active",
            },
          });
        }

        await tx.membership.upsert({
          where: {
            userId_organizationId_role: {
              userId: adminUser.id,
              organizationId: estate.id,
              role: "estate_admin",
            },
          },
          update: {
            status: "active",
            reviewedById: session.userId,
            reviewedAt: new Date(),
          },
          create: {
            userId: adminUser.id,
            organizationId: estate.id,
            role: "estate_admin",
            status: "active",
            reviewedById: session.userId,
            reviewedAt: new Date(),
          },
        });
      }

      return estate;
    });

    return NextResponse.json(
      { estate: result, message: "Estate created successfully." },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Super Admin access required." } }, { status: 403 });
    }
    if (msg === "ADMIN_FIELDS_REQUIRED") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Admin name and password (8+ chars) are required for a new admin account." } },
        { status: 400 }
      );
    }
    console.error("Create estate error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create estate." } }, { status: 500 });
  }
}
