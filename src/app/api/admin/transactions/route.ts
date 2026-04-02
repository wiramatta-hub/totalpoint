import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/transactions — list transactions with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const line_uid = searchParams.get("line_uid") ?? "";
    const type = searchParams.get("type") ?? ""; // 'earn' | 'burn' | ''
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = 30;

    const where: Record<string, unknown> = {};
    if (line_uid) where.user = { line_uid };
    if (type === "earn" || type === "burn") where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { display_name: true, line_uid: true, tier: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/admin/transactions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
