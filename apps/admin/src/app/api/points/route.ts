import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { adminAdjustPoints } from "@/lib/points";
import { adminAdjustPointsSchema } from "@/lib/validators";

/**
 * POST /api/points/adjust
 * Admin manual point adjustment
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can adjust points
    const user = session.user as { id: string; role: string };
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = adminAdjustPointsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await adminAdjustPoints({
      ...parsed.data,
      adminId: user.id,
    });

    await prisma.auditLog.create({
      data: {
        adminUserId: user.id,
        action: "ADJUST_POINTS",
        entity: "Member",
        entityId: parsed.data.memberId,
        newData: {
          points: parsed.data.points,
          reason: parsed.data.reason,
          newBalance: result.newBalance,
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      entry: result.entry,
    });
  } catch (error) {
    console.error(error);
    if ((error as Error).message === "Insufficient points") {
      return NextResponse.json({ error: "คะแนนไม่เพียงพอสำหรับการหัก" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/points/history
 * Get member's point history (LIFF client)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    // Admin access
    const session = await auth();
    if (session?.user && memberId) {
      const history = await prisma.pointLedger.findMany({
        where: { memberId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ history });
    }

    // LIFF client access
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT and get memberId from token
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "secret");
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, secret);
    const mid = payload.memberId as string;

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.pointLedger.findMany({
        where: { memberId: mid },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pointLedger.count({ where: { memberId: mid } }),
    ]);

    return NextResponse.json({
      history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
