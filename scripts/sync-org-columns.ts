import fs from "node:fs";
import path from "node:path";

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
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "activeUntil" TIMESTAMP(3);`
    );
    console.log("Successfully ensured activatedAt and activeUntil columns exist on organizations.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error syncing columns:", err);
  process.exit(1);
});
