import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberFromRequest } from "@/lib/line";
import { deductPoints } from "@/lib/points";
import { PointTransactionType } from "@prisma/client";
import { generateCouponCode } from "@/lib/utils";
import { z } from "zod";

const redeemSchema = z.object({
  rewardId: z.string().min(1),
});

/**
 * POST /api/redemptions
 * Redeem a reward (LIFF client)
 */
export async function POST(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { rewardId } = parsed.data;

    const [reward, member] = await Promise.all([
      prisma.reward.findUnique({ where: { id: rewardId } }),
      prisma.member.findUnique({ where: { id: memberPayload.memberId } }),
    ]);

    if (!reward || !reward.isActive) {
      return NextResponse.json({ error: "Reward not found or inactive" }, { status: 404 });
    }
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (member.currentPoints < reward.pointsCost) {
      return NextResponse.json(
        { error: "คะแนนไม่เพียงพอ" },
        { status: 400 }
      );
    }

    // Check stock
    if (reward.stock !== null && reward.stockUsed >= reward.stock) {
      return NextResponse.json({ error: "ของรางวัลหมดแล้ว" }, { status: 400 });
    }

    // Check max per member
    if (reward.maxPerMember) {
      const usageCount = await prisma.redemption.count({
        where: { memberId: member.id, rewardId },
      });
      if (usageCount >= reward.maxPerMember) {
        return NextResponse.json(
          { error: `สามารถแลกรางวัลนี้ได้สูงสุด ${reward.maxPerMember} ครั้ง` },
          { status: 400 }
        );
      }
    }

    // Check max per day
    if (reward.maxPerDay) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await prisma.redemption.count({
        where: {
          memberId: member.id,
          rewardId,
          redeemedAt: { gte: today },
        },
      });
      if (todayCount >= reward.maxPerDay) {
        return NextResponse.json(
          { error: "เกินจำนวนที่กำหนดสำหรับวันนี้" },
          { status: 400 }
        );
      }
    }

    // Generate coupon code
    const couponCode =
      reward.type === "COUPON" || reward.type === "HOMMALL_COUPON"
        ? generateCouponCode(reward.couponPrefix ?? "TP")
        : undefined;

    const expiresAt = reward.expiryDays
      ? new Date(Date.now() + reward.expiryDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Transaction: deduct points + create redemption + update stock
    const redemption = await prisma.$transaction(async (tx) => {
      const { entry } = await deductPoints({
        memberId: member.id,
        points: reward.pointsCost,
        type: PointTransactionType.REDEEM_REWARD,
        description: `แลกรางวัล: ${reward.nameTh}`,
        referenceId: rewardId,
        referenceType: "Reward",
      });

      const red = await tx.redemption.create({
        data: {
          memberId: member.id,
          rewardId,
          pointsUsed: reward.pointsCost,
          couponCode,
          expiresAt,
          pointLedgerEntryId: entry.id,
        },
      });

      await tx.reward.update({
        where: { id: rewardId },
        data: { stockUsed: { increment: 1 } },
      });

      return red;
    });

    return NextResponse.json({
      redemption: {
        id: redemption.id,
        rewardName: reward.nameTh,
        couponCode: redemption.couponCode,
        expiresAt: redemption.expiresAt,
        redeemedAt: redemption.redeemedAt,
      },
      pointsUsed: reward.pointsCost,
    });
  } catch (error) {
    console.error("POST /api/redemptions error:", error);
    if ((error as Error).message === "Insufficient points") {
      return NextResponse.json({ error: "คะแนนไม่เพียงพอ" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/redemptions
 * Get member's redemption history (LIFF client)
 */
export async function GET(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redemptions = await prisma.redemption.findMany({
      where: { memberId: memberPayload.memberId },
      include: {
        reward: {
          select: {
            name: true,
            nameTh: true,
            imageUrl: true,
            type: true,
          },
        },
      },
      orderBy: { redeemedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
