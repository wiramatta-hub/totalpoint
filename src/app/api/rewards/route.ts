import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/rewards
 * Returns all active rewards for the catalog page.
 */
export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({
      where: { is_active: true },
      orderBy: { required_points: "asc" },
    });
    return NextResponse.json({ rewards });
  } catch (err) {
    console.error("[GET /api/rewards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
