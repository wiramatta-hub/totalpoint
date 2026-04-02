import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/members — list all members with optional search
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = 20;

    const where = search
      ? {
          OR: [
            { display_name: { contains: search, mode: "insensitive" as const } },
            { line_uid: { contains: search, mode: "insensitive" as const } },
            { phone_number: { contains: search } },
          ],
        }
      : {};

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { transactions: true } } },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ members, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/admin/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
