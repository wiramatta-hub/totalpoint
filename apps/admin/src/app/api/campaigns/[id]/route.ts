import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { campaignSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        campaignRewards: { include: { reward: true }, orderBy: { sortOrder: "asc" } },
        lotteryConfig: { include: { _count: { select: { entries: true } } } },
        boothSessions: true,
        _count: { select: { orderSubmissions: true, lotteryEntries: true } },
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = campaignSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const old = await prisma.campaign.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { hasLottery, lotteryPurchasePerTicket, rules, ...rest } = parsed.data;

    const campaign = await prisma.$transaction(async (tx) => {
      const updated = await tx.campaign.update({
        where: { id },
        data: {
          ...rest,
          ...(rest.startDate ? { startDate: new Date(rest.startDate) } : {}),
          ...(rest.endDate ? { endDate: new Date(rest.endDate) } : {}),
          ...(hasLottery !== undefined ? { hasLottery } : {}),
          ...(lotteryPurchasePerTicket !== undefined ? { lotteryPurchasePerTicket } : {}),
          ...(rules !== undefined ? { rules: rules as any } : {}),
        },
      });

      // Create lottery config if newly enabled
      if (hasLottery && !old.hasLottery) {
        await tx.lotteryConfig.upsert({
          where: { campaignId: id },
          create: { campaignId: id },
          update: {},
        });
      }

      await tx.auditLog.create({
        data: {
          adminUserId: session.user?.id,
          action: "UPDATE",
          entity: "Campaign",
          entityId: id,
          oldData: old as any,
          newData: updated as any,
        },
      });

      return updated;
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const old = await prisma.campaign.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Soft delete: set status to ENDED
    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id },
        data: { status: "ENDED" },
      });
      await tx.auditLog.create({
        data: {
          adminUserId: session.user?.id,
          action: "DELETE",
          entity: "Campaign",
          entityId: id,
          oldData: old as any,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
