import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberFromRequest } from "@/lib/line";
import { orderSubmitSchema } from "@/lib/validators";
import { calculatePoints, awardPoints } from "@/lib/points";
import { PointTransactionType } from "@prisma/client";

/**
 * POST /api/orders
 * Submit order number for points (LIFF client)
 */
export async function POST(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = orderSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { campaignId, channel, orderNumber, purchaseAmount, purchaseDate, boothSessionId } =
      parsed.data;

    // Check for duplicate order number
    const existing = await prisma.orderSubmission.findUnique({
      where: { channel_orderNumber: { channel, orderNumber } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "เลขคำสั่งซื้อนี้ถูกส่งแล้ว" },
        { status: 409 }
      );
    }

    // Check member
    const member = await prisma.member.findUnique({
      where: { id: memberPayload.memberId },
      include: { tier: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get active campaign
    let campaign = null;
    if (campaignId) {
      campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });
    } else {
      campaign = await prisma.campaign.findFirst({
        where: {
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          channels: { has: channel },
        },
        orderBy: { pointsPerBaht: "desc" },
      });
    }

    const { points, lotteryTickets } = calculatePoints({
      purchaseAmount,
      channel,
      campaign,
      tier: member.tier,
    });

    // Create submission
    const submission = await prisma.orderSubmission.create({
      data: {
        memberId: member.id,
        campaignId: campaign?.id,
        channel,
        orderNumber,
        purchaseAmount,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        boothSessionId,
        status: "APPROVED", // Auto-approve order number submissions
        pointsEarned: points,
        lotteryTickets,
        reviewedAt: new Date(),
        reviewNote: "Auto-approved (order number submission)",
      },
    });

    // Award points
    let ledgerEntry = null;
    if (points > 0) {
      const result = await awardPoints({
        memberId: member.id,
        points,
        type: PointTransactionType.EARN_PURCHASE,
        description: `ซื้อสินค้าจาก ${channel} (${orderNumber})`,
        referenceId: submission.id,
        referenceType: "OrderSubmission",
        orderSubmissionId: submission.id,
      });
      ledgerEntry = result.entry;

      // Create lottery entries
      if (campaign && lotteryTickets > 0) {
        const lotteryConfig = await prisma.lotteryConfig.findUnique({
          where: { campaignId: campaign.id },
        });
        if (lotteryConfig) {
          await prisma.lotteryEntry.create({
            data: {
              memberId: member.id,
              campaignId: campaign.id,
              lotteryConfigId: lotteryConfig.id,
              tickets: lotteryTickets,
            },
          });
        }
      }
    }

    return NextResponse.json({
      submission,
      pointsEarned: points,
      lotteryTickets,
      newBalance: ledgerEntry?.balanceAfter ?? member.currentPoints,
    });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/orders
 * Get member's order history (LIFF client)
 */
export async function GET(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.orderSubmission.findMany({
        where: { memberId: memberPayload.memberId },
        include: { campaign: { select: { name: true, nameTh: true } } },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.orderSubmission.count({
        where: { memberId: memberPayload.memberId },
      }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
