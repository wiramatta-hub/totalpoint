import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer, getUserChannel, POINT_UPDATE_EVENT } from "@/lib/pusher";
import { getTierForSpent, calculatePoints } from "@/lib/tiers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_uid, purchase_amount, description } = body as {
      line_uid: string;
      purchase_amount: number;
      description?: string;
    };

    // --- Input validation ---
    if (!line_uid || typeof line_uid !== "string") {
      return NextResponse.json({ error: "line_uid is required" }, { status: 400 });
    }
    if (!purchase_amount || typeof purchase_amount !== "number" || purchase_amount <= 0) {
      return NextResponse.json({ error: "purchase_amount must be a positive number" }, { status: 400 });
    }

    // --- Find or create user ---
    let user = await prisma.user.findUnique({ where: { line_uid } });
    if (!user) {
      return NextResponse.json({ error: "User not found. Please register first." }, { status: 404 });
    }

    // --- Calculate new totals ---
    const newTotalSpent = user.total_spent + purchase_amount;
    const newTierConfig = getTierForSpent(newTotalSpent);
    const pointsEarned = calculatePoints(purchase_amount, newTierConfig);
    const newPoints = user.current_points + pointsEarned;

    // --- Persist (transaction ensures atomicity) ---
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { line_uid },
        data: {
          total_spent: newTotalSpent,
          current_points: newPoints,
          tier: newTierConfig.label,
        },
      }),
      prisma.transaction.create({
        data: {
          user_id: user.id,
          amount: purchase_amount,
          points_earned_or_burned: pointsEarned,
          type: "earn",
          description: description ?? `Purchase of ${purchase_amount} THB`,
        },
      }),
    ]);

    // --- Trigger Pusher real-time event ---
    await pusherServer.trigger(getUserChannel(line_uid), POINT_UPDATE_EVENT, {
      newPoints: updatedUser.current_points,
      newTier: updatedUser.tier,
      pointsEarned,
      totalSpent: updatedUser.total_spent,
    });

    return NextResponse.json({
      success: true,
      pointsEarned,
      newPoints: updatedUser.current_points,
      newTier: updatedUser.tier,
      totalSpent: updatedUser.total_spent,
      tierUpgraded: user.tier !== updatedUser.tier,
    });
  } catch (err) {
    console.error("[POST /api/points/earn]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
