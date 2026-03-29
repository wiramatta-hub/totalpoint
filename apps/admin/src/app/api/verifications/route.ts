import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { verificationActionSchema } from "@/lib/validators";
import { calculatePoints, awardPoints } from "@/lib/points";
import { PointTransactionType } from "@prisma/client";

/**
 * GET /api/verifications
 * List submissions pending review (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "PENDING";
    const channel = searchParams.get("channel");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const where = {
      ...(channel ? { channel: channel as "SHOPEE" | "TIKTOK" | "LAZADA" | "BOOTH" | "HOMMALL" | "MANUAL" } : {}),
      status: status as "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "CANCELLED",
    };

    const [submissions, total] = await Promise.all([
      prisma.orderSubmission.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              lineDisplayName: true,
              linePictureUrl: true,
              phone: true,
              tier: { select: { name: true, color: true } },
            },
          },
          campaign: { select: { id: true, name: true, nameTh: true } },
        },
        orderBy: { submittedAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.orderSubmission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
