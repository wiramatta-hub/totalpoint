import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { verificationActionSchema } from "@/lib/validators";
import { calculatePoints, awardPoints, deductPoints } from "@/lib/points";
import { PointTransactionType, OrderStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/verifications/[id]
 * Approve or reject an order submission (admin only)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = verificationActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { action, note, pointsOverride } = parsed.data;

    const submission = await prisma.orderSubmission.findUnique({
      where: { id },
      include: {
        member: { include: { tier: true } },
        campaign: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status === OrderStatus.APPROVED || submission.status === OrderStatus.REJECTED) {
      return NextResponse.json(
        { error: "Submission already reviewed" },
        { status: 409 }
      );
    }

    if (action === "APPROVE") {
      let points = pointsOverride ?? 0;

      if (!pointsOverride && submission.purchaseAmount) {
        const calc = calculatePoints({
          purchaseAmount: submission.purchaseAmount,
          channel: submission.channel,
          campaign: submission.campaign,
          tier: submission.member.tier,
        });
        points = calc.points;
      }

      await prisma.$transaction(async (tx) => {
        await tx.orderSubmission.update({
          where: { id },
          data: {
            status: OrderStatus.APPROVED,
            pointsEarned: points,
            reviewedBy: session.user?.id,
            reviewedAt: new Date(),
            reviewNote: note,
          },
        });

        if (points > 0) {
          await awardPoints({
            memberId: submission.memberId,
            points,
            type: PointTransactionType.EARN_PURCHASE,
            description: `อนุมัติหลักฐานการซื้อ (${submission.channel})`,
            referenceId: submission.id,
            referenceType: "OrderSubmission",
            orderSubmissionId: submission.id,
            createdBy: session.user?.id,
          });
        }

        // Lottery tickets
        if (submission.campaign?.hasLottery && submission.purchaseAmount) {
          const lotteryConfig = await tx.lotteryConfig.findUnique({
            where: { campaignId: submission.campaign.id },
          });
          if (lotteryConfig && submission.campaign.lotteryPurchasePerTicket) {
            const tickets = Math.floor(
              submission.purchaseAmount / submission.campaign.lotteryPurchasePerTicket
            );
            if (tickets > 0) {
              await tx.lotteryEntry.upsert({
                where: {
                  // unique on campaignId+memberId not defined, so create
                  id: "noop",
                },
                create: {
                  memberId: submission.memberId,
                  campaignId: submission.campaign.id,
                  lotteryConfigId: lotteryConfig.id,
                  tickets,
                },
                update: { tickets: { increment: tickets } },
              });
            }
          }
        }

        await tx.auditLog.create({
          data: {
            adminUserId: session.user?.id,
            action: "APPROVE",
            entity: "OrderSubmission",
            entityId: id,
            newData: { pointsAwarded: points, note } as any,
          },
        });
      });

      return NextResponse.json({
        success: true,
        action: "APPROVED",
        pointsEarned: points,
      });
    } else {
      // REJECT
      await prisma.$transaction(async (tx) => {
        await tx.orderSubmission.update({
          where: { id },
          data: {
            status: OrderStatus.REJECTED,
            reviewedBy: session.user?.id,
            reviewedAt: new Date(),
            reviewNote: note,
          },
        });

        await tx.auditLog.create({
          data: {
            adminUserId: session.user?.id,
            action: "REJECT",
            entity: "OrderSubmission",
            entityId: id,
            newData: { reason: note } as any,
          },
        });
      });

      return NextResponse.json({ success: true, action: "REJECTED" });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
