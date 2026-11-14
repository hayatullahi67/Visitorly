import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

function loadEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvIfNeeded();
  const { prisma } = await import("../src/lib/prisma");

  const email = "testadmin@visitorly.test";
  const password = "TestAdmin123!";
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Test Estate Admin already exists: ${email}`);
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: "Tunde Adebayo (Test Admin)",
          email,
          phone: "+2348099990001",
          passwordHash,
          isSuperAdmin: false,
          status: "active",
          mustChangePassword: false,
          emailVerifiedAt: new Date(),
        },
      });

      const org = await tx.organization.create({
        data: {
          type: "estate",
          name: "Victoria Island Crest Estate",
          address: "14 Adeola Odeku Street",
          city: "Lagos",
          totalHouses: 80,
          status: "pending",
          createdById: user.id,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "estate_admin",
          status: "active",
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      return { user, org };
    });

    console.log("Created Test Estate Admin & Pending Estate:");
    console.log(`Estate: ${result.org.name} (status: ${result.org.status})`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed to create test estate admin:", err);
  process.exit(1);
});
