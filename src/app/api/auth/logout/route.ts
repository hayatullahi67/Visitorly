import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const rawToken = req.cookies.get("refresh_token")?.value;
  if (rawToken) {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, select: { familyId: true } });
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  const response = NextResponse.json({ message: "You have been signed out." }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("access_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/api/auth" });
  return response;
}
