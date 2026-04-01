import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer, getUserChannel, POINT_UPDATE_EVENT } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { line_uid, reward_id } = body as {
      line_uid: string;
      reward_id: string;
    };

    // --- Input validation ---
    if (!line_uid || typeof line_uid !== "string") {
      return NextResponse.json({ error: "line_uid is required" }, { status: 400 });
    }
    if (!reward_id || typeof reward_id !== "string") {
      return NextResponse.json({ error: "reward_id is required" }, { status: 400 });
    }

    // --- Fetch user and reward concurrently ---
    const [user, reward] = await Promise.all([
      prisma.user.findUnique({ where: { line_uid } }),
      prisma.reward.findUnique({ where: { id: reward_id } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (!reward || !reward.is_active) {
      return NextResponse.json({ error: "Reward not found or inactive." }, { status: 404 });
    }
    if (user.current_points < reward.required_points) {
      return NextResponse.json(
        {
          error: "Insufficient points.",
          currentPoints: user.current_points,
          required: reward.required_points,
        },
        { status: 422 }
      );
    }

    const newPoints = user.current_points - reward.required_points;

    // --- Persist atomically ---
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { line_uid },
        data: { current_points: newPoints },
      }),
      prisma.transaction.create({
        data: {
          user_id: user.id,
          amount: 0,
          points_earned_or_burned: reward.required_points,
          type: "burn",
          description: `Redeemed: ${reward.title}`,
        },
      }),
    ]);

    // --- Trigger Pusher real-time event ---
    await pusherServer.trigger(getUserChannel(line_uid), POINT_UPDATE_EVENT, {
      newPoints: updatedUser.current_points,
      newTier: updatedUser.tier,
      pointsBurned: reward.required_points,
      redeemedReward: reward.title,
    });

    return NextResponse.json({
      success: true,
      redeemedReward: reward.title,
      pointsBurned: reward.required_points,
      newPoints: updatedUser.current_points,
      newTier: updatedUser.tier,
    });
  } catch (err) {
    console.error("[POST /api/points/burn]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
