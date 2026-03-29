import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { campaignSchema } from "@/lib/validators";

/**
 * GET /api/campaigns
 * List campaigns (admin: all, LIFF: active only with ?public=true)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "true";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    if (!isPublic) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const where = isPublic
      ? {
          status: "ACTIVE" as const,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        }
      : status
      ? { status: status as "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" }
      : {};

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          campaignRewards: { include: { reward: true } },
          lotteryConfig: true,
          _count: { select: { orderSubmissions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/campaigns
 * Create new campaign (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const {
      hasLottery,
      lotteryPurchasePerTicket,
      rules,
      ...campaignData
    } = parsed.data;

    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          ...campaignData,
          startDate: new Date(campaignData.startDate),
          endDate: new Date(campaignData.endDate),
          hasLottery,
          lotteryPurchasePerTicket,
          createdBy: session.user?.id,
          ...(rules !== undefined ? { rules: rules as any } : {}),
        },
      });

      if (hasLottery) {
        await tx.lotteryConfig.create({
          data: { campaignId: created.id },
        });
      }

      await tx.auditLog.create({
        data: {
          adminUserId: session.user?.id,
          action: "CREATE",
          entity: "Campaign",
          entityId: created.id,
          newData: created as any,
        },
      });

      return created;
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
