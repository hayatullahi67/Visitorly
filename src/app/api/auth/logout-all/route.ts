import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  await prisma.refreshToken.updateMany({
    where: { userId: session.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const response = NextResponse.json({ message: "You have been signed out on all devices." }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("access_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  response.cookies.set("refresh_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/api/auth" });
  return response;
}
