import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db";
import { getLineProfile, verifyLineToken } from "@/lib/line";
import { memberRegisterSchema } from "@/lib/validators";

/**
 * POST /api/line/auth
 * Called by LIFF app after LINE Login.
 * Verifies LINE access token, registers/fetches member, returns JWT.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "accessToken is required" },
        { status: 400 }
      );
    }

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID ?? "";
    const verified = await verifyLineToken(accessToken, channelId);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid LINE access token" },
        { status: 401 }
      );
    }

    const profile = await getLineProfile(accessToken);
    if (!profile) {
      return NextResponse.json(
        { error: "Could not fetch LINE profile" },
        { status: 401 }
      );
    }

    // Find or create member
    let member = await prisma.member.findUnique({
      where: { lineUserId: profile.userId },
      include: { tier: true },
    });

    if (!member) {
      // Get default tier
      const defaultTier = await prisma.memberTier.findFirst({
        where: { isDefault: true },
        orderBy: { sortOrder: "asc" },
      });
      if (!defaultTier) {
        return NextResponse.json(
          { error: "No default tier configured" },
          { status: 500 }
        );
      }

      member = await prisma.member.create({
        data: {
          lineUserId: profile.userId,
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl,
          tierId: defaultTier.id,
        },
        include: { tier: true },
      });
    } else {
      // Update display info
      member = await prisma.member.update({
        where: { id: member.id },
        data: {
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl,
        },
        include: { tier: true },
      });
    }

    // Issue JWT for LIFF app
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET ?? "secret"
    );
    const token = await new SignJWT({
      memberId: member.id,
      lineUserId: member.lineUserId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json({
      token,
      member: {
        id: member.id,
        lineDisplayName: member.lineDisplayName,
        linePictureUrl: member.linePictureUrl,
        currentPoints: member.currentPoints,
        lifetimePoints: member.lifetimePoints,
        tier: member.tier,
        isNewMember: !member.firstName && !member.phone,
      },
    });
  } catch (error) {
    console.error("LINE auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/line/auth/profile
 * Update member profile (called after registration)
 */
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = memberRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { lineUserId, ...data } = parsed.data;

    const member = await prisma.member.update({
      where: { lineUserId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
      include: { tier: true },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
