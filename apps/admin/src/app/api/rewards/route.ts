import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rewardSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "true";
    const type = searchParams.get("type");

    if (!isPublic) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const where = isPublic
      ? {
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          ...(type ? { type: type as "PHYSICAL" | "COUPON" | "HOMMALL_COUPON" | "PRIVILEGE" | "LOTTERY_TICKET" } : {}),
        }
      : type
      ? { type: type as "PHYSICAL" | "COUPON" | "HOMMALL_COUPON" | "PRIVILEGE" | "LOTTERY_TICKET" }
      : {};

    const rewards = await prisma.reward.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { pointsCost: "asc" }],
    });

    return NextResponse.json({ rewards });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = rewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reward = await prisma.reward.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: {
        adminUserId: session.user?.id,
        action: "CREATE",
        entity: "Reward",
        entityId: reward.id,
        newData: reward as any,
      },
    });

    return NextResponse.json({ reward }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
