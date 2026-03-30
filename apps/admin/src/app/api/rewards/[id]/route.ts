import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rewardSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const reward = await prisma.reward.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ reward });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = rewardSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const old = await prisma.reward.findUnique({ where: { id } });
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reward = await prisma.reward.update({ where: { id }, data: parsed.data });

    await prisma.auditLog.create({
      data: {
        adminUserId: session.user?.id,
        action: "UPDATE",
        entity: "Reward",
        entityId: id,
        oldData: old as any,
        newData: reward as any,
      },
    });

    return NextResponse.json({ reward });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Check for existing redemptions
    const reward = await prisma.reward.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true, campaignRewards: true } } },
    });
    if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (reward._count.redemptions > 0) {
      return NextResponse.json(
        { error: "ไม่สามารถลบได้ เนื่องจากมีการแลกของรางวัลนี้แล้ว" },
        { status: 400 }
      );
    }

    // Hard-delete (also removes campaign links)
    await prisma.campaignReward.deleteMany({ where: { rewardId: id } });
    await prisma.reward.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminUserId: session.user?.id,
        action: "DELETE",
        entity: "Reward",
        entityId: id,
        oldData: reward as any,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
