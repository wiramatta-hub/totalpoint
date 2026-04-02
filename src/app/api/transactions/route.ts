import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/transactions?line_uid=xxx — get transaction history for a user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const line_uid = searchParams.get("line_uid");

    if (!line_uid) {
      return NextResponse.json({ error: "line_uid is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { line_uid } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[GET /api/transactions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
