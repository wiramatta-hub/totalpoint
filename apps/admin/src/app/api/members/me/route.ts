import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberFromRequest } from "@/lib/line";

/**
 * GET /api/members/me
 * Get current member's profile + points (LIFF client)
 */
export async function GET(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberPayload.memberId },
      include: {
        tier: true,
        _count: {
          select: {
            orderSubmissions: true,
            redemptions: true,
            lotteryEntries: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Next tier info
    const nextTier = await prisma.memberTier.findFirst({
      where: { minLifetimePoints: { gt: member.lifetimePoints } },
      orderBy: { minLifetimePoints: "asc" },
    });

    return NextResponse.json({
      member: {
        id: member.id,
        lineDisplayName: member.lineDisplayName,
        linePictureUrl: member.linePictureUrl,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        email: member.email,
        birthDate: member.birthDate,
        currentPoints: member.currentPoints,
        lifetimePoints: member.lifetimePoints,
        tier: member.tier,
        nextTier,
        pointsToNextTier: nextTier
          ? nextTier.minLifetimePoints - member.lifetimePoints
          : null,
        stats: member._count,
        registeredAt: member.registeredAt,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/members/me
 * Update member profile (LIFF client)
 */
export async function PATCH(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, phone, email, birthDate } = body;

    // Validate phone uniqueness if provided
    if (phone) {
      const existing = await prisma.member.findFirst({
        where: { phone, id: { not: memberPayload.memberId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "เบอร์โทรนี้ถูกใช้แล้ว" },
          { status: 409 }
        );
      }
    }

    const member = await prisma.member.update({
      where: { id: memberPayload.memberId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
      include: { tier: true },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
