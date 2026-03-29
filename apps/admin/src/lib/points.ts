import { prisma } from "@/lib/db";
import {
  OrderChannel,
  PointTransactionType,
  MemberStatus,
  Campaign,
  MemberTier,
} from "@prisma/client";

// ============================================================
// POINT CALCULATION
// ============================================================

interface CalculatePointsInput {
  purchaseAmount: number;
  channel: OrderChannel;
  campaign: Campaign | null;
  tier: MemberTier;
}

export function calculatePoints({
  purchaseAmount,
  channel: _channel,
  campaign,
  tier,
}: CalculatePointsInput): { points: number; lotteryTickets: number } {
  if (!campaign || purchaseAmount <= 0) return { points: 0, lotteryTickets: 0 };

  const minAmount = campaign.minPurchaseAmount ?? 0;
  if (purchaseAmount < minAmount) return { points: 0, lotteryTickets: 0 };

  // Base points: pointsPerBaht * purchase amount
  let points = Math.floor(purchaseAmount * campaign.pointsPerBaht);

  // Campaign multiplier
  points = Math.floor(points * campaign.pointMultiplier);

  // Tier multiplier (silver = 1.2x, gold = 1.5x, etc.)
  points = Math.floor(points * tier.pointMultiplier);

  // Max points per order cap
  if (campaign.maxPointsPerOrder && points > campaign.maxPointsPerOrder) {
    points = campaign.maxPointsPerOrder;
  }

  // Lottery tickets
  let lotteryTickets = 0;
  if (campaign.hasLottery && campaign.lotteryPurchasePerTicket) {
    lotteryTickets = Math.floor(
      purchaseAmount / campaign.lotteryPurchasePerTicket
    );
  }

  return { points, lotteryTickets };
}

// ============================================================
// AWARD POINTS (Transactional)
// ============================================================

interface AwardPointsInput {
  memberId: string;
  points: number;
  type: PointTransactionType;
  description: string;
  referenceId?: string;
  referenceType?: string;
  orderSubmissionId?: string;
  expiresAt?: Date;
  createdBy?: string;
}

export async function awardPoints(input: AwardPointsInput) {
  return await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: input.memberId },
      select: {
        id: true,
        currentPoints: true,
        lifetimePoints: true,
        status: true,
      },
    });

    if (!member) throw new Error("Member not found");
    if (member.status !== MemberStatus.ACTIVE) {
      throw new Error("Member account is not active");
    }

    const newBalance = member.currentPoints + input.points;
    const newLifetime = member.lifetimePoints + input.points;

    // Update member balance
    await tx.member.update({
      where: { id: input.memberId },
      data: {
        currentPoints: newBalance,
        lifetimePoints: newLifetime,
        lastActivityAt: new Date(),
      },
    });

    // Create ledger entry
    const entry = await tx.pointLedger.create({
      data: {
        memberId: input.memberId,
        type: input.type,
        points: input.points,
        balanceAfter: newBalance,
        description: input.description,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        orderSubmissionId: input.orderSubmissionId,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy ?? "SYSTEM",
      },
    });

    // Check if tier upgrade is needed
    await checkAndUpgradeTier(tx, input.memberId, newLifetime);

    return { entry, newBalance };
  });
}

// ============================================================
// DEDUCT POINTS (for redemption)
// ============================================================

export async function deductPoints(input: {
  memberId: string;
  points: number;
  type: PointTransactionType;
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: input.memberId },
      select: {
        id: true,
        currentPoints: true,
        status: true,
      },
    });

    if (!member) throw new Error("Member not found");
    if (member.status !== MemberStatus.ACTIVE) {
      throw new Error("Member account is not active");
    }
    if (member.currentPoints < input.points) {
      throw new Error("Insufficient points");
    }

    const newBalance = member.currentPoints - input.points;

    await tx.member.update({
      where: { id: input.memberId },
      data: { currentPoints: newBalance },
    });

    const entry = await tx.pointLedger.create({
      data: {
        memberId: input.memberId,
        type: input.type,
        points: -input.points,
        balanceAfter: newBalance,
        description: input.description,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        createdBy: input.createdBy ?? "SYSTEM",
      },
    });

    return { entry, newBalance };
  });
}

// ============================================================
// TIER UPGRADE CHECK
// ============================================================

async function checkAndUpgradeTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  memberId: string,
  lifetimePoints: number
) {
  // Find the highest tier the member qualifies for
  const eligibleTier = await tx.memberTier.findFirst({
    where: { minLifetimePoints: { lte: lifetimePoints } },
    orderBy: { minLifetimePoints: "desc" },
  });

  if (!eligibleTier) return;

  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: { tierId: true },
  });

  if (member && member.tierId !== eligibleTier.id) {
    await tx.member.update({
      where: { id: memberId },
      data: { tierId: eligibleTier.id },
    });
  }
}

// ============================================================
// BIRTHDAY REWARD
// ============================================================

export async function giveBirthdayReward(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { tier: true },
  });
  if (!member || !member.birthDate) return null;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Already given this year
  if (member.birthdayRewardGivenYear === currentYear) return null;

  const todayMd = `${now.getMonth()}-${now.getDate()}`;
  const birthMd = `${member.birthDate.getMonth()}-${member.birthDate.getDate()}`;
  if (todayMd !== birthMd) return null;

  const bonusPoints = member.tier.birthdayBonusPoints;
  if (bonusPoints <= 0) return null;

  const result = await awardPoints({
    memberId,
    points: bonusPoints,
    type: PointTransactionType.EARN_BIRTHDAY,
    description: `🎂 โบนัสวันเกิด ${currentYear}`,
    createdBy: "SYSTEM",
  });

  await prisma.member.update({
    where: { id: memberId },
    data: { birthdayRewardGivenYear: currentYear },
  });

  return result;
}

// ============================================================
// ADMIN POINT ADJUSTMENT
// ============================================================

export async function adminAdjustPoints(input: {
  memberId: string;
  points: number; // can be negative
  reason: string;
  adminId: string;
}) {
  if (input.points > 0) {
    return awardPoints({
      memberId: input.memberId,
      points: input.points,
      type: PointTransactionType.ADMIN_ADJUST,
      description: `[Admin] ${input.reason}`,
      createdBy: input.adminId,
    });
  } else {
    return deductPoints({
      memberId: input.memberId,
      points: Math.abs(input.points),
      type: PointTransactionType.ADMIN_ADJUST,
      description: `[Admin] ${input.reason}`,
      createdBy: input.adminId,
    });
  }
}
