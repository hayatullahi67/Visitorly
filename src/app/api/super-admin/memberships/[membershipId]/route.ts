import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchMembershipSchema = z.object({
  status: z.enum(["pending", "active", "suspended", "rejected"]),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    const { membershipId: rawId } = await context.params;
    const membershipId = Number(rawId);
    if (!Number.isInteger(membershipId) || membershipId <= 0) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid membership ID." } }, { status: 400 });
    }

    const parsed = patchMembershipSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid status." } }, { status: 400 });
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: parsed.data.status,
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ membership: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in again." } }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Super Admin access required." } }, { status: 403 });
    }
    console.error("Super admin membership update error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update membership." } }, { status: 500 });
  }
}
