import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  loadEnvIfNeeded();
  const { prisma } = await import("../src/lib/prisma");

  try {
    let email = getArg("--email")?.trim().toLowerCase();
    let fullName = getArg("--name")?.trim();
    let password = getArg("--password");

    if (!email) {
      const rl = readline.createInterface({ input, output });
      try {
        email = (await rl.question("Super Admin Email: ")).trim().toLowerCase();
        if (!email || !email.includes("@")) {
          console.error("Please enter a valid email address.");
          process.exit(1);
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          fullName = (await rl.question("Full Name: ")).trim();
          password = await rl.question("Password (min 8 chars): ");
        }
      } finally {
        rl.close();
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isSuperAdmin: true,
          status: "active",
          emailVerifiedAt: existing.emailVerifiedAt || new Date(),
        },
      });
      console.log(`Promoted existing user "${existing.fullName}" (${existing.email}) to Super Admin.`);
    } else {
      if (!fullName || !password || password.length < 8) {
        console.error("For a new account, --name and --password (at least 8 characters) are required.");
        process.exit(1);
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const created = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          isSuperAdmin: true,
          status: "active",
          mustChangePassword: false,
          emailVerifiedAt: new Date(),
        },
      });
      console.log(`Created new Super Admin account "${created.fullName}" (${created.email}).`);
    }

    console.log("You can now sign in at /login and you will be redirected to /super-admin.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed to set up Super Admin:", err);
  process.exit(1);
});
