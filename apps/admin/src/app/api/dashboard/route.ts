import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/dashboard
 * Real-time dashboard stats (admin only)
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalMembers,
      membersThisMonth,
      membersLastMonth,
      activeMembers,
      totalPointsIssued,
      totalPointsRedeemed,
      pendingVerifications,
      todaySubmissions,
      approvedToday,
      activeCampaigns,
      tierBreakdown,
      channelStats,
      recentSubmissions,
      topMembers,
      dailyPoints,
    ] = await Promise.all([
      // Total members
      prisma.member.count(),

      // New members this month
      prisma.member.count({ where: { registeredAt: { gte: startOfMonth } } }),

      // New members last month
      prisma.member.count({
        where: { registeredAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),

      // Active members (activity in last 30 days)
      prisma.member.count({
        where: {
          lastActivityAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Total points issued (earn transactions)
      prisma.pointLedger.aggregate({
        where: { points: { gt: 0 } },
        _sum: { points: true },
      }),

      // Total points redeemed
      prisma.pointLedger.aggregate({
        where: { points: { lt: 0 } },
        _sum: { points: true },
      }),

      // Pending verifications
      prisma.orderSubmission.count({ where: { status: "PENDING" } }),

      // Today's submissions
      prisma.orderSubmission.count({ where: { submittedAt: { gte: startOfToday } } }),

      // Approved today
      prisma.orderSubmission.count({
        where: { status: "APPROVED", reviewedAt: { gte: startOfToday } },
      }),

      // Active campaigns
      prisma.campaign.count({
        where: {
          status: "ACTIVE",
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),

      // Tier breakdown
      prisma.member.groupBy({
        by: ["tierId"],
        _count: true,
      }),

      // Channel breakdown (this month)
      prisma.orderSubmission.groupBy({
        by: ["channel"],
        where: { submittedAt: { gte: startOfMonth }, status: "APPROVED" },
        _count: true,
        _sum: { pointsEarned: true, purchaseAmount: true },
      }),

      // Recent submissions
      prisma.orderSubmission.findMany({
        where: { status: { in: ["PENDING", "APPROVED", "REJECTED"] } },
        include: {
          member: { select: { lineDisplayName: true, linePictureUrl: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 10,
      }),

      // Top members by points
      prisma.member.findMany({
        orderBy: { currentPoints: "desc" },
        take: 5,
        select: {
          id: true,
          lineDisplayName: true,
          linePictureUrl: true,
          currentPoints: true,
          tier: { select: { id: true, name: true, nameTh: true, color: true } },
        },
      }),

      // Daily points for the last 14 days
      prisma.$queryRaw<Array<{ date: string; points: number; count: number }>>`
        SELECT
          DATE(created_at) as date,
          SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as points,
          COUNT(*) as count
        FROM point_ledger
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    const tiers = await prisma.memberTier.findMany({
      select: { id: true, name: true, nameTh: true, color: true },
    });
    const tierMap = Object.fromEntries(tiers.map((t) => [t.id, t]));

    return NextResponse.json({
      overview: {
        totalMembers,
        membersThisMonth,
        membersLastMonth,
        memberGrowth:
          membersLastMonth > 0
            ? Math.round(((membersThisMonth - membersLastMonth) / membersLastMonth) * 100)
            : 100,
        activeMembers,
        totalPointsIssued: totalPointsIssued._sum.points ?? 0,
        totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points ?? 0),
        pendingVerifications,
        todaySubmissions,
        approvedToday,
        activeCampaigns,
      },
      tierBreakdown: tierBreakdown.map((t) => ({
        tier: tierMap[t.tierId],
        count: t._count,
      })),
      channelStats,
      recentSubmissions,
      topMembers,
      dailyPoints,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
